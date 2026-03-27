import axios from 'axios';
import { Base64 } from 'js-base64';

const GMAIL_BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

function getBodyPart(payload: any): string {
  if (payload.body && payload.body.data && payload.mimeType === 'text/html') {
    return decodeBase64(payload.body.data);
  }

  if (payload.parts) {
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
    if (htmlPart && htmlPart.body && htmlPart.body.data) {
      return decodeBase64(htmlPart.body.data);
    }
    
    for (const part of payload.parts) {
      const nested = getBodyPart(part);
      if (nested) return nested;
    }
  }

  return '';
}

function decodeBase64(data: string): string {
  try {
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Base64.decode(base64);
  } catch (e) {
    return '';
  }
}

function estimateReadingTime(html: string): number {
  const plainText = html.replace(/<[^>]*>?/gm, '');
  const words = plainText.trim().split(/\s+/).length;
  const time = Math.ceil(words / 200);
  return time > 0 ? time : 1;
}

function extractCategory(name: string, subject: string): string {
  const n = (name + subject).toLowerCase();
  
  // High-Fidelity IQ Categorization
  if (n.includes('dev') || n.includes('tech') || n.includes('code') || n.includes('software')) return 'Tech';
  if (n.includes('finance') || n.includes('money') || n.includes('market') || n.includes('vc') || n.includes('startup') || n.includes('economy')) return 'Business';
  if (n.includes('marketing') || n.includes('growth') || n.includes('brand') || n.includes('agency')) return 'Marketing';
  if (n.includes('design') || n.includes('ui') || n.includes('ux') || n.includes('figma') || n.includes('creative')) return 'Design';
  if (n.includes('product') || n.includes('pm') || n.includes('roadmap')) return 'Product';
  if (n.includes('daily') || n.includes('digest') || n.includes('morning')) return 'Daily';
  if (n.includes('ai') || n.includes('intelligence') || n.includes('gpt') || n.includes('machine learning')) return 'AI/Intelligence';
  if (n.includes('health') || n.includes('travel') || n.includes('culture') || n.includes('lifestyle')) return 'Lifestyle';
  
  return 'General';
}

function generateAISummary(snippet: string): string {
  if (!snippet) return "Transmission received with empty payload.";
  const sentences = snippet.split(/[.!?]/);
  const core = sentences[0].trim();
  return core.length > 10 ? `${core}.` : "Newsletter overview captured.";
}

export function extractDraftInsights(html: string, snippet: string): string {
  const plainText = html.replace(/<[^>]*>?/gm, ' ');
  const lines = plainText.split(/[.!?]/).map(l => l.trim()).filter(l => l.length > 20);
  
  // Find key parts (Source Intel)
  const insights = lines.slice(0, 3).map(l => `• ${l}.`);
  if (insights.length < 1) return `• Transmission Analysis: ${snippet}`;
  
  return `[DRAFTED BY LETTERBOX]\n\n${insights.join('\n')}`;
}

function extractActionItems(html: string): string[] {
  const links: string[] = [];
  const matches = html.match(/href="([^"]+)"/g);
  if (matches) {
    matches.forEach(m => {
      const url = m.slice(6, -1);
      if (url.includes('http') && !url.includes('unsubscribe')) {
        links.push(url);
      }
    });
  }
  return Array.from(new Set(links)).slice(0, 3);
}

export async function fetchNewsletters(accessToken: string) {
  try {
    const response = await axios.get(`${GMAIL_BASE_URL}/messages`, {
      params: { maxResults: 20, q: 'category:promotions OR category:updates' },
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const messages = response.data.messages || [];
    const fullMessages = await Promise.all(
      messages.map(async (msg: any) => {
        const detail = await axios.get(`${GMAIL_BASE_URL}/messages/${msg.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        return detail.data;
      })
    );

    const newslettersData = fullMessages.filter(msg => {
      const headers = msg.payload.headers;
      return headers.find((h: any) => h.name.toLowerCase() === 'list-unsubscribe');
    });

    return newslettersData.map(msg => {
      const headers = msg.payload.headers;
      const getHeader = (name: string) => headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value;
      const html = getBodyPart(msg.payload);
      const sender = getHeader('from') || 'Unknown Sender';
      const subject = getHeader('subject') || '(No Subject)';

      return {
        id: msg.id,
        subject: subject,
        sender: sender,
        date: getHeader('date') || '',
        snippet: msg.snippet,
        category: extractCategory(sender, subject),
        bodyPreview: msg.snippet,
        bodyHtml: html,
        readingTime: estimateReadingTime(html || msg.snippet),
        unsubscribeUrl: getHeader('list-unsubscribe'),
        aiSummary: generateAISummary(msg.snippet),
        extractedLinks: extractActionItems(html || '')
      };
    });
  } catch (error) {
    console.error('Error fetching Gmail data:', error);
    throw error;
  }
}

export function extractSubscriptions(newsletters: any[]) {
  const subMap = new Map();
  const freqMap = new Map();

  newsletters.forEach(n => {
    const from = n.sender;
    const emailMatch = from.match(/<(.+)>/);
    const email = emailMatch ? emailMatch[1] : from;
    freqMap.set(email, (freqMap.get(email) || 0) + 1);
  });

  newsletters.forEach(n => {
    const from = n.sender;
    const emailMatch = from.match(/<(.+)>/);
    const email = emailMatch ? emailMatch[1] : from;
    const name = from.split('<')[0].trim() || email;

    let unsubscribeLink = n.unsubscribeUrl;
    if (unsubscribeLink && unsubscribeLink.includes('<')) {
      const matches = unsubscribeLink.match(/<(.+?)>/g);
      if (matches) {
        const mailto = matches.find((m: string) => m.toLowerCase().includes('mailto:'));
        unsubscribeLink = mailto ? mailto.slice(1, -1) : matches[0].slice(1, -1);
      }
    }

    if (!subMap.has(email)) {
      subMap.set(email, {
        id: email,
        senderName: name,
        senderEmail: email,
        status: 'active',
        lastReceived: n.date,
        unsubscribeUrl: unsubscribeLink,
        weeklyFrequency: freqMap.get(email),
        category: n.category || extractCategory(name, n.subject),
        isFavorite: false,
        engagementScore: 0
      });
    }
  });
  return Array.from(subMap.values());
}

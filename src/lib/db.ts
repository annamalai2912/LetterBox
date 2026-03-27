import { openDB } from 'idb';
import type { IDBPDatabase } from 'idb';

export interface Subscription {
  id: string;
  senderName: string;
  senderEmail: string;
  status: 'active' | 'unsubscribed';
  lastReceived: string;
  unsubscribeUrl?: string;
  weeklyFrequency?: number;
  category?: string;
  isFavorite?: boolean;
  engagementScore?: number; // 0-100
}

export interface Newsletter {
  id: string;
  subject: string;
  sender: string;
  date: string;
  snippet: string;
  bodyPreview: string;
  bodyHtml?: string;
  category?: string; // Metadata from sender
  engagementScore?: number; // Metadata from sender
  readingTime?: number; 
  isFavorite?: boolean;
  isArchived?: boolean; // Vault
  aiSummary?: string; 
  deepSummary?: string; // Bulleted Intel
  notes?: string; // User's intelligence notes
  extractedLinks?: string[]; 
}

const DB_NAME = 'letterbox_db_v3';
const STORE_SUBS = 'subscriptions';
const STORE_LETTERS = 'letters';

export async function initDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_SUBS)) {
        db.createObjectStore(STORE_SUBS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_LETTERS)) {
        db.createObjectStore(STORE_LETTERS, { keyPath: 'id' });
      }
    },
  });
}

export async function saveSubscriptions(subs: Subscription[]) {
  const db = await initDB();
  const tx = db.transaction(STORE_SUBS, 'readwrite');
  for (const sub of subs) {
    const existing = await tx.store.get(sub.id);
    tx.store.put({ 
      ...sub, 
      isFavorite: existing?.isFavorite ?? sub.isFavorite ?? false,
      engagementScore: existing?.engagementScore ?? sub.engagementScore ?? 0
    });
  }
  await tx.done;
}

export async function updateSubscription(id: string, updates: Partial<Subscription>) {
  const db = await initDB();
  const sub = await db.get(STORE_SUBS, id);
  if (sub) {
    await db.put(STORE_SUBS, { ...sub, ...updates });
  }
}

export async function getSubscriptions(): Promise<Subscription[]> {
  const db = await initDB();
  return db.getAll(STORE_SUBS);
}

export async function saveNewsletters(news: Newsletter[]) {
  const db = await initDB();
  const tx = db.transaction(STORE_LETTERS, 'readwrite');
  for (const item of news) {
    const existing = await tx.store.get(item.id);
    tx.store.put({ 
      ...item, 
      isFavorite: existing?.isFavorite ?? item.isFavorite ?? false,
      isArchived: existing?.isArchived ?? item.isArchived ?? false,
      aiSummary: item.aiSummary || existing?.aiSummary || '',
      deepSummary: existing?.deepSummary ?? item.deepSummary ?? '',
      notes: existing?.notes ?? item.notes ?? '',
      category: item.category || existing?.category || 'General',
      engagementScore: item.engagementScore || existing?.engagementScore || 0
    });
  }
  await tx.done;
}

export async function updateNewsletter(id: string, updates: Partial<Newsletter>) {
  const db = await initDB();
  const item = await db.get(STORE_LETTERS, id);
  if (item) {
    await db.put(STORE_LETTERS, { ...item, ...updates });
  }
}

export async function getNewsletters(): Promise<Newsletter[]> {
  const db = await initDB();
  return db.getAll(STORE_LETTERS);
}

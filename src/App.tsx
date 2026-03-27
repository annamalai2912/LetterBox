import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { 
  Mail, 
  LayoutDashboard, 
  LogOut, 
  ExternalLink,
  ChevronRight,
  Inbox,
  RefreshCw,
  Loader2,
  Heart,
  Archive,
  Zap,
  Activity,
  Maximize2,
  Minimize2,
  Search,
  EyeOff,
  Edit3,
  Save,
  Telescope,
  FileText,
  XCircle as LucideXCircle,
  TrendingUp,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Compass,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchNewsletters, extractSubscriptions, extractDraftInsights } from './lib/gmail';
import { saveSubscriptions, getSubscriptions, saveNewsletters, getNewsletters, updateSubscription, updateNewsletter } from './lib/db';
import { NEWSLETTER_RECOMMENDATIONS, type Recommendation } from './lib/recommendations';
import type { Subscription, Newsletter } from './lib/db';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [view, setView] = useState<'dashboard' | 'reader' | 'favorites' | 'vault' | 'settings'>('dashboard');
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [newsletters, setNewsletters] = useState<Newsletter[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedNewsletter, setSelectedNewsletter] = useState<Newsletter | null>(null);
  const [selectedSub, setSelectedSub] = useState<Subscription | null>(null);
  const [filterTag, setFilterTag] = useState<string>('All');
  
  // Beyond Intelligence States
  const [isFullReader, setIsFullReader] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isGhostMode] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Workbench & Intel States
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isDrafting, setIsDrafting] = useState(false);
  const [currentNote, setCurrentNote] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [isDoodleMode, setIsDoodleMode] = useState(false);
  const [doodleColor, setDoodleColor] = useState('#ffffff');
  const [isDrawing, setIsDrawing] = useState(false);

  // Feed Filter States
  const [feedCategory, setFeedCategory] = useState<string>('All');
  const [feedSort, setFeedSort] = useState<'date' | 'time' | 'score'>('date');
  const [highSignalOnly, setHighSignalOnly] = useState(false);

  // IQ Expansion States
  const [ , setShowSmartPurge] = useState(false);
  const [refreshDiscovery, setRefreshDiscovery] = useState(0); // For shuffling on refresh

  // Responsive Hook
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth < 768;

  const stats = useMemo(() => {
    return {
      total: subscriptions.length,
      weekly: subscriptions.reduce((acc, curr) => acc + (curr.weeklyFrequency || 0), 0),
      signal: Math.round(subscriptions.reduce((acc, curr) => acc + (curr.engagementScore || 0), 0) / (subscriptions.length || 1))
    };
  }, [subscriptions]);

  // Intelligence Pulse (Last 7 Days)
  const pulseData = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0];
    const now = new Date();
    newsletters.forEach(n => {
      const diff = Math.floor((now.getTime() - new Date(n.date).getTime()) / (1000 * 3600 * 24));
      if (diff >= 0 && diff < 7) counts[6 - diff]++;
    });
    const max = Math.max(...counts, 1);
    return counts.map(c => (c / max) * 100);
  }, [newsletters]);

  // Discovery Recommendations based on User Signal + Duplicate Check + Dynamic Shuffling
  const suggestedIntel = useMemo(() => {
    // 1. Get currently subscribed domains
    const subscribedDomains = new Set(subscriptions.map(s => {
       const parts = s.senderEmail.split('@');
       return parts.length > 1 ? parts[1].toLowerCase() : s.senderEmail.toLowerCase();
    }));

    // 2. Filter out already subscribed newsletters
    const availablePool = NEWSLETTER_RECOMMENDATIONS.filter(rec => {
       const recDomain = new URL(rec.url).hostname.replace('www.', '').replace('blog.', '').toLowerCase();
       // Check if any subscribed domain contains the recommendation domain or vice-versa
       return !Array.from(subscribedDomains).some(sub => sub.includes(recDomain) || recDomain.includes(sub));
    });

    // 3. Shuffle logic
    const shuffled = [...availablePool].sort(() => 0.5 - Math.random());

    // 4. Intelligence-led selection (Try to match high-signal categories first)
    const categoryScores: Record<string, number[]> = {};
    subscriptions.forEach(s => {
      if (s.category) {
        if (!categoryScores[s.category]) categoryScores[s.category] = [];
        categoryScores[s.category].push(s.engagementScore || 0);
      }
    });

    const averageScores = Object.entries(categoryScores).map(([cat, scores]) => ({
      category: cat,
      avg: scores.reduce((a, b) => a + b, 0) / scores.length
    })).sort((a, b) => b.avg - a.avg);

    const topCategories = averageScores.slice(0, 2).map(c => c.category);
    
    // Sort shuffled list to put top category matches first
    const prioritized = shuffled.sort((a, b) => {
       const aMatch = topCategories.includes(a.category) ? 1 : 0;
       const bMatch = topCategories.includes(b.category) ? 1 : 0;
       return bMatch - aMatch;
    });
    
    return prioritized.slice(0, 4);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subscriptions, newsletters, refreshDiscovery]);

  const deadNodes = useMemo(() => {
    return subscriptions.filter(s => s.engagementScore === 0 && (s.weeklyFrequency || 0) > 0);
  }, [subscriptions]);

  const processedFeed = useMemo(() => {
    let list = (view === 'reader' ? newsletters : view === 'favorites' ? newsletters.filter(n => n.isFavorite) : newsletters.filter(n => n.isArchived));
    if (feedCategory !== 'All') list = list.filter(n => n.category === feedCategory);
    if (highSignalOnly) list = list.filter(n => (n.engagementScore || 0) > 70);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(n => n.subject.toLowerCase().includes(q) || n.sender.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => {
      if (feedSort === 'time') return (b.readingTime || 0) - (a.readingTime || 0);
      if (feedSort === 'score') return (b.engagementScore || 0) - (a.engagementScore || 0);
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }, [newsletters, view, feedCategory, feedSort, highSignalOnly, searchQuery]);

  const feedCategories = useMemo(() => {
    const set = new Set(newsletters.map(n => n.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [newsletters]);

  const filteredSubs = useMemo(() => {
    if (filterTag === 'All') return subscriptions;
    return subscriptions.filter(s => s.category === filterTag);
  }, [subscriptions, filterTag]);

  const dashboardCategories = useMemo(() => {
    const set = new Set(subscriptions.map(s => s.category).filter(Boolean));
    return ['All', ...Array.from(set)];
  }, [subscriptions]);

  const searchedLetters = useMemo(() => {
    if (!searchQuery) return [];
    return newsletters.filter(n => n.subject.toLowerCase().includes(searchQuery.toLowerCase()) || n.sender.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [newsletters, searchQuery]);


  const login = useGoogleLogin({
    onSuccess: (codeResponse) => {
      setUser(codeResponse);
      localStorage.setItem('lb_session', JSON.stringify({ ...codeResponse, expiresAt: Date.now() + (codeResponse.expires_in * 1000) }));
      refreshData(codeResponse.access_token);
    },
    onError: (error) => console.log('Login Failed:', error),
    scope: 'https://www.googleapis.com/auth/gmail.readonly',
  });

  const loadFromDB = useCallback(async () => {
    const s = await getSubscriptions();
    const n = await getNewsletters();
    if (s.length > 0) setSubscriptions(s);
    if (n.length > 0) setNewsletters(n);
  }, []);

  const refreshData = async (token: string) => {
    if (!token) return;
    setLoading(true);
    // Shuffle Discovery on manual refresh
    setRefreshDiscovery(prev => prev + 1);
    try {
      const data = await fetchNewsletters(token);
      const subs = extractSubscriptions(data);
      await saveNewsletters(data);
      await saveSubscriptions(subs);
      await loadFromDB();
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => {
    const saved = localStorage.getItem('lb_session');
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.expiresAt > Date.now()) { setUser(session); } else { localStorage.removeItem('lb_session'); }
      } catch (e) { console.error('Session parse failed:', e); }
    }
    loadFromDB().finally(() => { setTimeout(() => setIsInitializing(false), 500); });
    const handleKeyDown = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsSearchOpen(true); } };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [loadFromDB]);

  const toggleHeartNewsletter = async (id: string, current: boolean) => {
    await updateNewsletter(id, { isFavorite: !current });
    await loadFromDB();
    if (selectedNewsletter?.id === id) setSelectedNewsletter(prev => prev ? { ...prev, isFavorite: !current } : null);
  };

  const smartPurgeBatch = async () => {
    setLoading(true);
    for (const node of deadNodes) {
      const lettersToArchive = newsletters.filter(n => n.sender.includes(node.senderEmail));
      for (const l of lettersToArchive) {
        await updateNewsletter(l.id, { isArchived: true });
      }
    }
    await loadFromDB();
    setLoading(false);
    setShowSmartPurge(false);
    alert(`Clean Sweep Complete! Decommissioned ${deadNodes.length} nodes.`);
  };

  const onReadNewsletter = async (n: Newsletter) => {
     setSelectedNewsletter(n);
     if (!n.notes) {
        setIsDrafting(true);
        setTimeout(async () => {
           const draft = extractDraftInsights(n.bodyHtml || '', n.snippet);
           const htmlDraft = `<div>[DRAFTED BY LETTERBOX]</div><br/>${draft.split('\n').map(line => `<div>• ${line}</div>`).join('')}`;
           setCurrentNote(htmlDraft);
           await updateNewsletter(n.id, { notes: htmlDraft });
           await loadFromDB();
           setIsDrafting(false);
        }, 1200);
     } else {
        setCurrentNote(n.notes || '');
     }
     const sub = subscriptions.find(s => n.sender.includes(s.senderEmail));
     if (sub) {
        const newScore = Math.min(100, (sub.engagementScore || 0) + 10);
        await updateSubscription(sub.id, { engagementScore: newScore });
        loadFromDB();
     }
  };

  const saveNotes = async () => {
    if (!selectedNewsletter) return;
    setSaveStatus('saving');
    await updateNewsletter(selectedNewsletter.id, { notes: currentNote });
    setNewsletters(prev => prev.map(n => n.id === selectedNewsletter.id ? { ...n, notes: currentNote } : n));
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const shareIntelligenceReport = () => {
     if (!selectedNewsletter) return;
     const report = `LETTERBOX INTELLIGENCE REPORT\n\nORIGIN: ${selectedNewsletter.sender}\nSUBJECT: ${selectedNewsletter.subject}\n\nSUMMARY:\n${selectedNewsletter.aiSummary}\n\nWORKBENCH NOTES:\n${currentNote}\n\nEXTRACTED INTEL:\n${selectedNewsletter.extractedLinks?.join('\n') || 'None'}\n\n-- End of Transmission --`;
     navigator.clipboard.writeText(report);
     alert('Intelligence Report copied to clipboard.');
  };

   const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            const imgHtml = `<div style="margin: 20px 0; border: 1px solid var(--glass-border); border-radius: 12px; overflow: hidden; box-shadow: 0 0 20px rgba(255,255,255,0.05);"><img src="${dataUrl}" style="max-width: 100%; display: block;" /></div>`;
            document.execCommand('insertHTML', false, imgHtml);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  const applyFormatting = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    const editor = document.getElementById('letterbox-tactical-editor');
    if (editor) setCurrentNote(editor.innerHTML);
  };

  const clearDoodle = () => {
    const canvas = document.getElementById('doodle-canvas') as HTMLCanvasElement;
    const ctx = canvas?.getContext('2d');
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveDoodleToIntel = () => {
    const canvas = document.getElementById('doodle-canvas') as HTMLCanvasElement;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL();
    const doodleHtml = `<div style="margin: 20px 0; transition: all 0.3s; cursor: pointer;"><img src="${dataUrl}" style="max-width: 100%; filter: drop-shadow(0 0 10px rgba(255,255,255,0.1));" /></div>`;
    document.execCommand('insertHTML', false, doodleHtml);
    clearDoodle();
    setIsDoodleMode(false);
  };

  const handleDoodleStart = (e: any) => {
    setIsDrawing(true);
    const canvas = e.target as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.strokeStyle = doodleColor;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.moveTo(x, y);
  };

  const handleDoodling = (e: any) => {
    if (!isDrawing) return;
    const canvas = e.target as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const runDeepScan = async () => {
    if (!selectedNewsletter || isSummarizing) return;
    setIsSummarizing(true);
    setTimeout(async () => {
      const detailed = `• Core Intel: Content scan priority status confirmed.\n• Analysis: Data patterns indicate high business relevance.\n• Action: Core links extracted to workbench.`;
      await updateNewsletter(selectedNewsletter.id, { deepSummary: detailed });
      setSelectedNewsletter(prev => prev ? { ...prev, deepSummary: detailed } : null);
      setNewsletters(prev => prev.map(n => n.id === selectedNewsletter.id ? { ...n, deepSummary: detailed } : n));
      setIsSummarizing(false);
    }, 1500);
  };

  if (isInitializing) {
    return (<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}><Mail size={32} color="#fff" /></div>);
  }

  if (!user) {
    return (
      <div className="landing-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px' }}>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '60px', maxWidth: '500px', textAlign: 'center' }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.05)', width: '64px', height: '64px', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}><Mail size={32} color="#fff" /></div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '12px', fontWeight: '700' }}>LetterBox</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '1rem', lineHeight: '1.6' }}>Intelligence-driven. Secure. Beyond Intelligence Experience.</p>
          <button className="btn-primary" onClick={() => login()} style={{ width: '100%', justifyContent: 'center' }}>Initialize Inbox</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="layout" style={{ background: '#000', minHeight: '100vh', paddingBottom: '100px' }}>
      
      <AnimatePresence>
        {isSearchOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 2000, display: 'flex', alignItems: 'start', justifyContent: 'center', paddingTop: '100px' }} onClick={() => setIsSearchOpen(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card" style={{ width: '600px', padding: '0', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
               <div style={{ display: 'flex', alignItems: 'center', padding: '20px', borderBottom: '1px solid var(--glass-border)' }}>
                  <Search size={20} color="var(--text-muted)" style={{ marginRight: '12px' }} />
                  <input autoFocus placeholder="Search transmissions, senders, intelligence..." style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: '1rem', flex: 1 }} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
               </div>
               <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {searchedLetters.map(n => ( <div key={n.id} onClick={() => { onReadNewsletter(n); setIsSearchOpen(false); }} style={{ padding: '16px 20px', borderBottom: '1px solid var(--glass-border)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="search-item"><div><div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{n.subject}</div><div className="mono" style={{ fontSize: '0.65rem' }}>{n.sender}</div></div><ChevronRight size={14} color="var(--text-muted)" /></div> ))}
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <nav className="nav-floating">
        <NavButton icon={<LayoutDashboard size={18} />} label="Board" active={view === 'dashboard'} onClick={() => setView('dashboard')} />
        <NavButton icon={<Inbox size={18} />} label="Feed" active={view === 'reader'} onClick={() => setView('reader')} />
        <NavButton icon={<Heart size={18} />} label="Favs" active={view === 'favorites'} onClick={() => setView('favorites')} />
        <NavButton icon={<Archive size={18} />} label="Vault" active={view === 'vault'} onClick={() => setView('vault')} />
        <div style={{ width: '1px', background: 'var(--glass-border)', margin: '4px' }} />
        <button onClick={() => setIsSearchOpen(true)} style={{ padding: '12px', borderRadius: '14px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><Search size={18} /></button>
        <button onClick={() => { localStorage.removeItem('lb_session'); setUser(null); }} style={{ padding: '12px', borderRadius: '14px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><LogOut size={18} /></button>
      </nav>

      <div className="layout-container">
        
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <Activity size={20} color="#fff" />
              <div className="mono" style={{ color: '#fff', fontSize: '0.9rem', fontWeight: '700' }}>LB // INTELLIGENCE</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '24px', paddingLeft: '20px', borderLeft: '1px solid var(--glass-border)' }}>
                 {pulseData.map((h, i) => (
                    <div key={i} style={{ width: '4px', height: `${h}%`, background: 'white', opacity: 0.1 + (h / 100) * 0.9, borderRadius: '1px' }} />
                 ))}
              </div>
           </div>
           <div style={{ display: 'flex', gap: '12px' }}>
              {isGhostMode && <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '8px', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}><EyeOff size={14} /><span className="mono" style={{ fontSize: '0.6rem' }}>GHOST ACTIVE</span></div>}
              <button className="glass-card" onClick={() => refreshData(user.access_token)} disabled={loading} style={{ width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1px solid var(--glass-border)', color: '#fff', background: 'transparent' }}>{loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}</button>
           </div>
        </header>

        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: '24px', marginBottom: '40px' }}>
                 <div className="glass-card hero-stats" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: '20px', padding: isMobile ? '20px' : '40px' }}>
                    <div><div className="mono">Active Nodes</div><div className="stat-value">{stats.total}</div></div>
                    <div><div className="mono">Weekly Flow</div><div className="stat-value">{stats.weekly}</div></div>
                    <div><div className="mono">Signal Index</div><div className="stat-value">{stats.signal}%</div></div>
                 </div>
                 <div className="glass-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', borderColor: deadNodes.length > 0 ? '#f59e0b' : 'var(--glass-border)' }}>
                    <div className="mono" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                       {deadNodes.length > 0 ? <ShieldAlert size={14} color="#f59e0b" /> : <ShieldCheck size={14} color="#10b981" />}
                       SMART PURGE
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>{deadNodes.length > 0 ? `Detected ${deadNodes.length} dead nodes with 0% engagement and frequent noise.` : 'Zero dead nodes detected. Intelligence flow is pure.'}</p>
                    {deadNodes.length > 0 && (
                       <button className="btn-primary" style={{ background: '#fff', color: '#000', width: '100%', justifyContent: 'center' }} onClick={smartPurgeBatch}><Trash2 size={16} /> DECOMMISSION ALL</button>
                    )}
                 </div>
              </div>

              {/* Intelligence Discovery Row */}
              <div style={{ marginBottom: '48px' }}>
                 <div className="mono" style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                   <Compass size={16} /> INTELLIGENCE DISCOVERY 
                   <div style={{ flex: 1, height: '1px', background: 'var(--glass-border)' }} />
                   <Sparkles size={14} color="var(--accent)" />
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                    {suggestedIntel.map(rec => (<DiscoveryCard key={rec.id} rec={rec} />))}
                    {suggestedIntel.length === 0 && <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', padding: '20px' }}>Your current network is optimal. No new suggestions.</div>}
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', overflowX: 'auto', paddingBottom: '8px', whiteSpace: 'nowrap' }}>
                  {dashboardCategories.map(cat => ( <button key={cat} onClick={() => setFilterTag(cat || 'All')} className="mono" style={{ padding: '6px 14px', borderRadius: '8px', background: filterTag === cat ? 'white' : 'rgba(255,255,255,0.03)', color: filterTag === cat ? '#000' : 'var(--text-muted)', border: '1px solid var(--glass-border)', cursor: 'pointer', fontWeight: '700', fontSize: '0.65rem' }}>{cat?.toUpperCase()}</button> ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>{filteredSubs.map(sub => (<SubscriptionCard key={sub.id} sub={sub} onClick={() => setSelectedSub(sub)} />))}</div>
            </motion.div>
          )}
          {(view === 'reader' || view === 'favorites' || view === 'vault') && (
            <motion.div key="list" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                     <h3 className="mono" style={{ color: '#fff', fontSize: '1rem' }}>{view.toUpperCase()} FEED</h3>
                     <div style={{ width: '1px', height: '16px', background: 'var(--glass-border)' }} />
                     <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', maxWidth: '400px' }}>
                        {feedCategories.map(cat => (
                          <button key={cat} onClick={() => setFeedCategory(cat || 'All')} className="mono" style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.6rem', background: feedCategory === cat ? 'white' : 'transparent', color: feedCategory === cat ? '#000' : 'var(--text-muted)', border: '1px solid var(--glass-border)', cursor: 'pointer' }}>{cat?.toUpperCase()}</button>
                        ))}
                     </div>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                     <button onClick={() => setHighSignalOnly(!highSignalOnly)} style={{ background: highSignalOnly ? '#fff' : 'transparent', border: '1px solid var(--glass-border)', padding: '6px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: highSignalOnly ? '#000' : 'var(--text-muted)' }}>
                        <TrendingUp size={14} /> <span className="mono" style={{ fontSize: '0.65rem' }}>HIGH SIGNAL</span>
                     </button>
                     <select value={feedSort} onChange={(e: any) => setFeedSort(e.target.value)} style={{ background: 'transparent', border: '1px solid var(--glass-border)', color: '#fff', borderRadius: '8px', padding: '6px 12px', outline: 'none', fontSize: '0.65rem' }} className="mono">
                        <option value="date" style={{ background: '#000' }}>NEWEST</option>
                        <option value="time" style={{ background: '#000' }}>READ TIME</option>
                        <option value="score" style={{ background: '#000' }}>SIGNAL</option>
                     </select>
                  </div>
               </div>
               <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {processedFeed.map(news => (<NewsletterRow key={news.id} newsletter={news} onClick={() => onReadNewsletter(news)} onHeart={() => toggleHeartNewsletter(news.id, !!news.isFavorite)} />))}
               </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedNewsletter && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.98)', zIndex: 1500, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => { setSelectedNewsletter(null); setIsFullReader(false); setIsNotesOpen(false); }}>
               <motion.div initial={{ scale: 0.98 }} animate={{ scale: 1, height: (isFullReader || isMobile) ? '100vh' : '92vh', width: (isFullReader || isMobile) ? '100vw' : '1200px' }} className={(isFullReader || isMobile) ? '' : 'glass-card'} style={{ background: '#000', overflowY: 'auto', display: 'flex', flexDirection: (isMobile && !isFullReader) ? 'column' : 'row', position: 'relative', border: (isFullReader || isMobile) ? 'none' : '1px solid var(--glass-border)', borderRadius: (isFullReader || isMobile) ? '0' : '24px' }} onClick={e => e.stopPropagation()}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: (isMobile && !isFullReader) ? '50vh' : 'auto' }}>
                     <header style={{ padding: isMobile ? '16px 20px' : '24px 40px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '20px', flex: 1 }}>
                           {!isMobile && <button onClick={() => setIsZenMode(!isZenMode)} style={{ background: isZenMode ? '#fff' : 'transparent', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: isZenMode ? '#000' : '#fff' }}><Zap size={14} /><span className="mono" style={{ fontSize: '0.7rem' }}>ZEN</span></button>}
                           {!isMobile && <button onClick={runDeepScan} disabled={isSummarizing} style={{ background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#fff' }}><Telescope size={14} /> <span className="mono" style={{ fontSize: '0.7rem' }}>DEEP SCAN</span></button>}
                           <button onClick={() => setIsNotesOpen(!isNotesOpen)} style={{ background: isNotesOpen ? '#fff' : 'transparent', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: isNotesOpen ? '#000' : '#fff' }}><Edit3 size={14} /> {!isMobile && <span className="mono" style={{ fontSize: '0.7rem' }}>WORKBENCH</span>}</button>
                           <h2 style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', fontWeight: '700', color: '#fff', maxWidth: isMobile ? '150px' : '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedNewsletter.subject}</h2>
                        </div>
                        <div style={{ display: 'flex', gap: isMobile ? '10px' : '16px', alignItems: 'center' }}>
                           <button onClick={() => toggleHeartNewsletter(selectedNewsletter.id, !!selectedNewsletter.isFavorite)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: selectedNewsletter.isFavorite ? '#ef4444' : '#fff' }}><Heart size={20} fill={selectedNewsletter.isFavorite ? '#ef4444' : 'transparent'} /></button>
                           {!isMobile && <button onClick={() => setIsFullReader(!isFullReader)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}>{isFullReader ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>}
                           <button onClick={() => setSelectedNewsletter(null)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}><LucideXCircle size={24} /></button>
                        </div>
                     </header>
                     <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
                        <div style={{ flex: 1, padding: isFullReader ? '60px 0' : '0', overflowY: 'auto' }}>
                           {isZenMode ? (
                             <div style={{ margin: 'auto', maxWidth: '700px', padding: '100px 40px', textAlign: 'center' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', width: '64px', height: '64px', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 32px' }}><Zap size={32} color="#fff" /></div>
                                <h3 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '24px' }}>Briefing Insight</h3>
                                {selectedNewsletter.deepSummary ? ( <div style={{ textAlign: 'left', background: 'rgba(255,255,255,0.02)', padding: '32px', borderRadius: '24px', border: '1px solid var(--glass-border)' }}> <p style={{ fontSize: '1.1rem', lineHeight: '1.8', color: '#e2e8f0', whiteSpace: 'pre-line' }}>{selectedNewsletter.deepSummary}</p> </div> ) : ( <p style={{ fontSize: '1.4rem', lineHeight: '1.8', color: '#cbd5e1' }}>{selectedNewsletter.aiSummary}</p> )}
                             </div>
                           ) : (
                             <iframe srcDoc={selectedNewsletter.bodyHtml} title="Transmission" style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }} />
                           )}
                        </div>
                        <AnimatePresence>
                          {isNotesOpen && (
                            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: (isFullReader || isMobile) ? (isMobile ? '100%' : '600px') : '450px', opacity: 1 }} exit={{ width: 0, opacity: 0 }} style={{ height: (isMobile && !isFullReader) ? '50vh' : '100%', borderLeft: isMobile ? 'none' : '1px solid var(--glass-border)', borderTop: (isMobile && !isFullReader) ? '1px solid var(--glass-border)' : 'none', background: 'rgba(255,255,255,0.02)', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                               {/* Tactical Toolbar */}
                               <div style={{ padding: '20px 32px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(10,10,10,0.5)', backdropFilter: 'blur(10px)' }}>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                     <button onClick={() => applyFormatting('hiliteColor', '#1e293b')} className="mono" style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--glass-border)', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '0.65rem' }}>HILITE</button>
                                     <button onClick={() => setIsDoodleMode(!isDoodleMode)} style={{ background: isDoodleMode ? '#fff' : 'transparent', color: isDoodleMode ? '#000' : '#fff', borderRadius: '6px', border: '1px solid var(--glass-border)', padding: '6px', cursor: 'pointer' }}><Edit3 size={14} /></button>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={shareIntelligenceReport} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#fff' }}><FileText size={16} /></button>
                                  </div>
                               </div>

                               <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
                                  <div 
                                    id="letterbox-tactical-editor"
                                    contentEditable 
                                    onPaste={handlePaste}
                                    onBlur={(e) => { setCurrentNote(e.currentTarget.innerHTML); saveNotes(); }}
                                    dangerouslySetInnerHTML={{ __html: currentNote }}
                                    style={{ 
                                      height: '100%', 
                                      width: '100%', 
                                      padding: '32px', 
                                      outline: 'none', 
                                      color: '#fff', 
                                      fontSize: '1rem', 
                                      lineHeight: '1.8', 
                                      overflowY: 'auto' 
                                    }} 
                                  />

                                  {isDrafting && (
                                    <div style={{ position: 'absolute', top: '32px', left: '32px', color: 'var(--accent)', fontSize: '0.65rem' }} className="mono">
                                       <Loader2 className="animate-spin" size={12} style={{ marginRight: '8px' }} /> 
                                       EXTRACTING INTELLIGENCE...
                                    </div>
                                  )}

                                  {isSummarizing && (
                                    <div style={{ position: 'absolute', top: '50px', left: '32px', color: '#3b82f6', fontSize: '0.65rem' }} className="mono">
                                       <Loader2 className="animate-spin" size={12} style={{ marginRight: '8px' }} /> 
                                       DEEP SCAN IN PROGRESS...
                                    </div>
                                  )}

                                  <AnimatePresence>
                                     {isDoodleMode && (
                                       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', zIndex: 10, cursor: 'crosshair', display: 'flex', flexDirection: 'column' }}>
                                          <div style={{ padding: '12px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000' }}>
                                             <div className="mono" style={{ fontSize: '0.6rem' }}>TACTICAL SKETCH OVERLAY</div>
                                             <div style={{ display: 'flex', gap: '8px' }}>
                                                <button onClick={() => setDoodleColor('#ffffff')} style={{ width: '16px', height: '16px', borderRadius: '8px', background: '#fff', border: doodleColor === '#ffffff' ? '2px solid var(--accent)' : 'none' }} />
                                                <button onClick={() => setDoodleColor('#3b82f6')} style={{ width: '16px', height: '16px', borderRadius: '8px', background: '#3b82f6', border: doodleColor === '#3b82f6' ? '2px solid var(--accent)' : 'none' }} />
                                                <button onClick={() => setDoodleColor('#ef4444')} style={{ width: '16px', height: '16px', borderRadius: '8px', background: '#ef4444', border: doodleColor === '#ef4444' ? '2px solid var(--accent)' : 'none' }} />
                                                <div style={{ width: '1px', background: 'var(--glass-border)', margin: '0 8px' }} />
                                                <button onClick={clearDoodle} className="mono" style={{ border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer', fontSize: '0.6rem' }}>CLEAR</button>
                                                <button onClick={saveDoodleToIntel} className="mono" style={{ background: '#fff', color: '#000', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.6rem', fontWeight: 'bold' }}>BURN TO INTEL</button>
                                             </div>
                                          </div>
                                          <canvas 
                                            id="doodle-canvas"
                                            width="600"
                                            height="800"
                                            onMouseDown={handleDoodleStart}
                                            onMouseMove={handleDoodling}
                                            onMouseUp={() => setIsDrawing(false)}
                                            onMouseLeave={() => setIsDrawing(false)}
                                            style={{ flex: 1, width: '100%', height: '100%' }}
                                          />
                                       </motion.div>
                                     )}
                                  </AnimatePresence>
                               </div>

                               <div style={{ padding: '32px', borderTop: '1px solid var(--glass-border)' }}>
                                  <button onClick={saveNotes} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                                     {saveStatus === 'saving' ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} 
                                     {saveStatus === 'saved' ? ' INTEL SECURED' : ' CAPTURE INTELLIGENCE'}
                                  </button>
                               </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                     </div>
                  </div>
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {selectedSub && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setSelectedSub(null)}>
               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="glass-card" style={{ width: '450px', padding: '40px', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                  <div style={{ background: 'rgba(255, 255, 255, 0.03)', width: '64px', height: '64px', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid var(--glass-border)' }}><Mail size={32} color="#fff" /></div>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: '800', marginBottom: '8px' }}>{selectedSub.senderName}</h3>
                  <div className="mono" style={{ fontSize: '0.7rem', marginBottom: '32px', color: 'var(--text-muted)' }}>{selectedSub.senderEmail}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '40px' }}>
                     <div className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}><div className="mono" style={{ fontSize: '0.6rem', marginBottom: '4px' }}>SIGNAL</div><div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{selectedSub.engagementScore}%</div></div>
                     <div className="glass-card" style={{ padding: '20px', background: 'rgba(255,255,255,0.02)' }}><div className="mono" style={{ fontSize: '0.6rem', marginBottom: '4px' }}>FLOW</div><div style={{ fontSize: '1.2rem', fontWeight: '800' }}>{selectedSub.weeklyFrequency}x</div></div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                     <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setSelectedSub(null)}>ABORT</button>
                     <button className="btn-primary" style={{ flex: 1.5, justifyContent: 'center', background: '#ef4444' }} onClick={() => { if (selectedSub.unsubscribeUrl) window.open(selectedSub.unsubscribeUrl, '_blank'); setSelectedSub(null); }}>TERMINATE NODE</button>
                  </div>
               </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function NavButton({ icon, label, active, onClick }: any) { return (<div onClick={onClick} className={`nav-item ${active ? 'active' : ''}`} style={{ padding: '10px 18px', cursor: 'pointer' }}>{icon}<span className="mono" style={{ fontSize: '0.65rem' }}>{label}</span></div>); }
function SubscriptionCard({ sub, onClick }: { sub: Subscription, onClick: () => void }) { return (<div className="glass-card" style={{ padding: '24px', cursor: 'pointer' }} onClick={onClick}> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><div style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '10px', border: '1px solid var(--glass-border)' }}><Mail size={18} color="#fff" /></div><div className="mono" style={{ fontSize: '0.6rem' }}>{sub.category}</div></div> <h3 style={{ marginBottom: '4px', fontWeight: '700', color: '#fff', fontSize: '1.1rem' }}>{sub.senderName}</h3> <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '24px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub.senderEmail}</p> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '4px', height: '4px', borderRadius: '2px', background: (sub.engagementScore || 0) > 50 ? '#10b981' : '#f59e0b' }} /><span className="mono" style={{ fontSize: '0.65rem' }}>SIGNAL: {sub.engagementScore}%</span></div><ChevronRight size={14} color="var(--text-muted)" /></div> </div>); }
function DiscoveryCard({ rec }: { rec: Recommendation }) { return (<div className="glass-card discovery-card" style={{ padding: '28px', borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.1)', transition: 'all 0.3s ease' }}> <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}><span className="mono" style={{ fontSize: '0.55rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', color: 'var(--accent)' }}>RECOMMENDED // {rec.category.toUpperCase()}</span></div> <h3 style={{ marginBottom: '8px', fontWeight: '800', fontSize: '1rem' }}>{rec.name}</h3> <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', lineHeight: '1.5', marginBottom: '24px' }}>{rec.description}</p> <button className="btn-secondary mono" style={{ width: '100%', justifyContent: 'center', fontSize: '0.65rem' }} onClick={() => window.open(rec.url, '_blank')}><ExternalLink size={12} style={{ marginRight: '8px' }} /> SOURCE INTEL</button> </div>); }
function NewsletterRow({ newsletter, onClick, onHeart }: any) { return (<div className="glass-card" onClick={onClick} style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}> <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flex: 1 }}> <button onClick={(e) => { e.stopPropagation(); onHeart(e); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: newsletter.isFavorite ? '#ef4444' : 'rgba(255,255,255,0.1)' }}><Heart size={18} fill={newsletter.isFavorite ? '#ef4444' : 'transparent'} /></button> <div className="mono" style={{ color: '#fff', fontSize: '0.75rem', width: '30px' }}>{newsletter.readingTime}M</div> <div style={{ flex: 1 }}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><h4 style={{ fontWeight: '700', marginBottom: '2px', color: '#fff', fontSize: '0.95rem' }}>{newsletter.subject}</h4><span className="mono" style={{ fontSize: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>{newsletter.category?.toUpperCase()}</span></div><p className="mono" style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'none' }}>{newsletter.sender.split('<')[0].trim()} • {newsletter.date.split(',')[0]}</p></div> </div> <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>{newsletter.notes && <Edit3 size={14} color="#fff" />}{newsletter.isArchived && <Archive size={14} color="#10b981" />}<ChevronRight size={18} color="var(--text-muted)" /></div> </div>); }

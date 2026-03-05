'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { NameCardData, DomainCheck, SavedName, CARD_FONTS, GRADIENTS, CATEGORY_COLORS } from '@/lib/types';
import { pickTextColor, STATUS_COLORS } from '@/lib/colors';

type CheckMethod = 'whoisxml' | 'dns' | 'pending';

function generateCardStyle(usedIndices: Set<number>): { gradient: string; fontFamily: string; textColor: string } {
  let idx = Math.floor(Math.random() * GRADIENTS.length);
  let attempts = 0;
  while (usedIndices.has(idx) && attempts < 12) { idx = Math.floor(Math.random() * GRADIENTS.length); attempts++; }
  usedIndices.add(idx);
  if (usedIndices.size > GRADIENTS.length - 3) usedIndices.clear();
  const gradient = GRADIENTS[idx];
  const fontFamily = CARD_FONTS[Math.floor(Math.random() * CARD_FONTS.length)];
  return { gradient, fontFamily, textColor: pickTextColor(gradient) };
}

function domainUrl(domain: string, tld: string, available: boolean | null): string {
  const full = domain.includes('.') ? domain : `${domain}.${tld}`;
  if (available === false) return `https://${full}`;
  return `https://porkbun.com/checkout/search?q=${encodeURIComponent(full)}`;
}

function DomainRow({ domain, available, method, isExact, tld }: {
  domain: string; available: boolean | null; method: CheckMethod; isExact: boolean; tld: string;
}) {
  const full = domain.includes('.') ? domain : `${domain}.${tld}`;
  const isDns = method === 'dns';
  const SC = STATUS_COLORS;

  if (available === null) return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg" style={{ background: SC.loading.bg }}>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full pulse" style={{ background: SC.loading.dot }} />
        <span className="text-xs text-white/40 font-mono">{full}</span>
        {isExact && <span className="text-[10px] text-white/20 uppercase tracking-wider">exact</span>}
      </div>
      <span className="text-[10px] text-white/20">checking…</span>
    </div>
  );

  const sc = available ? SC.available : SC.taken;

  return (
    <a href={domainUrl(domain, tld, available)} target="_blank" rel="noopener noreferrer"
      className="domain-pill flex items-center justify-between py-1.5 px-3 rounded-lg transition-all"
      style={{ background: available ? sc.bg : 'rgba(255,255,255,0.02)' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {available ? (
          <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sc.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        ) : (
          <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sc.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"><path d="M18 6L6 18M6 6l12 12"/></svg>
        )}
        <span className="text-xs font-mono truncate" style={{ color: available ? sc.text : 'rgba(255,255,255,0.3)' }}>{full}</span>
        {isExact && <span className="shrink-0 text-[10px] uppercase tracking-wider" style={{ color: available ? sc.text + '99' : 'rgba(255,255,255,0.15)' }}>exact</span>}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color: available ? sc.text + 'cc' : 'rgba(255,255,255,0.2)' }}>
          {available ? (isDns ? 'Likely free' : 'Available') : 'Taken'}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ color: available ? sc.text + '80' : 'rgba(255,255,255,0.15)' }}>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
        </svg>
      </div>
    </a>
  );
}

function StatusBanner({ card, tld }: { card: NameCardData; tld: string }) {
  const exactAv = card.exactDomain.available;
  const anyVar = card.variantDomains.some(v => v.available === true);
  const allChecked = card.exactDomain.available !== null && card.variantDomains.every(v => v.available !== null);
  const avCount = [card.exactDomain, ...card.variantDomains].filter(d => d.available === true).length;
  const SC = STATUS_COLORS;

  if (!allChecked) return (
    <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: SC.loading.bg }}>
      <div className="w-3 h-3 border-[1.5px] border-white/20 border-t-white/50 rounded-full spinner" />
      <span className="text-[10px] text-white/40 uppercase tracking-wider">Checking domains…</span>
    </div>
  );

  if (exactAv) return (
    <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: SC.available.bg }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={SC.available.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
      <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: SC.available.text }}>
        .{tld} available{avCount > 1 ? ` · ${avCount} domains free` : ''}
      </span>
    </div>
  );

  if (anyVar) return (
    <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: SC.variantAvailable.bg }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={SC.variantAvailable.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 9v4M12 17h.01"/></svg>
      <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: SC.variantAvailable.text }}>
        .{tld} taken · {avCount} variant{avCount > 1 ? 's' : ''} {card.verified ? 'available' : 'likely free'}
      </span>
    </div>
  );

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5" style={{ background: SC.taken.bg }}>
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={SC.taken.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7"><path d="M18 6L6 18M6 6l12 12"/></svg>
      <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: SC.taken.text + 'b3' }}>No .{tld} domains available</span>
    </div>
  );
}

function CategoryTag({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS['custom'] || '#8c8c8c';
  return (
    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider"
      style={{ background: color + '25', color, border: `1px solid ${color}40` }}>
      {category}
    </span>
  );
}

function NameCardComponent({ card, index, onSave, onVerify, onMoreVariants, isSaved, tld }: {
  card: NameCardData; index: number; onSave: (c: NameCardData) => void;
  onVerify: (id: string) => void; onMoreVariants: (id: string) => void;
  isSaved: boolean; tld: string;
}) {
  const exactAv = card.exactDomain.available;
  const anyVar = card.variantDomains.some(v => v.available === true);
  const allChecked = card.exactDomain.available !== null && card.variantDomains.every(v => v.available !== null);
  const noneAv = allChecked && !exactAv && !anyVar;
  const hasUnverified = card.variantDomains.some(v => v.available === true && v.method === 'dns');
  const showVerify = allChecked && hasUnverified && !card.verified;
  const SC = STATUS_COLORS;

  let borderColor = SC.loading.border;
  let shadow = SC.loading.glow;
  if (exactAv) { borderColor = SC.available.border; shadow = SC.available.glow; }
  else if (anyVar) { borderColor = SC.variantAvailable.border; shadow = SC.variantAvailable.glow; }
  else if (noneAv) { borderColor = SC.taken.border; }

  return (
    <div className="name-card card-enter rounded-2xl overflow-hidden relative group"
      style={{ animationDelay: `${index * 60}ms`, border: `2px solid ${borderColor}`, boxShadow: shadow !== 'transparent' ? `0 0 24px ${shadow}` : undefined }}>

      <div className="h-40 sm:h-48 flex items-center justify-center p-6 relative" style={{ background: card.gradient }}>
        <CategoryTag category={card.category} />
        <h2 className="text-2xl sm:text-3xl text-center leading-tight break-words max-w-full"
          style={{ fontFamily: card.fontFamily, color: card.textColor, textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
          {card.name}
        </h2>
        <button onClick={() => onSave(card)}
          className={`absolute top-3 right-3 p-2 rounded-lg transition-all ${isSaved ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-black/20 text-white/60 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-black/40'}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>

      <StatusBanner card={card} tld={tld} />

      <div className="bg-[var(--bg-secondary)] px-2.5 py-2 flex flex-col gap-1">
        <DomainRow domain={card.exactDomain.domain} available={card.exactDomain.available} method={card.exactDomain.method} isExact={true} tld={tld} />
        {card.variantDomains.map(v => (
          <DomainRow key={v.domain} domain={v.domain} available={v.available} method={v.method} isExact={false} tld={tld} />
        ))}
      </div>

      {/* Action buttons */}
      <div className="bg-[var(--bg-secondary)] px-2.5 pb-2.5 flex gap-1.5">
        {/* More variants */}
        <button onClick={() => onMoreVariants(card.id)} disabled={card.loadingVariants}
          className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-medium transition-all bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/70 disabled:opacity-40 flex items-center justify-center gap-1.5">
          {card.loadingVariants ? <div className="w-3 h-3 border-[1.5px] border-white/20 border-t-white/50 rounded-full spinner" /> : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          )}
          More variants
        </button>

        {/* Verify */}
        {showVerify && (
          <button onClick={() => onVerify(card.id)} disabled={card.verifying}
            className="flex-1 py-1.5 px-2 rounded-lg text-[10px] font-medium transition-all flex items-center justify-center gap-1.5 disabled:opacity-40"
            style={{ background: SC.variantAvailable.bg, color: SC.variantAvailable.text, border: `1px solid ${SC.variantAvailable.border}` }}>
            {card.verifying ? <div className="w-3 h-3 border-[1.5px] rounded-full spinner" style={{ borderColor: SC.variantAvailable.text + '40', borderTopColor: SC.variantAvailable.text }} /> : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
            )}
            Verify
          </button>
        )}

        {card.verified && (
          <div className="flex items-center gap-1 px-2">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={SC.available.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            <span className="text-[10px] uppercase tracking-wider" style={{ color: SC.available.text + '99' }}>Verified</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<NameCardData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [tld, setTld] = useState('com');
  const existingNamesRef = useRef<string[]>([]);
  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const configRef = useRef<any>(null);
  const initialLoadDone = useRef(false);
  const batchNumberRef = useRef(1);
  const usedGradientIndices = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nc_saved');
      if (saved) try { setSavedNames(new Set(JSON.parse(saved).map((s: SavedName) => s.name))); } catch {}
      const configStr = localStorage.getItem('nc_config');
      if (configStr) try { configRef.current = JSON.parse(configStr); setTld(configRef.current.tld || 'com'); } catch {}
      if (!configRef.current) {
        const desc = localStorage.getItem('nc_description') || '';
        configRef.current = { businessDescription: desc, tld: 'com' };
      }
    }
  }, []);

  // Step 1: DNS check all domains (free, fast)
  // Step 2: For domains that DNS says are available, confirm via WhoisXML (accurate)
  const checkDomainsForCard = useCallback(async (cardId: string, exactDomain: string, variantDomains: string[]) => {
    const currentTld = configRef.current?.tld || 'com';
    const allDomains = [exactDomain, ...variantDomains];

    // Step 1: DNS check everything
    try {
      const dnsResp = await fetch('/api/check-domain-dns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: allDomains, tld: currentTld }),
      });
      if (!dnsResp.ok) return;
      const { results: dnsResults } = await dnsResp.json();

      // Update cards with DNS results
      setCards(prev => prev.map(c => {
        if (c.id !== cardId) return c;
        return {
          ...c,
          exactDomain: dnsResults[c.exactDomain.domain] !== undefined
            ? { ...c.exactDomain, available: dnsResults[c.exactDomain.domain], method: 'dns' as CheckMethod } : c.exactDomain,
          variantDomains: c.variantDomains.map(v =>
            dnsResults[v.domain] !== undefined ? { ...v, available: dnsResults[v.domain], method: 'dns' as CheckMethod } : v
          ),
        };
      }));

      // Step 2: WhoisXML only for exact match + DNS-available variants
      const dnsAvailable = allDomains.filter(d => dnsResults[d] === true);
      if (dnsAvailable.length === 0) return;

      // Always verify exact match if DNS says available; variants stay as DNS
      const toVerify = dnsAvailable.includes(exactDomain) ? [exactDomain] : [];
      if (toVerify.length === 0) return;

      const xmlResp = await fetch('/api/check-domain', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: toVerify, tld: currentTld }),
      });
      if (!xmlResp.ok) return;
      const { results: xmlResults } = await xmlResp.json();

      setCards(prev => prev.map(c => {
        if (c.id !== cardId) return c;
        return {
          ...c,
          exactDomain: xmlResults[c.exactDomain.domain] !== undefined
            ? { ...c.exactDomain, available: xmlResults[c.exactDomain.domain], method: 'whoisxml' as CheckMethod } : c.exactDomain,
        };
      }));
    } catch (err) { console.error('Domain check error:', err); }
  }, []);

  const handleVerify = useCallback(async (cardId: string) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, verifying: true } : c));
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const currentTld = configRef.current?.tld || 'com';
    const domains = card.variantDomains.map(v => v.domain);

    try {
      const resp = await fetch('/api/check-domain', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains, tld: currentTld }),
      });
      if (!resp.ok) return;
      const { results } = await resp.json();
      setCards(prev => prev.map(c => {
        if (c.id !== cardId) return c;
        return { ...c, verifying: false, verified: true,
          variantDomains: c.variantDomains.map(v => results[v.domain] !== undefined ? { ...v, available: results[v.domain], method: 'whoisxml' as CheckMethod } : v),
        };
      }));
    } catch { setCards(prev => prev.map(c => c.id === cardId ? { ...c, verifying: false } : c)); }
  }, [cards]);

  const handleMoreVariants = useCallback(async (cardId: string) => {
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, loadingVariants: true } : c));
    const card = cards.find(c => c.id === cardId);
    if (!card) return;
    const currentTld = configRef.current?.tld || 'com';

    try {
      const resp = await fetch('/api/generate-variants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: card.name,
          businessDescription: configRef.current?.businessDescription || '',
          industry: configRef.current?.industry || '',
          existingVariants: [card.exactDomain.domain, ...card.variantDomains.map(v => v.domain)],
          tld: currentTld,
        }),
      });
      if (!resp.ok) { setCards(prev => prev.map(c => c.id === cardId ? { ...c, loadingVariants: false } : c)); return; }
      const { variants } = await resp.json();

      const newDomains: DomainCheck[] = variants.map((v: string) => ({ domain: v, available: null, method: 'pending' as CheckMethod }));

      setCards(prev => prev.map(c => {
        if (c.id !== cardId) return c;
        return { ...c, loadingVariants: false, verified: false, verifying: false, variantDomains: [...c.variantDomains, ...newDomains] };
      }));

      // DNS check new variants
      if (variants.length > 0) {
        const dnsResp = await fetch('/api/check-domain-dns', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ domains: variants, tld: currentTld }),
        });
        if (dnsResp.ok) {
          const { results } = await dnsResp.json();
          setCards(prev => prev.map(c => {
            if (c.id !== cardId) return c;
            return { ...c, variantDomains: c.variantDomains.map(v => results[v.domain] !== undefined ? { ...v, available: results[v.domain], method: 'dns' as CheckMethod } : v) };
          }));
        }
      }
    } catch { setCards(prev => prev.map(c => c.id === cardId ? { ...c, loadingVariants: false } : c)); }
  }, [cards]);

  const generateBatch = useCallback(async () => {
    if (loadingRef.current || !configRef.current) return;
    loadingRef.current = true;
    setIsGenerating(true);
    setError(null);

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: configRef.current, existingNames: existingNamesRef.current,
          rejectedNames: existingNamesRef.current, batchSize: 10, batchNumber: batchNumberRef.current,
        }),
      });
      if (!resp.ok) { const e = await resp.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const { suggestions } = await resp.json();

      const newSuggestions = suggestions.filter((s: any) => !existingNamesRef.current.includes(s.name.toLowerCase()));
      const newCards: NameCardData[] = newSuggestions.map((s: any) => {
        const style = generateCardStyle(usedGradientIndices.current);
        const nameLower = s.name.toLowerCase().replace(/\s+/g, '');
        return {
          id: `${nameLower}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: s.name, category: s.category || 'invented',
          exactDomain: { domain: nameLower, available: null, method: 'pending' as CheckMethod },
          variantDomains: (s.variants || []).map((v: string) => ({ domain: v.toLowerCase().replace(/\s+/g, ''), available: null, method: 'pending' as CheckMethod })),
          verified: false, verifying: false, loadingVariants: false, ...style,
        };
      });

      for (const c of newCards) existingNamesRef.current.push(c.name.toLowerCase());
      setCards(prev => [...prev, ...newCards]);
      batchNumberRef.current++;

      for (const c of newCards) checkDomainsForCard(c.id, c.exactDomain.domain, c.variantDomains.map(v => v.domain));
    } catch (err: any) { setError(err.message || 'Failed'); } finally { setIsGenerating(false); loadingRef.current = false; }
  }, [checkDomainsForCard]);

  useEffect(() => {
    if (!initialLoadDone.current) { initialLoadDone.current = true; setTimeout(() => generateBatch(), 100); }
  }, [generateBatch]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => { if (entries[0].isIntersecting && !loadingRef.current) generateBatch(); }, { rootMargin: '400px' });
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [generateBatch]);

  const handleSave = (card: NameCardData) => {
    if (typeof window === 'undefined') return;
    const saved: SavedName[] = JSON.parse(localStorage.getItem('nc_saved') || '[]');
    if (saved.some(s => s.name === card.name)) {
      localStorage.setItem('nc_saved', JSON.stringify(saved.filter(s => s.name !== card.name)));
      setSavedNames(prev => { const n = new Set(prev); n.delete(card.name); return n; });
    } else {
      const avDomains = [...(card.exactDomain.available ? [card.exactDomain.domain + '.' + tld] : []),
        ...card.variantDomains.filter(v => v.available).map(v => v.domain + '.' + tld)];
      saved.push({ name: card.name, category: card.category, savedAt: Date.now(), gradient: card.gradient, fontFamily: card.fontFamily, textColor: card.textColor, availableDomains: avDomains });
      localStorage.setItem('nc_saved', JSON.stringify(saved));
      setSavedNames(prev => { const arr = Array.from(prev); arr.push(card.name); return new Set(arr); });
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, i) => (
            <NameCardComponent key={card.id} card={card} index={i % 10} onSave={handleSave}
              onVerify={handleVerify} onMoreVariants={handleMoreVariants} isSaved={savedNames.has(card.name)} tld={tld} />
          ))}
        </div>
        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center">
            <p className="text-red-400 text-sm mb-2">{error}</p>
            <button onClick={() => generateBatch()} className="text-sm text-[var(--accent)] hover:underline">Try again</button>
          </div>
        )}
        {isGenerating && (
          <div className="flex items-center justify-center gap-3 py-12">
            <div className="w-5 h-5 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full spinner" />
            <span className="text-sm text-[var(--text-secondary)]">Generating more names&hellip;</span>
          </div>
        )}
        <div ref={sentinelRef} className="h-4" />
      </main>
    </div>
  );
}

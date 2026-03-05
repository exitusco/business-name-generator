'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { NameCard, DomainCheck, SavedName, CARD_FONTS, GRADIENTS } from '@/lib/types';
import { pickTextColor } from '@/lib/colors';

// 'whoisxml' = accurate paid check, 'dns' = free fast estimate, 'pending' = not checked yet
type CheckMethod = 'whoisxml' | 'dns' | 'pending';

interface DomainCheckExt extends DomainCheck {
  method: CheckMethod;
}

interface NameCardExt extends Omit<NameCard, 'exactDomain' | 'variantDomains'> {
  exactDomain: DomainCheckExt;
  variantDomains: DomainCheckExt[];
  verified: boolean;
  verifying: boolean;
}

function generateCardStyle(usedIndices: Set<number>): { gradient: string; fontFamily: string; textColor: string } {
  let idx = Math.floor(Math.random() * GRADIENTS.length);
  let attempts = 0;
  while (usedIndices.has(idx) && attempts < 10) {
    idx = Math.floor(Math.random() * GRADIENTS.length);
    attempts++;
  }
  usedIndices.add(idx);
  if (usedIndices.size > GRADIENTS.length - 3) usedIndices.clear();
  const gradient = GRADIENTS[idx];
  const fontFamily = CARD_FONTS[Math.floor(Math.random() * CARD_FONTS.length)];
  const textColor = pickTextColor(gradient);
  return { gradient, fontFamily, textColor };
}

function porkbunSearchUrl(domain: string): string {
  const full = domain.includes('.') ? domain : `${domain}.com`;
  return `https://porkbun.com/checkout/search?q=${encodeURIComponent(full)}`;
}

function DomainRow({
  domain,
  available,
  method,
  isExact,
}: {
  domain: string;
  available: boolean | null;
  method: CheckMethod;
  isExact: boolean;
}) {
  const fullDomain = domain.includes('.') ? domain : `${domain}.com`;
  const isDns = method === 'dns';

  if (available === null) {
    return (
      <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/[0.03]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-white/20 pulse" />
          <span className="text-xs text-white/40 font-mono">{fullDomain}</span>
          {isExact && <span className="text-[10px] text-white/20 uppercase tracking-wider">exact</span>}
        </div>
        <span className="text-[10px] text-white/20">checking…</span>
      </div>
    );
  }

  return (
    <a
      href={porkbunSearchUrl(fullDomain)}
      target="_blank"
      rel="noopener noreferrer"
      className={`domain-pill flex items-center justify-between py-1.5 px-3 rounded-lg transition-all ${
        available
          ? 'bg-[#4ade80]/[0.08] hover:bg-[#4ade80]/[0.14]'
          : 'bg-white/[0.02] hover:bg-white/[0.05]'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {available ? (
          <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
        ) : (
          <svg className="shrink-0" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        )}
        <span className={`text-xs font-mono truncate ${available ? 'text-[#4ade80]' : 'text-white/35'}`}>
          {fullDomain}
        </span>
        {isExact && (
          <span className={`shrink-0 text-[10px] uppercase tracking-wider ${available ? 'text-[#4ade80]/60' : 'text-white/15'}`}>
            exact
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5 shrink-0 ml-2">
        {isDns && available && (
          <span className="text-[10px] text-white/20" title="Checked via DNS — use Verify for accurate result">~</span>
        )}
        <span className={`text-[10px] font-medium uppercase tracking-wider ${available ? 'text-[#4ade80]/80' : 'text-white/20'}`}>
          {available ? (isDns ? 'Likely free' : 'Available') : 'Taken'}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={available ? 'text-[#4ade80]/50' : 'text-white/15'}>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
        </svg>
      </div>
    </a>
  );
}

function StatusBanner({ card }: { card: NameCardExt }) {
  const exactAvailable = card.exactDomain.available;
  const anyVariantAvailable = card.variantDomains.some(v => v.available === true);
  const allChecked = card.exactDomain.available !== null && card.variantDomains.every(v => v.available !== null);
  const stillLoading = !allChecked;
  const availableCount = [card.exactDomain, ...card.variantDomains].filter(d => d.available === true).length;
  const hasUnverifiedAvailable = card.variantDomains.some(v => v.available === true && v.method === 'dns');

  if (stillLoading) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/[0.04]">
        <div className="w-3 h-3 border-[1.5px] border-white/20 border-t-white/50 rounded-full spinner" />
        <span className="text-[10px] text-white/40 uppercase tracking-wider">Checking domains…</span>
      </div>
    );
  }

  if (exactAvailable) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#4ade80]/[0.08]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        <span className="text-[10px] text-[#4ade80] uppercase tracking-wider font-semibold">
          .com available{availableCount > 1 ? ` · ${availableCount} domains free` : ''}
        </span>
      </div>
    );
  }

  if (anyVariantAvailable) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#fbbf24]/[0.06]">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4M12 17h.01"/>
          <circle cx="12" cy="12" r="10"/>
        </svg>
        <span className="text-[10px] text-[#fbbf24] uppercase tracking-wider font-semibold">
          .com taken · {availableCount} variant{availableCount > 1 ? 's' : ''} {hasUnverifiedAvailable && !card.verified ? 'likely free' : 'available'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f87171]/[0.05]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
        <path d="M18 6L6 18M6 6l12 12"/>
      </svg>
      <span className="text-[10px] text-[#f87171]/70 uppercase tracking-wider font-semibold">
        No .com domains available
      </span>
    </div>
  );
}

function NameCardComponent({
  card,
  index,
  onSave,
  onVerify,
  isSaved,
}: {
  card: NameCardExt;
  index: number;
  onSave: (card: NameCardExt) => void;
  onVerify: (cardId: string) => void;
  isSaved: boolean;
}) {
  const exactAvailable = card.exactDomain.available;
  const anyVariantAvailable = card.variantDomains.some(v => v.available === true);
  const allChecked = card.exactDomain.available !== null && card.variantDomains.every(v => v.available !== null);
  const noneAvailable = allChecked && !exactAvailable && !anyVariantAvailable;
  const hasUnverifiedAvailable = card.variantDomains.some(v => v.available === true && v.method === 'dns');
  const showVerify = allChecked && hasUnverifiedAvailable && !card.verified;

  let borderColor = 'rgba(42, 42, 58, 1)';
  let shadowColor = 'transparent';
  if (exactAvailable) {
    borderColor = 'rgba(74, 222, 128, 0.5)';
    shadowColor = 'rgba(74, 222, 128, 0.08)';
  } else if (anyVariantAvailable) {
    borderColor = card.verified ? 'rgba(251, 191, 36, 0.4)' : 'rgba(251, 191, 36, 0.25)';
    shadowColor = 'rgba(251, 191, 36, 0.04)';
  } else if (noneAvailable) {
    borderColor = 'rgba(248, 113, 113, 0.25)';
  }

  return (
    <div
      className="name-card card-enter rounded-2xl overflow-hidden relative group"
      style={{
        animationDelay: `${index * 60}ms`,
        border: `2px solid ${borderColor}`,
        boxShadow: shadowColor !== 'transparent' ? `0 0 24px ${shadowColor}` : undefined,
      }}
    >
      <div
        className="h-40 sm:h-48 flex items-center justify-center p-6 relative"
        style={{ background: card.gradient }}
      >
        <h2
          className="text-2xl sm:text-3xl text-center leading-tight break-words max-w-full"
          style={{
            fontFamily: card.fontFamily,
            color: card.textColor,
            textShadow: '0 2px 12px rgba(0,0,0,0.3)',
          }}
        >
          {card.name}
        </h2>

        <button
          onClick={() => onSave(card)}
          className={`absolute top-3 right-3 p-2 rounded-lg transition-all ${
            isSaved
              ? 'bg-[var(--accent)]/20 text-[var(--accent)]'
              : 'bg-black/20 text-white/60 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-black/40'
          }`}
          title={isSaved ? 'Saved!' : 'Save this name'}
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24"
            fill={isSaved ? 'currentColor' : 'none'}
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>

      <StatusBanner card={card} />

      <div className="bg-[var(--bg-secondary)] px-2.5 py-2 flex flex-col gap-1">
        <DomainRow
          domain={card.exactDomain.domain}
          available={card.exactDomain.available}
          method={card.exactDomain.method}
          isExact={true}
        />
        {card.variantDomains.map((v) => (
          <DomainRow
            key={v.domain}
            domain={v.domain}
            available={v.available}
            method={v.method}
            isExact={false}
          />
        ))}
      </div>

      {/* Verify button — only shown when there are unverified DNS results that look available */}
      {showVerify && (
        <div className="bg-[var(--bg-secondary)] px-2.5 pb-2.5">
          <button
            onClick={() => onVerify(card.id)}
            disabled={card.verifying}
            className="w-full py-2 px-3 rounded-lg text-xs font-medium transition-all
              bg-[#fbbf24]/[0.08] hover:bg-[#fbbf24]/[0.14] text-[#fbbf24] border border-[#fbbf24]/20
              disabled:opacity-50 disabled:cursor-not-allowed
              flex items-center justify-center gap-2"
          >
            {card.verifying ? (
              <>
                <div className="w-3 h-3 border-[1.5px] border-[#fbbf24]/30 border-t-[#fbbf24] rounded-full spinner" />
                Verifying…
              </>
            ) : (
              <>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/>
                </svg>
                Verify variant availability
              </>
            )}
          </button>
        </div>
      )}

      {/* Show verified badge */}
      {card.verified && (
        <div className="bg-[var(--bg-secondary)] px-2.5 pb-2">
          <div className="flex items-center justify-center gap-1.5 py-1">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <span className="text-[10px] text-[#4ade80]/60 uppercase tracking-wider">Verified via registrar</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<NameCardExt[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
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
      if (saved) {
        try {
          const arr: SavedName[] = JSON.parse(saved);
          setSavedNames(new Set(arr.map(s => s.name)));
        } catch {}
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const configStr = localStorage.getItem('nc_config');
      if (configStr) {
        try { configRef.current = JSON.parse(configStr); } catch {}
      }
      if (!configRef.current) {
        const desc = localStorage.getItem('nc_description') || '';
        configRef.current = { businessDescription: desc };
      }
    }
  }, []);

  // Check exact domain via WhoisXML (accurate, paid)
  const checkExactDomain = useCallback(async (cardId: string, domain: string) => {
    try {
      const resp = await fetch('/api/check-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: [domain] }),
      });
      if (!resp.ok) return;
      const { results } = await resp.json();

      setCards(prev => prev.map(card => {
        if (card.id !== cardId) return card;
        return {
          ...card,
          exactDomain: results[domain] !== undefined
            ? { ...card.exactDomain, available: results[domain], method: 'whoisxml' as CheckMethod }
            : card.exactDomain,
        };
      }));
    } catch (err) {
      console.error('Exact domain check error:', err);
    }
  }, []);

  // Check variant domains via DNS (free, fast, approximate)
  const checkVariantDomains = useCallback(async (cardId: string, domains: string[]) => {
    if (domains.length === 0) return;
    try {
      const resp = await fetch('/api/check-domain-dns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains }),
      });
      if (!resp.ok) return;
      const { results } = await resp.json();

      setCards(prev => prev.map(card => {
        if (card.id !== cardId) return card;
        return {
          ...card,
          variantDomains: card.variantDomains.map(v =>
            results[v.domain] !== undefined
              ? { ...v, available: results[v.domain], method: 'dns' as CheckMethod }
              : v
          ),
        };
      }));
    } catch (err) {
      console.error('DNS variant check error:', err);
    }
  }, []);

  // Verify: re-check ALL variant domains via WhoisXML (accurate, paid)
  const handleVerify = useCallback(async (cardId: string) => {
    // Mark as verifying
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, verifying: true } : c));

    // Get the card's variant domains
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const variantDomains = card.variantDomains.map(v => v.domain);

    try {
      const resp = await fetch('/api/check-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: variantDomains }),
      });
      if (!resp.ok) return;
      const { results } = await resp.json();

      setCards(prev => prev.map(c => {
        if (c.id !== cardId) return c;
        return {
          ...c,
          verifying: false,
          verified: true,
          variantDomains: c.variantDomains.map(v =>
            results[v.domain] !== undefined
              ? { ...v, available: results[v.domain], method: 'whoisxml' as CheckMethod }
              : v
          ),
        };
      }));
    } catch (err) {
      console.error('Verify error:', err);
      setCards(prev => prev.map(c => c.id === cardId ? { ...c, verifying: false } : c));
    }
  }, [cards]);

  const generateBatch = useCallback(async () => {
    if (loadingRef.current || !configRef.current) return;
    loadingRef.current = true;
    setIsGenerating(true);
    setError(null);

    const currentBatch = batchNumberRef.current;

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: configRef.current,
          existingNames: existingNamesRef.current,
          rejectedNames: existingNamesRef.current,
          batchSize: 10,
          batchNumber: currentBatch,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Generation failed');
      }

      const { suggestions } = await resp.json();

      const newSuggestions = suggestions.filter(
        (s: any) => !existingNamesRef.current.includes(s.name.toLowerCase())
      );

      const newCards: NameCardExt[] = newSuggestions.map((s: any) => {
        const style = generateCardStyle(usedGradientIndices.current);
        const nameLower = s.name.toLowerCase().replace(/\s+/g, '');
        return {
          id: `${nameLower}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: s.name,
          exactDomain: { domain: nameLower, available: null, method: 'pending' as CheckMethod },
          variantDomains: (s.variants || []).map((v: string) => ({
            domain: v.toLowerCase().replace(/\s+/g, ''),
            available: null,
            method: 'pending' as CheckMethod,
          })),
          verified: false,
          verifying: false,
          ...style,
        };
      });

      for (const card of newCards) {
        existingNamesRef.current.push(card.name.toLowerCase());
      }

      setCards(prev => [...prev, ...newCards]);
      batchNumberRef.current++;

      // Fire checks: WhoisXML for exact, DNS for variants
      for (const card of newCards) {
        checkExactDomain(card.id, card.exactDomain.domain);
        checkVariantDomains(card.id, card.variantDomains.map(v => v.domain));
      }
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate names');
    } finally {
      setIsGenerating(false);
      loadingRef.current = false;
    }
  }, [checkExactDomain, checkVariantDomains]);

  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      setTimeout(() => generateBatch(), 100);
    }
  }, [generateBatch]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) {
          generateBatch();
        }
      },
      { rootMargin: '400px' }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [generateBatch]);

  const handleSave = (card: NameCardExt) => {
    if (typeof window === 'undefined') return;
    const saved: SavedName[] = JSON.parse(localStorage.getItem('nc_saved') || '[]');
    const exists = saved.some(s => s.name === card.name);

    if (exists) {
      const filtered = saved.filter(s => s.name !== card.name);
      localStorage.setItem('nc_saved', JSON.stringify(filtered));
      setSavedNames(prev => { const next = new Set(prev); next.delete(card.name); return next; });
    } else {
      const availableDomains = [
        ...(card.exactDomain.available ? [card.exactDomain.domain + '.com'] : []),
        ...card.variantDomains.filter(v => v.available).map(v => v.domain + '.com'),
      ];
      saved.push({
        name: card.name, savedAt: Date.now(),
        gradient: card.gradient, fontFamily: card.fontFamily, textColor: card.textColor,
        availableDomains,
      });
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
            <NameCardComponent
              key={card.id}
              card={card}
              index={i % 10}
              onSave={handleSave}
              onVerify={handleVerify}
              isSaved={savedNames.has(card.name)}
            />
          ))}
        </div>

        {error && (
          <div className="mt-6 p-4 bg-[#f87171]/10 border border-[#f87171]/30 rounded-xl text-center">
            <p className="text-[#f87171] text-sm mb-2">{error}</p>
            <button onClick={() => generateBatch()} className="text-sm text-[var(--accent)] hover:underline">
              Try again
            </button>
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

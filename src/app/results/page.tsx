'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { NameCard, SavedName, CARD_FONTS, GRADIENTS } from '@/lib/types';
import { pickTextColor } from '@/lib/colors';

function generateCardStyle(): { gradient: string; fontFamily: string; textColor: string } {
  const gradient = GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)];
  const fontFamily = CARD_FONTS[Math.floor(Math.random() * CARD_FONTS.length)];
  const textColor = pickTextColor(gradient);
  return { gradient, fontFamily, textColor };
}

function porkbunSearchUrl(domain: string): string {
  const full = domain.includes('.') ? domain : `${domain}.com`;
  return `https://porkbun.com/checkout/search?q=${encodeURIComponent(full)}`;
}

// Domain status badge
function DomainBadge({
  domain,
  available,
}: {
  domain: string;
  available: boolean | null;
}) {
  const fullDomain = domain.includes('.') ? domain : `${domain}.com`;
  
  if (available === null) {
    return (
      <span className="domain-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-white/10 text-white/50 pulse">
        <span className="w-1.5 h-1.5 rounded-full bg-white/30" />
        {fullDomain}
      </span>
    );
  }

  return (
    <a
      href={porkbunSearchUrl(fullDomain)}
      target="_blank"
      rel="noopener noreferrer"
      className={`domain-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs ${
        available
          ? 'bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30'
          : 'bg-white/5 text-white/40 border border-white/10'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${available ? 'bg-[#4ade80]' : 'bg-white/20'}`} />
      {fullDomain}
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
      </svg>
    </a>
  );
}

function NameCardComponent({
  card,
  index,
  onSave,
  isSaved,
}: {
  card: NameCard;
  index: number;
  onSave: (card: NameCard) => void;
  isSaved: boolean;
}) {
  // Determine border style based on domain availability
  const exactAvailable = card.exactDomain.available;
  const anyVariantAvailable = card.variantDomains.some(v => v.available === true);
  const allChecked = card.exactDomain.available !== null && card.variantDomains.every(v => v.available !== null);
  const noneAvailable = allChecked && !exactAvailable && !anyVariantAvailable;

  let borderClass = 'border-[var(--border)]'; // default / still loading
  if (exactAvailable) {
    borderClass = 'border-[#4ade80]/60';
  } else if (anyVariantAvailable) {
    borderClass = 'border-[#fbbf24]/50';
  } else if (noneAvailable) {
    borderClass = 'border-[#f87171]/30';
  }

  return (
    <div
      className={`name-card card-enter rounded-2xl border-2 ${borderClass} overflow-hidden relative group`}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Card visual area */}
      <div
        className="h-44 sm:h-52 flex items-center justify-center p-6 relative"
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

        {/* Save button */}
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
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill={isSaved ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>

      {/* Domain availability section */}
      <div className="bg-[var(--bg-secondary)] px-4 py-3 flex flex-wrap gap-1.5">
        <DomainBadge
          domain={card.exactDomain.domain}
          available={card.exactDomain.available}
        />
        {card.variantDomains.map((v) => (
          <DomainBadge
            key={v.domain}
            domain={v.domain}
            available={v.available}
          />
        ))}
      </div>
    </div>
  );
}

export default function ResultsPage() {
  const router = useRouter();
  const [cards, setCards] = useState<NameCard[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const existingNamesRef = useRef<string[]>([]);
  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const configRef = useRef<any>(null);
  const initialLoadDone = useRef(false);

  // Load saved names
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

  // Load config
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const configStr = localStorage.getItem('nc_config');
      if (configStr) {
        try {
          configRef.current = JSON.parse(configStr);
        } catch {}
      }
      if (!configRef.current) {
        const desc = localStorage.getItem('nc_description') || '';
        configRef.current = { businessDescription: desc };
      }
    }
  }, []);

  const checkDomains = useCallback(async (domainsToCheck: string[]) => {
    if (domainsToCheck.length === 0) return;
    try {
      const resp = await fetch('/api/check-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: domainsToCheck }),
      });
      if (!resp.ok) return;
      const { results } = await resp.json();

      setCards(prev =>
        prev.map(card => {
          const exactKey = card.exactDomain.domain;
          let updated = { ...card };
          if (results[exactKey] !== undefined) {
            updated.exactDomain = { ...card.exactDomain, available: results[exactKey] };
          }
          updated.variantDomains = card.variantDomains.map(v =>
            results[v.domain] !== undefined
              ? { ...v, available: results[v.domain] }
              : v
          );
          return updated;
        })
      );
    } catch (err) {
      console.error('Domain check error:', err);
    }
  }, []);

  const generateBatch = useCallback(async () => {
    if (loadingRef.current || !configRef.current) return;
    loadingRef.current = true;
    setIsGenerating(true);
    setError(null);

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: configRef.current,
          existingNames: existingNamesRef.current,
          batchSize: 10,
        }),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || 'Generation failed');
      }

      const { suggestions } = await resp.json();

      // Filter duplicates
      const newSuggestions = suggestions.filter(
        (s: any) => !existingNamesRef.current.includes(s.name.toLowerCase())
      );

      // Build cards
      const newCards: NameCard[] = newSuggestions.map((s: any) => {
        const style = generateCardStyle();
        const nameLower = s.name.toLowerCase().replace(/\s+/g, '');
        return {
          id: `${nameLower}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: s.name,
          exactDomain: { domain: nameLower, available: null },
          variantDomains: (s.variants || []).map((v: string) => ({
            domain: v.toLowerCase().replace(/\s+/g, ''),
            available: null,
          })),
          ...style,
        };
      });

      // Track existing names
      for (const card of newCards) {
        existingNamesRef.current.push(card.name.toLowerCase());
      }

      setCards(prev => [...prev, ...newCards]);

      // Kick off domain checks
      const allDomains = newCards.flatMap(c => [
        c.exactDomain.domain,
        ...c.variantDomains.map(v => v.domain),
      ]);
      checkDomains(allDomains);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message || 'Failed to generate names');
    } finally {
      setIsGenerating(false);
      loadingRef.current = false;
    }
  }, [checkDomains]);

  // Initial load
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      // Small delay to ensure config is loaded
      setTimeout(() => generateBatch(), 100);
    }
  }, [generateBatch]);

  // Infinite scroll observer
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

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [generateBatch]);

  const handleSave = (card: NameCard) => {
    if (typeof window === 'undefined') return;

    const saved: SavedName[] = JSON.parse(localStorage.getItem('nc_saved') || '[]');
    const exists = saved.some(s => s.name === card.name);

    if (exists) {
      // Unsave
      const filtered = saved.filter(s => s.name !== card.name);
      localStorage.setItem('nc_saved', JSON.stringify(filtered));
      setSavedNames(prev => {
        const next = new Set(prev);
        next.delete(card.name);
        return next;
      });
    } else {
      // Save
      const availableDomains = [
        ...(card.exactDomain.available ? [card.exactDomain.domain + '.com'] : []),
        ...card.variantDomains.filter(v => v.available).map(v => v.domain + '.com'),
      ];
      saved.push({
        name: card.name,
        savedAt: Date.now(),
        gradient: card.gradient,
        fontFamily: card.fontFamily,
        textColor: card.textColor,
        availableDomains,
      });
      localStorage.setItem('nc_saved', JSON.stringify(saved));
      setSavedNames(prev => new Set([...prev, card.name]));
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Results grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, i) => (
            <NameCardComponent
              key={card.id}
              card={card}
              index={i % 10}
              onSave={handleSave}
              isSaved={savedNames.has(card.name)}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-6 p-4 bg-[#f87171]/10 border border-[#f87171]/30 rounded-xl text-center">
            <p className="text-[#f87171] text-sm mb-2">{error}</p>
            <button
              onClick={() => generateBatch()}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading indicator */}
        {isGenerating && (
          <div className="flex items-center justify-center gap-3 py-12">
            <div className="w-5 h-5 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full spinner" />
            <span className="text-sm text-[var(--text-secondary)]">Generating more names&hellip;</span>
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-4" />
      </main>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Header from '@/components/Header';
import { NameCardData, DomainCheck, SavedName, CARD_FONTS, GRADIENTS, CATEGORY_COLORS, COMMON_TLDS } from '@/lib/types';
import { pickTextColor, STATUS_COLORS } from '@/lib/colors';
import { partitionCached, setCache } from '@/lib/domain-cache';

type CheckMethod = 'whoisxml' | 'dns' | 'pending';
interface DomainCheckExt extends DomainCheck { method: CheckMethod; }
interface CardData extends Omit<NameCardData, 'exactDomain' | 'variantDomains'> {
  exactDomain: DomainCheckExt;
  variantDomains: DomainCheckExt[];
  tldChecks: DomainCheckExt[];
  variantTld: string; // which TLD variants are currently checked against
}

const EXPLORE_TLDS = ['com', 'io', 'co', 'net', 'org', 'ai', 'app', 'dev', 'xyz', 'tech'];
const SC = STATUS_COLORS;

function genStyle(used: Set<number>): { gradient: string; fontFamily: string; textColor: string } {
  let idx = Math.floor(Math.random() * GRADIENTS.length);
  let a = 0;
  while (used.has(idx) && a < 12) { idx = Math.floor(Math.random() * GRADIENTS.length); a++; }
  used.add(idx);
  if (used.size > GRADIENTS.length - 3) used.clear();
  const g = GRADIENTS[idx];
  return { gradient: g, fontFamily: CARD_FONTS[Math.floor(Math.random() * CARD_FONTS.length)], textColor: pickTextColor(g) };
}

function domainUrl(domain: string, tld: string, available: boolean | null): string {
  const full = domain.includes('.') ? domain : `${domain}.${tld}`;
  return available === false ? `https://${full}` : `https://porkbun.com/checkout/search?q=${encodeURIComponent(full)}`;
}

// --- Cached DNS check helper: checks cache first, fetches only uncached ---
async function cachedDnsCheck(domains: string[], tld: string): Promise<Record<string, { available: boolean; method: CheckMethod }>> {
  const { cached, uncached } = partitionCached(domains, tld);
  const results: Record<string, { available: boolean; method: CheckMethod }> = {};

  // Apply cached
  for (const [d, entry] of Object.entries(cached)) {
    results[d] = { available: entry.available, method: entry.method as CheckMethod };
  }

  // Fetch uncached via DNS
  if (uncached.length > 0) {
    try {
      const resp = await fetch('/api/check-domain-dns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: uncached, tld }),
      });
      if (resp.ok) {
        const { results: dnsResults } = await resp.json();
        for (const [d, av] of Object.entries(dnsResults)) {
          const full = d.includes('.') ? d : `${d}.${tld}`;
          setCache(full, av as boolean, 'dns');
          results[d] = { available: av as boolean, method: 'dns' };
        }
      }
    } catch {}
  }

  return results;
}

// --- Cached WhoisXML check helper ---
async function cachedWhoisCheck(domains: string[], tld: string): Promise<Record<string, { available: boolean; method: CheckMethod }>> {
  const { cached, uncached } = partitionCached(domains, tld);
  const results: Record<string, { available: boolean; method: CheckMethod }> = {};

  // Return whoisxml-cached without re-fetching; dns-cached need upgrade
  for (const [d, entry] of Object.entries(cached)) {
    if (entry.method === 'whoisxml') {
      results[d] = { available: entry.available, method: 'whoisxml' };
    } else {
      uncached.push(d); // dns-cached should be re-verified
    }
  }

  if (uncached.length > 0) {
    try {
      const resp = await fetch('/api/check-domain', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domains: uncached, tld }),
      });
      if (resp.ok) {
        const { results: xmlResults } = await resp.json();
        for (const [d, av] of Object.entries(xmlResults)) {
          const full = d.includes('.') ? d : `${d}.${tld}`;
          setCache(full, av as boolean, 'whoisxml');
          results[d] = { available: av as boolean, method: 'whoisxml' };
        }
      }
    } catch {}
  }

  return results;
}

// --- Domain row ---
function DomainRow({ domain, tld, available, method }: {
  domain: string; tld: string; available: boolean | null; method: CheckMethod;
}) {
  const full = domain.includes('.') ? domain : `${domain}.${tld}`;
  const isDns = method === 'dns';

  if (available === null) return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/[0.03]">
      <span className="text-xs text-white/40 font-mono flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-white/20 pulse" />{full}
      </span>
      <span className="text-[10px] text-white/20">checking…</span>
    </div>
  );

  const sc = available ? SC.available : SC.taken;
  return (
    <a href={domainUrl(domain, tld, available)} target="_blank" rel="noopener noreferrer"
      className="domain-pill flex items-center justify-between py-1.5 px-3 rounded-lg transition-all"
      style={{ background: available ? sc.bg : 'rgba(255,255,255,0.02)' }}>
      <span className="text-xs font-mono flex items-center gap-2 min-w-0">
        {available ? (
          <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={sc.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        ) : (
          <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={sc.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".6"><path d="M18 6L6 18M6 6l12 12"/></svg>
        )}
        <span className="truncate" style={{ color: available ? sc.text : 'rgba(255,255,255,.3)' }}>{full}</span>
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider shrink-0 ml-2" style={{ color: available ? sc.text + 'cc' : 'rgba(255,255,255,.2)' }}>
        {available ? (isDns ? 'Likely free' : 'Available') : 'Taken'}
      </span>
    </a>
  );
}

// ===== DETAIL MODAL =====
function DetailModal({ card, defaultTld, onClose, onUpdate }: {
  card: CardData; defaultTld: string; onClose: () => void;
  onUpdate: (updater: (c: CardData) => CardData) => void;
}) {
  const configRef = useRef<any>(null);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { configRef.current = JSON.parse(localStorage.getItem('nc_config') || '{}'); } catch {}
    }
  }, []);

  const [loadingVariants, setLoadingVariants] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [tldLoading, setTldLoading] = useState(false);
  const [variantTld, setVariantTld] = useState(card.variantTld || defaultTld);
  const [recheckingTld, setRecheckingTld] = useState(false);

  // Load TLD checks on open
  useEffect(() => {
    if (card.tldChecks.length > 0) return;
    loadTldChecks();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTldChecks = async () => {
    setTldLoading(true);
    const nameLower = card.name.toLowerCase().replace(/\s+/g, '');
    const tlds = EXPLORE_TLDS.includes(defaultTld) ? EXPLORE_TLDS : [defaultTld, ...EXPLORE_TLDS.filter(t => t !== defaultTld)];
    const domainStrings = tlds.map(t => `${nameLower}.${t}`);
    const checks: DomainCheckExt[] = domainStrings.map(d => ({ domain: d, available: null, method: 'pending' as CheckMethod }));
    onUpdate(c => ({ ...c, tldChecks: checks }));

    const results = await cachedDnsCheck(domainStrings, 'noop'); // domains already include TLD
    onUpdate(c => ({
      ...c,
      tldChecks: c.tldChecks.map(tc =>
        results[tc.domain] ? { ...tc, available: results[tc.domain].available, method: results[tc.domain].method } : tc
      ),
    }));
    setTldLoading(false);
  };

  // When user changes variant TLD
  const handleVariantTldChange = async (newTld: string) => {
    setVariantTld(newTld);
    setRecheckingTld(true);
    onUpdate(c => ({
      ...c, variantTld: newTld, verified: false,
      // Reset variant availability to pending — domains stay the same, TLD changes
      variantDomains: c.variantDomains.map(v => ({ ...v, available: null, method: 'pending' as CheckMethod })),
      exactDomain: { ...c.exactDomain, available: null, method: 'pending' as CheckMethod },
    }));

    // Recheck all variants + exact with new TLD
    const allDomains = [card.exactDomain.domain, ...card.variantDomains.map(v => v.domain)];
    const results = await cachedDnsCheck(allDomains, newTld);

    onUpdate(c => ({
      ...c,
      exactDomain: results[c.exactDomain.domain]
        ? { ...c.exactDomain, available: results[c.exactDomain.domain].available, method: results[c.exactDomain.domain].method }
        : c.exactDomain,
      variantDomains: c.variantDomains.map(v =>
        results[v.domain] ? { ...v, available: results[v.domain].available, method: results[v.domain].method } : v
      ),
    }));

    // If exact is DNS-available, verify with WhoisXML
    if (results[card.exactDomain.domain]?.available) {
      const xmlResults = await cachedWhoisCheck([card.exactDomain.domain], newTld);
      onUpdate(c => ({
        ...c,
        exactDomain: xmlResults[c.exactDomain.domain]
          ? { ...c.exactDomain, available: xmlResults[c.exactDomain.domain].available, method: 'whoisxml' as CheckMethod }
          : c.exactDomain,
      }));
    }

    setRecheckingTld(false);
  };

  const handleMoreVariants = async () => {
    setLoadingVariants(true);
    try {
      const resp = await fetch('/api/generate-variants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: card.name,
          businessDescription: configRef.current?.businessDescription || '',
          industry: configRef.current?.industry || '',
          existingVariants: [card.exactDomain.domain, ...card.variantDomains.map(v => v.domain)],
          tld: variantTld,
        }),
      });
      if (!resp.ok) return;
      const { variants } = await resp.json();
      const newDomains: DomainCheckExt[] = variants.map((v: string) => ({
        domain: v, available: null, method: 'pending' as CheckMethod,
      }));
      onUpdate(c => ({ ...c, verified: false, variantDomains: [...c.variantDomains, ...newDomains] }));

      // DNS check new ones (with cache)
      if (variants.length > 0) {
        const results = await cachedDnsCheck(variants, variantTld);
        onUpdate(c => ({
          ...c,
          variantDomains: c.variantDomains.map(v =>
            results[v.domain] ? { ...v, available: results[v.domain].available, method: results[v.domain].method } : v
          ),
        }));
      }
    } catch {} finally { setLoadingVariants(false); }
  };

  const handleVerifyAll = async () => {
    setVerifying(true);
    const variantDomainsToVerify = card.variantDomains.filter(v => v.available === true && v.method === 'dns').map(v => v.domain);
    const tldDomainsToVerify = card.tldChecks.filter(t => t.available === true && t.method === 'dns').map(t => t.domain);

    if (variantDomainsToVerify.length > 0) {
      const results = await cachedWhoisCheck(variantDomainsToVerify, variantTld);
      onUpdate(c => ({
        ...c,
        variantDomains: c.variantDomains.map(v =>
          results[v.domain] ? { ...v, available: results[v.domain].available, method: 'whoisxml' as CheckMethod } : v
        ),
      }));
    }

    if (tldDomainsToVerify.length > 0) {
      const results = await cachedWhoisCheck(tldDomainsToVerify, 'noop');
      onUpdate(c => ({
        ...c,
        tldChecks: c.tldChecks.map(t =>
          results[t.domain] ? { ...t, available: results[t.domain].available, method: 'whoisxml' as CheckMethod } : t
        ),
      }));
    }

    onUpdate(c => ({ ...c, verified: true }));
    setVerifying(false);
  };

  const avVariants = card.variantDomains.filter(v => v.available === true).length;
  const avTlds = card.tldChecks.filter(t => t.available === true).length;
  const hasUnverified = [...card.variantDomains, ...card.tldChecks].some(d => d.available === true && d.method === 'dns');

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-3xl sm:mx-4 max-h-[85vh] bg-[var(--bg-secondary)] border border-[var(--border)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 pb-3 flex items-start justify-between shrink-0" style={{ background: card.gradient }}>
          <div>
            <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider mb-2"
              style={{ background: (CATEGORY_COLORS[card.category] || '#8c8c8c') + '30', color: CATEGORY_COLORS[card.category] || '#8c8c8c' }}>
              {card.category}
            </span>
            <h2 className="text-3xl sm:text-4xl" style={{ fontFamily: card.fontFamily, color: card.textColor, textShadow: '0 2px 12px rgba(0,0,0,.3)' }}>
              {card.name}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg bg-black/20 text-white/70 hover:text-white hover:bg-black/40 transition-all">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Summary bar */}
        <div className="px-5 py-2 bg-[var(--bg-elevated)] flex items-center justify-between shrink-0 border-b border-[var(--border)] flex-wrap gap-2">
          <div className="flex items-center gap-4 text-xs">
            <span style={{ color: SC.available.text }}>{avTlds + avVariants} domains look available</span>
            {hasUnverified && !card.verified && <span className="text-white/30 hidden sm:inline">DNS estimates — verify for accuracy</span>}
            {card.verified && (
              <span className="flex items-center gap-1" style={{ color: SC.available.text }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                Verified
              </span>
            )}
          </div>
          {hasUnverified && !card.verified && (
            <button onClick={handleVerifyAll} disabled={verifying}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-40"
              style={{ background: SC.variantAvailable.bg, color: SC.variantAvailable.text, border: `1px solid ${SC.variantAvailable.border}` }}>
              {verifying ? <div className="w-3 h-3 border-[1.5px] rounded-full spinner" style={{ borderColor: SC.variantAvailable.text + '40', borderTopColor: SC.variantAvailable.text }} /> : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>
              )}
              Verify all
            </button>
          )}
        </div>

        {/* Two columns */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Column 1: TLD exploration */}
            <div>
              <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">
                {card.name.toLowerCase()}.___
              </h3>
              <div className="flex flex-col gap-1">
                {card.tldChecks.map(tc => (
                  <DomainRow key={tc.domain} domain={tc.domain} tld="" available={tc.available} method={tc.method} />
                ))}
                {card.tldChecks.length === 0 && tldLoading && (
                  <div className="flex items-center gap-2 py-3 text-xs text-white/30">
                    <div className="w-3 h-3 border-[1.5px] border-white/20 border-t-white/50 rounded-full spinner" />
                    Loading TLD checks…
                  </div>
                )}
              </div>
            </div>

            {/* Column 2: Variants */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">
                  Variants
                </h3>
                {/* TLD switcher */}
                <div className="flex items-center gap-1.5">
                  {recheckingTld && <div className="w-3 h-3 border-[1.5px] border-white/20 border-t-white/50 rounded-full spinner" />}
                  <span className="text-[10px] text-white/30">TLD:</span>
                  <select
                    value={variantTld}
                    onChange={(e) => handleVariantTldChange(e.target.value)}
                    className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-2 py-0.5 text-xs text-[var(--text-primary)] appearance-none cursor-pointer hover:border-[var(--accent-dim)] transition-colors"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238a8692' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: '20px' }}
                  >
                    {[...new Set([defaultTld, ...COMMON_TLDS])].map(t => (
                      <option key={t} value={t}>.{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <DomainRow domain={card.exactDomain.domain} tld={variantTld} available={card.exactDomain.available} method={card.exactDomain.method} />
                {card.variantDomains.map(v => (
                  <DomainRow key={v.domain} domain={v.domain} tld={variantTld} available={v.available} method={v.method} />
                ))}
              </div>
              <button onClick={handleMoreVariants} disabled={loadingVariants}
                className="w-full mt-2 py-2 rounded-lg text-xs font-medium transition-all bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/70 disabled:opacity-40 flex items-center justify-center gap-1.5">
                {loadingVariants ? <div className="w-3 h-3 border-[1.5px] border-white/20 border-t-white/50 rounded-full spinner" /> : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                )}
                Generate more variants
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== GRID CARD =====
function CategoryTag({ category }: { category: string }) {
  const color = CATEGORY_COLORS[category] || '#8c8c8c';
  return (
    <span className="absolute top-3 left-3 px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider"
      style={{ background: color + '25', color, border: `1px solid ${color}40` }}>
      {category}
    </span>
  );
}

function GridCard({ card, index, onSave, onExplore, isSaved, tld }: {
  card: CardData; index: number; onSave: (c: CardData) => void;
  onExplore: () => void; isSaved: boolean; tld: string;
}) {
  const exactAv = card.exactDomain.available;
  const anyVar = card.variantDomains.some(v => v.available === true);
  const allChecked = card.exactDomain.available !== null && card.variantDomains.every(v => v.available !== null);
  const noneAv = allChecked && !exactAv && !anyVar;
  const avCount = [card.exactDomain, ...card.variantDomains].filter(d => d.available === true).length;

  let borderColor = SC.loading.border;
  let shadow = 'none';
  if (exactAv) { borderColor = SC.available.border; shadow = `0 0 24px ${SC.available.glow}`; }
  else if (anyVar) { borderColor = SC.variantAvailable.border; shadow = `0 0 24px ${SC.variantAvailable.glow}`; }
  else if (noneAv) { borderColor = SC.taken.border; }

  const full = `${card.exactDomain.domain}.${card.variantTld || tld}`;

  return (
    <div className="name-card card-enter rounded-2xl overflow-hidden relative group cursor-pointer"
      onClick={onExplore}
      style={{ animationDelay: `${index * 60}ms`, border: `2px solid ${borderColor}`, boxShadow: shadow }}>
      <div className="h-40 sm:h-48 flex items-center justify-center p-6 relative" style={{ background: card.gradient }}>
        <CategoryTag category={card.category} />
        <h2 className="text-2xl sm:text-3xl text-center leading-tight break-words max-w-full"
          style={{ fontFamily: card.fontFamily, color: card.textColor, textShadow: '0 2px 12px rgba(0,0,0,.3)' }}>
          {card.name}
        </h2>
        <button onClick={(e) => { e.stopPropagation(); onSave(card); }}
          className={`absolute top-3 right-3 p-2 rounded-lg transition-all ${isSaved ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-black/20 text-white/60 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-black/40'}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        </button>
      </div>
      <div className="bg-[var(--bg-secondary)] px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          {card.exactDomain.available === null ? <span className="w-2 h-2 rounded-full bg-white/20 pulse" /> :
            exactAv ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={SC.available.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg> :
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={SC.taken.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".6"><path d="M18 6L6 18M6 6l12 12"/></svg>
          }
          <span className="text-xs font-mono" style={{ color: exactAv ? SC.available.text : 'rgba(255,255,255,.35)' }}>{full}</span>
          <span className="text-[10px] uppercase tracking-wider ml-auto" style={{ color: exactAv ? SC.available.text + 'aa' : 'rgba(255,255,255,.2)' }}>
            {card.exactDomain.available === null ? '' : exactAv ? 'Available' : 'Taken'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/40">
            {!allChecked ? 'Checking variants…' :
              avCount > 0 ? <span style={{ color: SC.variantAvailable.text }}>{avCount} variant{avCount > 1 ? 's' : ''} available</span> :
              'No variants available'}
          </span>
          <span className="text-[10px] text-[var(--accent)] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Explore →</span>
        </div>
      </div>
    </div>
  );
}

// ===== MAIN =====
export default function ResultsPage() {
  const [cards, setCards] = useState<CardData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [tld, setTld] = useState('com');
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const existingNamesRef = useRef<string[]>([]);
  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const configRef = useRef<any>(null);
  const initialLoadDone = useRef(false);
  const batchNumberRef = useRef(1);
  const usedGrad = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nc_saved');
      if (saved) try { setSavedNames(new Set(JSON.parse(saved).map((s: SavedName) => s.name))); } catch {}
      const cs = localStorage.getItem('nc_config');
      if (cs) try { configRef.current = JSON.parse(cs); setTld(configRef.current.tld || 'com'); } catch {}
      if (!configRef.current) configRef.current = { businessDescription: localStorage.getItem('nc_description') || '', tld: 'com' };
    }
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveCardId(null); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  const checkDomainsForCard = useCallback(async (cardId: string, exactDomain: string, variantDomains: string[]) => {
    const currentTld = configRef.current?.tld || 'com';
    const allDomains = [exactDomain, ...variantDomains];

    // DNS check all (cached)
    const dnsResults = await cachedDnsCheck(allDomains, currentTld);

    setCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      return {
        ...c,
        exactDomain: dnsResults[c.exactDomain.domain]
          ? { ...c.exactDomain, available: dnsResults[c.exactDomain.domain].available, method: dnsResults[c.exactDomain.domain].method }
          : c.exactDomain,
        variantDomains: c.variantDomains.map(v =>
          dnsResults[v.domain] ? { ...v, available: dnsResults[v.domain].available, method: dnsResults[v.domain].method } : v
        ),
      };
    }));

    // WhoisXML for exact match if DNS says available
    if (dnsResults[exactDomain]?.available) {
      const xmlResults = await cachedWhoisCheck([exactDomain], currentTld);
      setCards(prev => prev.map(c => {
        if (c.id !== cardId) return c;
        return {
          ...c,
          exactDomain: xmlResults[c.exactDomain.domain]
            ? { ...c.exactDomain, available: xmlResults[c.exactDomain.domain].available, method: 'whoisxml' as CheckMethod }
            : c.exactDomain,
        };
      }));
    }
  }, []);

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

      const currentTld = configRef.current?.tld || 'com';
      const newCards: CardData[] = suggestions
        .filter((s: any) => !existingNamesRef.current.includes(s.name.toLowerCase()))
        .map((s: any) => {
          const style = genStyle(usedGrad.current);
          const nl = s.name.toLowerCase().replace(/\s+/g, '');
          return {
            id: `${nl}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: s.name, category: s.category || 'invented',
            exactDomain: { domain: nl, available: null, method: 'pending' as CheckMethod },
            variantDomains: (s.variants || []).map((v: string) => ({ domain: v.toLowerCase().replace(/\s+/g, ''), available: null, method: 'pending' as CheckMethod })),
            tldChecks: [], verified: false, verifying: false, loadingVariants: false,
            variantTld: currentTld, ...style,
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

  const handleSave = (card: CardData) => {
    if (typeof window === 'undefined') return;
    const saved: SavedName[] = JSON.parse(localStorage.getItem('nc_saved') || '[]');
    const vt = card.variantTld || tld;
    if (saved.some(s => s.name === card.name)) {
      localStorage.setItem('nc_saved', JSON.stringify(saved.filter(s => s.name !== card.name)));
      setSavedNames(prev => { const n = new Set(prev); n.delete(card.name); return n; });
    } else {
      const avD = [...(card.exactDomain.available ? [`${card.exactDomain.domain}.${vt}`] : []),
        ...card.variantDomains.filter(v => v.available).map(v => `${v.domain}.${vt}`),
        ...card.tldChecks.filter(t => t.available).map(t => t.domain)];
      saved.push({ name: card.name, category: card.category, savedAt: Date.now(), gradient: card.gradient, fontFamily: card.fontFamily, textColor: card.textColor, availableDomains: avD });
      localStorage.setItem('nc_saved', JSON.stringify(saved));
      setSavedNames(prev => { const arr = Array.from(prev); arr.push(card.name); return new Set(arr); });
    }
  };

  const activeCard = activeCardId ? cards.find(c => c.id === activeCardId) : null;
  const updateCard = useCallback((cardId: string) => (updater: (c: CardData) => CardData) => {
    setCards(prev => prev.map(c => c.id === cardId ? updater(c) : c));
  }, []);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cards.map((card, i) => (
            <GridCard key={card.id} card={card} index={i % 10} onSave={handleSave}
              onExplore={() => setActiveCardId(card.id)} isSaved={savedNames.has(card.name)} tld={tld} />
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
      {activeCard && (
        <DetailModal card={activeCard} defaultTld={tld} onClose={() => setActiveCardId(null)}
          onUpdate={updateCard(activeCard.id)} />
      )}
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import ChatSidebar from '@/components/ChatSidebar';
import { UpgradePrompt, ProBadge } from '@/components/ProGate';
import { useFeatures } from '@/hooks/useFeatures';
import type { ChatMsg } from '@/components/ChatSidebar';
import { DEFAULT_FREE_MODEL, AI_MODELS } from '@/lib/features';
import { NameCardData, DomainCheck, SavedName, CARD_FONTS, GRADIENTS, CATEGORY_COLORS, COMMON_TLDS } from '@/lib/types';
import { pickTextColor, STATUS_COLORS as SC } from '@/lib/colors';
import { partitionCached, setCache } from '@/lib/domain-cache';

type CM = 'whoisxml' | 'dns' | 'pending';
interface DCE extends DomainCheck { method: CM; }
interface CardData extends Omit<NameCardData, 'exactDomain' | 'variantDomains'> {
  exactDomain: DCE; variantDomains: DCE[]; tldChecks: DCE[]; variantTld: string;
}

const DEFAULT_EXPLORE_TLDS = ['com','io','co','net','org','ai','app','dev','xyz','tech'];

function genStyle(used: Set<number>): { gradient: string; fontFamily: string; textColor: string } {
  let i = Math.floor(Math.random() * GRADIENTS.length), a = 0;
  while (used.has(i) && a < 12) { i = Math.floor(Math.random() * GRADIENTS.length); a++; }
  used.add(i); if (used.size > GRADIENTS.length - 3) used.clear();
  const g = GRADIENTS[i];
  return { gradient: g, fontFamily: CARD_FONTS[Math.floor(Math.random() * CARD_FONTS.length)], textColor: pickTextColor(g) };
}

// --- Cached helpers ---
async function cachedDnsCheck(domains: string[], tld: string): Promise<Record<string, { available: boolean; method: CM }>> {
  const { cached, uncached } = partitionCached(domains, tld);
  const results: Record<string, { available: boolean; method: CM }> = {};
  for (const [d, e] of Object.entries(cached)) results[d] = { available: e.available, method: e.method as CM };
  if (uncached.length > 0) {
    try {
      const r = await fetch('/api/check-domain-dns', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domains: uncached, tld }) });
      if (r.ok) { const { results: dr } = await r.json(); for (const [d, av] of Object.entries(dr)) { const f = d.includes('.') ? d : `${d}.${tld}`; setCache(f, av as boolean, 'dns'); results[d] = { available: av as boolean, method: 'dns' }; } }
    } catch {}
  }
  return results;
}
async function cachedWhoisCheck(domains: string[], tld: string): Promise<Record<string, { available: boolean; method: CM }>> {
  const { cached, uncached: unc } = partitionCached(domains, tld);
  const results: Record<string, { available: boolean; method: CM }> = {};
  const toFetch: string[] = [...unc];
  for (const [d, e] of Object.entries(cached)) { if (e.method === 'whoisxml') results[d] = { available: e.available, method: 'whoisxml' }; else toFetch.push(d); }
  if (toFetch.length > 0) {
    try {
      const r = await fetch('/api/check-domain', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ domains: toFetch, tld }) });
      if (r.ok) { const { results: xr } = await r.json(); for (const [d, av] of Object.entries(xr)) { const f = d.includes('.') ? d : `${d}.${tld}`; setCache(f, av as boolean, 'whoisxml'); results[d] = { available: av as boolean, method: 'whoisxml' }; } }
    } catch {}
  }
  return results;
}

function domainUrl(domain: string, tld: string, available: boolean | null): string {
  const f = domain.includes('.') ? domain : `${domain}.${tld}`;
  return available === false ? `https://${f}` : `https://porkbun.com/checkout/search?q=${encodeURIComponent(f)}`;
}

// Color helper: picks the right status color based on method + availability
function statusColor(available: boolean | null, method: CM) {
  if (available === null) return SC.loading;
  if (!available) return SC.taken;
  return method === 'whoisxml' ? SC.confirmed : SC.likelyFree;
}

// --- Domain row ---
function DomainRow({ domain, tld, available, method }: { domain: string; tld: string; available: boolean | null; method: CM }) {
  const f = domain.includes('.') ? domain : `${domain}.${tld}`;
  const sc = statusColor(available, method);

  if (available === null) return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/[0.03]">
      <span className="text-xs text-white/40 font-mono flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white/20 pulse" />{f}</span>
      <span className="text-[10px] text-white/20">checking…</span>
    </div>
  );

  return (
    <a href={domainUrl(domain, tld, available)} target="_blank" rel="noopener noreferrer"
      className="domain-pill flex items-center justify-between py-1.5 px-3 rounded-lg transition-all" style={{ background: available ? sc.bg : 'rgba(255,255,255,0.02)' }}>
      <span className="text-xs font-mono flex items-center gap-2 min-w-0">
        {available ? (
          <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={sc.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
        ) : (
          <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={sc.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".6"><path d="M18 6L6 18M6 6l12 12"/></svg>
        )}
        <span className="truncate" style={{ color: available ? sc.text : 'rgba(255,255,255,.3)' }}>{f}</span>
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider shrink-0 ml-2" style={{ color: available ? sc.text + 'cc' : 'rgba(255,255,255,.2)' }}>
        {available ? (method === 'whoisxml' ? 'Available' : 'Likely free') : 'Taken'}
      </span>
    </a>
  );
}

// ===== DETAIL TRAY / MODAL =====
function DetailPanel({ card, defaultTld, onClose, onUpdate, onSave, isSaved, chatOpen, advancedAvailability, extraVariants }: {
  card: CardData; defaultTld: string; onClose: () => void;
  onUpdate: (updater: (c: CardData) => CardData) => void;
  onSave: () => void; isSaved: boolean; chatOpen: boolean;
  advancedAvailability: boolean; extraVariants: boolean;
}) {
  const configRef = useRef<any>(null);
  useEffect(() => { try { configRef.current = JSON.parse(localStorage.getItem('nc_config') || '{}'); } catch {} }, []);

  const [loadingVariants, setLoadingVariants] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [variantTld, setVariantTld] = useState(card.variantTld || defaultTld);
  const [recheckingTld, setRecheckingTld] = useState(false);
  const [tldInput, setTldInput] = useState('');
  const [addingTld, setAddingTld] = useState(false);

  // Reset local state when card changes
  useEffect(() => {
    setVariantTld(card.variantTld || defaultTld);
    setLoadingVariants(false);
    setVerifying(false);
    setTldInput('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  // Load TLD checks on open or when card changes
  useEffect(() => {
    if (card.tldChecks.length > 0) return;
    loadTldChecks(DEFAULT_EXPLORE_TLDS.includes(defaultTld) ? DEFAULT_EXPLORE_TLDS : [defaultTld, ...DEFAULT_EXPLORE_TLDS.filter(t => t !== defaultTld)]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card.id]);

  const loadTldChecks = async (tlds: string[]) => {
    const nl = card.name.toLowerCase().replace(/\s+/g, '');
    const domainStrings = tlds.map(t => `${nl}.${t}`);
    // Only add new ones, don't duplicate existing
    const existing = new Set(card.tldChecks.map(tc => tc.domain));
    const newChecks: DCE[] = domainStrings.filter(d => !existing.has(d)).map(d => ({ domain: d, available: null, method: 'pending' as CM }));
    if (newChecks.length === 0) return;

    onUpdate(c => ({ ...c, tldChecks: [...c.tldChecks, ...newChecks] }));
    const newDomains = newChecks.map(c => c.domain);
    const results = await cachedDnsCheck(newDomains, 'noop');
    onUpdate(c => ({ ...c, tldChecks: c.tldChecks.map(tc => results[tc.domain] ? { ...tc, available: results[tc.domain].available, method: results[tc.domain].method } : tc) }));
  };

  const handleAddTld = async () => {
    const clean = tldInput.toLowerCase().replace(/^\./, '').replace(/[^a-z0-9]/g, '');
    if (!clean) return;
    setAddingTld(true);
    // Validate
    try {
      const resp = await fetch(`/api/validate-tld?tld=${clean}`);
      const { valid } = await resp.json();
      if (valid) {
        await loadTldChecks([clean]);
        setTldInput('');
      }
    } catch {} finally { setAddingTld(false); }
  };

  const handleVariantTldChange = async (newTld: string) => {
    setVariantTld(newTld); setRecheckingTld(true);
    onUpdate(c => ({ ...c, variantTld: newTld, verified: false,
      variantDomains: c.variantDomains.map(v => ({ ...v, available: null, method: 'pending' as CM })),
      exactDomain: { ...c.exactDomain, available: null, method: 'pending' as CM },
    }));
    const all = [card.exactDomain.domain, ...card.variantDomains.map(v => v.domain)];
    const results = await cachedDnsCheck(all, newTld);
    onUpdate(c => ({
      ...c,
      exactDomain: results[c.exactDomain.domain] ? { ...c.exactDomain, available: results[c.exactDomain.domain].available, method: results[c.exactDomain.domain].method } : c.exactDomain,
      variantDomains: c.variantDomains.map(v => results[v.domain] ? { ...v, available: results[v.domain].available, method: results[v.domain].method } : v),
    }));
    setRecheckingTld(false);
  };

  const handleMoreVariants = async () => {
    setLoadingVariants(true);
    try {
      const r = await fetch('/api/generate-variants', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: card.name, businessDescription: configRef.current?.businessDescription || '', industry: configRef.current?.industry || '', existingVariants: [card.exactDomain.domain, ...card.variantDomains.map(v => v.domain)], tld: variantTld }) });
      if (!r.ok) return;
      const { variants } = await r.json();
      const nd: DCE[] = variants.map((v: string) => ({ domain: v, available: null, method: 'pending' as CM }));
      onUpdate(c => ({ ...c, verified: false, variantDomains: [...c.variantDomains, ...nd] }));
      if (variants.length > 0) {
        const res = await cachedDnsCheck(variants, variantTld);
        onUpdate(c => ({ ...c, variantDomains: c.variantDomains.map(v => res[v.domain] ? { ...v, available: res[v.domain].available, method: res[v.domain].method } : v) }));
      }
    } catch {} finally { setLoadingVariants(false); }
  };

  const handleVerifyAll = async () => {
    setVerifying(true);
    const vd = card.variantDomains.filter(v => v.available === true && v.method === 'dns').map(v => v.domain);
    const td = card.tldChecks.filter(t => t.available === true && t.method === 'dns').map(t => t.domain);
    if (vd.length > 0) {
      const res = await cachedWhoisCheck(vd, variantTld);
      onUpdate(c => ({ ...c, variantDomains: c.variantDomains.map(v => res[v.domain] ? { ...v, available: res[v.domain].available, method: 'whoisxml' as CM } : v) }));
    }
    if (td.length > 0) {
      const res = await cachedWhoisCheck(td, 'noop');
      onUpdate(c => ({ ...c, tldChecks: c.tldChecks.map(t => res[t.domain] ? { ...t, available: res[t.domain].available, method: 'whoisxml' as CM } : t) }));
    }
    onUpdate(c => ({ ...c, verified: true }));
    setVerifying(false);
  };

  const avAll = [...card.variantDomains, ...card.tldChecks].filter(d => d.available === true).length + (card.exactDomain.available ? 1 : 0);
  const hasUnverified = [...card.variantDomains, ...card.tldChecks, card.exactDomain].some(d => d.available === true && d.method === 'dns');
  const catColor = CATEGORY_COLORS[card.category] || '#8c8c8c';

  return (
    <>
      {/* Mobile: fullscreen overlay */}
      <div className="sm:hidden fixed inset-0 z-[85] bg-[var(--bg-primary)] overflow-y-auto pb-16">
        {/* Close bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[var(--bg-primary)]/90 backdrop-blur-xl border-b border-[var(--border)]">
          <span className="text-sm font-medium">{card.name}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <PanelContent card={card} catColor={catColor} variantTld={variantTld} recheckingTld={recheckingTld}
          loadingVariants={loadingVariants} verifying={verifying} avAll={avAll} hasUnverified={hasUnverified}
          tldInput={tldInput} setTldInput={setTldInput} addingTld={addingTld}
          onTldChange={handleVariantTldChange} onAddTld={handleAddTld} onMoreVariants={handleMoreVariants} onVerifyAll={handleVerifyAll} onSave={onSave} isSaved={isSaved} defaultTld={defaultTld} advancedAvailability={advancedAvailability} extraVariants={extraVariants} />
      </div>

      {/* Desktop: bottom tray */}
      <div className="hidden sm:block fixed inset-x-0 bottom-0 z-[75]" style={{ right: chatOpen ? '340px' : '0' }} onClick={onClose}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-h-[60vh] bg-[var(--bg-secondary)] border-t border-[var(--border)] rounded-t-2xl overflow-hidden flex flex-col"
          onClick={e => e.stopPropagation()}>
          {/* Drag handle + close */}
          <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-1 rounded-full bg-white/10" />
              <h2 className="text-lg font-semibold" style={{ fontFamily: card.fontFamily }}>{card.name}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <PanelContent card={card} catColor={catColor} variantTld={variantTld} recheckingTld={recheckingTld}
              loadingVariants={loadingVariants} verifying={verifying} avAll={avAll} hasUnverified={hasUnverified}
              tldInput={tldInput} setTldInput={setTldInput} addingTld={addingTld}
              onTldChange={handleVariantTldChange} onAddTld={handleAddTld} onMoreVariants={handleMoreVariants} onVerifyAll={handleVerifyAll} onSave={onSave} isSaved={isSaved} defaultTld={defaultTld} advancedAvailability={advancedAvailability} extraVariants={extraVariants} />
          </div>
        </div>
      </div>
    </>
  );
}

// Shared panel content used by both mobile fullscreen and desktop tray
function PanelContent({ card, catColor, variantTld, recheckingTld, loadingVariants, verifying, avAll, hasUnverified, tldInput, setTldInput, addingTld, onTldChange, onAddTld, onMoreVariants, onVerifyAll, onSave, isSaved, defaultTld, advancedAvailability, extraVariants }: {
  card: CardData; catColor: string; variantTld: string; recheckingTld: boolean; loadingVariants: boolean; verifying: boolean; avAll: number; hasUnverified: boolean;
  tldInput: string; setTldInput: (v: string) => void; addingTld: boolean;
  onTldChange: (t: string) => void; onAddTld: () => void; onMoreVariants: () => void; onVerifyAll: () => void; onSave: () => void; isSaved: boolean; defaultTld: string;
  advancedAvailability: boolean; extraVariants: boolean;
}) {
  return (
    <div className="p-5 sm:p-6">
      {/* Category tag + save button */}
      <div className="flex items-center justify-between mb-3">
        <span className="px-2.5 py-1 rounded-lg text-xs font-medium uppercase tracking-wider"
          style={{ background: catColor + '20', color: catColor, border: `1px solid ${catColor}30` }}>
          {card.category}
        </span>
        <button onClick={onSave}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            isSaved
              ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30'
              : 'bg-white/[0.05] text-white/50 hover:text-white/80 border border-[var(--border)] hover:border-[var(--accent-dim)]'
          }`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
          {isSaved ? 'Saved' : 'Save name'}
        </button>
      </div>

      {/* Rationale */}
      {card.rationale && (
        <p className="text-sm text-[var(--text-secondary)] mb-4 italic" style={{ borderLeft: `2px solid ${catColor}40`, paddingLeft: '12px' }}>
          {card.rationale}
        </p>
      )}

      {/* Summary + verify bar */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-3 text-xs">
          <span style={{ color: avAll > 0 ? (hasUnverified ? SC.likelyFree.text : SC.confirmed.text) : SC.taken.text }}>
            {avAll} domain{avAll !== 1 ? 's' : ''} {hasUnverified ? 'look available' : 'available'}
          </span>
          {hasUnverified && !card.verified && <span className="text-white/30">DNS estimates</span>}
          {card.verified && <span className="flex items-center gap-1" style={{ color: SC.confirmed.text }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg> Verified
          </span>}
        </div>
        {hasUnverified && !card.verified && (
          advancedAvailability ? (
            <button onClick={onVerifyAll} disabled={verifying} className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-40"
              style={{ background: SC.confirmed.bg, color: SC.confirmed.text, border: `1px solid ${SC.confirmed.border}` }}>
              {verifying ? <div className="w-3 h-3 border-[1.5px] rounded-full spinner" style={{ borderColor: SC.confirmed.text + '40', borderTopColor: SC.confirmed.text }} /> :
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/></svg>}
              Verify all
            </button>
          ) : (
            <UpgradePrompt feature="Verify domains" compact />
          )
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* TLD exploration */}
        <div>
          <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">{card.name.toLowerCase()}.___</h3>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto overflow-x-hidden">
            {card.tldChecks.map(tc => <DomainRow key={tc.domain} domain={tc.domain} tld="" available={tc.available} method={tc.method} />)}
          </div>
          {/* Add more TLDs */}
          <div className="flex gap-1.5 mt-2">
            <div className="flex items-center flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg overflow-hidden">
              <span className="text-xs text-white/30 pl-2.5">.&thinsp;</span>
              <input type="text" value={tldInput} onChange={e => setTldInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onAddTld()}
                placeholder="tld" className="flex-1 bg-transparent border-none px-1 py-1.5 text-xs text-[var(--text-primary)] placeholder:text-white/20 focus:outline-none focus:ring-0 focus:shadow-none" style={{ boxShadow: 'none' }} />
            </div>
            <button onClick={onAddTld} disabled={addingTld || !tldInput.trim()}
              className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] hover:bg-white/[0.1] text-white/50 hover:text-white/70 disabled:opacity-30 transition-all">
              {addingTld ? <div className="w-3 h-3 border-[1.5px] border-white/20 border-t-white/50 rounded-full spinner" /> : 'Check'}
            </button>
          </div>
        </div>

        {/* Variants */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Variants</h3>
            <div className="flex items-center gap-1.5">
              {recheckingTld && <div className="w-3 h-3 border-[1.5px] border-white/20 border-t-white/50 rounded-full spinner" />}
              <select value={variantTld} onChange={e => onTldChange(e.target.value)}
                className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-2 py-0.5 text-xs text-[var(--text-primary)] cursor-pointer hover:border-[var(--accent-dim)] transition-colors"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%238a8692' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 6px center', paddingRight: '20px', appearance: 'none', WebkitAppearance: 'none' }}>
                {[...new Set([defaultTld, ...COMMON_TLDS])].map(t => <option key={t} value={t}>.{t}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto overflow-x-hidden">
            <DomainRow domain={card.exactDomain.domain} tld={variantTld} available={card.exactDomain.available} method={card.exactDomain.method} />
            {card.variantDomains.map(v => <DomainRow key={v.domain} domain={v.domain} tld={variantTld} available={v.available} method={v.method} />)}
          </div>
          {extraVariants ? (
            <button onClick={onMoreVariants} disabled={loadingVariants}
              className="w-full mt-2 py-2 rounded-lg text-xs font-medium transition-all bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/70 disabled:opacity-40 flex items-center justify-center gap-1.5">
              {loadingVariants ? <div className="w-3 h-3 border-[1.5px] border-white/20 border-t-white/50 rounded-full spinner" /> :
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>}
              Generate more variants
            </button>
          ) : (
            <div className="mt-2">
              <UpgradePrompt feature="Generate more variants" compact />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== GRID CARD =====
function GridCard({ card, index, onSave, onExplore, isSaved, tld }: {
  card: CardData; index: number; onSave: (c: CardData) => void; onExplore: () => void; isSaved: boolean; tld: string;
}) {
  const exactAv = card.exactDomain.available;
  const anyVar = card.variantDomains.some(v => v.available === true);
  const allChecked = card.exactDomain.available !== null && card.variantDomains.every(v => v.available !== null);
  const noneAv = allChecked && !exactAv && !anyVar;
  const avCount = [card.exactDomain, ...card.variantDomains].filter(d => d.available === true).length;

  const exactSc = statusColor(exactAv, card.exactDomain.method);
  let borderColor = SC.loading.border, shadow = 'none';
  if (exactAv) { const s = statusColor(true, card.exactDomain.method); borderColor = s.border; shadow = `0 0 20px ${s.glow}`; }
  else if (anyVar) { borderColor = SC.likelyFree.border; shadow = `0 0 20px ${SC.likelyFree.glow}`; }
  else if (noneAv) { borderColor = SC.taken.border; }

  const catColor = CATEGORY_COLORS[card.category] || '#8c8c8c';
  const vt = card.variantTld || tld;
  const full = `${card.exactDomain.domain}.${vt}`;

  return (
    <div className="name-card card-enter rounded-2xl overflow-hidden relative group cursor-pointer" onClick={onExplore}
      style={{ animationDelay: `${index * 60}ms`, border: `2px solid ${borderColor}`, boxShadow: shadow }}>
      <div className="h-40 sm:h-48 flex items-center justify-center p-6 relative" style={{ background: card.gradient }}>
        <h2 className="text-2xl sm:text-3xl text-center leading-tight break-words max-w-full" style={{ fontFamily: card.fontFamily, color: card.textColor, textShadow: '0 2px 12px rgba(0,0,0,.3)' }}>{card.name}</h2>
        <button onClick={e => { e.stopPropagation(); onSave(card); }}
          className={`absolute top-3 right-3 p-2 rounded-lg transition-all ${isSaved ? 'bg-[var(--accent)]/20 text-[var(--accent)]' : 'bg-black/20 text-white/60 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-black/40'}`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
        </button>
      </div>
      <div className="bg-[var(--bg-secondary)] px-4 py-3">
        <div className="flex items-center gap-2 mb-2">
          {exactAv === null ? <span className="w-2 h-2 rounded-full bg-white/20 pulse" /> :
            exactAv ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={exactSc.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg> :
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={SC.taken.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".6"><path d="M18 6L6 18M6 6l12 12"/></svg>}
          <span className="text-xs font-mono" style={{ color: exactAv ? exactSc.text : 'rgba(255,255,255,.35)' }}>{full}</span>
          <span className="text-[10px] uppercase tracking-wider ml-auto" style={{ color: exactAv ? exactSc.text + 'aa' : 'rgba(255,255,255,.2)' }}>
            {exactAv === null ? '' : exactAv ? (card.exactDomain.method === 'whoisxml' ? 'Available' : 'Likely') : 'Taken'}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-white/40">
            {!allChecked ? 'Checking variants…' : avCount > 0 ? <span style={{ color: SC.likelyFree.text }}>{avCount} variant{avCount > 1 ? 's' : ''} available</span> : 'No variants available'}
          </span>
          <span className="text-[10px] text-[var(--accent)] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Explore →</span>
        </div>
      </div>
    </div>
  );
}


// ===== MAIN =====
export default function ResultsPage() {
  const router = useRouter();
  const features = useFeatures();
  const [selectedModel, setSelectedModel] = useState(features.defaultModel);
  const selectedModelRef = useRef(features.defaultModel);
  useEffect(() => { selectedModelRef.current = selectedModel; }, [selectedModel]);

  const [cards, setCards] = useState<CardData[]>([]);
  const [dividers, setDividers] = useState<Record<number, string>>({});
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
  const cardsLenRef = useRef(0);
  const savedNamesRef = useRef<Set<string>>(new Set());
  const lastCheckInRef = useRef(0);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatOpen, setChatOpen] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatOpenRef = useRef(true);
  const chatMessagesRef = useRef<ChatMsg[]>([]);

  useEffect(() => { chatOpenRef.current = chatOpen; if (chatOpen) setUnreadCount(0); }, [chatOpen]);
  useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);
  useEffect(() => { cardsLenRef.current = cards.length; }, [cards.length]);
  useEffect(() => { savedNamesRef.current = savedNames; }, [savedNames]);

  // Persist state to sessionStorage so navigating to settings and back preserves everything
  useEffect(() => {
    if (cards.length > 0) {
      try { sessionStorage.setItem('nc_cards', JSON.stringify(cards)); } catch {}
    }
  }, [cards]);
  useEffect(() => {
    if (Object.keys(dividers).length > 0) {
      try { sessionStorage.setItem('nc_dividers', JSON.stringify(dividers)); } catch {}
    }
  }, [dividers]);
  useEffect(() => {
    if (chatMessages.length > 0) {
      try { sessionStorage.setItem('nc_chat', JSON.stringify(chatMessages)); } catch {}
    }
  }, [chatMessages]);
  useEffect(() => {
    if (existingNamesRef.current.length > 0) {
      try { sessionStorage.setItem('nc_existing', JSON.stringify(existingNamesRef.current)); } catch {}
      try { sessionStorage.setItem('nc_batch', String(batchNumberRef.current)); } catch {}
    }
  }, [cards.length]); // piggyback on cards changing

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('nc_saved'); if (s) setSavedNames(new Set(JSON.parse(s).map((x: SavedName) => x.name))); } catch {}
      try { const c = localStorage.getItem('nc_config'); if (c) { configRef.current = JSON.parse(c); setTld(configRef.current.tld || 'com'); if (configRef.current.selectedModel) { setSelectedModel(configRef.current.selectedModel); selectedModelRef.current = configRef.current.selectedModel; } } } catch {}
      if (!configRef.current) configRef.current = { businessDescription: localStorage.getItem('nc_description') || '', tld: 'com' };
      if (window.innerWidth < 640) setChatOpen(false);

      // Restore state from sessionStorage if available
      try {
        const savedCards = sessionStorage.getItem('nc_cards');
        const savedDividers = sessionStorage.getItem('nc_dividers');
        const savedChat = sessionStorage.getItem('nc_chat');
        const savedExisting = sessionStorage.getItem('nc_existing');
        const savedBatch = sessionStorage.getItem('nc_batch');

        if (savedCards) {
          const parsed = JSON.parse(savedCards);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCards(parsed);
            initialLoadDone.current = true; // skip initial generation
          }
        }
        if (savedDividers) setDividers(JSON.parse(savedDividers));
        if (savedChat) setChatMessages(JSON.parse(savedChat));
        if (savedExisting) existingNamesRef.current = JSON.parse(savedExisting);
        if (savedBatch) batchNumberRef.current = parseInt(savedBatch) || 1;
      } catch {}
    }
  }, []);

  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveCardId(null); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);

  const checkDomainsForCard = useCallback(async (cardId: string, exactDomain: string, variantDomains: string[]) => {
    const ct = configRef.current?.tld || 'com';
    const all = [exactDomain, ...variantDomains];
    const dns = await cachedDnsCheck(all, ct);
    setCards(prev => prev.map(c => c.id !== cardId ? c : {
      ...c,
      exactDomain: dns[c.exactDomain.domain] ? { ...c.exactDomain, available: dns[c.exactDomain.domain].available, method: dns[c.exactDomain.domain].method } : c.exactDomain,
      variantDomains: c.variantDomains.map(v => dns[v.domain] ? { ...v, available: dns[v.domain].available, method: dns[v.domain].method } : v),
    }));
  }, []);

  const generateBatch = useCallback(async (dividerText?: string) => {
    if (loadingRef.current) return;
    if (!configRef.current) {
      try { const c = localStorage.getItem('nc_config'); if (c) configRef.current = JSON.parse(c); } catch {}
      if (!configRef.current) configRef.current = { businessDescription: localStorage.getItem('nc_description') || '', tld: 'com' };
    }
    loadingRef.current = true; setIsGenerating(true); setError(null);
    const dividerIndex = cardsLenRef.current;

    try {
      const r = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: configRef.current, existingNames: existingNamesRef.current, savedNames: Array.from(savedNamesRef.current), batchSize: 10,
          nonce: Math.random().toString(36).slice(2, 10),
          model: selectedModelRef.current,
          chatHistory: chatMessagesRef.current.slice(-20).map(m => ({ role: m.role, content: m.content })),
        }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const { suggestions } = await r.json();
      const ct = configRef.current?.tld || 'com';
      const nc: CardData[] = suggestions.filter((s: any) => !existingNamesRef.current.includes(s.name.toLowerCase())).map((s: any) => {
        const st = genStyle(usedGrad.current); const nl = s.name.toLowerCase().replace(/\s+/g, '');
        return { id: `${nl}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, name: s.name, category: s.category || 'invented', rationale: s.rationale || '',
          exactDomain: { domain: nl, available: null, method: 'pending' as CM },
          variantDomains: (s.variants || []).map((v: string) => ({ domain: v.toLowerCase().replace(/\s+/g, ''), available: null, method: 'pending' as CM })),
          tldChecks: [], verified: false, verifying: false, loadingVariants: false, variantTld: ct, ...st };
      });
      for (const c of nc) existingNamesRef.current.push(c.name.toLowerCase());
      if (dividerText) setDividers(prev => ({ ...prev, [dividerIndex]: dividerText }));
      setCards(prev => [...prev, ...nc]); batchNumberRef.current++;
      for (const c of nc) checkDomainsForCard(c.id, c.exactDomain.domain, c.variantDomains.map(v => v.domain));
      if (dividerText) {
        setTimeout(() => {
          const el = document.getElementById(`divider-${dividerIndex}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }

      // Proactive check-in: if user has seen many names without interacting, ask a question
      const totalShown = existingNamesRef.current.length;
      const lastCheckIn = lastCheckInRef.current;
      const userMsgCount = chatMessagesRef.current.filter(m => m.role === 'user').length;
      const savedCount = savedNamesRef.current.size;
      // Trigger every 30 names, but only if user hasn't chatted recently and has saved fewer than expected
      if (totalShown - lastCheckIn >= 30 && !dividerText && features.aiChat) {
        lastCheckInRef.current = totalShown;
        // Fire async — don't block
        (async () => {
          try {
            const checkInEvent: ChatMsg = {
              id: `event-checkin-${Date.now()}`, role: 'system-event',
              content: `User has browsed ${totalShown} names, saved ${savedCount}, sent ${userMsgCount} messages`,
              timestamp: Date.now(),
            };
            const allMsgs = [...chatMessagesRef.current, checkInEvent].map(m => ({ role: m.role, content: m.content }));
            const r = await fetch('/api/chat', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: allMsgs, config: configRef.current, savedNames: Array.from(savedNamesRef.current), namesShown: totalShown }),
            });
            if (r.ok) {
              const { message } = await r.json();
              if (message) {
                setChatMessages(prev => [...prev, checkInEvent]);
                const aiMsg: ChatMsg = { id: `ai-checkin-${Date.now()}`, role: 'assistant', content: message, timestamp: Date.now() };
                setChatMessages(prev => [...prev, aiMsg]);
                if (!chatOpenRef.current) setUnreadCount(prev => prev + 1);
              }
            }
          } catch {}
        })();
      }
    } catch (err: any) { setError(err.message || 'Failed'); } finally { setIsGenerating(false); loadingRef.current = false; }
  }, [checkDomainsForCard]);

  useEffect(() => { if (!initialLoadDone.current) { initialLoadDone.current = true; setTimeout(() => generateBatch(), 100); } }, [generateBatch]);
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => { if (entries.some(e => e.isIntersecting) && !loadingRef.current) generateBatch(); },
      { rootMargin: '600px', threshold: 0 }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [generateBatch]);

  // --- Chat ---
  const callChatApi = useCallback(async (messages: ChatMsg[], extraSavedNames?: string[]) => {
    const allMsgs = messages.map(m => ({ role: m.role, content: m.content }));
    const savedArr = [...Array.from(savedNames), ...(extraSavedNames || [])];
    const r = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: allMsgs, config: configRef.current, savedNames: savedArr, namesShown: existingNamesRef.current.length }),
    });
    if (!r.ok) throw new Error('Chat failed');
    return r.json();
  }, [savedNames]);

  const handleChatSend = useCallback(async (text: string) => {
    const userMsg: ChatMsg = { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const { message, generateNames, suggestedChanges = [] } = await callChatApi([...chatMessagesRef.current, userMsg]);
      if (message || suggestedChanges.length > 0) {
        const aiMsg: ChatMsg = {
          id: `ai-${Date.now()}`, role: 'assistant', content: message || '', timestamp: Date.now(),
          suggestedChanges: suggestedChanges.map((sc: any) => ({ ...sc, status: 'pending' as const })),
        };
        setChatMessages(prev => [...prev, aiMsg]);
        if (!chatOpenRef.current) setUnreadCount(prev => prev + 1);
      }
      // If there are suggested changes, do NOT auto-generate — wait for accept/reject
      if (generateNames && suggestedChanges.length === 0) {
        const genEvent: ChatMsg = { id: `event-gen-${Date.now()}`, role: 'system-event', content: 'Generating new names...', timestamp: Date.now() };
        setChatMessages(prev => [...prev, genEvent]);
        generateBatch(message || 'New direction based on your feedback');
      }
    } catch (err) { console.error('Chat error:', err); } finally { setChatLoading(false); }
  }, [callChatApi, generateBatch]);

  const handleSave = useCallback((card: CardData) => {
    if (typeof window === 'undefined') return;
    const saved: SavedName[] = JSON.parse(localStorage.getItem('nc_saved') || '[]');
    const vt = card.variantTld || tld;
    const isUnsaving = saved.some(s => s.name === card.name);

    if (isUnsaving) {
      localStorage.setItem('nc_saved', JSON.stringify(saved.filter(s => s.name !== card.name)));
      setSavedNames(prev => { const n = new Set(prev); n.delete(card.name); return n; });
    } else {
      const avD = [...(card.exactDomain.available ? [`${card.exactDomain.domain}.${vt}`] : []),
        ...card.variantDomains.filter(v => v.available).map(v => `${v.domain}.${vt}`),
        ...card.tldChecks.filter(t => t.available).map(t => t.domain)];
      saved.push({ name: card.name, category: card.category, savedAt: Date.now(), gradient: card.gradient, fontFamily: card.fontFamily, textColor: card.textColor, availableDomains: avD });
      localStorage.setItem('nc_saved', JSON.stringify(saved));
      setSavedNames(prev => { const a = Array.from(prev); a.push(card.name); return new Set(a); });

      // Chat: system event (always show) + AI reaction (pro only)
      const eventMsg: ChatMsg = { id: `event-${Date.now()}`, role: 'system-event', content: `Saved "${card.name}"`, timestamp: Date.now() };
      setChatMessages(prev => [...prev, eventMsg]);

      if (features.aiChat) {
        (async () => {
          setChatLoading(true);
          try {
            const { message, suggestedChanges = [] } = await callChatApi([...chatMessagesRef.current, eventMsg], [card.name]);
            if (message || suggestedChanges.length > 0) {
              const aiMsg: ChatMsg = {
                id: `ai-${Date.now()}`, role: 'assistant', content: message || '', timestamp: Date.now(),
                suggestedChanges: suggestedChanges.map((sc: any) => ({ ...sc, status: 'pending' as const })),
              };
              setChatMessages(prev => [...prev, aiMsg]);
              if (!chatOpenRef.current) setUnreadCount(prev => prev + 1);
            }
            // Hard guardrail: saves never trigger new name generation
          } catch {} finally { setChatLoading(false); }
        })();
      }
    }
  }, [tld, callChatApi, generateBatch]);

  const activeCard = activeCardId ? cards.find(c => c.id === activeCardId) : null;
  const updateCard = useCallback((id: string) => (fn: (c: CardData) => CardData) => { setCards(prev => prev.map(c => c.id === id ? fn(c) : c)); }, []);

  // --- Config change accept/reject ---
  const handleAcceptChange = useCallback((msgId: string, changeIndex: number) => {
    setChatMessages(prev => prev.map(msg => {
      if (msg.id !== msgId || !msg.suggestedChanges) return msg;
      const updated = [...msg.suggestedChanges];
      updated[changeIndex] = { ...updated[changeIndex], status: 'accepted' };
      return { ...msg, suggestedChanges: updated };
    }));

    // Apply the change to config
    const msg = chatMessages.find(m => m.id === msgId);
    const change = msg?.suggestedChanges?.[changeIndex];
    if (!change || !configRef.current) return;

    if (change.action === 'append' && change.field === 'otherDetails') {
      const existing = configRef.current.otherDetails || '';
      configRef.current.otherDetails = existing ? `${existing}. ${change.value}` : change.value;
    } else {
      configRef.current[change.field] = change.value;
    }

    localStorage.setItem('nc_config', JSON.stringify(configRef.current));
    if (change.field === 'tld') setTld(change.value);

    // System event for this individual change
    const eventMsg: ChatMsg = {
      id: `event-cfg-${Date.now()}-${changeIndex}`, role: 'system-event',
      content: `Updated ${change.label} → ${change.displayValue}`, timestamp: Date.now(),
    };
    setChatMessages(prev => [...prev, eventMsg]);

    // Check if all suggestions in this message are now dispositioned
    // We need to check the updated state, so compute it manually
    const updatedSuggestions = msg.suggestedChanges!.map((sc, i) =>
      i === changeIndex ? { ...sc, status: 'accepted' as const } : sc
    );
    const allDispositioned = updatedSuggestions.every(sc => sc.status !== 'pending');
    const anyAccepted = updatedSuggestions.some(sc => sc.status === 'accepted');

    if (allDispositioned && anyAccepted) {
      const genEvent: ChatMsg = {
        id: `event-gen-cfg-${Date.now()}`, role: 'system-event',
        content: 'Generating new names with updated settings...', timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, genEvent]);
      generateBatch('Updated settings based on your preferences');
    }
  }, [chatMessages, generateBatch]);

  const handleRejectChange = useCallback((msgId: string, changeIndex: number) => {
    setChatMessages(prev => prev.map(msg => {
      if (msg.id !== msgId || !msg.suggestedChanges) return msg;
      const updated = [...msg.suggestedChanges];
      updated[changeIndex] = { ...updated[changeIndex], status: 'rejected' };
      return { ...msg, suggestedChanges: updated };
    }));

    const msg = chatMessages.find(m => m.id === msgId);
    const change = msg?.suggestedChanges?.[changeIndex];
    if (!change) return;

    const eventMsg: ChatMsg = {
      id: `event-reject-${Date.now()}-${changeIndex}`, role: 'system-event',
      content: `Rejected: ${change.label} → ${change.displayValue}`, timestamp: Date.now(),
    };
    setChatMessages(prev => [...prev, eventMsg]);

    // Check if all suggestions in this message are now dispositioned
    const updatedSuggestions = msg.suggestedChanges!.map((sc, i) =>
      i === changeIndex ? { ...sc, status: 'rejected' as const } : sc
    );
    const allDispositioned = updatedSuggestions.every(sc => sc.status !== 'pending');
    const anyAccepted = updatedSuggestions.some(sc => sc.status === 'accepted');

    // Only generate if at least one was accepted
    if (allDispositioned && anyAccepted) {
      const genEvent: ChatMsg = {
        id: `event-gen-cfg-${Date.now()}`, role: 'system-event',
        content: 'Generating new names with updated settings...', timestamp: Date.now(),
      };
      setChatMessages(prev => [...prev, genEvent]);
      generateBatch('Updated settings based on your preferences');
    }
  }, [chatMessages, generateBatch]);

  // Build grid with dividers
  const gridItems: Array<{ type: 'card'; card: CardData; index: number } | { type: 'divider'; text: string; id: number }> = [];
  cards.forEach((c, i) => {
    if (dividers[i]) gridItems.push({ type: 'divider', text: dividers[i], id: i });
    gridItems.push({ type: 'card', card: c, index: i });
  });

  // Fresh start: clear names, chat, dividers — keep saved names and settings
  const handleRefresh = useCallback(() => {
    setCards([]);
    setDividers({});
    setChatMessages([]);
    setActiveCardId(null);
    setError(null);
    existingNamesRef.current = [];
    batchNumberRef.current = 1;
    loadingRef.current = false;
    usedGrad.current.clear();
    lastCheckInRef.current = 0;
    try {
      sessionStorage.removeItem('nc_cards');
      sessionStorage.removeItem('nc_dividers');
      sessionStorage.removeItem('nc_chat');
      sessionStorage.removeItem('nc_existing');
      sessionStorage.removeItem('nc_batch');
    } catch {}
    // Trigger a fresh batch
    setTimeout(() => generateBatch(), 100);
  }, [generateBatch]);

  return (
    <div className="min-h-screen">
      <Header onRefresh={handleRefresh} />
      {/* Sticky model bar */}
      <div className={`sticky top-14 z-40 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-[var(--border)] transition-all duration-300 ${chatOpen ? 'sm:mr-[340px]' : ''}`}>
        <div className="max-w-6xl mx-auto px-4 h-9 flex items-center gap-3 text-xs text-[var(--text-secondary)]">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <span>{AI_MODELS.find(m => m.id === selectedModel)?.name || 'Unknown model'}</span>
            <span className="text-[var(--text-secondary)]/40">·</span>
            <span className="text-[var(--text-secondary)]/40">{AI_MODELS.find(m => m.id === selectedModel)?.provider}</span>
          </div>
          <button
            onClick={() => router.push('/configure')}
            className="text-[var(--accent)]/60 hover:text-[var(--accent)] transition-colors underline underline-offset-2 decoration-[var(--accent)]/20 hover:decoration-[var(--accent)]/50"
          >
            change
          </button>
        </div>
      </div>
      <div className="flex">
        <main className={`flex-1 min-w-0 px-4 py-6 transition-all duration-300 ${chatOpen ? 'sm:mr-[340px]' : ''}`}>
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {gridItems.map((item) => {
                if (item.type === 'divider') return (
                  <div key={`div-${item.id}`} id={`divider-${item.id}`} className="col-span-full py-6">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center"><div className="w-full h-px bg-gradient-to-r from-transparent via-[var(--accent)]/20 to-transparent" /></div>
                      <div className="relative px-5 py-2 rounded-full bg-[var(--bg-primary)] border border-[var(--accent)]/15">
                        <span className="text-[11px] text-[var(--accent)]/80 tracking-wide">{item.text}</span>
                      </div>
                    </div>
                  </div>
                );
                return <GridCard key={item.card.id} card={item.card} index={item.index % 10} onSave={handleSave} onExplore={() => setActiveCardId(item.card.id)} isSaved={savedNames.has(item.card.name)} tld={tld} />;
              })}
              {isGenerating && (() => {
                const cols = 3;
                const remainder = cards.length % cols;
                const fillCount = remainder === 0 ? cols : (cols - remainder) + cols;
                return [...Array(Math.min(fillCount, 9))].map((_, i) => (
                  <div key={`skel-${i}`} className="rounded-2xl overflow-hidden border-2 border-[var(--border)]">
                    <div className="h-40 sm:h-48 bg-[var(--bg-elevated)] pulse" />
                    <div className="bg-[var(--bg-secondary)] px-4 py-3 space-y-2">
                      <div className="h-3 bg-white/[0.05] rounded w-3/4 pulse" />
                      <div className="h-3 bg-white/[0.05] rounded w-1/2 pulse" />
                    </div>
                  </div>
                ));
              })()}
            </div>
            {error && <div className="mt-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-center"><p className="text-red-400 text-sm mb-2">{error}</p><button onClick={() => generateBatch()} className="text-sm text-[var(--accent)] hover:underline">Try again</button></div>}
            {!isGenerating && cards.length > 0 && (
              <div className="flex justify-center py-8">
                <button onClick={() => generateBatch()} className="px-6 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent-dim)] transition-all">Load more names</button>
              </div>
            )}
            <div ref={sentinelRef} className="h-20" />
            <div className="sm:hidden h-16" />
          </div>
        </main>
        <ChatSidebar messages={chatMessages} onSend={handleChatSend} onAcceptChange={handleAcceptChange} onRejectChange={handleRejectChange} isLoading={chatLoading} isOpen={chatOpen} onToggle={() => setChatOpen(prev => !prev)} unreadCount={unreadCount} chatEnabled={features.aiChat} />
      </div>
      {activeCard && <DetailPanel card={activeCard} defaultTld={tld} onClose={() => setActiveCardId(null)} onUpdate={updateCard(activeCard.id)} onSave={() => handleSave(activeCard)} isSaved={savedNames.has(activeCard.name)} chatOpen={chatOpen} advancedAvailability={features.advancedAvailability} extraVariants={features.extraVariants} />}
    </div>
  );
}

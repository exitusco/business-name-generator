'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import ChatSidebar from '@/components/ChatSidebar';
import { UpgradePrompt } from '@/components/ProGate';
import { useFeatures } from '@/hooks/useFeatures';
import type { ChatMsg } from '@/components/ChatSidebar';
import { NameCardData, DomainCheck, CARD_FONTS, GRADIENTS, CATEGORY_COLORS, COMMON_TLDS } from '@/lib/types';
import { pickTextColor, STATUS_COLORS as SC } from '@/lib/colors';
import { partitionCached, setCache } from '@/lib/domain-cache';

type CM = 'whoisxml' | 'dns' | 'pending';
interface DCE extends DomainCheck { method: CM; }
interface CardData extends Omit<NameCardData, 'exactDomain' | 'variantDomains'> {
  dbId?: string; // database ID for this result
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

function statusColor(available: boolean | null, method: CM) {
  if (available === null) return SC.loading;
  if (!available) return SC.taken;
  return method === 'whoisxml' ? SC.confirmed : SC.likelyFree;
}

function domainUrl(domain: string, tld: string, available: boolean | null): string {
  const f = domain.includes('.') ? domain : `${domain}.${tld}`;
  return available === false ? `https://${f}` : `https://porkbun.com/checkout/search?q=${encodeURIComponent(f)}`;
}

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
        {available ? <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={sc.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          : <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={sc.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".6"><path d="M18 6L6 18M6 6l12 12"/></svg>}
        <span className="truncate" style={{ color: available ? sc.text : 'rgba(255,255,255,.3)' }}>{f}</span>
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider shrink-0 ml-2" style={{ color: available ? sc.text + 'cc' : 'rgba(255,255,255,.2)' }}>
        {available ? (method === 'whoisxml' ? 'Available' : 'Likely free') : 'Taken'}
      </span>
    </a>
  );
}

// ===== CHOOSE NAME BUTTON =====
function ChooseNameButton({ card, tld, onChoose }: { card: CardData; tld: string; onChoose: (domain: string) => void }) {
  const [selectedDomain, setSelectedDomain] = useState('');
  const [choosing, setChoosing] = useState(false);

  // Collect all available domains
  const availableDomains = [
    ...(card.exactDomain.available ? [`${card.exactDomain.domain}.${tld}`] : []),
    ...card.variantDomains.filter(v => v.available).map(v => v.domain.includes('.') ? v.domain : `${v.domain}.${tld}`),
    ...card.tldChecks.filter(t => t.available).map(t => t.domain),
  ];

  useEffect(() => {
    if (availableDomains.length > 0 && !selectedDomain) {
      setSelectedDomain(availableDomains[0]);
    }
  }, [availableDomains.length]);

  const handleChoose = async () => {
    setChoosing(true);
    await onChoose(selectedDomain);
    setChoosing(false);
  };

  return (
    <div>
      <p className="text-xs text-[var(--text-secondary)] mb-2">Use this as your business name?</p>
      {availableDomains.length > 0 ? (
        <div className="flex flex-col gap-2">
          <select value={selectedDomain} onChange={e => setSelectedDomain(e.target.value)}
            className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--text-primary)]" style={{ appearance: 'none' }}>
            {availableDomains.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <button onClick={handleChoose} disabled={choosing || !selectedDomain}
            className="w-full py-2.5 rounded-xl text-sm font-semibold bg-[#22c55e] text-[#0a0a0f] hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2">
            {choosing ? <div className="w-4 h-4 border-2 border-[#0a0a0f]/30 border-t-[#0a0a0f] rounded-full spinner" /> : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
            )}
            Choose this name
          </button>
        </div>
      ) : (
        <button onClick={() => onChoose(`${card.exactDomain.domain}.${tld}`)} disabled={choosing}
          className="w-full py-2.5 rounded-xl text-sm font-medium bg-white/[0.05] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] hover:border-[var(--accent-dim)] transition-all flex items-center justify-center gap-2">
          Choose without domain
        </button>
      )}
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

// ===== DETAIL PANEL =====
function DetailPanel({ card, defaultTld, onClose, onUpdate, onSave, onChoose, isSaved, chatOpen, advancedAvailability, extraVariants, searchConfig }: {
  card: CardData; defaultTld: string; onClose: () => void;
  onUpdate: (updater: (c: CardData) => CardData) => void;
  onSave: () => void; onChoose: (domain: string) => void; isSaved: boolean; chatOpen: boolean;
  advancedAvailability: boolean; extraVariants: boolean; searchConfig: any;
}) {
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [variantTld, setVariantTld] = useState(card.variantTld || defaultTld);
  const [recheckingTld, setRecheckingTld] = useState(false);
  const [tldInput, setTldInput] = useState('');
  const [addingTld, setAddingTld] = useState(false);

  useEffect(() => { setVariantTld(card.variantTld || defaultTld); setLoadingVariants(false); setVerifying(false); setTldInput(''); }, [card.id]);

  const handleGenerateVariants = async () => {
    setLoadingVariants(true);
    try {
      const existingVariants = card.variantDomains.map(v => v.domain);
      const r = await fetch('/api/generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: card.name,
          businessDescription: searchConfig?.businessDescription || '',
          industry: searchConfig?.industry || '',
          existingVariants,
          tld: variantTld,
        }),
      });
      if (r.ok) {
        const { variants } = await r.json();
        const newDomains: DCE[] = variants.map((v: string) => ({ domain: v, available: null, method: 'pending' as CM }));
        onUpdate(c => ({ ...c, variantDomains: [...c.variantDomains, ...newDomains] }));
        // Check availability for new variants
        const results = await cachedDnsCheck(variants, variantTld);
        onUpdate(c => ({
          ...c,
          variantDomains: c.variantDomains.map(v =>
            results[v.domain] ? { ...v, available: results[v.domain].available, method: results[v.domain].method } : v
          ),
        }));
      }
    } catch (err) { console.error('Generate variants error:', err); }
    finally { setLoadingVariants(false); }
  };

  useEffect(() => {
    if (card.tldChecks.length > 0) return;
    const tlds = DEFAULT_EXPLORE_TLDS.includes(defaultTld) ? DEFAULT_EXPLORE_TLDS : [defaultTld, ...DEFAULT_EXPLORE_TLDS.filter(t => t !== defaultTld)];
    loadTldChecks(tlds);
  }, [card.id]);

  const loadTldChecks = async (tlds: string[]) => {
    const nl = card.name.toLowerCase().replace(/\s+/g, '');
    const domainStrings = tlds.map(t => `${nl}.${t}`);
    const existing = new Set(card.tldChecks.map(tc => tc.domain));
    const newChecks: DCE[] = domainStrings.filter(d => !existing.has(d)).map(d => ({ domain: d, available: null, method: 'pending' as CM }));
    if (newChecks.length === 0) return;
    onUpdate(c => ({ ...c, tldChecks: [...c.tldChecks, ...newChecks] }));
    const results = await cachedDnsCheck(newChecks.map(c => c.domain), 'noop');
    onUpdate(c => ({ ...c, tldChecks: c.tldChecks.map(tc => results[tc.domain] ? { ...tc, available: results[tc.domain].available, method: results[tc.domain].method } : tc) }));
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

  const panelContent = (
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <span className="px-2.5 py-1 rounded-lg text-xs font-medium uppercase tracking-wider" style={{ background: catColor + '20', color: catColor, border: `1px solid ${catColor}30` }}>{card.category}</span>
        <button onClick={onSave} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${isSaved ? 'bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30' : 'bg-white/[0.05] text-white/50 hover:text-white/80 border border-[var(--border)]'}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isSaved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          {isSaved ? 'Saved' : 'Save'}
        </button>
      </div>
      {card.rationale && <p className="text-sm text-[var(--text-secondary)] mb-4 italic" style={{ borderLeft: `2px solid ${catColor}40`, paddingLeft: '12px' }}>{card.rationale}</p>}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <span className="text-xs" style={{ color: avAll > 0 ? (hasUnverified ? SC.likelyFree.text : SC.confirmed.text) : SC.taken.text }}>
          {avAll} domain{avAll !== 1 ? 's' : ''} {hasUnverified ? 'look available' : 'available'}
        </span>
        {hasUnverified && !card.verified && (
          advancedAvailability ? (
            <button onClick={handleVerifyAll} disabled={verifying} className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-40" style={{ background: SC.confirmed.bg, color: SC.confirmed.text, border: `1px solid ${SC.confirmed.border}` }}>
              {verifying ? <div className="w-3 h-3 border-[1.5px] rounded-full spinner" style={{ borderColor: SC.confirmed.text + '40', borderTopColor: SC.confirmed.text }} /> : null}
              Verify all
            </button>
          ) : <UpgradePrompt feature="Verify domains" compact />
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">{card.name.toLowerCase()}.___</h3>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto overflow-x-hidden">
            {card.tldChecks.map(tc => <DomainRow key={tc.domain} domain={tc.domain} tld="" available={tc.available} method={tc.method} />)}
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider">Variants</h3>
            <select value={variantTld} onChange={e => handleVariantTldChange(e.target.value)}
              className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-2 py-0.5 text-xs text-[var(--text-primary)] cursor-pointer" style={{ appearance: 'none', paddingRight: '20px' }}>
              {[...new Set([defaultTld, ...COMMON_TLDS])].map(t => <option key={t} value={t}>.{t}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto overflow-x-hidden">
            <DomainRow domain={card.exactDomain.domain} tld={variantTld} available={card.exactDomain.available} method={card.exactDomain.method} />
            {card.variantDomains.map(v => <DomainRow key={v.domain} domain={v.domain} tld={variantTld} available={v.available} method={v.method} />)}
          </div>
          {extraVariants ? (
            <button onClick={handleGenerateVariants} disabled={loadingVariants} className="w-full mt-2 py-2 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/70 disabled:opacity-40 flex items-center justify-center gap-1.5">
              {loadingVariants ? <div className="w-3 h-3 border-[1.5px] rounded-full spinner" style={{ borderColor: 'rgba(255,255,255,.2)', borderTopColor: 'rgba(255,255,255,.6)' }} /> : (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              )}
              {loadingVariants ? 'Generating...' : 'Generate more variants'}
            </button>
          ) : <div className="mt-2"><UpgradePrompt feature="More variants" compact /></div>}
        </div>
      </div>
      {/* Choose this name */}
      <div className="mt-6 pt-4 border-t border-[var(--border)]">
        <ChooseNameButton card={card} tld={variantTld} onChoose={onChoose} />
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile: fullscreen */}
      <div className="sm:hidden fixed inset-0 z-[85] bg-[var(--bg-primary)] overflow-y-auto pb-16">
        <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 bg-[var(--bg-primary)]/90 backdrop-blur-xl border-b border-[var(--border)]">
          <span className="text-sm font-medium">{card.name}</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>
        {panelContent}
      </div>
      {/* Desktop: bottom tray */}
      <div className="hidden sm:block fixed inset-x-0 bottom-0 z-[75]" style={{ right: chatOpen ? '340px' : '0' }} onClick={onClose}>
        <div className="absolute inset-0 bg-black/40" />
        <div className="relative max-h-[60vh] bg-[var(--bg-secondary)] border-t border-[var(--border)] rounded-t-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-1 rounded-full bg-white/10" />
              <h2 className="text-lg font-semibold" style={{ fontFamily: card.fontFamily }}>{card.name}</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{panelContent}</div>
        </div>
      </div>
    </>
  );
}

// ===== MAIN =====
export default function SearchResultsPage() {
  const router = useRouter();
  const params = useParams();
  const features = useFeatures();
  const projectId = params.id as string;
  const searchId = params.searchId as string;

  const [cards, setCards] = useState<CardData[]>([]);
  const [dividers, setDividers] = useState<Record<number, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [savedNames, setSavedNames] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [tld, setTld] = useState('com');
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [searchConfig, setSearchConfig] = useState<any>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  const existingNamesRef = useRef<string[]>([]);
  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const batchNumberRef = useRef(1);
  const usedGrad = useRef<Set<number>>(new Set());
  const cardsLenRef = useRef(0);
  const savedNamesRef = useRef<Set<string>>(new Set());

  // Model
  const [selectedModel, setSelectedModel] = useState(features.defaultModel);
  const selectedModelRef = useRef(features.defaultModel);
  useEffect(() => { selectedModelRef.current = selectedModel; }, [selectedModel]);
  useEffect(() => {
    const m = localStorage.getItem('nc_selected_model');
    if (m) { setSelectedModel(m); selectedModelRef.current = m; }
  }, []);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatOpen, setChatOpen] = useState(typeof window !== 'undefined' && window.innerWidth >= 640);
  const [chatLoading, setChatLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const chatOpenRef = useRef(chatOpen);
  const chatMessagesRef = useRef<ChatMsg[]>([]);

  useEffect(() => { chatOpenRef.current = chatOpen; if (chatOpen) setUnreadCount(0); }, [chatOpen]);
  useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);
  useEffect(() => { cardsLenRef.current = cards.length; }, [cards.length]);
  useEffect(() => { savedNamesRef.current = savedNames; }, [savedNames]);

  // Load search data from database
  useEffect(() => {
    loadSearchData();
  }, [searchId]);

  const loadSearchData = async () => {
    try {
      // Load search config
      let loadedTld = 'com';
      const searchR = await fetch(`/api/searches/${searchId}`);
      if (searchR.ok) {
        const { search } = await searchR.json();
        setSearchConfig(search.config);
        loadedTld = search.config?.tld || 'com';
        setTld(loadedTld);
      }

      // Load existing results
      const resultsR = await fetch(`/api/searches/${searchId}/results`);
      if (resultsR.ok) {
        const { results } = await resultsR.json();
        if (results && results.length > 0) {
          const loaded: CardData[] = results.map((r: any, i: number) => {
            const nl = r.name.toLowerCase().replace(/\s+/g, '');
            existingNamesRef.current.push(nl);
            return {
              id: `${nl}-${r.id}`,
              dbId: r.id,
              name: r.name,
              category: r.category || 'invented',
              rationale: r.rationale || '',
              exactDomain: { domain: r.exact_domain || nl, available: null, method: 'pending' as CM },
              variantDomains: (r.variants || []).map((v: string) => ({ domain: v, available: null, method: 'pending' as CM })),
              tldChecks: [],
              verified: false,
              verifying: false,
              loadingVariants: false,
              variantTld: loadedTld,
              gradient: r.gradient || genStyle(usedGrad.current).gradient,
              fontFamily: r.font_family || CARD_FONTS[Math.floor(Math.random() * CARD_FONTS.length)],
              textColor: r.text_color || '#ffffff',
            };
          });
          if (loaded.some(c => c.gradient)) {
            // Use existing styles
          }
          setCards(loaded);
          setSavedNames(new Set(results.filter((r: any) => r.is_saved).map((r: any) => r.name)));
          batchNumberRef.current = Math.max(...results.map((r: any) => r.batch_number || 1)) + 1;
          hasGeneratedRef.current = true; // existing results loaded, enable infinite scroll

          // Check domains for loaded cards
          for (const c of loaded) {
            checkDomainsForCard(c.id, c.exactDomain.domain, c.variantDomains.map(v => v.domain));
          }
        }
      }

      // Load chat messages
      const chatR = await fetch(`/api/searches/${searchId}/chat`);
      if (chatR.ok) {
        const { messages } = await chatR.json();
        if (messages && messages.length > 0) {
          setChatMessages(messages.map((m: any) => ({
            id: m.id, role: m.role, content: m.content, timestamp: new Date(m.created_at).getTime(),
            suggestedChanges: m.suggested_changes?.map((sc: any) => ({ ...sc, status: 'accepted' })) || undefined,
          })));
        }
      }

      setInitialLoaded(true);
    } catch (err) {
      console.error('Failed to load search data:', err);
      setInitialLoaded(true);
    }
  };

  useEffect(() => { const h = (e: KeyboardEvent) => { if (e.key === 'Escape') setActiveCardId(null); }; window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h); }, []);

  const checkDomainsForCard = useCallback(async (cardId: string, exactDomain: string, variantDomains: string[]) => {
    const ct = tld || 'com';
    const all = [exactDomain, ...variantDomains];
    const dns = await cachedDnsCheck(all, ct);
    setCards(prev => prev.map(c => c.id !== cardId ? c : {
      ...c,
      exactDomain: dns[c.exactDomain.domain] ? { ...c.exactDomain, available: dns[c.exactDomain.domain].available, method: dns[c.exactDomain.domain].method } : c.exactDomain,
      variantDomains: c.variantDomains.map(v => dns[v.domain] ? { ...v, available: dns[v.domain].available, method: dns[v.domain].method } : v),
    }));
  }, [tld]);

  const generateBatch = useCallback(async (dividerText?: string) => {
    if (loadingRef.current || !searchConfig) return;
    loadingRef.current = true; setIsGenerating(true); setError(null);
    const dividerIndex = cardsLenRef.current;

    try {
      const r = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: searchConfig, existingNames: existingNamesRef.current, savedNames: Array.from(savedNamesRef.current), batchSize: 10,
          nonce: Math.random().toString(36).slice(2, 10), model: selectedModelRef.current,
          chatHistory: chatMessagesRef.current.slice(-20).map(m => ({ role: m.role, content: m.content })),
        }) });
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Failed'); }
      const { suggestions } = await r.json();
      const ct = searchConfig?.tld || 'com';
      const nc: CardData[] = suggestions.filter((s: any) => !existingNamesRef.current.includes(s.name.toLowerCase())).map((s: any, i: number) => {
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

      // Save results to database
      const dbResults = nc.map((c, i) => ({
        name: c.name, category: c.category, rationale: c.rationale,
        gradient: c.gradient, font_family: c.fontFamily, text_color: c.textColor,
        exact_domain: c.exactDomain.domain, variants: c.variantDomains.map(v => v.domain),
        batch_number: batchNumberRef.current - 1, position: dividerIndex + i,
      }));
      fetch(`/api/searches/${searchId}/results`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: dbResults }),
      }).then(r => r.ok ? r.json() : null).then(data => {
        if (data?.results) {
          // Update cards with database IDs
          setCards(prev => prev.map(c => {
            const match = data.results.find((r: any) => r.name === c.name && !c.dbId);
            return match ? { ...c, dbId: match.id } : c;
          }));
        }
      }).catch(() => {});

      if (dividerText) {
        setTimeout(() => {
          const el = document.getElementById(`divider-${dividerIndex}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }
    } catch (err: any) { setError(err.message || 'Failed'); } finally { setIsGenerating(false); loadingRef.current = false; }
  }, [checkDomainsForCard, searchConfig, searchId]);

  const hasGeneratedRef = useRef(false);

  // Initial generation - only if no results loaded from DB
  useEffect(() => {
    if (initialLoaded && searchConfig && cards.length === 0 && !hasGeneratedRef.current) {
      hasGeneratedRef.current = true;
      setTimeout(() => generateBatch(), 100);
    }
  }, [initialLoaded, searchConfig, cards.length]);

  // Infinite scroll - only after initial generation has happened
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!hasGeneratedRef.current) return; // Don't observe until first batch is done
    observerRef.current = new IntersectionObserver(
      (entries) => { if (entries.some(e => e.isIntersecting) && !loadingRef.current && initialLoaded) generateBatch(); },
      { rootMargin: '600px', threshold: 0 }
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [generateBatch, initialLoaded, cards.length]);

  // Chat handlers
  const callChatApi = useCallback(async (messages: ChatMsg[], extraSavedNames?: string[]) => {
    const allMsgs = messages.map(m => ({ role: m.role, content: m.content }));
    const savedArr = [...Array.from(savedNamesRef.current), ...(extraSavedNames || [])];
    const r = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: allMsgs, config: searchConfig, savedNames: savedArr, namesShown: existingNamesRef.current.length }),
    });
    if (!r.ok) throw new Error('Chat failed');
    return r.json();
  }, [searchConfig]);

  const handleChatSend = useCallback(async (text: string) => {
    const userMsg: ChatMsg = { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    // Save to DB
    fetch(`/api/searches/${searchId}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'user', content: text }) }).catch(() => {});
    try {
      const { message, generateNames, suggestedChanges = [] } = await callChatApi([...chatMessagesRef.current, userMsg]);
      if (message || suggestedChanges.length > 0) {
        const aiMsg: ChatMsg = { id: `ai-${Date.now()}`, role: 'assistant', content: message || '', timestamp: Date.now(),
          suggestedChanges: suggestedChanges.map((sc: any) => ({ ...sc, status: 'pending' as const })) };
        setChatMessages(prev => [...prev, aiMsg]);
        if (!chatOpenRef.current) setUnreadCount(prev => prev + 1);
        fetch(`/api/searches/${searchId}/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role: 'assistant', content: message || '', suggested_changes: suggestedChanges }) }).catch(() => {});
      }
      if (generateNames && suggestedChanges.length === 0) {
        const genEvent: ChatMsg = { id: `event-gen-${Date.now()}`, role: 'system-event', content: 'Generating new names...', timestamp: Date.now() };
        setChatMessages(prev => [...prev, genEvent]);
        generateBatch(message || 'New direction');
      }
    } catch (err) { console.error('Chat error:', err); } finally { setChatLoading(false); }
  }, [callChatApi, generateBatch, searchId]);

  const handleSave = useCallback((card: CardData) => {
    const isUnsaving = savedNames.has(card.name);
    if (isUnsaving) {
      setSavedNames(prev => { const n = new Set(prev); n.delete(card.name); return n; });
    } else {
      setSavedNames(prev => { const a = Array.from(prev); a.push(card.name); return new Set(a); });
    }
    // Update in DB
    if (card.dbId) {
      fetch(`/api/searches/${searchId}/results`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId: card.dbId, action: 'toggleSave', isSaved: !isUnsaving }),
      }).catch(() => {});
    }
    // Chat event for saves (pro only)
    if (!isUnsaving) {
      const eventMsg: ChatMsg = { id: `event-${Date.now()}`, role: 'system-event', content: `Saved "${card.name}"`, timestamp: Date.now() };
      setChatMessages(prev => [...prev, eventMsg]);
    }
  }, [savedNames, searchId]);

  const handleAcceptChange = useCallback((msgId: string, changeIndex: number) => {
    setChatMessages(prev => prev.map(msg => {
      if (msg.id !== msgId || !msg.suggestedChanges) return msg;
      const updated = [...msg.suggestedChanges];
      updated[changeIndex] = { ...updated[changeIndex], status: 'accepted' };
      return { ...msg, suggestedChanges: updated };
    }));
    // Apply to search config
    const msg = chatMessages.find(m => m.id === msgId);
    const change = msg?.suggestedChanges?.[changeIndex];
    if (change && searchConfig) {
      const newConfig = { ...searchConfig };
      if (change.action === 'append' && change.field === 'otherDetails') {
        newConfig.otherDetails = (newConfig.otherDetails || '') + '. ' + change.value;
      } else {
        newConfig[change.field] = change.value;
      }
      setSearchConfig(newConfig);
      if (change.field === 'tld') setTld(change.value);
      fetch(`/api/searches/${searchId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ config: newConfig }) }).catch(() => {});

      // Check if all suggestions dispositioned
      const allSuggestions = msg.suggestedChanges!.map((sc, i) => i === changeIndex ? { ...sc, status: 'accepted' } : sc);
      if (allSuggestions.every(sc => sc.status !== 'pending') && allSuggestions.some(sc => sc.status === 'accepted')) {
        generateBatch(`Updated settings`);
      }
    }
  }, [chatMessages, searchConfig, searchId, generateBatch]);

  const handleRejectChange = useCallback((msgId: string, changeIndex: number) => {
    setChatMessages(prev => prev.map(msg => {
      if (msg.id !== msgId || !msg.suggestedChanges) return msg;
      const updated = [...msg.suggestedChanges];
      updated[changeIndex] = { ...updated[changeIndex], status: 'rejected' };
      return { ...msg, suggestedChanges: updated };
    }));
  }, []);

  const handleRefresh = useCallback(() => {
    setCards([]); setDividers({}); setChatMessages([]); setActiveCardId(null); setError(null);
    existingNamesRef.current = []; batchNumberRef.current = 1; loadingRef.current = false; usedGrad.current.clear();
    hasGeneratedRef.current = false;
    setTimeout(() => { hasGeneratedRef.current = true; generateBatch(); }, 100);
  }, [generateBatch]);

  const handleChooseName = useCallback(async (domain: string) => {
    const card = cards.find(c => c.id === activeCardId);
    if (!card?.dbId) return;
    try {
      const r = await fetch(`/api/searches/${searchId}/choose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId: card.dbId, domain }),
      });
      if (r.ok) {
        setActiveCardId(null);
        router.push(`/projects/${projectId}/names`);
      }
    } catch (err) { console.error('Choose name error:', err); }
  }, [activeCardId, cards, searchId, projectId, router]);

  const activeCard = activeCardId ? cards.find(c => c.id === activeCardId) : null;
  const updateCard = useCallback((id: string) => (fn: (c: CardData) => CardData) => { setCards(prev => prev.map(c => c.id === id ? fn(c) : c)); }, []);

  const gridItems: Array<{ type: 'card'; card: CardData; index: number } | { type: 'divider'; text: string; id: number }> = [];
  cards.forEach((c, i) => {
    if (dividers[i]) gridItems.push({ type: 'divider', text: dividers[i], id: i });
    gridItems.push({ type: 'card', card: c, index: i });
  });

  return (
    <div className="min-h-screen">
      <AppShell onRefresh={handleRefresh} showRecentSearch={false} />
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
        <ChatSidebar messages={chatMessages} onSend={handleChatSend} onAcceptChange={handleAcceptChange} onRejectChange={handleRejectChange}
          isLoading={chatLoading} isOpen={chatOpen} onToggle={() => setChatOpen(prev => !prev)} unreadCount={unreadCount} chatEnabled={features.aiChat} />
      </div>
      {activeCard && <DetailPanel card={activeCard} defaultTld={tld} onClose={() => setActiveCardId(null)} onUpdate={updateCard(activeCard.id)} onSave={() => handleSave(activeCard)} onChoose={handleChooseName} isSaved={savedNames.has(activeCard.name)} chatOpen={chatOpen} advancedAvailability={features.advancedAvailability} extraVariants={features.extraVariants} searchConfig={searchConfig} />}
    </div>
  );
}

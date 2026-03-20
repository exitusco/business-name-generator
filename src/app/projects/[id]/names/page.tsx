'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { useFeatures } from '@/hooks/useFeatures';
import { UpgradePrompt } from '@/components/ProGate';
import AppShell from '@/components/AppShell';
import { COMMON_TLDS } from '@/lib/types';
import { STATUS_COLORS as SC } from '@/lib/colors';
import { partitionCached, setCache } from '@/lib/domain-cache';

type CM = 'whoisxml' | 'dns' | 'pending';
interface DomainEntry { domain: string; available: boolean | null; method: CM; }

const DEFAULT_EXPLORE_TLDS = ['com','io','co','net','org','ai','app','dev','xyz','tech'];

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
  for (const [d, e] of Object.entries(cached)) {
    if (e.method === 'whoisxml') results[d] = { available: e.available, method: 'whoisxml' };
    else toFetch.push(d);
  }
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

function DomainRow({ domain, available, method }: { domain: string; available: boolean | null; method: CM }) {
  const sc = statusColor(available, method);
  if (available === null) return (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/[0.03]">
      <span className="text-xs text-white/40 font-mono flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white/20 pulse" />{domain}</span>
      <span className="text-[10px] text-white/20">checking…</span>
    </div>
  );
  const url = available === false ? `https://${domain}` : `https://porkbun.com/checkout/search?q=${encodeURIComponent(domain)}`;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="domain-pill flex items-center justify-between py-1.5 px-3 rounded-lg transition-all" style={{ background: available ? sc.bg : 'rgba(255,255,255,0.02)' }}>
      <span className="text-xs font-mono flex items-center gap-2 min-w-0">
        {available ? <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={sc.text} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
          : <svg className="shrink-0" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={sc.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity=".6"><path d="M18 6L6 18M6 6l12 12"/></svg>}
        <span className="truncate" style={{ color: available ? sc.text : 'rgba(255,255,255,.3)' }}>{domain}</span>
      </span>
      <span className="text-[10px] font-medium uppercase tracking-wider shrink-0 ml-2" style={{ color: available ? sc.text + 'cc' : 'rgba(255,255,255,.2)' }}>
        {available ? (method === 'whoisxml' ? 'Available' : 'Likely free') : 'Taken'}
      </span>
    </a>
  );
}

// ===== EXPANDED SAVED NAME CARD =====
function ExpandedSavedCard({ result, searchConfig, onChoose, onClose, features }: {
  result: any; searchConfig: any; onChoose: (resultId: string, domain: string) => Promise<void>;
  onClose: () => void; features: any;
}) {
  const nl = result.name.toLowerCase().replace(/\s+/g, '');
  const defaultTld = searchConfig?.tld || 'com';

  // Variant domains from the result
  const [variantDomains, setVariantDomains] = useState<DomainEntry[]>(() =>
    (result.variants || []).map((v: string) => ({ domain: v, available: null, method: 'pending' as CM }))
  );
  const [exactDomain, setExactDomain] = useState<DomainEntry>({ domain: result.exact_domain || nl, available: null, method: 'pending' as CM });
  const [tldChecks, setTldChecks] = useState<DomainEntry[]>([]);
  const [variantTld, setVariantTld] = useState(defaultTld);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [choosing, setChoosing] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);

  // Load TLD checks on mount
  useEffect(() => {
    const tlds = DEFAULT_EXPLORE_TLDS.includes(defaultTld) ? DEFAULT_EXPLORE_TLDS : [defaultTld, ...DEFAULT_EXPLORE_TLDS.filter(t => t !== defaultTld)];
    const domainStrings = tlds.map(t => `${nl}.${t}`);
    const initial: DomainEntry[] = domainStrings.map(d => ({ domain: d, available: null, method: 'pending' as CM }));
    setTldChecks(initial);

    cachedDnsCheck(domainStrings, 'noop').then(res => {
      setTldChecks(prev => prev.map(tc => res[tc.domain] ? { ...tc, available: res[tc.domain].available, method: res[tc.domain].method } : tc));
    });
  }, [nl, defaultTld]);

  // Check exact + variants on mount
  useEffect(() => {
    const all = [exactDomain.domain, ...variantDomains.map(v => v.domain)];
    cachedDnsCheck(all, variantTld).then(res => {
      setExactDomain(prev => res[prev.domain] ? { ...prev, available: res[prev.domain].available, method: res[prev.domain].method } : prev);
      setVariantDomains(prev => prev.map(v => res[v.domain] ? { ...v, available: res[v.domain].available, method: res[v.domain].method } : v));
    });
  }, [variantTld]);

  // Auto-select first available domain
  useEffect(() => {
    if (selectedDomain) return;
    const available = [
      ...(exactDomain.available ? [`${exactDomain.domain}.${variantTld}`] : []),
      ...variantDomains.filter(v => v.available).map(v => v.domain.includes('.') ? v.domain : `${v.domain}.${variantTld}`),
      ...tldChecks.filter(t => t.available).map(t => t.domain),
    ];
    if (available.length > 0) setSelectedDomain(available[0]);
  }, [exactDomain, variantDomains, tldChecks]);

  const handleVariantTldChange = async (newTld: string) => {
    setVariantTld(newTld);
    setExactDomain(prev => ({ ...prev, available: null, method: 'pending' as CM }));
    setVariantDomains(prev => prev.map(v => ({ ...v, available: null, method: 'pending' as CM })));
    const all = [exactDomain.domain, ...variantDomains.map(v => v.domain)];
    const res = await cachedDnsCheck(all, newTld);
    setExactDomain(prev => res[prev.domain] ? { ...prev, available: res[prev.domain].available, method: res[prev.domain].method } : prev);
    setVariantDomains(prev => prev.map(v => res[v.domain] ? { ...v, available: res[v.domain].available, method: res[v.domain].method } : v));
  };

  const handleGenerateVariants = async () => {
    setLoadingVariants(true);
    try {
      const existingVariants = variantDomains.map(v => v.domain);
      const r = await fetch('/api/generate-variants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: result.name, businessDescription: searchConfig?.businessDescription || '', industry: searchConfig?.industry || '', existingVariants, tld: variantTld }),
      });
      if (r.ok) {
        const { variants } = await r.json();
        const newDomains: DomainEntry[] = variants.map((v: string) => ({ domain: v, available: null, method: 'pending' as CM }));
        setVariantDomains(prev => [...prev, ...newDomains]);
        const res = await cachedDnsCheck(variants, variantTld);
        setVariantDomains(prev => prev.map(v => res[v.domain] ? { ...v, available: res[v.domain].available, method: res[v.domain].method } : v));
      }
    } catch {} finally { setLoadingVariants(false); }
  };

  const handleVerifyAll = async () => {
    setVerifying(true);
    try {
      // Verify variant domains that are dns-likely-free
      const vd = variantDomains.filter(v => v.available === true && v.method === 'dns').map(v => v.domain);
      const td = tldChecks.filter(t => t.available === true && t.method === 'dns').map(t => t.domain);
      const ed = (exactDomain.available === true && exactDomain.method === 'dns') ? [exactDomain.domain] : [];

      if (vd.length > 0) {
        const res = await cachedWhoisCheck(vd, variantTld);
        setVariantDomains(prev => prev.map(v => res[v.domain] ? { ...v, available: res[v.domain].available, method: 'whoisxml' as CM } : v));
      }
      if (td.length > 0) {
        const res = await cachedWhoisCheck(td, 'noop');
        setTldChecks(prev => prev.map(t => res[t.domain] ? { ...t, available: res[t.domain].available, method: 'whoisxml' as CM } : t));
      }
      if (ed.length > 0) {
        const res = await cachedWhoisCheck(ed, variantTld);
        if (res[exactDomain.domain]) {
          setExactDomain(prev => ({ ...prev, available: res[prev.domain].available, method: 'whoisxml' as CM }));
        }
      }
      setVerified(true);
    } catch {} finally { setVerifying(false); }
  };

  const handleChoose = async () => {
    setChoosing(true);
    await onChoose(result.id, selectedDomain);
    setChoosing(false);
  };

  // Availability stats
  const allDomains = [exactDomain, ...variantDomains, ...tldChecks];
  const avCount = allDomains.filter(d => d.available === true).length;
  const hasUnverified = allDomains.some(d => d.available === true && d.method === 'dns');

  // All available domains for the picker
  const availableDomains = [
    ...(exactDomain.available ? [`${exactDomain.domain}.${variantTld}`] : []),
    ...variantDomains.filter(v => v.available).map(v => v.domain.includes('.') ? v.domain : `${v.domain}.${variantTld}`),
    ...tldChecks.filter(t => t.available).map(t => t.domain),
  ];

  return (
    <div className="rounded-xl bg-[var(--bg-secondary)] border border-[var(--accent-dim)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: result.gradient || 'var(--bg-elevated)' }}>
            <span className="text-sm font-bold" style={{ color: result.text_color || '#fff', fontFamily: result.font_family }}>{result.name?.[0]}</span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]" style={{ fontFamily: result.font_family }}>{result.name}</h3>
            {result.rationale && <p className="text-xs text-[var(--text-secondary)]/50 mt-0.5 line-clamp-1">{result.rationale}</p>}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-secondary)]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Domain sections */}
      <div className="p-4">
        {/* Availability summary + verify */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <span className="text-xs" style={{ color: avCount > 0 ? (hasUnverified ? SC.likelyFree.text : SC.confirmed.text) : SC.taken.text }}>
            {avCount} domain{avCount !== 1 ? 's' : ''} {hasUnverified ? 'look available' : 'available'}
          </span>
          {hasUnverified && !verified && (
            features.advancedAvailability ? (
              <button onClick={handleVerifyAll} disabled={verifying}
                className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-40"
                style={{ background: SC.confirmed.bg, color: SC.confirmed.text, border: `1px solid ${SC.confirmed.border}` }}>
                {verifying ? <div className="w-3 h-3 border-[1.5px] rounded-full spinner" style={{ borderColor: SC.confirmed.text + '40', borderTopColor: SC.confirmed.text }} /> : null}
                {verifying ? 'Verifying...' : 'Verify all'}
              </button>
            ) : <UpgradePrompt feature="Verify domains" compact />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* TLD Explorer */}
          <div>
            <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-2">{nl}.___</h4>
            <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
              {tldChecks.map(tc => <DomainRow key={tc.domain} domain={tc.domain} available={tc.available} method={tc.method} />)}
            </div>
          </div>

          {/* Variants */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-medium text-white/50 uppercase tracking-wider">Variants</h4>
              <select value={variantTld} onChange={e => handleVariantTldChange(e.target.value)}
                className="bg-[var(--bg-elevated)] border border-[var(--border)] rounded-md px-2 py-0.5 text-xs text-[var(--text-primary)] cursor-pointer" style={{ appearance: 'none', paddingRight: '20px' }}>
                {[...new Set([defaultTld, ...COMMON_TLDS])].map(t => <option key={t} value={t}>.{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 max-h-56 overflow-y-auto">
              <DomainRow domain={`${exactDomain.domain}.${variantTld}`} available={exactDomain.available} method={exactDomain.method} />
              {variantDomains.map(v => <DomainRow key={v.domain} domain={v.domain.includes('.') ? v.domain : `${v.domain}.${variantTld}`} available={v.available} method={v.method} />)}
            </div>
            {features.extraVariants ? (
              <button onClick={handleGenerateVariants} disabled={loadingVariants}
                className="w-full mt-2 py-2 rounded-lg text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white/70 disabled:opacity-40 flex items-center justify-center gap-1.5">
                {loadingVariants ? <div className="w-3 h-3 border-[1.5px] rounded-full spinner" style={{ borderColor: 'rgba(255,255,255,.2)', borderTopColor: 'rgba(255,255,255,.6)' }} /> : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                )}
                {loadingVariants ? 'Generating...' : 'Generate more variants'}
              </button>
            ) : <div className="mt-2"><UpgradePrompt feature="More variants" compact /></div>}
          </div>
        </div>

        {/* Choose this name */}
        <div className="mt-5 pt-4 border-t border-[var(--border)]">
          <p className="text-xs text-[var(--text-secondary)] mb-2">Use this as your business name?</p>
          {availableDomains.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={selectedDomain} onChange={e => setSelectedDomain(e.target.value)}
                className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm font-mono text-[var(--text-primary)]" style={{ appearance: 'none' }}>
                {availableDomains.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button onClick={handleChoose} disabled={choosing || !selectedDomain}
                className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[#22c55e] text-[#0a0a0f] hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 shrink-0">
                {choosing ? <div className="w-4 h-4 border-2 border-[#0a0a0f]/30 border-t-[#0a0a0f] rounded-full spinner" /> : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                )}
                Choose this name
              </button>
            </div>
          ) : (
            <button onClick={() => onChoose(result.id, `${nl}.${defaultTld}`)} disabled={choosing}
              className="w-full py-2.5 rounded-xl text-sm font-medium bg-white/[0.05] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)] transition-all">
              Choose without domain
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
export default function BusinessNamesPage() {
  const router = useRouter();
  const params = useParams();
  const { isSignedIn } = useAuth();
  const features = useFeatures();
  const projectId = params.id as string;
  const [project, setProject] = useState<any>(null);
  const [searches, setSearches] = useState<any[]>([]);
  const [savedResults, setSavedResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => { load(); }, [projectId]);

  const load = async () => {
    try {
      const [projR, searchR, savedR] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/searches`),
        fetch(`/api/projects/${projectId}/saved-results`),
      ]);
      if (projR.ok) { const { project: p } = await projR.json(); setProject(p); }
      if (searchR.ok) { const { searches: s } = await searchR.json(); setSearches(s || []); }
      if (savedR.ok) {
        const { results } = await savedR.json();
        setSavedResults(results || []);
      } else {
        console.error('Saved results fetch failed:', savedR.status, await savedR.text().catch(() => ''));
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally { setLoading(false); }
  };

  const handleNewSearch = () => {
    router.push(`/configure?projectId=${projectId}`);
  };

  const handleChooseName = async (resultId: string, domain: string) => {
    // Find the search_id for this result
    const result = savedResults.find(r => r.id === resultId);
    if (!result) return;
    try {
      const r = await fetch(`/api/searches/${result.search_id}/choose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId, domain }),
      });
      if (r.ok) {
        setExpandedId(null);
        await load();
      }
    } catch (err) { console.error('Choose name error:', err); }
  };

  const handleUnchoose = async () => {
    try {
      const r = await fetch(`/api/projects/${projectId}/unchoose`, { method: 'POST' });
      if (r.ok) await load();
    } catch (err) { console.error('Unchoose error:', err); }
  };

  // Get search config for a result (for variant generation)
  const getSearchConfig = (result: any) => {
    const search = searches.find(s => s.id === result.search_id);
    return search?.config || {};
  };

  const chosenName = project?.chosen_name;
  const nameComponent = project?.project_components?.find((c: any) => c.component_type === 'business_name');
  const isComplete = nameComponent?.status === 'complete';

  return (
    <div className="min-h-screen">
      <AppShell projectId={projectId} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button onClick={() => router.push(`/projects/${projectId}`)} className="text-xs text-[var(--text-secondary)]/50 hover:text-[var(--accent)] transition-colors mb-1 flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              {project?.name || 'Project'}
            </button>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Business Name</h1>
          </div>
          {isSignedIn && (
            <button onClick={handleNewSearch}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--accent)] text-[#0a0a0f] hover:opacity-90 transition-all flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              New search
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] pulse" />)}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Chosen name banner */}
            {isComplete && chosenName && (
              <div className="p-5 rounded-xl bg-[#22c55e]/[0.06] border border-[#22c55e]/20">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                    <span className="text-xs text-[#22c55e] uppercase tracking-wider font-medium">Chosen name</span>
                  </div>
                  <button onClick={handleUnchoose}
                    className="text-xs text-[var(--text-secondary)]/40 hover:text-[var(--text-secondary)] transition-colors">
                    Change name
                  </button>
                </div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">{chosenName}</h2>
                {project?.chosen_domain && <p className="text-sm font-mono text-[var(--accent)]/60 mt-1">{project.chosen_domain}</p>}
              </div>
            )}

            {/* Saved names */}
            {savedResults.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">
                  Saved names ({savedResults.length})
                </h2>
                <div className="space-y-2">
                  {savedResults.map((result: any) => {
                    const isExpanded = expandedId === result.id;

                    if (isExpanded) {
                      return (
                        <ExpandedSavedCard
                          key={result.id}
                          result={result}
                          searchConfig={getSearchConfig(result)}
                          onChoose={handleChooseName}
                          onClose={() => setExpandedId(null)}
                          features={features}
                        />
                      );
                    }

                    return (
                      <button
                        key={result.id}
                        onClick={() => setExpandedId(result.id)}
                        className="w-full text-left flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent-dim)] transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: result.gradient || 'var(--bg-elevated)' }}>
                            <span className="text-xs font-bold" style={{ color: result.text_color || '#fff', fontFamily: result.font_family }}>{result.name?.[0]}</span>
                          </div>
                          <div className="min-w-0">
                            <span className="text-sm text-[var(--text-primary)] font-medium group-hover:text-[var(--accent)] transition-colors">{result.name}</span>
                            {result.exact_domain && <span className="text-xs font-mono text-[var(--text-secondary)]/40 ml-2">.{getSearchConfig(result)?.tld || 'com'}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {result.is_chosen ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-[#22c55e]/10 text-[#22c55e] uppercase tracking-wider">Chosen</span>
                          ) : (
                            <span className="text-[10px] text-[var(--accent)] font-medium opacity-0 group-hover:opacity-100 transition-opacity">Explore →</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Searches */}
            <div>
              <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">Searches</h2>
              {searches.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm text-[var(--text-secondary)]/50 mb-3">No searches yet</p>
                  {isSignedIn && (
                    <button onClick={handleNewSearch} className="text-sm text-[var(--accent)] hover:underline">Start your first search →</button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {searches.map((search: any) => {
                    const config = search.config || {};
                    const desc = config.businessDescription || 'No description';
                    return (
                      <button
                        key={search.id}
                        onClick={() => router.push(`/projects/${projectId}/names/search/${search.id}`)}
                        className="w-full text-left p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent-dim)] transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-sm text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors truncate">{desc}</p>
                            <p className="text-xs text-[var(--text-secondary)]/40 mt-0.5">{new Date(search.created_at).toLocaleDateString()} · .{config.tld || 'com'}</p>
                          </div>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]/30 group-hover:text-[var(--accent)] shrink-0 transition-colors"><path d="M9 18l6-6-6-6"/></svg>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

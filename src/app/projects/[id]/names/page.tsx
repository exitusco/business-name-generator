'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import AppShell from '@/components/AppShell';

export default function BusinessNamesPage() {
  const router = useRouter();
  const params = useParams();
  const { isSignedIn } = useAuth();
  const projectId = params.id as string;
  const [project, setProject] = useState<any>(null);
  const [searches, setSearches] = useState<any[]>([]);
  const [savedResults, setSavedResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState(false);

  useEffect(() => { load(); }, [projectId]);

  const load = async () => {
    try {
      const [projR, searchR] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch(`/api/projects/${projectId}/searches`),
      ]);
      if (projR.ok) { const { project: p } = await projR.json(); setProject(p); }
      if (searchR.ok) { const { searches: s } = await searchR.json(); setSearches(s || []); }
      // Load saved results from all searches
      // We'll fetch from a dedicated endpoint
      const savedR = await fetch(`/api/projects/${projectId}/saved-results`);
      if (savedR.ok) { const { results } = await savedR.json(); setSavedResults(results || []); }
    } catch {} finally { setLoading(false); }
  };

  const handleNewSearch = () => {
    // Navigate to configure page with this project pre-selected
    router.push(`/configure?projectId=${projectId}`);
  };

  const handleChooseName = async (result: any) => {
    if (!result.search_id) return;
    setChoosing(true);
    try {
      const domain = result.exact_domain ? `${result.exact_domain}.com` : null;
      const r = await fetch(`/api/searches/${result.search_id}/choose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultId: result.id, domain }),
      });
      if (r.ok) { await load(); } // Refresh data
    } catch {} finally { setChoosing(false); }
  };

  const chosenName = project?.chosen_name;
  const nameComponent = project?.project_components?.find((c: any) => c.component_type === 'business_name');
  const isComplete = nameComponent?.status === 'complete';

  return (
    <div className="min-h-screen">
      <AppShell />
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
                <div className="flex items-center gap-2 mb-1">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>
                  <span className="text-xs text-[#22c55e] uppercase tracking-wider font-medium">Chosen name</span>
                </div>
                <h2 className="text-xl font-semibold text-[var(--text-primary)]">{chosenName}</h2>
                {project?.chosen_domain && <p className="text-sm font-mono text-[var(--accent)]/60 mt-1">{project.chosen_domain}</p>}
              </div>
            )}

            {/* Saved names */}
            {savedResults.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-3">Saved names</h2>
                <div className="space-y-2">
                  {savedResults.map((result: any) => (
                    <div key={result.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: result.gradient || 'var(--bg-elevated)' }}>
                          <span className="text-xs font-bold" style={{ color: result.text_color || '#fff' }}>{result.name?.[0]}</span>
                        </div>
                        <div className="min-w-0">
                          <span className="text-sm text-[var(--text-primary)] font-medium">{result.name}</span>
                          {result.exact_domain && <span className="text-xs font-mono text-[var(--text-secondary)]/40 ml-2">{result.exact_domain}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {result.is_chosen ? (
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[#22c55e]/10 text-[#22c55e] uppercase tracking-wider">Chosen</span>
                        ) : (
                          <button onClick={() => handleChooseName(result)} disabled={choosing}
                            className="px-3 py-1 rounded-lg text-xs text-[var(--accent)]/60 hover:text-[var(--accent)] bg-[var(--accent)]/[0.06] hover:bg-[var(--accent)]/10 border border-[var(--accent)]/10 transition-all disabled:opacity-40">
                            Choose this name
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
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

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import AppShell from '@/components/AppShell';
import { NAME_STYLES, CATEGORY_COLORS } from '@/lib/types';

function ConfigureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn } = useAuth();
  const preselectedProjectId = searchParams.get('projectId');

  const [industry, setIndustry] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [nameStyles, setNameStyles] = useState<string[]>([]);
  const [customStyles, setCustomStyles] = useState<string[]>([]);
  const [customStyleInput, setCustomStyleInput] = useState('');
  const [phoneticTransparency, setPhoneticTransparency] = useState('');
  const [competitorNames, setCompetitorNames] = useState('');
  const [otherDetails, setOtherDetails] = useState('');
  const [obscurityLevel, setObscurityLevel] = useState(50);
  const [tld, setTld] = useState('com');
  const [tldError, setTldError] = useState('');
  const [tldValidating, setTldValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Project selection
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(preselectedProjectId || 'new');

  useEffect(() => {
    if (isSignedIn) {
      fetch('/api/projects').then(r => r.json()).then(({ projects: p }) => {
        setProjects(p || []);
      }).catch(() => {});
    }
  }, [isSignedIn]);

  useEffect(() => {
    const desc = localStorage.getItem('nc_description') || '';
    if (desc) setBusinessDescription(desc);
  }, []);

  const toggleStyle = (id: string) => {
    setNameStyles(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const addCustomStyle = () => {
    const val = customStyleInput.trim();
    if (val && !customStyles.includes(val)) { setCustomStyles(prev => [...prev, val]); setCustomStyleInput(''); }
  };

  const removeCustomStyle = (style: string) => { setCustomStyles(prev => prev.filter(s => s !== style)); };

  const validateAndSetTld = async (value: string) => {
    const clean = value.toLowerCase().replace(/^\./, '').replace(/[^a-z0-9]/g, '');
    setTld(clean);
    setTldError('');
    if (!clean) return;
    setTldValidating(true);
    try {
      const resp = await fetch(`/api/validate-tld?tld=${clean}`);
      const data = await resp.json();
      if (!data.valid) setTldError(`".${clean}" is not a recognized TLD`);
    } catch {} finally { setTldValidating(false); }
  };

  const obscurityLabel = obscurityLevel < 20 ? 'Very familiar' : obscurityLevel < 40 ? 'Mostly familiar' : obscurityLevel < 60 ? 'Balanced' : obscurityLevel < 80 ? 'Quite unique' : 'Very obscure';

  const handleSubmit = async () => {
    if (tldError || submitting) return;
    setSubmitting(true);

    const config = {
      businessDescription: businessDescription, industry, nameStyles, customStyles,
      phoneticTransparency, competitorNames, otherDetails,
      obscurityLevel, tld: tld || 'com',
    };

    try {
      let projectId = selectedProjectId;

      // Create project if needed
      if (projectId === 'new' || !projectId) {
        if (!isSignedIn) {
          // Anonymous — store config locally and redirect to sign in
          localStorage.setItem('nc_config', JSON.stringify(config));
          router.push('/sign-in');
          return;
        }
        const projR = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: businessDescription ? businessDescription.slice(0, 50) : 'Untitled Project' }),
        });
        if (!projR.ok) throw new Error('Failed to create project');
        const { project } = await projR.json();
        projectId = project.id;
      }

      // Create search
      const searchR = await fetch('/api/searches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, config }),
      });
      if (!searchR.ok) throw new Error('Failed to create search');
      const { search } = await searchR.json();

      // Navigate to results
      router.push(`/projects/${projectId}/names/search/${search.id}`);
    } catch (err) {
      console.error('Submit error:', err);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <AppShell />
      <main className="max-w-2xl mx-auto px-4 py-8 pb-28">
        <h1 className="text-2xl sm:text-3xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Fine-tune your names
        </h1>
        <p className="text-[var(--text-secondary)] text-sm mb-8">These are optional — you can skip straight to results.</p>

        <div className="space-y-8">
          {/* Project selector (signed in only) */}
          {isSignedIn && projects.length > 0 && !preselectedProjectId && (
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Add to project</label>
              <select value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm"
                style={{ appearance: 'none' }}>
                <option value="new">+ New project</option>
                {projects.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {/* Business description */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Business description</label>
            <textarea value={businessDescription} onChange={e => setBusinessDescription(e.target.value)} placeholder="Describe your business..."
              rows={3} className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 resize-none text-sm" />
          </div>

          {/* TLD */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Target domain extension</label>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-secondary)]">.</span>
              <input type="text" value={tld} onChange={(e) => validateAndSetTld(e.target.value)} placeholder="com"
                className="w-24 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm" />
              {tldValidating && <span className="text-xs text-[var(--text-secondary)]">checking...</span>}
            </div>
            {tldError && <p className="text-xs text-red-400 mt-1">{tldError}</p>}
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Industry (optional)</label>
            <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="e.g. Fintech, Healthcare, E-commerce..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 text-sm" />
          </div>

          {/* Name styles */}
          <div>
            <label className="block text-sm font-medium mb-3 text-[var(--text-secondary)]">Preferred name styles</label>
            <div className="flex flex-wrap gap-2">
              {NAME_STYLES.map((style) => (
                <button key={style.id} onClick={() => toggleStyle(style.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all border ${
                    nameStyles.includes(style.id)
                      ? 'border-[var(--accent)] text-[var(--accent)]' : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-dim)]'
                  }`}
                  style={nameStyles.includes(style.id) ? { background: (CATEGORY_COLORS as any)[style.id] + '15' } : {}}>
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Obscurity */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Name uniqueness</label>
            <div className="flex items-center gap-4">
              <input type="range" min="0" max="100" value={obscurityLevel} onChange={(e) => setObscurityLevel(Number(e.target.value))}
                className="flex-1 accent-[var(--accent)]" />
              <span className="text-xs text-[var(--accent)] w-28 text-right">{obscurityLabel}</span>
            </div>
          </div>

          {/* Competitors */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Names you admire?</label>
            <input type="text" value={competitorNames} onChange={(e) => setCompetitorNames(e.target.value)} placeholder="e.g. Stripe, Linear, Notion..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 text-sm" />
          </div>

          {/* Other details */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Anything else?</label>
            <textarea value={otherDetails} onChange={(e) => setOtherDetails(e.target.value)} placeholder="Any other preferences, constraints, or ideas..."
              rows={3} className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 resize-none text-sm" />
          </div>
        </div>

        {/* Submit bar */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-[var(--bg-primary)]/90 backdrop-blur-xl border-t border-[var(--border)]">
          <div className="max-w-2xl mx-auto flex justify-between items-center">
            <button onClick={() => router.back()} className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors">Back</button>
            <button onClick={handleSubmit} disabled={!!tldError || submitting}
              className="bg-[var(--accent)] text-[#0a0a0f] px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-30 flex items-center gap-2">
              {submitting ? 'Creating...' : 'Generate names'}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ConfigurePage() {
  return (
    <Suspense fallback={<div className="min-h-screen"><AppShell /><main className="max-w-2xl mx-auto px-4 py-8"><div className="h-12 bg-[var(--bg-secondary)] rounded-xl pulse" /></main></div>}>
      <ConfigureContent />
    </Suspense>
  );
}

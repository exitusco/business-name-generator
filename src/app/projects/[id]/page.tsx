'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';

const COMPONENT_META: Record<string, { label: string; description: string; icon: string; enabled: boolean }> = {
  business_name: { label: 'Business Name', description: 'Find the perfect name for your business', icon: '✦', enabled: true },
  color_palette: { label: 'Color Palette', description: 'Define your brand colors', icon: '◆', enabled: false },
  logo_ideas: { label: 'Logo Ideas', description: 'Explore logo concepts', icon: '◎', enabled: false },
  logo_design: { label: 'Logo Design', description: 'Create your final logo', icon: '▣', enabled: false },
  design_elements: { label: 'Design Elements', description: 'Patterns, textures, and more', icon: '❖', enabled: false },
  typography: { label: 'Typography', description: 'Choose your brand typefaces', icon: 'Aa', enabled: false },
};

export default function ProjectPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const r = await fetch(`/api/projects/${projectId}`);
      if (r.ok) {
        const { project: p } = await r.json();
        setProject(p);
      }
    } catch {} finally { setLoading(false); }
  };

  const getComponentStatus = (type: string) => {
    const comp = project?.project_components?.find((c: any) => c.component_type === type);
    return comp?.status || 'incomplete';
  };

  if (loading) return (
    <div className="min-h-screen">
      <AppShell projectId={projectId} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="h-8 w-48 bg-[var(--bg-secondary)] rounded pulse mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] pulse" />)}
        </div>
      </main>
    </div>
  );

  return (
    <div className="min-h-screen">
      <AppShell projectId={projectId} />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">{project?.name || 'Project'}</h1>
            {project?.chosen_domain && (
              <p className="text-sm font-mono text-[var(--accent)]/60 mt-1">{project.chosen_domain}</p>
            )}
          </div>
          <button
            onClick={() => router.push(`/projects/${projectId}/settings`)}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1.5"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09"/>
            </svg>
            Settings
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(COMPONENT_META).map(([type, meta]) => {
            const status = getComponentStatus(type);
            const isEnabled = meta.enabled;

            return (
              <button
                key={type}
                onClick={() => isEnabled ? router.push(`/projects/${projectId}/names`) : null}
                disabled={!isEnabled}
                className={`text-left p-5 rounded-xl border transition-all ${
                  isEnabled
                    ? 'bg-[var(--bg-secondary)] border-[var(--border)] hover:border-[var(--accent-dim)] cursor-pointer group'
                    : 'bg-[var(--bg-secondary)]/50 border-[var(--border)]/50 cursor-not-allowed opacity-40'
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="text-lg">{meta.icon}</span>
                  {status === 'complete' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#22c55e]/10 text-[#22c55e] uppercase tracking-wider">Done</span>
                  ) : status === 'in_progress' ? (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[var(--accent)]/10 text-[var(--accent)] uppercase tracking-wider">In progress</span>
                  ) : !isEnabled ? (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-white/[0.04] text-[var(--text-secondary)]/30 uppercase tracking-wider">Coming soon</span>
                  ) : null}
                </div>
                <h3 className={`text-sm font-medium mb-1 ${isEnabled ? 'text-[var(--text-primary)] group-hover:text-[var(--accent)]' : 'text-[var(--text-secondary)]/50'} transition-colors`}>
                  {meta.label}
                </h3>
                <p className="text-xs text-[var(--text-secondary)]/50">{meta.description}</p>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
}

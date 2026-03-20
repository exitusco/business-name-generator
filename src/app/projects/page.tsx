'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import AppShell from '@/components/AppShell';

interface Project {
  id: string;
  name: string;
  chosen_name: string | null;
  chosen_domain: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  project_components: Array<{ component_type: string; status: string }>;
}

export default function ProjectsPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const r = await fetch('/api/projects');
      if (r.ok) {
        const { projects: p } = await r.json();
        setProjects(p || []);
      }
    } catch {} finally { setLoading(false); }
  };

  const handleNewProject = async () => {
    if (!isSignedIn) {
      // Could show sign-in prompt
      return;
    }
    setCreating(true);
    try {
      const r = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Untitled Project' }),
      });
      if (r.ok) {
        const { project } = await r.json();
        router.push(`/projects/${project.id}`);
      }
    } catch {} finally { setCreating(false); }
  };

  const getComponentStatus = (project: Project, type: string) => {
    const comp = project.project_components?.find(c => c.component_type === type);
    return comp?.status || 'incomplete';
  };

  return (
    <div className="min-h-screen">
      <AppShell />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Projects</h1>
          {isSignedIn ? (
            <button
              onClick={handleNewProject}
              disabled={creating}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--accent)] text-[#0a0a0f] hover:opacity-90 transition-all disabled:opacity-40 flex items-center gap-2"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
              New project
            </button>
          ) : (
            <p className="text-sm text-[var(--text-secondary)]">Sign in to create projects</p>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] pulse" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-16">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-30">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
            </svg>
            <p className="text-[var(--text-secondary)] mb-2">No projects yet</p>
            <p className="text-sm text-[var(--text-secondary)]/50 mb-6">Start from the home page to create your first project</p>
            <button onClick={() => router.push('/')} className="text-sm text-[var(--accent)] hover:underline">
              Go to home page →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map(project => {
              const nameStatus = getComponentStatus(project, 'business_name');
              return (
                <button
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="w-full text-left p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] hover:border-[var(--accent-dim)] transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-[var(--text-primary)] group-hover:text-[var(--accent)] transition-colors">
                        {project.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        {project.chosen_domain && (
                          <span className="text-xs font-mono text-[var(--accent)]/60">{project.chosen_domain}</span>
                        )}
                        <span className="text-xs text-[var(--text-secondary)]/40">
                          {new Date(project.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider ${
                        nameStatus === 'complete' ? 'bg-[#22c55e]/10 text-[#22c55e]' :
                        nameStatus === 'in_progress' ? 'bg-[var(--accent)]/10 text-[var(--accent)]' :
                        'bg-white/[0.04] text-[var(--text-secondary)]/40'
                      }`}>
                        {nameStatus === 'complete' ? 'Named' : nameStatus === 'in_progress' ? 'In progress' : 'New'}
                      </span>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]/30 group-hover:text-[var(--accent)] transition-colors">
                        <path d="M9 18l6-6-6-6"/>
                      </svg>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

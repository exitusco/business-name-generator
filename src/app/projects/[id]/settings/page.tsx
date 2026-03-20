'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';

export default function ProjectSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/projects/${projectId}`);
        if (r.ok) { const { project } = await r.json(); setName(project.name || ''); }
      } catch {} finally { setLoading(false); }
    })();
  }, [projectId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      router.back();
    } catch {} finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen">
      <AppShell />
      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold mb-6 text-[var(--text-primary)]">Project Settings</h1>
        {loading ? (
          <div className="h-12 rounded-xl bg-[var(--bg-secondary)] pulse" />
        ) : (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Project name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => router.back()} className="px-4 py-2 rounded-xl text-sm text-[var(--text-secondary)] border border-[var(--border)] hover:border-[var(--accent-dim)] transition-colors">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving || !name.trim()}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--accent)] text-[#0a0a0f] hover:opacity-90 disabled:opacity-40 transition-all">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

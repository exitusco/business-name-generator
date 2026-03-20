'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import AppShell from '@/components/AppShell';

export default function SearchSettingsPage() {
  const router = useRouter();
  const params = useParams();
  const searchId = params.searchId as string;
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/searches/${searchId}`).then(r => r.json()).then(({ search }) => {
      setConfig(search?.config || {});
    }).catch(() => {});
  }, [searchId]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`/api/searches/${searchId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      router.back();
    } catch {} finally { setSaving(false); }
  };

  if (!config) return <div className="min-h-screen"><AppShell showRecentSearch={false} /><main className="max-w-lg mx-auto px-4 py-8"><div className="h-12 rounded-xl bg-[var(--bg-secondary)] pulse" /></main></div>;

  return (
    <div className="min-h-screen">
      <AppShell showRecentSearch={false} />
      <main className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold mb-6 text-[var(--text-primary)]">Search Settings</h1>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">Business Description</label>
            <textarea value={config.businessDescription || ''} onChange={e => setConfig({ ...config, businessDescription: e.target.value })} rows={3}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">TLD</label>
            <input value={config.tld || 'com'} onChange={e => setConfig({ ...config, tld: e.target.value })}
              className="w-24 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-[var(--text-secondary)]">Notes</label>
            <textarea value={config.otherDetails || ''} onChange={e => setConfig({ ...config, otherDetails: e.target.value })} rows={3}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] text-sm resize-none" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => router.back()} className="px-4 py-2 rounded-xl text-sm text-[var(--text-secondary)] border border-[var(--border)]">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--accent)] text-[#0a0a0f] hover:opacity-90 disabled:opacity-40">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </main>
    </div>
  );
}

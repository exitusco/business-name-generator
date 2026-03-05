'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { SavedName } from '@/lib/types';

function porkbunSearchUrl(domain: string): string {
  return `https://porkbun.com/checkout/search?q=${encodeURIComponent(domain)}`;
}

export default function SavedPage() {
  const router = useRouter();
  const [savedNames, setSavedNames] = useState<SavedName[]>([]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nc_saved');
      if (saved) {
        try {
          setSavedNames(JSON.parse(saved));
        } catch {}
      }
    }
  }, []);

  const handleRemove = (name: string) => {
    const filtered = savedNames.filter(s => s.name !== name);
    setSavedNames(filtered);
    if (typeof window !== 'undefined') {
      localStorage.setItem('nc_saved', JSON.stringify(filtered));
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1
          className="text-2xl sm:text-3xl mb-2"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Saved names
        </h1>
        <p className="text-[var(--text-secondary)] mb-8 text-sm">
          {savedNames.length === 0
            ? "You haven't saved any names yet."
            : `${savedNames.length} name${savedNames.length === 1 ? '' : 's'} saved`}
        </p>

        {savedNames.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--bg-elevated)] flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <p className="text-[var(--text-secondary)] mb-4">Names you save will appear here.</p>
            <button
              onClick={() => router.push('/')}
              className="text-sm text-[var(--accent)] hover:underline"
            >
              Start generating names
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {savedNames.map((saved) => (
              <div
                key={saved.name}
                className="name-card rounded-2xl border border-[var(--border)] overflow-hidden group"
              >
                {/* Visual */}
                <div
                  className="h-36 flex items-center justify-center p-6 relative"
                  style={{ background: saved.gradient }}
                >
                  <h2
                    className="text-2xl text-center"
                    style={{
                      fontFamily: saved.fontFamily,
                      color: saved.textColor,
                      textShadow: '0 2px 12px rgba(0,0,0,0.3)',
                    }}
                  >
                    {saved.name}
                  </h2>

                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(saved.name)}
                    className="absolute top-3 right-3 p-2 rounded-lg bg-black/30 text-white/60 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-black/50 transition-all"
                    title="Remove from saved"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>

                {/* Domains */}
                <div className="bg-[var(--bg-secondary)] px-4 py-3">
                  {saved.availableDomains.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {saved.availableDomains.map((d) => (
                        <a
                          key={d}
                          href={porkbunSearchUrl(d)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="domain-pill inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-[#4ade80]/15 text-[#4ade80] border border-[#4ade80]/30"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                          {d}
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                          </svg>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--text-secondary)]">
                      No available .com domains found at time of save
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

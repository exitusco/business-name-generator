'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleSubmit = () => {
    if (!description.trim()) return;
    setIsSubmitting(true);
    // Store description and navigate to configure
    if (typeof window !== 'undefined') {
      localStorage.setItem('nc_description', description.trim());
    }
    router.push('/configure');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--accent)] opacity-[0.03] rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#6b4d8a] opacity-[0.04] rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--accent)] to-[#6b4d8a] flex items-center justify-center">
            <span className="text-[#0a0a0f] font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>P</span>
          </div>
          <span className="text-2xl font-semibold tracking-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
            Poacher
          </span>
        </div>

        {/* Tagline */}
        <h1
          className="text-center text-3xl sm:text-4xl md:text-5xl font-light leading-tight mb-3 text-[var(--text-primary)]"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Tell me about your business
        </h1>
        <p className="text-center text-[var(--text-secondary)] mb-10 text-base sm:text-lg">
          Describe what you&apos;re building and we&apos;ll find the perfect name.
        </p>

        {/* Input area */}
        <div className="relative">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="We're a fintech startup that helps freelancers manage invoices and get paid faster..."
            rows={4}
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-2xl px-5 py-4 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/50 resize-none text-base leading-relaxed"
            autoFocus
          />
          <button
            onClick={handleSubmit}
            disabled={!description.trim() || isSubmitting}
            className="absolute bottom-4 right-4 bg-[var(--accent)] text-[#0a0a0f] px-5 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0a0a0f]/30 border-t-[#0a0a0f] rounded-full spinner" />
                Loading
              </>
            ) : (
              <>
                Next
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </>
            )}
          </button>
        </div>

        {/* Saved names link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/saved')}
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors underline underline-offset-4 decoration-[var(--border)] hover:decoration-[var(--accent)]"
          >
            return to my saved names&hellip;
          </button>
        </div>
      </div>
    </div>
  );
}

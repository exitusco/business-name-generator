'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { NAME_STYLES } from '@/lib/types';

export default function ConfigurePage() {
  const router = useRouter();
  const [industry, setIndustry] = useState('');
  const [nameStyles, setNameStyles] = useState<string[]>([]);
  const [phoneticTransparency, setPhoneticTransparency] = useState('');
  const [domainModifiers, setDomainModifiers] = useState('');
  const [competitorNames, setCompetitorNames] = useState('');
  const [otherDetails, setOtherDetails] = useState('');
  const [prioritizeAvailability, setPrioritizeAvailability] = useState('');

  useEffect(() => {
    // Load any existing config
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nc_config');
      if (saved) {
        try {
          const c = JSON.parse(saved);
          setIndustry(c.industry || '');
          setNameStyles(c.nameStyles || []);
          setPhoneticTransparency(c.phoneticTransparency || '');
          setDomainModifiers(c.domainModifiers || '');
          setCompetitorNames(c.competitorNames || '');
          setOtherDetails(c.otherDetails || '');
          setPrioritizeAvailability(c.prioritizeAvailability || '');
        } catch {}
      }
    }
  }, []);

  const toggleStyle = (style: string) => {
    setNameStyles(prev =>
      prev.includes(style) ? prev.filter(s => s !== style) : [...prev, style]
    );
  };

  const handleSubmit = () => {
    const desc = typeof window !== 'undefined' ? localStorage.getItem('nc_description') || '' : '';
    const config = {
      businessDescription: desc,
      industry,
      nameStyles,
      phoneticTransparency,
      domainModifiers,
      competitorNames,
      otherDetails,
      prioritizeAvailability,
    };
    if (typeof window !== 'undefined') {
      localStorage.setItem('nc_config', JSON.stringify(config));
    }
    router.push('/results');
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 pb-24">
        <h1
          className="text-2xl sm:text-3xl mb-2"
          style={{ fontFamily: "'DM Serif Display', serif" }}
        >
          Fine-tune your names
        </h1>
        <p className="text-[var(--text-secondary)] mb-8 text-sm">
          All fields are optional. Skip ahead if you want to dive right in.
        </p>

        <div className="space-y-8">
          {/* Industry */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
              What industry is your business in?
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Financial technology, Healthcare, Restaurant..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 text-sm"
            />
          </div>

          {/* Name styles */}
          <div>
            <label className="block text-sm font-medium mb-3 text-[var(--text-secondary)]">
              Select which naming styles you like
            </label>
            <div className="flex flex-wrap gap-2">
              {NAME_STYLES.map((style) => (
                <button
                  key={style}
                  onClick={() => toggleStyle(style)}
                  className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${
                    nameStyles.includes(style)
                      ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)]'
                      : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-dim)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Phonetic transparency */}
          <div>
            <label className="block text-sm font-medium mb-3 text-[var(--text-secondary)]">
              Do the names need to be phonetically transparent?
            </label>
            <p className="text-xs text-[var(--text-secondary)]/60 mb-3">
              Easy to spell correctly just from hearing the name spoken aloud.
            </p>
            <div className="flex gap-3">
              {['Yes', 'No', 'No preference'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPhoneticTransparency(opt.toLowerCase())}
                  className={`px-4 py-2 rounded-lg text-sm transition-all border ${
                    phoneticTransparency === opt.toLowerCase()
                      ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)]'
                      : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-dim)]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Domain modifiers */}
          <div>
            <label className="block text-sm font-medium mb-3 text-[var(--text-secondary)]">
              Are domain modifiers acceptable?
            </label>
            <p className="text-xs text-[var(--text-secondary)]/60 mb-3">
              Like join____.com, use____.com, get____.com
            </p>
            <div className="flex gap-3">
              {['Yes', 'No', 'No preference'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setDomainModifiers(opt.toLowerCase())}
                  className={`px-4 py-2 rounded-lg text-sm transition-all border ${
                    domainModifiers === opt.toLowerCase()
                      ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)]'
                      : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-dim)]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Prioritize available domains */}
          <div>
            <label className="block text-sm font-medium mb-3 text-[var(--text-secondary)]">
              Prioritize names likely to have .com available?
            </label>
            <p className="text-xs text-[var(--text-secondary)]/60 mb-3">
              The AI will favor more unique, invented, or uncommon names that are less likely to already be registered.
            </p>
            <div className="flex gap-3">
              {['Yes', 'No', 'No preference'].map((opt) => (
                <button
                  key={opt}
                  onClick={() => setPrioritizeAvailability(opt.toLowerCase())}
                  className={`px-4 py-2 rounded-lg text-sm transition-all border ${
                    prioritizeAvailability === opt.toLowerCase()
                      ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)]'
                      : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-dim)]'
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {/* Competitor names */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
              Any competitors whose name you like?
            </label>
            <input
              type="text"
              value={competitorNames}
              onChange={(e) => setCompetitorNames(e.target.value)}
              placeholder="e.g. Stripe, Linear, Notion..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 text-sm"
            />
          </div>

          {/* Other details */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
              Any other details?
            </label>
            <textarea
              value={otherDetails}
              onChange={(e) => setOtherDetails(e.target.value)}
              placeholder="e.g. We want something that sounds modern and premium. Max 2 syllables..."
              rows={3}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 resize-none text-sm"
            />
          </div>
        </div>

        {/* Submit */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/90 backdrop-blur-xl border-t border-[var(--border)] p-4">
          <div className="max-w-2xl mx-auto flex gap-3">
            <button
              onClick={() => router.push('/')}
              className="px-5 py-3 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)]"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 bg-[var(--accent)] text-[#0a0a0f] px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
            >
              Generate names
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

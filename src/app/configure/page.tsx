'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/Header';
import { NAME_STYLES, CATEGORY_COLORS } from '@/lib/types';

export default function ConfigurePage() {
  const router = useRouter();
  const [industry, setIndustry] = useState('');
  const [nameStyles, setNameStyles] = useState<string[]>([]);
  const [customStyles, setCustomStyles] = useState<string[]>([]);
  const [customStyleInput, setCustomStyleInput] = useState('');
  const [phoneticTransparency, setPhoneticTransparency] = useState('');
  const [domainModifiers, setDomainModifiers] = useState('');
  const [competitorNames, setCompetitorNames] = useState('');
  const [otherDetails, setOtherDetails] = useState('');
  const [obscurityLevel, setObscurityLevel] = useState(50);
  const [tld, setTld] = useState('com');
  const [tldError, setTldError] = useState('');
  const [tldValidating, setTldValidating] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nc_config');
      if (saved) {
        try {
          const c = JSON.parse(saved);
          setIndustry(c.industry || '');
          setNameStyles(c.nameStyles || []);
          setCustomStyles(c.customStyles || []);
          setPhoneticTransparency(c.phoneticTransparency || '');
          setDomainModifiers(c.domainModifiers || '');
          setCompetitorNames(c.competitorNames || '');
          setOtherDetails(c.otherDetails || '');
          setObscurityLevel(c.obscurityLevel ?? 50);
          setTld(c.tld || 'com');
        } catch {}
      }
    }
  }, []);

  const toggleStyle = (id: string) => {
    setNameStyles(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);
  };

  const addCustomStyle = () => {
    const val = customStyleInput.trim();
    if (val && !customStyles.includes(val)) {
      setCustomStyles(prev => [...prev, val]);
      setCustomStyleInput('');
    }
  };

  const removeCustomStyle = (style: string) => {
    setCustomStyles(prev => prev.filter(s => s !== style));
  };

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
    } catch {
      // Don't block on validation failure
    } finally {
      setTldValidating(false);
    }
  };

  const obscurityLabel = obscurityLevel < 20 ? 'Very familiar' : obscurityLevel < 40 ? 'Mostly familiar' : obscurityLevel < 60 ? 'Balanced' : obscurityLevel < 80 ? 'Quite unique' : 'Very obscure';

  const handleSubmit = () => {
    if (tldError) return;
    const desc = typeof window !== 'undefined' ? localStorage.getItem('nc_description') || '' : '';
    const config = {
      businessDescription: desc, industry, nameStyles, customStyles,
      phoneticTransparency, domainModifiers, competitorNames, otherDetails,
      obscurityLevel, tld: tld || 'com',
    };
    if (typeof window !== 'undefined') localStorage.setItem('nc_config', JSON.stringify(config));
    router.push('/results');
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8 pb-28">
        <h1 className="text-2xl sm:text-3xl mb-2" style={{ fontFamily: "'DM Serif Display', serif" }}>
          Fine-tune your names
        </h1>
        <p className="text-[var(--text-secondary)] mb-8 text-sm">All fields are optional. Skip ahead if you want.</p>

        <div className="space-y-8">
          {/* TLD */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Domain extension</label>
            <div className="flex items-center gap-2">
              <span className="text-[var(--text-secondary)]">.</span>
              <input
                type="text"
                value={tld}
                onChange={(e) => validateAndSetTld(e.target.value)}
                placeholder="com"
                className="w-32 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm"
              />
              {tldValidating && <div className="w-4 h-4 border-2 border-[var(--accent)]/30 border-t-[var(--accent)] rounded-full spinner" />}
            </div>
            {tldError && <p className="text-xs text-red-400 mt-1">{tldError}</p>}
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">What industry is your business in?</label>
            <input type="text" value={industry} onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Financial technology, Healthcare, Restaurant..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 text-sm" />
          </div>

          {/* Name styles — refactored */}
          <div>
            <label className="block text-sm font-medium mb-3 text-[var(--text-secondary)]">What kind of names do you like?</label>
            <div className="flex flex-wrap gap-2">
              {NAME_STYLES.map((style) => (
                <button key={style.id} onClick={() => toggleStyle(style.id)}
                  className={`px-3 py-2 rounded-xl text-xs transition-all border ${
                    nameStyles.includes(style.id)
                      ? 'border-[var(--accent)] text-[var(--text-primary)]'
                      : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-dim)] hover:text-[var(--text-primary)]'
                  }`}
                  style={nameStyles.includes(style.id) ? { backgroundColor: (CATEGORY_COLORS[style.id] || '#c4a1ff') + '18', borderColor: CATEGORY_COLORS[style.id] || '#c4a1ff' } : {}}
                >
                  <span className="font-medium">{style.label}</span>
                  <span className="block text-[10px] opacity-60 mt-0.5">{style.desc}</span>
                </button>
              ))}
            </div>

            {/* Custom styles */}
            <div className="mt-3">
              <div className="flex gap-2">
                <input type="text" value={customStyleInput}
                  onChange={(e) => setCustomStyleInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomStyle())}
                  placeholder="Add your own style..."
                  className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 text-xs" />
                <button onClick={addCustomStyle}
                  className="px-3 py-2 rounded-xl text-xs bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                  Add
                </button>
              </div>
              {customStyles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {customStyles.map(s => (
                    <span key={s} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/20">
                      {s}
                      <button onClick={() => removeCustomStyle(s)} className="hover:text-white">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Obscurity / domain availability slider */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">
              Name uniqueness
            </label>
            <p className="text-xs text-[var(--text-secondary)]/60 mb-4">
              More unique names are more likely to have available domains, but may be harder to remember.
            </p>
            <div className="space-y-2">
              <input type="range" min="0" max="100" value={obscurityLevel}
                onChange={(e) => setObscurityLevel(parseInt(e.target.value))} />
              <div className="flex justify-between text-[10px] text-[var(--text-secondary)]">
                <span>Familiar</span>
                <span className="text-[var(--accent)] font-medium">{obscurityLabel}</span>
                <span>Obscure</span>
              </div>
            </div>
          </div>

          {/* Phonetic transparency */}
          <div>
            <label className="block text-sm font-medium mb-3 text-[var(--text-secondary)]">Phonetically transparent?</label>
            <p className="text-xs text-[var(--text-secondary)]/60 mb-3">Easy to spell from hearing it spoken.</p>
            <div className="flex gap-3">
              {['Yes', 'No', 'No preference'].map((opt) => (
                <button key={opt} onClick={() => setPhoneticTransparency(opt.toLowerCase())}
                  className={`px-4 py-2 rounded-lg text-sm transition-all border ${
                    phoneticTransparency === opt.toLowerCase()
                      ? 'bg-[var(--accent)]/15 border-[var(--accent)] text-[var(--accent)]'
                      : 'bg-[var(--bg-secondary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--accent-dim)]'
                  }`}>{opt}</button>
              ))}
            </div>
          </div>

          {/* Competitors */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Competitors whose name you like?</label>
            <input type="text" value={competitorNames} onChange={(e) => setCompetitorNames(e.target.value)}
              placeholder="e.g. Stripe, Linear, Notion..."
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 text-sm" />
          </div>

          {/* Other details */}
          <div>
            <label className="block text-sm font-medium mb-2 text-[var(--text-secondary)]">Other details?</label>
            <textarea value={otherDetails} onChange={(e) => setOtherDetails(e.target.value)}
              placeholder="e.g. Modern, premium. Max 2 syllables..."
              rows={3}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 resize-none text-sm" />
          </div>
        </div>

        {/* Submit */}
        <div className="fixed bottom-0 left-0 right-0 bg-[#0a0a0f]/90 backdrop-blur-xl border-t border-[var(--border)] p-4">
          <div className="max-w-2xl mx-auto flex gap-3">
            <button onClick={() => router.back()}
              className="px-5 py-3 rounded-xl text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors border border-[var(--border)]">
              Back
            </button>
            <button onClick={handleSubmit} disabled={!!tldError}
              className="flex-1 bg-[var(--accent)] text-[#0a0a0f] px-5 py-3 rounded-xl text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-40 flex items-center justify-center gap-2">
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

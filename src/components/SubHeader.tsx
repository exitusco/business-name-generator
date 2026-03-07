'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useFeatures } from '@/hooks/useFeatures';
import ModelSelector from '@/components/ModelSelector';
import { USAGE_LIMITS } from '@/lib/supabase/types';

interface UsageData {
  generation: number;
  domain_check: number;
  saved_name: number;
}

export default function SubHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const features = useFeatures();

  // Model state — persisted to localStorage
  const [selectedModel, setSelectedModel] = useState(features.defaultModel);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('nc_selected_model');
      if (saved) setSelectedModel(saved);
    }
  }, []);
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    localStorage.setItem('nc_selected_model', modelId);
    // Also update config so generate route picks it up
    try {
      const config = JSON.parse(localStorage.getItem('nc_config') || '{}');
      config.selectedModel = modelId;
      localStorage.setItem('nc_config', JSON.stringify(config));
    } catch {}
  };

  // Usage state
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [usageOpen, setUsageOpen] = useState(false);
  const usageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchUsage();
    // Refresh usage every 60s
    const interval = setInterval(fetchUsage, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (usageRef.current && !usageRef.current.contains(e.target as Node)) setUsageOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchUsage = async () => {
    try {
      const r = await fetch('/api/usage');
      if (r.ok) {
        const { usage: u } = await r.json();
        if (u) setUsage(u);
      }
    } catch {}
  };

  // Determine limits based on tier
  const limits = USAGE_LIMITS[features.tier] || USAGE_LIMITS.anonymous;

  // Calculate the closest-to-limit metric for the progress bar
  const getUsagePercent = (used: number, limit: number | null) => {
    if (limit === null) return 0; // unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const metrics = usage ? [
    { key: 'generation', label: 'Names generated', used: usage.generation, limit: limits.generations_per_period, available: true },
    { key: 'domain_check', label: 'Domain verifications', used: usage.domain_check, limit: limits.domain_checks_per_period, available: features.advancedAvailability },
    { key: 'saved_name', label: 'Names saved', used: usage.saved_name, limit: limits.saved_names_per_period, available: true },
  ] : [];

  const highestUsagePercent = metrics.reduce((max, m) => {
    const pct = getUsagePercent(m.used, m.limit);
    return pct > max ? pct : max;
  }, 0);

  const progressColor = highestUsagePercent >= 90 ? '#f87171' : highestUsagePercent >= 70 ? '#E69F00' : 'var(--accent)';

  // Don't show on sign-in/sign-up pages
  if (pathname?.startsWith('/sign-')) return null;

  return (
    <div className="sticky top-14 z-40 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 h-9 flex items-center justify-between gap-4">
        {/* Left: Model selector */}
        <div className="flex items-center gap-2 min-w-0">
          <ModelSelector selectedModel={selectedModel} onSelect={handleModelChange} availableModels={features.availableModels} />
        </div>

        {/* Right: Usage indicator */}
        <div ref={usageRef} className="relative shrink-0">
          <button
            onClick={() => setUsageOpen(!usageOpen)}
            className="flex items-center gap-2.5 px-2 py-1 rounded-lg hover:bg-white/[0.03] transition-colors"
          >
            {usage ? (
              <>
                {/* Mini progress bar */}
                <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(highestUsagePercent, 2)}%`, background: progressColor }}
                  />
                </div>
                <span className="text-[10px] text-[var(--text-secondary)]/50 hidden sm:inline">Usage</span>
                <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--text-secondary)]/40">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </>
            ) : (
              <div className="w-16 h-1.5 rounded-full bg-white/[0.04] pulse" />
            )}
          </button>

          {/* Usage dropdown */}
          {usageOpen && usage && (
            <div className="absolute top-full right-0 mt-1 w-64 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="px-3 py-2 border-b border-[var(--border)]">
                <span className="text-[10px] text-[var(--text-secondary)]/50 uppercase tracking-wider">Current period usage</span>
              </div>
              <div className="py-2">
                {metrics.map(m => {
                  const pct = getUsagePercent(m.used, m.limit);
                  const barColor = !m.available ? 'var(--text-secondary)' : pct >= 90 ? '#f87171' : pct >= 70 ? '#E69F00' : 'var(--accent)';

                  return (
                    <div key={m.key} className={`px-3 py-2 ${!m.available ? 'opacity-35' : ''}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] text-[var(--text-secondary)]">{m.label}</span>
                        <span className="text-[11px] text-[var(--text-primary)] font-mono">
                          {m.used}{m.limit !== null ? ` / ${m.limit}` : ''}
                          {m.limit === null && <span className="text-[var(--text-secondary)]/40 ml-1">∞</span>}
                        </span>
                      </div>
                      {m.limit !== null ? (
                        <div className="w-full h-1 rounded-full bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.max(pct, 1)}%`, background: barColor, opacity: m.available ? 1 : 0.3 }}
                          />
                        </div>
                      ) : (
                        <div className="w-full h-1 rounded-full bg-white/[0.03]" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="px-3 py-2 border-t border-[var(--border)]">
                <button
                  onClick={() => { router.push('/pricing'); setUsageOpen(false); }}
                  className="text-[10px] text-[var(--accent)]/60 hover:text-[var(--accent)] transition-colors"
                >
                  {features.tier === 'pro' ? 'Manage subscription' : 'Upgrade for higher limits'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

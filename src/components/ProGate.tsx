'use client';

import { useRouter } from 'next/navigation';

// Small inline badge for greyed-out options
export function ProBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider bg-[var(--accent)]/10 text-[var(--accent)]/70 border border-[var(--accent)]/15">
      Pro
    </span>
  );
}

// Tooltip-style explanation that appears on hover
export function ProTooltip({ children, message }: { children: React.ReactNode; message?: string }) {
  return (
    <div className="relative group/pro">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 rounded-lg bg-[#1a1a27] border border-[var(--border)] text-[10px] text-[var(--text-secondary)] whitespace-nowrap opacity-0 group-hover/pro:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl">
        {message || 'Available on the Pro plan'}
      </div>
    </div>
  );
}

// Larger upgrade prompt replacing a disabled feature area
export function UpgradePrompt({ feature, compact }: { feature: string; compact?: boolean }) {
  const router = useRouter();

  if (compact) {
    return (
      <button
        onClick={() => router.push('/pricing')}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] text-[var(--accent)]/70 bg-[var(--accent)]/[0.06] border border-[var(--accent)]/10 hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-all"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        {feature}
        <ProBadge />
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-3 px-4 rounded-xl bg-[var(--accent)]/[0.04] border border-[var(--accent)]/10">
      <div className="flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.6">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        <span className="text-xs text-[var(--text-secondary)]">{feature}</span>
        <ProBadge />
      </div>
      <button
        onClick={() => router.push('/pricing')}
        className="text-[11px] text-[var(--accent)]/60 hover:text-[var(--accent)] transition-colors underline underline-offset-2"
      >
        Upgrade to Pro
      </button>
    </div>
  );
}

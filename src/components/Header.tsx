'use client';

import { useRouter, usePathname } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';

interface HeaderProps {
  onRefresh?: () => void;
}

export default function Header({ onRefresh }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === '/';
  const isResults = pathname === '/results';

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0a0a0f]/80 border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-3">
          {!isHome && (
            <button
              onClick={() => router.push('/')}
              className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1.5"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
              <span className="hidden sm:inline">Start over</span>
            </button>
          )}
          {isResults && onRefresh && (
            <>
              <div className="w-px h-4 bg-[var(--border)]" />
              <button
                onClick={onRefresh}
                className="text-sm text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors flex items-center gap-1.5"
                title="Clear all names and chat, keep settings and saved names"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"/>
                </svg>
                <span className="hidden sm:inline">Fresh start</span>
              </button>
            </>
          )}
        </div>

        {/* Center: Logo */}
        <button
          onClick={() => router.push('/')}
          className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)] to-[#6b4d8a] flex items-center justify-center">
            <span className="text-[#0a0a0f] font-bold text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>P</span>
          </div>
          <span className="text-base font-semibold tracking-tight hidden sm:inline" style={{ fontFamily: "'Syne', sans-serif" }}>
            Poacher
          </span>
        </button>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/saved')}
            className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-secondary)] hover:text-[var(--accent)]"
            title="Saved names"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
          <button
            onClick={() => router.push('/configure')}
            className="p-2 rounded-lg hover:bg-[var(--bg-elevated)] transition-colors text-[var(--text-secondary)] hover:text-[var(--accent)]"
            title="Settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>

          {/* Auth */}
          <div className="ml-1">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--accent)]/10 text-[var(--accent)] hover:bg-[var(--accent)]/20 transition-colors border border-[var(--accent)]/20">
                  Sign in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                afterSignOutUrl="/"
                appearance={{
                  elements: {
                    avatarBox: 'w-8 h-8',
                  },
                }}
              />
            </SignedIn>
          </div>
        </div>
      </div>
    </header>
  );
}

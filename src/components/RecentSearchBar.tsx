'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface RecentSearchBarProps {
  projectId?: string;
}

export default function RecentSearchBar({ projectId }: RecentSearchBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [recentSearch, setRecentSearch] = useState<any>(null);

  useEffect(() => {
    if (pathname?.includes('/search/')) return;
    const url = projectId ? `/api/searches?projectId=${projectId}` : '/api/searches';
    fetch(url).then(r => r.json()).then(({ search }) => {
      if (search) setRecentSearch(search);
    }).catch(() => {});
  }, [pathname, projectId]);

  if (!recentSearch || pathname?.includes('/search/')) return null;

  const desc = recentSearch.config?.businessDescription;
  const truncated = desc ? (desc.length > 50 ? desc.slice(0, 47) + '…' : desc) : null;

  return (
    <div className="border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-4">
        <button
          onClick={() => router.push(`/projects/${recentSearch.project_id}/names/search/${recentSearch.id}`)}
          className="w-full py-2 flex items-center justify-center gap-2.5 group"
        >
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--accent)]/[0.06] border border-[var(--accent)]/10 group-hover:bg-[var(--accent)]/[0.1] group-hover:border-[var(--accent)]/20 transition-all">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-50 group-hover:opacity-80 transition-opacity">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8"/>
            </svg>
            <span className="text-xs text-[var(--accent)]/70 group-hover:text-[var(--accent)] transition-colors font-medium">
              Continue your search
            </span>
            {truncated && (
              <>
                <span className="text-[var(--accent)]/20">·</span>
                <span className="text-[11px] text-[var(--text-secondary)]/30 group-hover:text-[var(--text-secondary)]/50 transition-colors hidden sm:inline max-w-[200px] truncate">
                  {truncated}
                </span>
              </>
            )}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent)]/30 group-hover:text-[var(--accent)]/60 transition-colors">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
        </button>
      </div>
    </div>
  );
}

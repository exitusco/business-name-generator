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
  const truncated = desc ? (desc.length > 60 ? desc.slice(0, 57) + '...' : desc) : 'Your search';

  return (
    <div className="bg-[var(--accent)]/[0.04] border-b border-[var(--accent)]/10">
      <div className="max-w-6xl mx-auto px-4 h-8 flex items-center justify-center">
        <button
          onClick={() => router.push(`/projects/${recentSearch.project_id}/names/search/${recentSearch.id}`)}
          className="text-xs text-[var(--accent)]/60 hover:text-[var(--accent)] transition-colors flex items-center gap-1.5"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
          Return to your most recent search
          <span className="text-[var(--text-secondary)]/30 ml-1 hidden sm:inline">— {truncated}</span>
        </button>
      </div>
    </div>
  );
}

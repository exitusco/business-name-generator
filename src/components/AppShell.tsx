'use client';

import Header from '@/components/Header';
import SubHeader from '@/components/SubHeader';
import RecentSearchBar from '@/components/RecentSearchBar';

interface AppShellProps {
  children?: React.ReactNode;
  onRefresh?: () => void;
  projectId?: string; // for project-scoped recent search
  showRecentSearch?: boolean;
}

export default function AppShell({ children, onRefresh, projectId, showRecentSearch = true }: AppShellProps) {
  return (
    <>
      <Header onRefresh={onRefresh} />
      <SubHeader />
      {showRecentSearch && <RecentSearchBar projectId={projectId} />}
      {children}
    </>
  );
}

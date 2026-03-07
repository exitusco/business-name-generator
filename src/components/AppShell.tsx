'use client';

import Header from '@/components/Header';
import SubHeader from '@/components/SubHeader';

interface AppShellProps {
  children?: React.ReactNode;
  onRefresh?: () => void;
}

export default function AppShell({ children, onRefresh }: AppShellProps) {
  return (
    <>
      <Header onRefresh={onRefresh} />
      <SubHeader />
      {children}
    </>
  );
}

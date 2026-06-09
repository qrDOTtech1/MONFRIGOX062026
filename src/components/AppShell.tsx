'use client';

import BottomNav from './BottomNav';

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="page-container fade-in">{children}</div>
      <BottomNav />
    </>
  );
}

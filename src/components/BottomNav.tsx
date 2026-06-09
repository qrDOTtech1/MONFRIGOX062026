'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ScanLine, LayoutGrid, Heart, UserCircle } from 'lucide-react';

const items = [
  { href: '/scan', icon: ScanLine, label: 'Scan' },
  { href: '/dashboard', icon: LayoutGrid, label: 'Explorer' },
  { href: '/favorites', icon: Heart, label: 'Favoris' },
  { href: '/profile', icon: UserCircle, label: 'Profil' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-dark-800/90 backdrop-blur-lg border-t border-dark-600/50">
      <div className="max-w-lg mx-auto flex justify-around py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href} className={`nav-item py-2 px-3 ${active ? 'nav-item-active' : ''}`}>
              <Icon className="w-6 h-6" strokeWidth={active ? 2.5 : 1.5} />
              <span className={`text-[10px] ${active ? 'font-semibold' : ''}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

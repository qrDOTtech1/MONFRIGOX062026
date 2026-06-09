'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ScanLine, Refrigerator, LayoutGrid, Heart, UserCircle } from 'lucide-react';

const items = [
  { href: '/scan',      icon: ScanLine,     label: 'Scan' },
  { href: '/fridge',    icon: Refrigerator, label: 'Mon Frigo' },
  { href: '/dashboard', icon: LayoutGrid,   label: 'Explorer' },
  { href: '/favorites', icon: Heart,        label: 'Favoris' },
  { href: '/profile',   icon: UserCircle,   label: 'Profil' },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50"
      style={{ backgroundColor: 'var(--bg-raised)', borderTop: '1px solid var(--border)' }}>
      <div className="max-w-lg mx-auto flex justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`nav-item py-1.5 px-2 ${active ? 'nav-item-active' : ''}`}
            >
              <Icon className="w-[1.15rem] h-[1.15rem]" strokeWidth={active ? 2.5 : 1.5} />
              <span className={`text-[9px] leading-tight ${active ? 'font-semibold' : ''}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

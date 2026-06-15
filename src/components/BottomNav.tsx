'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ScanLine, Refrigerator, LayoutGrid, UserCircle } from 'lucide-react';
import { useT } from '@/lib/i18n';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useT();

  const items = [
    { href: '/home',      icon: Home,        label: t('nav.home')    },
    { href: '/scan',      icon: ScanLine,    label: t('nav.scan')    },
    { href: '/fridge',    icon: Refrigerator,label: t('nav.fridge')  },
    { href: '/dashboard', icon: LayoutGrid,  label: t('nav.recipes') },
    { href: '/profile',   icon: UserCircle,  label: t('nav.profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50"
      style={{ backgroundColor: 'var(--bg-raised)', borderTop: '1px solid var(--border)' }}>
      <div className="max-w-lg mx-auto flex justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href}
              className={`nav-item py-1.5 px-2 ${active ? 'nav-item-active' : ''}`}>
              <Icon className="w-[1.1rem] h-[1.1rem]" strokeWidth={active ? 2.5 : 1.5} />
              <span className={`text-[8px] leading-tight ${active ? 'font-semibold' : ''}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

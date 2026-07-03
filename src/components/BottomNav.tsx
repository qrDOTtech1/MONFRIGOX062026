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
      style={{
        backgroundColor: 'color-mix(in srgb, var(--bg-raised) 82%, transparent)',
        borderTop: '1px solid var(--border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
      }}>
      <div className="max-w-lg mx-auto flex justify-around py-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))]">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link key={href} href={href}
              className="nav-tab relative flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-300 active:scale-90"
              style={active
                ? { backgroundColor: 'var(--brand-ring)' }
                : { backgroundColor: 'transparent' }}>
              {/* Icône : grossit et passe en émeraude quand actif */}
              <Icon
                className="transition-all duration-300"
                style={{
                  width: active ? '1.35rem' : '1.1rem',
                  height: active ? '1.35rem' : '1.1rem',
                  color: active ? 'var(--brand)' : 'var(--text-muted)',
                  transform: active ? 'translateY(-1px)' : 'none',
                  filter: active ? 'drop-shadow(0 2px 6px var(--brand-ring))' : 'none',
                }}
                strokeWidth={active ? 2.5 : 1.75}
              />
              <span className="text-[8px] leading-tight transition-all duration-300"
                style={{
                  color: active ? 'var(--brand)' : 'var(--text-muted)',
                  fontWeight: active ? 700 : 500,
                }}>
                {label}
              </span>
              {/* Petit point lumineux sous l'onglet actif */}
              {active && (
                <span className="absolute -bottom-0.5 w-1 h-1 rounded-full"
                  style={{ backgroundColor: 'var(--brand)', boxShadow: '0 0 6px 1px var(--brand)' }} />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

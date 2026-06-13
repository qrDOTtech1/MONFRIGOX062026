'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, Users, Settings, BarChart3, ChefHat, ArrowLeft, Database, CreditCard, Tag, Megaphone } from 'lucide-react';

const navItems = [
  { href: '/admin',          icon: BarChart3,   label: 'Dashboard' },
  { href: '/admin/users',    icon: Users,       label: 'Utilisateurs' },
  { href: '/admin/recipes',  icon: ChefHat,     label: 'Recettes' },
  { href: '/admin/promo',    icon: Tag,         label: 'Promos' },
  { href: '/admin/billing',  icon: CreditCard,  label: 'Billing' },
  { href: '/admin/prospection', icon: Megaphone, label: 'Prospection' },
  { href: '/admin/database', icon: Database,    label: 'DB & Import' },
  { href: '/admin/config',   icon: Settings,    label: 'Config' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50" style={{ backgroundColor: 'var(--bg-raised)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button onClick={() => router.push('/dashboard')} className="p-2 rounded-lg transition-colors hover:bg-[var(--bg-inset)]">
              <ArrowLeft className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
            <Shield className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
            <span className="font-semibold text-sm">Admin</span>
          </div>
          <nav className="flex gap-0.5">
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${active ? '' : ''}`}
                  style={active ? { backgroundColor: 'var(--bg-inset)', color: 'var(--text)' } : { color: 'var(--text-muted)' }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, Users, Settings, BarChart3, ChefHat, ArrowLeft } from 'lucide-react';

const navItems = [
  { href: '/admin', icon: BarChart3, label: 'Dashboard' },
  { href: '/admin/users', icon: Users, label: 'Utilisateurs' },
  { href: '/admin/recipes', icon: ChefHat, label: 'Recettes' },
  { href: '/admin/config', icon: Settings, label: 'Configuration' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="min-h-screen">
      <header className="bg-dark-800/90 backdrop-blur-lg border-b border-dark-600/50 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/dashboard')} className="p-2 hover:bg-dark-700 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <Shield className="w-5 h-5 text-fresh-500" />
            <span className="font-bold">Admin Portal</span>
          </div>
          <nav className="flex gap-1">
            {navItems.map(({ href, icon: Icon, label }) => {
              const active = pathname === href;
              return (
                <Link key={href} href={href} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-fresh-500/20 text-fresh-400' : 'text-gray-400 hover:bg-dark-700'}`}>
                  <Icon className="w-4 h-4" />
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

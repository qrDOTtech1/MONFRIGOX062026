'use client';

import Link from 'next/link';
import { Refrigerator, ScanLine, ChefHat, ShoppingCart, Leaf } from 'lucide-react';

const features = [
  { icon: ScanLine, title: 'Scan intelligent', desc: 'Photographie ton frigo, l\'IA identifie tes ingrédients' },
  { icon: ChefHat, title: 'Recettes sur mesure', desc: 'Des recettes adaptées à ce que tu as sous la main' },
  { icon: ShoppingCart, title: 'Liste de courses', desc: 'Génère automatiquement ce qu\'il te manque' },
  { icon: Leaf, title: 'Anti-gaspi', desc: 'Alertes péremption et recettes prioritaires' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2.5">
          <Refrigerator className="w-6 h-6" />
          <span className="text-lg font-semibold tracking-tight">Mon Frigo</span>
        </div>
        <div className="flex gap-2">
          <Link href="/login" className="btn-secondary !px-4 !py-2 text-sm">Connexion</Link>
          <Link href="/register" className="btn-primary !px-4 !py-2 text-sm">S&apos;inscrire</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-8" style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
          <Refrigerator className="w-8 h-8" style={{ color: 'var(--text-secondary)' }} />
        </div>

        <h1 className="text-3xl md:text-4xl font-bold mb-4 leading-tight tracking-tight">
          Ton frigo,<br />
          ton chef personnel.
        </h1>

        <p className="text-base mb-8 max-w-md" style={{ color: 'var(--text-secondary)' }}>
          Scanne tes ingrédients, découvre des recettes parfaites
          et ne gaspille plus jamais rien.
        </p>

        <Link href="/register" className="btn-primary text-base !px-8 !py-3 mb-3">
          Commencer gratuitement
        </Link>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pas de carte bancaire requise</p>

        <div className="grid grid-cols-2 gap-3 mt-16 max-w-lg w-full">
          {features.map((f) => (
            <div key={f.title} className="card p-4 text-left">
              <f.icon className="w-5 h-5 mb-3" style={{ color: 'var(--text-secondary)' }} />
              <h3 className="font-medium text-sm mb-1">{f.title}</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center text-xs py-6" style={{ color: 'var(--text-muted)' }}>
        Mon Frigo &copy; 2026
      </footer>
    </div>
  );
}

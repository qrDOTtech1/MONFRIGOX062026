'use client';

import Link from 'next/link';
import { Refrigerator, ScanLine, ChefHat, ShoppingCart, Sparkles, Leaf } from 'lucide-react';

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
        <div className="flex items-center gap-2">
          <Refrigerator className="w-8 h-8 text-fresh-500" />
          <span className="text-xl font-bold">Mon Frigo</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className="btn-secondary !px-4 !py-2 text-sm">Connexion</Link>
          <Link href="/register" className="btn-primary !px-4 !py-2 text-sm">S&apos;inscrire</Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="relative mb-8">
          <div className="w-24 h-24 bg-fresh-500/20 rounded-3xl flex items-center justify-center pulse-green">
            <Refrigerator className="w-12 h-12 text-fresh-500" />
          </div>
          <Sparkles className="w-6 h-6 text-fresh-400 absolute -top-2 -right-2 animate-pulse" />
        </div>

        <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
          Ton frigo,<br />
          <span className="text-fresh-500">ton chef personnel</span>
        </h1>

        <p className="text-gray-400 text-lg mb-8 max-w-md">
          Scanne tes ingrédients, découvre des recettes parfaites
          et ne gaspille plus jamais rien.
        </p>

        <Link href="/register" className="btn-primary text-lg !px-8 !py-4 mb-4">
          Commencer gratuitement
        </Link>
        <p className="text-gray-600 text-sm">Pas de carte bancaire requise</p>

        <div className="grid grid-cols-2 gap-4 mt-16 max-w-lg w-full">
          {features.map((f) => (
            <div key={f.title} className="glass-card p-4 text-left">
              <f.icon className="w-8 h-8 text-fresh-500 mb-3" />
              <h3 className="font-semibold text-sm mb-1">{f.title}</h3>
              <p className="text-gray-500 text-xs">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center text-gray-600 text-xs py-6">
        Mon Frigo &copy; 2026 &mdash; Cuisine intelligente, z&eacute;ro gaspi
      </footer>
    </div>
  );
}

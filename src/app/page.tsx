'use client';

import Link from 'next/link';
import { ScanLine, ChefHat, ShoppingCart, Leaf, Barcode, Sparkles, Check, Brain, X, Calendar } from 'lucide-react';

const features = [
  {
    icon: ScanLine,
    title: 'Scan IA du frigo',
    desc: 'Une photo, et l\'IA identifie chaque aliment. Instantanément. Sans fautes.',
  },
  {
    icon: Barcode,
    title: 'Code-barres EAN',
    desc: 'N\'importe quel produit emballé, scanné en un instant. Données nutritionnelles incluses.',
  },
  {
    icon: ChefHat,
    title: 'Recettes personnalisées',
    desc: 'Régime, allergènes, portions, cuisines du monde — chaque recette est faite pour toi.',
  },
  {
    icon: Brain,
    title: 'IA culinaire intégrée',
    desc: 'Pose n\'importe quelle question. Elle connaît chaque recette, chaque substitution possible.',
  },
  {
    icon: Calendar,
    title: 'Planning de repas',
    desc: 'Planifie ta semaine en quelques tapotements. Liste de courses générée automatiquement.',
  },
  {
    icon: Leaf,
    title: 'Zéro gaspillage',
    desc: 'Alertes péremption, suggestions anti-gaspi. Ce qui allait à la poubelle finit dans l\'assiette.',
  },
];

type Plan = {
  name: string;
  price: string;
  priceAnnual?: string;
  period: string;
  periodAnnual?: string;
  desc: string;
  color: string;
  border: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  cta: string;
  href: string;
  features: string[];
  excluded: string[];
};

const plans: Plan[] = [
  {
    name: 'Gratuit',
    price: '0€',
    period: 'pour toujours',
    desc: 'Pour découvrir sans risque.',
    color: 'transparent',
    border: 'var(--border)',
    cta: 'Commencer gratuitement',
    href: '/register',
    features: [
      '1 requête IA / semaine',
      '1 scan frigo / semaine',
      '20 scans code-barres / semaine',
      'Accès à 50% des recettes',
    ],
    excluded: [
      'Planning de repas',
      'Liste de courses',
      'Notes communautaires',
      'Historique de cuisine',
    ],
  },
  {
    name: 'Premium',
    price: '3,99€',
    priceAnnual: '34,99€',
    period: '/ mois',
    periodAnnual: '/ an  −27%',
    desc: 'Pour ceux qui cuisinent vraiment.',
    color: 'rgba(245,158,11,0.04)',
    border: 'rgba(245,158,11,0.35)',
    badge: 'Le plus populaire',
    badgeColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'rgba(245,158,11,0.12)',
    cta: 'Essayer Premium',
    href: '/register',
    features: [
      '10 requêtes IA / semaine',
      '5 scans frigo / semaine',
      '100 scans code-barres / semaine',
      'Toutes les recettes',
      'Planning de repas',
      'Liste de courses',
      'Notes communautaires',
      'Historique de cuisine',
    ],
    excluded: [],
  },
  {
    name: 'VIP',
    price: '6,99€',
    priceAnnual: '59,99€',
    period: '/ mois',
    periodAnnual: '/ an  −28%',
    desc: 'Pour les perfectionnistes.',
    color: 'rgba(168,85,247,0.04)',
    border: 'rgba(168,85,247,0.35)',
    badge: 'Illimité',
    badgeColor: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'rgba(168,85,247,0.12)',
    cta: 'Passer VIP',
    href: '/register',
    features: [
      'Requêtes IA illimitées',
      '14 scans frigo / semaine',
      'Scans EAN illimités',
      'Tout Premium inclus',
      'Planning automatique intelligent',
      'Suivi nutritionnel complet',
      'Support prioritaire',
      'Accès aux nouveautés en avant-première',
    ],
    excluded: [],
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg)' }}>

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
        style={{ backgroundColor: 'var(--bg)', borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="text-lg font-bold tracking-tight">Mon Frigo</span>
        <div className="flex gap-2">
          <Link href="/login" className="btn-secondary !px-4 !py-2 text-sm">Connexion</Link>
          <Link href="/register" className="btn-primary !px-4 !py-2 text-sm">S&apos;inscrire</Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 pb-20">

        {/* ── Hero ── */}
        <section className="text-center pt-14 pb-12">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-7"
            style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'rgb(16,185,129)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Sparkles className="w-3 h-3" /> Gratuit pour commencer · Aucune carte requise
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-5">
            Cuisine mieux,<br />avec ce que tu as déjà.
          </h1>

          <p className="text-base leading-relaxed mb-2 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Mon Frigo scanne ton frigo, génère des recettes personnalisées
            et planifie ta semaine — sans effort, sans gaspillage.
          </p>
          <p className="text-sm mb-10 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
            L&apos;IA culinaire qui mérite une place permanente sur ton téléphone.
          </p>

          <Link href="/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold transition-all"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            Commencer gratuitement
          </Link>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Inscription en 30 secondes · Email vérifié · Gratuit pour toujours
          </p>
        </section>

        {/* ── Chiffres clés ── */}
        <section className="grid grid-cols-3 gap-3 mb-14">
          {[
            { value: '< 3s', label: 'pour scanner un frigo' },
            { value: '100%', label: 'recettes sur mesure' },
            { value: '0€', label: 'pour démarrer' },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <p className="text-2xl font-bold mb-1">{s.value}</p>
              <p className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </section>

        {/* ── Features ── */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-center mb-1.5">Ce que ça fait, concrètement.</h2>
          <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>
            Pas une appli de plus. Une vraie différence dans ta cuisine.
          </p>
          <div className="grid grid-cols-1 gap-2.5">
            {features.map((f) => (
              <div key={f.title} className="card p-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--bg-inset)' }}>
                  <f.icon className="w-[1.1rem] h-[1.1rem]" style={{ color: 'var(--text-secondary)' }} />
                </div>
                <div>
                  <h3 className="font-semibold text-sm mb-0.5">{f.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-center mb-1.5">Transparent. Sans surprise.</h2>
          <p className="text-sm text-center mb-7" style={{ color: 'var(--text-muted)' }}>
            Moins cher qu&apos;un café par mois. Bien plus utile.
          </p>

          <div className="space-y-3">
            {plans.map((plan) => (
              <div key={plan.name} className="card p-5"
                style={{ backgroundColor: plan.color, borderColor: plan.border }}>

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-base">{plan.name}</h3>
                      {plan.badge && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${plan.badgeColor}`}
                          style={{ backgroundColor: plan.badgeBg }}>
                          {plan.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{plan.desc}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div>
                      <span className="text-2xl font-bold">{plan.price}</span>
                      <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>
                    </div>
                    {plan.priceAnnual && (
                      <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        ou&nbsp;<span className="font-semibold">{plan.priceAnnual}</span>
                        &nbsp;<span className="text-emerald-500 font-medium">{plan.periodAnnual}</span>
                      </p>
                    )}
                  </div>
                </div>

                <ul className="space-y-1.5 mb-4">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                  {plan.excluded.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs"
                      style={{ color: 'var(--text-muted)', opacity: 0.45 }}>
                      <X className="w-3 h-3 shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link href={plan.href}
                  className="block w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-all"
                  style={plan.badge
                    ? { backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }
                    : { backgroundColor: 'var(--bg-inset)', color: 'var(--text)', border: '1px solid var(--border)' }}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
            Besoin de plus ? Des packs de requêtes IA supplémentaires sont disponibles à partir de 0,99€.
          </p>
        </section>

        {/* ── Final CTA ── */}
        <section className="text-center px-6 py-12 rounded-2xl"
          style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
          <h2 className="text-xl font-bold mb-2">Prêt à ne plus jamais fixer un frigo vide ?</h2>
          <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
            Gratuit. Sans carte. Et franchement, tu t&apos;en veux déjà de ne pas l&apos;avoir fait avant.
          </p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            Créer mon compte — c&apos;est gratuit
          </Link>
        </section>
      </main>

      <footer className="text-center text-xs py-6" style={{ color: 'var(--text-muted)' }}>
        Mon Frigo &copy; 2026
      </footer>
    </div>
  );
}

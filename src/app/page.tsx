'use client';

import Link from 'next/link';
import { ScanLine, ChefHat, ShoppingCart, Leaf, Barcode, Sparkles, Check, Brain, Star } from 'lucide-react';

const features = [
  {
    icon: ScanLine,
    title: 'Scan IA du frigo',
    desc: 'Une photo. L\'IA identifie tout. En secondes. Pas en minutes — en secondes.',
  },
  {
    icon: Barcode,
    title: 'Code-barres EAN',
    desc: 'Scanner un produit emballé ? Un coup de caméra et il est dans ton frigo virtuel.',
  },
  {
    icon: ChefHat,
    title: 'Recettes sur mesure',
    desc: 'Adaptées à ce que tu as. Ton régime. Tes allergènes. Tes portions. Pas les recettes de ta grand-mère.',
  },
  {
    icon: Brain,
    title: 'IA culinaire',
    desc: 'Pose n\'importe quelle question. Elle connaît chaque recette, chaque ingrédient. Disponible 24h/24.',
  },
  {
    icon: Leaf,
    title: 'Zéro gaspillage',
    desc: 'Alertes péremption, recettes anti-gaspi. Ce qui allait finir à la poubelle finit dans ton assiette.',
  },
  {
    icon: ShoppingCart,
    title: 'Courses automatiques',
    desc: 'Liste générée depuis ton planning. Ce qu\'il te manque, et rien de plus.',
  },
];

const plans = [
  {
    name: 'Gratuit',
    price: '0€',
    period: 'pour toujours',
    desc: 'Pour ceux qui veulent voir de quoi il retourne.',
    color: 'var(--bg-raised)',
    border: 'var(--border)',
    badge: null,
    cta: 'Commencer maintenant',
    href: '/register',
    features: [
      '5 requêtes IA / jour',
      'Scan IA du frigo',
      'Scan code-barres EAN',
      'Recettes illimitées',
      'Planning de repas',
      'Liste de courses',
    ],
    excluded: [
      '100 requêtes IA / jour',
      'Notes communautaires',
      'Historique complet',
    ],
  },
  {
    name: 'Premium',
    price: '3,99€',
    priceAnnual: '34,99€',
    period: '/ mois',
    periodAnnual: '/ an (−27%)',
    desc: 'Pour ceux qui cuisinent sérieusement.',
    color: 'rgba(245,158,11,0.05)',
    border: 'rgba(245,158,11,0.4)',
    badge: 'Populaire',
    badgeColor: 'text-amber-600 dark:text-amber-400',
    badgeBg: 'rgba(245,158,11,0.12)',
    cta: 'Essayer Premium',
    href: '/register',
    features: [
      '100 requêtes IA / jour',
      'Scan IA du frigo',
      'Scan code-barres EAN',
      'Recettes illimitées',
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
    periodAnnual: '/ an (−28%)',
    desc: 'Pour les obsédés. Tu sais qui tu es.',
    color: 'rgba(168,85,247,0.05)',
    border: 'rgba(168,85,247,0.4)',
    badge: 'Illimité',
    badgeColor: 'text-purple-600 dark:text-purple-400',
    badgeBg: 'rgba(168,85,247,0.12)',
    cta: 'Passer VIP',
    href: '/register',
    features: [
      'Requêtes IA illimitées',
      'Tout Premium inclus',
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
        <section className="text-center pt-16 pb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-6"
            style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'rgb(16,185,129)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Sparkles className="w-3 h-3" /> Essai gratuit · Sans carte bancaire
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-5">
            Ton frigo est plein.<br />
            <span style={{ color: 'var(--text-muted)' }}>Ton cerveau, lui, est vide.</span>
          </h1>

          <p className="text-base leading-relaxed mb-3 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Mon Frigo scanne ce que tu as, invente ce que tu vas manger,
            te dit ce qui va périmer demain, et génère ta liste de courses.
            Tout ça. Automatiquement.
          </p>
          <p className="text-sm mb-10" style={{ color: 'var(--text-muted)' }}>
            Parce que &quot;je sais pas quoi manger&quot; n&apos;est pas une réponse acceptable en 2026.
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
            { value: '100%', label: 'recettes personnalisées' },
            { value: '0€', label: 'pour commencer' },
          ].map(s => (
            <div key={s.label} className="card p-4 text-center">
              <p className="text-2xl font-bold mb-1">{s.value}</p>
              <p className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
            </div>
          ))}
        </section>

        {/* ── Features ── */}
        <section className="mb-14">
          <h2 className="text-xl font-bold text-center mb-2">Ce que ça fait.</h2>
          <p className="text-sm text-center mb-7" style={{ color: 'var(--text-muted)' }}>
            On n&apos;a pas fait un simple convertisseur de recettes. On a fait bien mieux.
          </p>
          <div className="grid grid-cols-1 gap-3">
            {features.map((f) => (
              <div key={f.title} className="card p-4 flex items-start gap-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: 'var(--bg-inset)' }}>
                  <f.icon className="w-4.5 h-4.5" style={{ color: 'var(--text-secondary)', width: '1.1rem', height: '1.1rem' }} />
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
          <h2 className="text-xl font-bold text-center mb-2">Des prix qui ne font pas honte.</h2>
          <p className="text-sm text-center mb-7" style={{ color: 'var(--text-muted)' }}>
            Moins cher qu&apos;un café. Plus utile qu&apos;un café.
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
                    <span className="text-2xl font-bold">{plan.price}</span>
                    <span className="text-xs ml-1" style={{ color: 'var(--text-muted)' }}>{plan.period}</span>
                    {plan.priceAnnual && (
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        ou {plan.priceAnnual} <span className="text-emerald-500 font-medium">{plan.periodAnnual}</span>
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
                    <li key={f} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>
                      <span className="w-3.5 h-3.5 shrink-0 text-center">–</span>
                      <span className="line-through">{f}</span>
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
            Besoin de plus de requêtes IA ? Des packs à 0,99€ sont disponibles dans ton profil.
          </p>
        </section>

        {/* ── Final CTA ── */}
        <section className="text-center py-10 rounded-2xl"
          style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)' }}>
          <Star className="w-8 h-8 mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <h2 className="text-xl font-bold mb-2">Alors, on attend quoi ?</h2>
          <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
            Gratuit. Immédiat. Et franchement, c&apos;est exactement ce qu&apos;il te fallait depuis longtemps.
          </p>
          <Link href="/register"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            Créer mon compte gratuitement
          </Link>
        </section>
      </main>

      <footer className="text-center text-xs py-6" style={{ color: 'var(--text-muted)' }}>
        Mon Frigo &copy; 2026
      </footer>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { ScanLine, ChefHat, ShoppingCart, Leaf, Barcode, Sparkles, Check, Brain, X, Calendar } from 'lucide-react';
import LogoAnim from '@/components/LogoAnim';
import FloatingEmojis from '@/components/FloatingEmojis';

/* ── Landing-specific styles ─────────────────────────────────────────── */
function LandingStyles() {
  return (
    <style>{`
      @keyframes shimmer {
        0%   { background-position: -200% center; }
        100% { background-position:  200% center; }
      }
      @keyframes glow-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(var(--accent-rgb, 200,200,200), 0); }
        50%       { box-shadow: 0 0 24px 4px rgba(var(--accent-rgb, 200,200,200), 0.18); }
      }
      .btn-glow { animation: glow-pulse 2.8s ease-in-out infinite; }
      .shimmer-text {
        background: linear-gradient(90deg, var(--text) 20%, var(--accent) 50%, var(--text) 80%);
        background-size: 200% auto;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        animation: shimmer 4s linear infinite;
      }
      .section-fade { opacity: 0; transform: translateY(24px); transition: opacity 0.6s ease, transform 0.6s ease; }
      .section-fade.visible { opacity: 1; transform: translateY(0); }
    `}</style>
  );
}

/* ── Staggered section observer ─────────────────────────────────────── */
function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add('section-fade');
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.add('visible'); obs.disconnect(); }
    }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ── Data ────────────────────────────────────────────────────────────── */
const features = [
  { icon: ScanLine,   title: 'Scan IA du frigo',       desc: 'Une photo, et l\'IA identifie chaque aliment. Instantanément. Sans fautes.' },
  { icon: Barcode,    title: 'Code-barres EAN',         desc: 'N\'importe quel produit emballé, scanné en un instant. Données nutritionnelles incluses.' },
  { icon: ChefHat,    title: 'Recettes personnalisées', desc: 'Régime, allergènes, portions, cuisines du monde — chaque recette est faite pour toi.' },
  { icon: Brain,      title: 'IA culinaire intégrée',   desc: 'Pose n\'importe quelle question. Elle connaît chaque recette, chaque substitution possible.' },
  { icon: Calendar,   title: 'Planning de repas',       desc: 'Planifie ta semaine en quelques tapotements. Liste de courses générée automatiquement.' },
  { icon: Leaf,       title: 'Zéro gaspillage',         desc: 'Alertes péremption, suggestions anti-gaspi. Ce qui allait à la poubelle finit dans l\'assiette.' },
];

type PlanDef = {
  name: string; price: string; priceAnnual?: string;
  period: string; periodAnnual?: string; desc: string;
  color: string; border: string;
  badge?: string; badgeColor?: string; badgeBg?: string;
  cta: string; href: string;
  features: string[]; excluded: string[];
};

const plans: PlanDef[] = [
  {
    name: 'Gratuit', price: '0€', period: 'pour toujours',
    desc: 'Pour découvrir sans risque.',
    color: 'transparent', border: 'var(--border)',
    cta: 'Commencer gratuitement', href: '/register',
    features: ['3 requêtes IA à vie (essai)', '20 scans code-barres EAN / semaine', 'Accès à 50% des recettes'],
    excluded: ['Scan frigo IA', 'Planning de repas', 'Liste de courses', 'Notes communautaires', 'Historique de cuisine'],
  },
  {
    name: 'Premium', price: '3,99€', priceAnnual: '34,99€',
    period: '/ mois', periodAnnual: '/ an  −27%',
    desc: 'Pour ceux qui cuisinent vraiment.',
    color: 'rgba(245,158,11,0.04)', border: 'rgba(245,158,11,0.35)',
    badge: 'Le plus populaire', badgeColor: 'text-amber-600 dark:text-amber-400', badgeBg: 'rgba(245,158,11,0.12)',
    cta: 'Essayer Premium', href: '/register',
    features: ['10 requêtes IA / semaine', '5 scans frigo IA / semaine', '100 scans code-barres / semaine',
      'Toutes les recettes', 'Planning de repas', 'Liste de courses', 'Notes communautaires', 'Historique de cuisine'],
    excluded: [],
  },
  {
    name: 'VIP', price: '6,99€', priceAnnual: '59,99€',
    period: '/ mois', periodAnnual: '/ an  −28%',
    desc: 'Pour les perfectionnistes.',
    color: 'rgba(168,85,247,0.04)', border: 'rgba(168,85,247,0.35)',
    badge: 'Illimité', badgeColor: 'text-purple-600 dark:text-purple-400', badgeBg: 'rgba(168,85,247,0.12)',
    cta: 'Passer VIP', href: '/register',
    features: ['Requêtes IA illimitées', '14 scans frigo / semaine', 'Scans EAN illimités',
      'Tout Premium inclus', 'Planning automatique intelligent', 'Suivi nutritionnel complet',
      'Support prioritaire', 'Accès aux nouveautés en avant-première'],
    excluded: [],
  },
];

/* ── JSON-LD ────────────────────────────────────────────────────────── */
const SITE_URL = 'https://monfrigo.app';
const jsonLdApp = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'WebApplication',
  name: 'Mon Frigo', url: SITE_URL, applicationCategory: 'LifestyleApplication', operatingSystem: 'Web',
  description: "Application de cuisine intelligente : scanne ton frigo, trouve des recettes, planifie tes repas, réduis le gaspillage alimentaire.",
  offers: [
    { '@type': 'Offer', price: '0', priceCurrency: 'EUR', name: 'Gratuit' },
    { '@type': 'Offer', price: '3.99', priceCurrency: 'EUR', name: 'Premium', billingIncrement: 'P1M' },
    { '@type': 'Offer', price: '6.99', priceCurrency: 'EUR', name: 'VIP', billingIncrement: 'P1M' },
  ],
  aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.8', ratingCount: '1250', bestRating: '5' },
  featureList: ['Scan IA du frigo', 'Scan code-barres EAN', 'Recettes personnalisées', 'Planning repas automatique', 'Liste de courses intelligente', 'Anti-gaspillage alimentaire', 'NutriScore par recette'],
});
const jsonLdFaq = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'FAQPage',
  mainEntity: [
    { '@type': 'Question', name: "Comment trouver une recette avec ce que j'ai dans le frigo ?", acceptedAnswer: { '@type': 'Answer', text: "Ouvrez Mon Frigo, prenez une photo de votre frigo ou ajoutez vos ingrédients. L'app montre instantanément toutes les recettes faisables, triées par correspondance." } },
    { '@type': 'Question', name: "Mon Frigo est-il gratuit ?", acceptedAnswer: { '@type': 'Answer', text: "Oui ! Le plan gratuit donne accès à 50% des recettes, 20 scans EAN/semaine et 3 requêtes IA. Premium dès 3,99€/mois." } },
    { '@type': 'Question', name: "Comment faire des courses moins chères ?", acceptedAnswer: { '@type': 'Answer', text: "Mon Frigo estime le coût de chaque recette, propose des alternatives économiques, et génère des listes de courses optimisées. Économisez 25 à 40% sur votre budget." } },
    { '@type': 'Question', name: "Comment réduire le gaspillage alimentaire ?", acceptedAnswer: { '@type': 'Answer', text: "L'app suit les dates de péremption, prévient quand un aliment va expirer, et propose des recettes qui l'utilisent en priorité." } },
    { '@type': 'Question', name: "Quels régimes alimentaires sont supportés ?", acceptedAnswer: { '@type': 'Answer', text: "Végétarien, vegan, halal, casher, sans gluten, keto, sans sucre — tous configurables dans le profil avec filtrage automatique." } },
  ],
});
const jsonLdOrg = JSON.stringify({
  '@context': 'https://schema.org', '@type': 'Organization',
  name: 'Mon Frigo', url: SITE_URL, logo: `${SITE_URL}/icon.png`,
  description: "Mon Frigo — Application de cuisine intelligente anti-gaspi",
});

/* ── Page ────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const statsRef    = useFadeIn();
  const featuresRef = useFadeIn();
  const pricingRef  = useFadeIn();
  const ctaRef      = useFadeIn();

  return (
    <div className="min-h-screen flex flex-col relative" style={{ backgroundColor: 'var(--bg)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdApp }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdFaq }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdOrg }} />
      <FloatingEmojis />
      <LandingStyles />

      {/* ── Header ── */}
      <header className="flex items-center justify-between px-6 py-4 sticky top-0 z-20"
        style={{
          backgroundColor: 'var(--bg)',
          borderBottom: '1px solid var(--border-subtle)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}>
        <LogoAnim size={36} withName nameSize="text-base" />
        <div className="flex gap-2">
          <Link href="/login"    className="btn-secondary !px-4 !py-2 text-sm">Connexion</Link>
          <Link href="/register" className="btn-primary  !px-4 !py-2 text-sm">S&apos;inscrire</Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-5 pb-20 relative z-10">

        {/* ── Hero ── */}
        <section className="text-center pt-14 pb-12">
          {/* Mascotte hero */}
          <div className="flex justify-center mb-6">
            <LogoAnim size={96} />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium mb-7"
            style={{ backgroundColor: 'rgba(16,185,129,0.1)', color: 'rgb(16,185,129)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Sparkles className="w-3 h-3" /> Gratuit pour commencer · Aucune carte requise
          </div>

          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-5">
            Cuisine <span className="shimmer-text">mieux</span>,<br />
            avec ce que tu as déjà.
          </h1>

          <p className="text-base leading-relaxed mb-2 max-w-md mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Mon Frigo scanne ton frigo, génère des recettes personnalisées
            et planifie ta semaine — sans effort, sans gaspillage.
          </p>
          <p className="text-sm mb-10 max-w-sm mx-auto" style={{ color: 'var(--text-muted)' }}>
            L&apos;IA culinaire qui mérite une place permanente sur ton téléphone.
          </p>

          <Link href="/register"
            className="btn-glow inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold transition-all hover:scale-[1.03] active:scale-95"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
            Commencer gratuitement
          </Link>
          <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
            Inscription en 30 secondes · Email vérifié · Gratuit pour toujours
          </p>
        </section>

        {/* ── Chiffres clés ── */}
        <div ref={statsRef}>
          <section className="grid grid-cols-3 gap-3 mb-14">
            {[
              { value: '< 3s',  label: 'pour scanner un frigo' },
              { value: '100%',  label: 'recettes sur mesure'   },
              { value: '0€',    label: 'pour démarrer'         },
            ].map((s, i) => (
              <div key={s.label} className="card p-4 text-center"
                style={{ transitionDelay: `${i * 80}ms`, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
                <p className="text-2xl font-bold mb-1">{s.value}</p>
                <p className="text-[11px] leading-tight" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              </div>
            ))}
          </section>
        </div>

        {/* ── Features ── */}
        <div ref={featuresRef}>
          <section className="mb-14">
            <h2 className="text-xl font-bold text-center mb-1.5">Ce que ça fait, concrètement.</h2>
            <p className="text-sm text-center mb-6" style={{ color: 'var(--text-muted)' }}>
              Pas une appli de plus. Une vraie différence dans ta cuisine.
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              {features.map((f, i) => (
                <div key={f.title} className="card p-4 flex items-start gap-4 hover:scale-[1.01] transition-transform"
                  style={{
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    transitionDelay: `${i * 60}ms`,
                  }}>
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
        </div>

        {/* ── Pricing ── */}
        <div ref={pricingRef}>
          <section className="mb-14">
            <h2 className="text-xl font-bold text-center mb-1.5">Transparent. Sans surprise.</h2>
            <p className="text-sm text-center mb-7" style={{ color: 'var(--text-muted)' }}>
              Moins cher qu&apos;un café par mois. Bien plus utile.
            </p>

            <div className="space-y-3">
              {plans.map((plan, pi) => (
                <div key={plan.name} className="card p-5 hover:scale-[1.01] transition-transform"
                  style={{
                    backgroundColor: plan.color, borderColor: plan.border,
                    backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
                    transitionDelay: `${pi * 80}ms`,
                  }}>
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
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          ou <span className="font-semibold">{plan.priceAnnual}</span>
                          {' '}<span className="text-emerald-500 font-medium">{plan.periodAnnual}</span>
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
                    className="block w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-all hover:scale-[1.02] active:scale-95"
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
        </div>

        {/* ── Final CTA ── */}
        <div ref={ctaRef}>
          <section className="text-center px-6 py-12 rounded-2xl"
            style={{
              backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border)',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            }}>
            <div className="text-5xl mb-4 animate-bounce" style={{ animationDuration: '2.5s' }}>🍽️</div>
            <h2 className="text-xl font-bold mb-2">Prêt à ne plus jamais fixer un frigo vide ?</h2>
            <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
              Gratuit. Sans carte. Et franchement, tu t&apos;en veux déjà de ne pas l&apos;avoir fait avant.
            </p>
            <Link href="/register"
              className="btn-glow inline-flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-semibold transition-all hover:scale-[1.03] active:scale-95"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-text)' }}>
              Créer mon compte — c&apos;est gratuit
            </Link>
          </section>
        </div>
      </main>

      <footer className="text-center text-xs py-8 space-y-4 relative z-10" style={{ color: 'var(--text-muted)' }}>
        {/* SEO internal links */}
        <nav className="max-w-2xl mx-auto px-5">
          <p className="font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Découvrir aussi</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5">
            {[
              { href: '/s/recette-avec-ce-que-j-ai', label: "Recette avec ce que j'ai" },
              { href: '/s/courses-moins-cheres', label: 'Courses moins chères' },
              { href: '/s/anti-gaspillage-alimentaire', label: 'Anti-gaspillage alimentaire' },
              { href: '/s/planning-repas-semaine', label: 'Planning repas semaine' },
              { href: '/s/recette-pas-cher', label: 'Recettes pas chères' },
              { href: '/s/que-manger-ce-soir', label: 'Que manger ce soir ?' },
              { href: '/s/scanner-frigo-ia', label: 'Scanner frigo IA' },
              { href: '/s/liste-courses-intelligente', label: 'Liste courses intelligente' },
              { href: '/s/recette-rapide-facile', label: 'Recettes rapides' },
              { href: '/s/cuisiner-les-restes', label: 'Cuisiner les restes' },
              { href: '/s/batch-cooking-meal-prep', label: 'Batch cooking' },
              { href: '/s/recette-vegetarienne', label: 'Recettes végétariennes' },
              { href: '/s/recette-vegan', label: 'Recettes vegan' },
              { href: '/s/recette-sans-gluten', label: 'Sans gluten' },
              { href: '/s/recette-halal', label: 'Recettes halal' },
              { href: '/s/economiser-alimentation', label: 'Économiser alimentation' },
              { href: '/s/nutriscore-recette', label: 'NutriScore recette' },
              { href: '/s/application-cuisine-gratuite', label: 'App cuisine gratuite' },
            ].map(l => (
              <Link key={l.href} href={l.href} className="hover:underline underline-offset-2 transition-opacity hover:opacity-80">
                {l.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className="space-y-1">
          <p>Mon Frigo &copy; 2026</p>
          <p>
            Une application proposée par{' '}
            <a href="https://matable.pro" target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-2 hover:opacity-80 transition-opacity">
              matable.pro
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

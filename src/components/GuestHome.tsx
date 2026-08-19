'use client';

import Link from 'next/link';
import { ScanLine, Refrigerator, CalendarDays, Leaf, ChefHat, Sparkles } from 'lucide-react';
import Mascot from '@/components/Mascot';

/**
 * Accueil des visiteurs sans compte.
 *
 * ⚠️ Cette page portait auparavant une mascotte et deux boutons, rien d'autre :
 * aucune valeur pour le visiteur, et aucun contenu pour Google. C'est ici qu'on
 * répond à l'objection SEO faite au mode invité (cf. src/app/page.tsx) — le
 * texte indexable vit DANS l'app, pas sur une plaquette tarifaire séparée.
 * Ne pas la vider : garder des phrases réelles, pas des slogans creux.
 */

const ETAPES = [
  {
    icon: Refrigerator,
    titre: 'Dis ce que tu as',
    texte: "Ajoute les aliments qui traînent dans ton frigo. Trois suffisent pour commencer — pas besoin de compte.",
  },
  {
    icon: ChefHat,
    titre: 'Vois ce que tu peux cuisiner',
    texte: "Les recettes se classent par ce que tu possèdes déjà. Tu vois tout de suite ce qui est faisable ce soir, sans courses.",
  },
  {
    icon: Leaf,
    titre: 'Cuisine avant de jeter',
    texte: "Les aliments proches de la date limite remontent en premier. C'est ce qui évite le plus de gaspillage, et le plus de dépenses.",
  },
];

const USAGES = [
  { icon: ScanLine, texte: "Prends ton frigo en photo, l'IA reconnaît les aliments" },
  { icon: CalendarDays, texte: 'Planifie la semaine à partir de ce que tu as déjà' },
  { icon: Sparkles, texte: "Demande une substitution quand il te manque un ingrédient" },
];

export default function GuestHome() {
  return (
    <div className="max-w-2xl mx-auto px-5 pb-16">
      <section className="text-center pt-6 pb-8">
        <div className="flex justify-center mb-4">
          <Mascot variant="happy" size="lg" animate="float" />
        </div>
        <h1 className="text-2xl md:text-3xl font-bold leading-tight mb-3">
          Qu&apos;est-ce que tu peux cuisiner avec ce que tu as déjà&nbsp;?
        </h1>
        <p className="text-[15px] leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>
          Mon Frigo part de ton frigo, pas d&apos;une liste de courses. Tu indiques
          ce que tu as, l&apos;app te montre les recettes réellement faisables —
          et te prévient avant que les aliments ne se perdent.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link href="/fridge" className="btn-primary">Remplir mon frigo</Link>
          <Link href="/dashboard" className="btn-secondary">Parcourir les recettes</Link>
        </div>
        <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
          Sans compte, sans carte bancaire. Tu crées un compte seulement si tu
          veux garder ton frigo.
        </p>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Comment ça marche</h2>
        <div className="space-y-3">
          {ETAPES.map((e, i) => (
            <div key={e.titre} className="rounded-2xl p-4 flex gap-4"
              style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)' }}>
                <e.icon className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h3 className="font-semibold text-[15px] mb-1">
                  {i + 1}. {e.titre}
                </h3>
                <p className="text-[13px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                  {e.texte}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-4">Ce que tu peux faire ensuite</h2>
        <div className="space-y-2">
          {USAGES.map(u => (
            <div key={u.texte} className="flex items-center gap-3 text-sm py-2">
              <u.icon className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />
              <span style={{ color: 'var(--text-secondary)' }}>{u.texte}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-semibold mb-3">Questions fréquentes</h2>
        <div className="space-y-4 text-sm">
          <div>
            <h3 className="font-semibold mb-1">Faut-il créer un compte pour essayer&nbsp;?</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Non. Tu peux remplir ton frigo et voir les recettes correspondantes
              sans rien créer. Le compte sert à retrouver ton frigo sur tes autres
              appareils et à garder tes favoris.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Est-ce que c&apos;est gratuit&nbsp;?</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Le frigo, les recettes, le planning et les alertes de péremption sont
              gratuits et le restent. Les formules payantes ajoutent le scan photo
              du frigo et l&apos;assistant IA sans limite.
            </p>
          </div>
          <div>
            <h3 className="font-semibold mb-1">Comment l&apos;app réduit le gaspillage&nbsp;?</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              Elle suit les dates limites de ce que tu as ajouté, te prévient avant
              qu&apos;un aliment ne se perde, et propose en priorité les recettes qui
              l&apos;utilisent.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl p-5 text-center"
        style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Commence par trois ingrédients. Tu verras tout de suite si ça te sert.
        </p>
        <Link href="/fridge" className="btn-primary">Remplir mon frigo</Link>
      </section>
    </div>
  );
}

import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Clock, Utensils, ArrowRight } from 'lucide-react';
import { getIngredientPage, listIngredientPages } from '@/lib/ingredientPages';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://monfrigo.app';

/**
 * « Que faire avec des aubergines ? » et quelques centaines de variantes.
 *
 * Ces pages visent la longue traîne : chacune a peu de volume, mais elles
 * répondent exactement à la question que se pose quelqu'un devant son frigo, et
 * elles s'appuient sur des recettes réelles du catalogue — pas sur du texte
 * de remplissage. Une page n'est publiée que si au moins six recettes la
 * justifient (voir MIN_RECIPES).
 *
 * Régénération toutes les 24 h : le catalogue grossit en continu.
 */
export const revalidate = 86400;

export async function generateStaticParams() {
  try {
    const pages = await listIngredientPages();
    return pages.map(p => ({ ingredient: p.slug }));
  } catch {
    return [];               // base injoignable au build : rendu à la demande
  }
}

export async function generateMetadata(
  { params }: { params: Promise<{ ingredient: string }> },
): Promise<Metadata> {
  const { ingredient } = await params;
  const page = await getIngredientPage(ingredient).catch(() => null);
  if (!page) return { title: 'Ingrédient introuvable' };

  const titre = `Que faire avec ${article(page.name)} ? ${page.recipeCount} recettes`;
  const desc = `${page.recipeCount} recettes avec ${article(page.name)}, triées par ce que `
    + `tu as déjà chez toi. Temps de préparation, ingrédients, étapes. Sans compte.`;

  return {
    title: titre,
    description: desc,
    alternates: { canonical: `${BASE}/que-faire-avec/${page.slug}` },
    openGraph: { title: titre, description: desc, url: `${BASE}/que-faire-avec/${page.slug}` },
  };
}

/** « aubergine » → « des aubergines », « riz » → « du riz ». */
function article(nom: string): string {
  const n = nom.toLowerCase().trim();
  if (/^(riz|lait|beurre|sucre|sel|miel|thon|poulet|boeuf|bœuf|pain|fromage|jambon|chocolat|vinaigre)/.test(n)) {
    return `du ${n}`;
  }
  if (/^(huile|farine|creme|crème|salade|viande|semoule|confiture)/.test(n)) {
    return `de la ${n}`;
  }
  if (/s$/.test(n)) return `des ${n}`;
  return `des ${n}s`;
}

const DIFFICULTE: Record<string, string> = {
  FACILE: 'Facile', MOYEN: 'Moyen', DIFFICILE: 'Costaud',
};

export default async function QueFaireAvecPage(
  { params }: { params: Promise<{ ingredient: string }> },
) {
  const { ingredient } = await params;
  const page = await getIngredientPage(ingredient).catch(() => null);
  if (!page || page.recipes.length === 0) notFound();

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Recettes avec ${article(page.name)}`,
    numberOfItems: page.recipes.length,
    itemListElement: page.recipes.slice(0, 12).map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${BASE}/recipes/${r.id}`,
      name: r.name,
    })),
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      <main className="max-w-3xl mx-auto px-5 py-10">
        <header className="mb-8">
          <div className="text-5xl mb-3">{page.emoji}</div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-3">
            Que faire avec {article(page.name)} ?
          </h1>
          <p className="text-[15px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {page.recipeCount} recettes du catalogue Mon Frigo utilisent{' '}
            {article(page.name)}. En voici {page.recipes.length}, avec le temps de
            préparation et la liste complète des ingrédients. Ajoute ce que tu as
            déjà chez toi et l&apos;app classera ces recettes par ce qui est
            réellement faisable ce soir, sans courses.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/fridge" className="btn-primary">Dire ce que j&apos;ai</Link>
            <Link href="/" className="btn-secondary">Comment ça marche</Link>
          </div>
        </header>

        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-4">
            Les recettes avec {article(page.name)}
          </h2>
          <div className="space-y-2">
            {page.recipes.map(r => (
              <Link key={r.id} href={`/recipes/${r.id}`}
                className="block rounded-2xl p-4 transition-all hover:scale-[1.01]"
                style={{ backgroundColor: 'var(--bg-raised)', border: '1px solid var(--border-subtle)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-[15px] mb-1">{r.name}</h3>
                    {r.description && (
                      <p className="text-[13px] leading-snug line-clamp-2"
                        style={{ color: 'var(--text-muted)' }}>
                        {r.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-2 text-[12px]"
                      style={{ color: 'var(--text-muted)' }}>
                      {r.prepTime > 0 && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {r.prepTime} min
                        </span>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Utensils className="w-3.5 h-3.5" /> {r.ingredientCount} ingrédients
                      </span>
                      {DIFFICULTE[r.difficulty] && <span>{DIFFICULTE[r.difficulty]}</span>}
                      {r.calories && <span>{r.calories} kcal</span>}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0 mt-1" style={{ color: 'var(--text-muted)' }} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold mb-3">
            {page.name} : ne pas la laisser se perdre
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            La plupart des aliments finissent à la poubelle non par manque
            d&apos;envie, mais parce qu&apos;on oublie qu&apos;on les a. Mon Frigo suit
            les dates limites de ce que tu ajoutes et fait remonter en premier les
            recettes qui utilisent ce qui va bientôt se perdre — {page.name.toLowerCase()}
            {' '}comprise. C&apos;est gratuit et ça ne demande pas de compte pour essayer.
          </p>
        </section>

        {page.related.length > 0 && (
          <section className="mb-10">
            <h2 className="text-lg font-semibold mb-3">Et avec ça ?</h2>
            <div className="flex flex-wrap gap-2">
              {page.related.map(rel => (
                <Link key={rel.slug} href={`/que-faire-avec/${rel.slug}`}
                  className="text-sm px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
                  {rel.emoji} {rel.name}
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl p-5 text-center"
          style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
          <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
            Dis ce que tu as dans ton frigo, on te montre ce qui est faisable
            maintenant.
          </p>
          <Link href="/fridge" className="btn-primary">Remplir mon frigo</Link>
        </section>
      </main>
    </div>
  );
}

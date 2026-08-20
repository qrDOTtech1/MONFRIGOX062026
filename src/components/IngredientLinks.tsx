import Link from 'next/link';
import { listIngredientPages } from '@/lib/ingredientPages';

/**
 * Maillage interne vers les pages « Que faire avec … ».
 *
 * Sans lien depuis une page indexée, Google ne découvre pas ces centaines de
 * pages — le sitemap seul ne suffit pas à leur donner du poids. On expose donc
 * les ingrédients les plus courants directement sur l'accueil.
 */
export default async function IngredientLinks({ limit = 24 }: { limit?: number }) {
  let pages: Awaited<ReturnType<typeof listIngredientPages>> = [];
  try {
    pages = (await listIngredientPages()).slice(0, limit);
  } catch {
    return null;                 // base indisponible : on n'affiche rien
  }
  if (pages.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-1">Que faire avec…</h2>
      <p className="text-[13px] mb-4" style={{ color: 'var(--text-muted)' }}>
        Tu as un ingrédient qui traîne ? Vois ce qu&apos;il devient.
      </p>
      <div className="flex flex-wrap gap-2">
        {pages.map(p => (
          <Link key={p.slug} href={`/que-faire-avec/${p.slug}`}
            className="text-sm px-3 py-1.5 rounded-full transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border)' }}>
            {p.emoji} {p.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

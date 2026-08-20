import { MetadataRoute } from 'next';
import { listIngredientPages } from '@/lib/ingredientPages';

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://monfrigo.app';

// Le sitemap est régénéré chaque jour plutôt que figé au build : les pages
// « Que faire avec … » viennent de la base, qui grossit en continu. Généré une
// seule fois au build, il restait vide si la base répondait mal à cet instant.
export const revalidate = 86400;

const SEO_SLUGS = [
  'recette-avec-ce-que-j-ai',
  'courses-moins-cheres',
  'anti-gaspillage-alimentaire',
  'planning-repas-semaine',
  'recette-pas-cher',
  'que-manger-ce-soir',
  'scanner-frigo-ia',
  'liste-courses-intelligente',
  'recette-rapide-facile',
  'cuisiner-les-restes',
  'batch-cooking-meal-prep',
  'recette-vegetarienne',
  'recette-vegan',
  'recette-sans-gluten',
  'recette-halal',
  'economiser-alimentation',
  'nutriscore-recette',
  'application-cuisine-gratuite',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();

  const staticPages = [
    { url: BASE, lastModified: now, changeFrequency: 'weekly' as const, priority: 1.0 },
    { url: `${BASE}/register`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 },
    { url: `${BASE}/login`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.5 },
  ];

  // Pages de longue traîne générées depuis le catalogue. Si la base est
  // injoignable au build, on publie le sitemap sans elles plutôt que d'échouer.
  let ingredientPages: MetadataRoute.Sitemap = [];
  try {
    const pages = await listIngredientPages();
    ingredientPages = pages.map(p => ({
      url: `${BASE}/que-faire-avec/${p.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));
  } catch { /* base indisponible */ }

  const seoPages = SEO_SLUGS.map(slug => ({
    url: `${BASE}/s/${slug}`,
    lastModified: now,
    changeFrequency: 'weekly' as const,
    priority: 0.9,
  }));

  return [...staticPages, ...seoPages, ...ingredientPages];
}

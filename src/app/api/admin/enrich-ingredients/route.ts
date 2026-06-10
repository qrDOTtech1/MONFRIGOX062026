import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { openfoodfacts_search } from '@/lib/food-apis';

// POST /api/admin/enrich-ingredients
// Cherche sur Open Food Facts pour chaque ingrédient sans imageUrl
// et met à jour : imageUrl, brands si trouvés
export async function POST(req: NextRequest) {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { limit = 30 } = await req.json().catch(() => ({}));

  // Récupère les ingrédients sans image (ou sans barcode)
  const ingredients = await prisma.ingredient.findMany({
    where: { imageUrl: '' },
    take: Number(limit),
    orderBy: { name: 'asc' },
  });

  let enriched = 0;
  let skipped  = 0;

  for (const ing of ingredients) {
    try {
      const results = await openfoodfacts_search(ing.name, 1);
      const best = results.find(r => r.imageUrl && r.name.toLowerCase().includes(ing.name.toLowerCase().split(' ')[0]));
      if (best?.imageUrl) {
        await prisma.ingredient.update({
          where: { id: ing.id },
          data: {
            imageUrl: best.imageUrl,
            brands: ing.brands || best.brands || '',
          },
        });
        enriched++;
      } else {
        skipped++;
      }
      // Petite pause pour ne pas surcharger OFF (rate limit courtois)
      await new Promise(r => setTimeout(r, 120));
    } catch {
      skipped++;
    }
  }

  return NextResponse.json({
    ok: true,
    processed: ingredients.length,
    enriched,
    skipped,
    remaining: await prisma.ingredient.count({ where: { imageUrl: '' } }),
  });
}

// GET — stats rapides
export async function GET() {
  const admin = await getCurrentUser();
  if (!admin || admin.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [total, withImage, withBarcode] = await Promise.all([
    prisma.ingredient.count(),
    prisma.ingredient.count({ where: { imageUrl: { not: '' } } }),
    prisma.ingredient.count({ where: { barcode: { not: '' } } }),
  ]);

  return NextResponse.json({ total, withImage, withBarcode, missingImage: total - withImage });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { openfoodfacts_barcode } from '@/lib/food-apis';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { barcode } = await req.json();
  if (!barcode) return NextResponse.json({ error: 'Code-barres manquant' }, { status: 400 });

  const product = await openfoodfacts_barcode(String(barcode));
  if (!product || !product.name) {
    return NextResponse.json({ error: 'Produit introuvable — essaie un autre code-barres' }, { status: 404 });
  }

  // Chercher un ingrédient existant proche en DB
  const cleanName = product.name.split(',')[0].trim();
  const existing = await prisma.ingredient.findFirst({
    where: { name: { contains: cleanName.split(' ')[0], mode: 'insensitive' } },
  });

  return NextResponse.json({
    barcode,
    name: product.name,
    brands: product.brands,
    imageUrl: product.imageUrl,
    nutriScore: product.nutriScore,
    nutrients: product.nutrients,
    ingredientId: existing?.id ?? null,
    ingredientName: existing?.name ?? null,
  });
}

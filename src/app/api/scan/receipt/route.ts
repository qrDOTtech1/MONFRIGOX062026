import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { analyzeImage } from '@/lib/ollama';

/**
 * POST /api/scan/receipt  { image }
 * Lit un ticket de caisse (OCR via vision IA) et extrait les produits
 * alimentaires, mappés sur nos ingrédients quand c'est possible.
 * Réservé Premium/VIP (vision coûteuse), comme le scan frigo.
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true, plan: true, planExpiresAt: true },
  });
  const plan = (userRecord?.planExpiresAt && userRecord.planExpiresAt < new Date()) ? 'FREE' : (userRecord?.plan || 'FREE');
  if (plan === 'FREE' && userRecord?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Le scan IA est réservé aux abonnés Premium et VIP.', upgrade: true }, { status: 403 });
  }

  const { image } = await req.json();
  if (!image) return NextResponse.json({ error: 'Image requise' }, { status: 400 });

  try {
    const result = await analyzeImage(
      image,
      `Lis ce ticket de caisse / reçu de supermarché. Extrais UNIQUEMENT les produits ALIMENTAIRES achetés.
Ignore les lignes non-alimentaires (sacs, hygiène, total, TVA, carte, rendu monnaie…).
Pour chaque produit, donne un nom d'ingrédient simple et générique en français (ex: ligne "TOMATES GRAPPE BIO" -> "tomate", "LAIT 1/2 ECREME 1L" -> "lait").
Réponds UNIQUEMENT en JSON valide :
[{"name":"tomate","confidence":0.9}]
Si le ticket est illisible, renvoie [].`
    );

    const content = result.message?.content || '[]';
    let items: Array<{ name: string; confidence: number }>;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      items = [];
    }

    // Déduplique + mappe sur nos ingrédients
    const seen = new Set<string>();
    const enriched = await Promise.all(
      items
        .filter(it => {
          const k = (it.name || '').toLowerCase().trim();
          if (!k || seen.has(k)) return false;
          seen.add(k);
          return true;
        })
        .map(async (item) => {
          const ingredient = await prisma.ingredient.findFirst({
            where: { name: { contains: item.name, mode: 'insensitive' } },
            select: { id: true, name: true },
          });
          return {
            name: ingredient?.name || item.name,
            confidence: item.confidence ?? 0.8,
            ingredientId: ingredient?.id || null,
          };
        })
    );

    return NextResponse.json({ items: enriched });
  } catch (err) {
    console.error('Receipt scan error:', err);
    return NextResponse.json({ error: 'Erreur lors de la lecture du ticket', items: [] }, { status: 500 });
  }
}

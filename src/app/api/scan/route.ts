import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { analyzeImage } from '@/lib/ollama';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { image } = await req.json();
  if (!image) return NextResponse.json({ error: 'Image requise' }, { status: 400 });

  try {
    const result = await analyzeImage(
      image,
      `Analyse cette photo d'un frigo ou d'aliments. Identifie tous les ingrédients visibles.
Réponds UNIQUEMENT en JSON valide avec ce format:
[{"name": "nom de l'ingrédient", "confidence": 0.95}]
Sois précis et utilise des noms simples en français (ex: "tomate", "lait", "beurre").`
    );

    const content = result.message?.content || '[]';
    let items: Array<{ name: string; confidence: number }>;

    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      items = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      items = [];
    }

    const enriched = await Promise.all(
      items.map(async (item: { name: string; confidence: number }) => {
        const ingredient = await prisma.ingredient.findFirst({
          where: { name: { contains: item.name, mode: 'insensitive' } },
          select: { id: true, name: true },
        });
        return {
          name: ingredient?.name || item.name,
          confidence: item.confidence,
          ingredientId: ingredient?.id || null,
        };
      })
    );

    return NextResponse.json({ items: enriched });
  } catch (err) {
    console.error('Scan error:', err);
    return NextResponse.json({ error: 'Erreur lors de l\'analyse', items: [] }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { chatCompletion } from '@/lib/ollama';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const { ingredientName } = await req.json();
  if (!ingredientName) return NextResponse.json({ error: 'ingredientName requis' }, { status: 400 });

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { name: true, ingredients: { include: { ingredient: true } } },
  });
  if (!recipe) return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 });

  const fridgeItems = await prisma.fridgeItem.findMany({
    where: { userId: user.id },
    include: { ingredient: true },
  });
  const fridgeNames = fridgeItems.map(f => f.ingredient.name.toLowerCase());

  const allIngs = recipe.ingredients.map(i => `${i.quantity} ${i.unit} ${i.ingredient.name}`).join(', ');

  const resp = await chatCompletion([
    {
      role: 'system',
      content: `Tu es un chef cuisinier expert en substitutions. Réponds UNIQUEMENT en JSON valide :
{"substitute":"nom","quantity":2,"unit":"cs","reason":"explication courte","tip":"astuce optionnelle"}`,
    },
    {
      role: 'user',
      content: `Recette : "${recipe.name}"
Ingrédients : ${allIngs}
Ingrédient à remplacer : ${ingredientName}
Ingrédients dans le frigo de l'utilisateur : ${fridgeNames.join(', ') || 'aucun'}

Propose LE MEILLEUR substitut pour "${ingredientName}" dans cette recette. Privilégie les ingrédients déjà dans le frigo si possible.`,
    },
  ], { temperature: 0.4 });

  const raw = resp.message?.content?.trim() || '';
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    const data = match ? JSON.parse(match[0]) : null;
    if (!data) throw new Error('No JSON');
    return NextResponse.json({
      ...data,
      inFridge: fridgeNames.some(f => f.includes((data.substitute || '').toLowerCase().split(' ')[0])),
    });
  } catch {
    return NextResponse.json({ error: 'Erreur IA' }, { status: 500 });
  }
}

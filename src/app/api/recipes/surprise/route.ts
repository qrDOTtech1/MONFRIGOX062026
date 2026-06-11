import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/recipes/surprise — returns a random recipe the user can cook (≥80% match)
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const fridgeItems = await prisma.fridgeItem.findMany({
    where: { userId: user.id },
    select: { ingredientId: true },
  });
  const fridgeIds = new Set(fridgeItems.map(f => f.ingredientId));

  const recipes = await prisma.recipe.findMany({
    select: {
      id: true,
      name: true,
      imageUrl: true,
      prepTime: true,
      cuisine: true,
      difficulty: true,
      ingredients: { select: { ingredientId: true } },
    },
  });

  // Filter to recipes where ≥80% ingredients are in fridge
  const ready = recipes.filter(r => {
    if (r.ingredients.length === 0) return false;
    const matched = r.ingredients.filter(i => fridgeIds.has(i.ingredientId)).length;
    return (matched / r.ingredients.length) >= 0.8;
  });

  if (ready.length === 0) {
    // Fallback: any recipe with ≥50% match
    const partial = recipes.filter(r => {
      if (r.ingredients.length === 0) return false;
      const matched = r.ingredients.filter(i => fridgeIds.has(i.ingredientId)).length;
      return (matched / r.ingredients.length) >= 0.5;
    });
    if (partial.length === 0) {
      return NextResponse.json({ error: 'Pas assez d\'ingrédients dans ton frigo' }, { status: 404 });
    }
    const pick = partial[Math.floor(Math.random() * partial.length)];
    return NextResponse.json({ id: pick.id, name: pick.name, fallback: true });
  }

  const pick = ready[Math.floor(Math.random() * ready.length)];
  return NextResponse.json({ id: pick.id, name: pick.name, fallback: false });
}

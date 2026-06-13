import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json();
  const action = body.action || body.type;
  const { recipeId, date, mealType, ingredientName, quantity, unit } = body;

  if (action === 'PLAN') {
    if (!recipeId || !date || !mealType)
      return NextResponse.json({ error: 'recipeId, date et mealType requis' }, { status: 400 });

    const dateObj = new Date(date + 'T00:00:00.000Z');
    const plan = await prisma.mealPlan.upsert({
      where: { userId_date_mealType: { userId: user.id, date: dateObj, mealType } },
      create: { userId: user.id, recipeId, date: dateObj, mealType },
      update: { recipeId },
      include: { recipe: { select: { name: true } } },
    });
    return NextResponse.json({ ok: true, message: `${plan.recipe.name} ajouté au planning (${mealType})` });
  }

  if (action === 'FRIDGE') {
    if (!ingredientName)
      return NextResponse.json({ error: 'ingredientName requis' }, { status: 400 });

    let ingredient = await prisma.ingredient.findFirst({
      where: { name: { equals: ingredientName, mode: 'insensitive' } },
    });
    if (!ingredient) {
      ingredient = await prisma.ingredient.create({
        data: { name: ingredientName, category: 'Ajouté via chat', emoji: '🥫' },
      });
    }
    await prisma.fridgeItem.upsert({
      where: { userId_ingredientId: { userId: user.id, ingredientId: ingredient.id } },
      update: { quantity: quantity || 1, unit: unit || 'unité' },
      create: { userId: user.id, ingredientId: ingredient.id, quantity: quantity || 1, unit: unit || 'unité' },
    });
    return NextResponse.json({ ok: true, message: `${ingredientName} ajouté au frigo` });
  }

  if (action === 'SHOP') {
    if (!ingredientName)
      return NextResponse.json({ error: 'ingredientName requis' }, { status: 400 });

    let ingredient = await prisma.ingredient.findFirst({
      where: { name: { equals: ingredientName, mode: 'insensitive' } },
    });
    if (!ingredient) {
      ingredient = await prisma.ingredient.create({
        data: { name: ingredientName, category: 'Ajouté via chat', emoji: '🛒' },
      });
    }

    let list = await prisma.shoppingList.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (!list) {
      list = await prisma.shoppingList.create({
        data: { userId: user.id, name: 'Ma liste' },
      });
    }

    await prisma.shoppingItem.create({
      data: {
        listId: list.id,
        ingredientId: ingredient.id,
        quantity: quantity || 1,
        unit: unit || 'unité',
      },
    });
    return NextResponse.json({ ok: true, message: `${ingredientName} ajouté à la liste de courses` });
  }

  return NextResponse.json({ error: 'Action inconnue' }, { status: 400 });
}

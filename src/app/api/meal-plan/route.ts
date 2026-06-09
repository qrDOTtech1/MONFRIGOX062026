import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// GET /api/meal-plan?start=2026-06-09&end=2026-06-15
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  if (!start || !end) return NextResponse.json({ error: 'start et end requis' }, { status: 400 });

  const plans = await prisma.mealPlan.findMany({
    where: {
      userId: user.id,
      date: {
        gte: new Date(start + 'T00:00:00.000Z'),
        lte: new Date(end + 'T23:59:59.999Z'),
      },
    },
    include: {
      recipe: {
        select: {
          id: true,
          name: true,
          prepTime: true,
          imageUrl: true,
          cuisine: true,
          ingredients: {
            include: { ingredient: { select: { emoji: true } } },
          },
        },
      },
    },
    orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
  });

  return NextResponse.json(plans);
}

// POST /api/meal-plan  { recipeId, date, mealType }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { recipeId, date, mealType } = await req.json();
  if (!recipeId || !date || !mealType)
    return NextResponse.json({ error: 'recipeId, date et mealType requis' }, { status: 400 });

  const dateObj = new Date(date + 'T00:00:00.000Z');

  const plan = await prisma.mealPlan.upsert({
    where: { userId_date_mealType: { userId: user.id, date: dateObj, mealType } },
    create: { userId: user.id, recipeId, date: dateObj, mealType },
    update: { recipeId },
    include: {
      recipe: {
        select: {
          id: true, name: true, prepTime: true, imageUrl: true,
          ingredients: { include: { ingredient: { select: { emoji: true } } } },
        },
      },
    },
  });

  return NextResponse.json(plan);
}

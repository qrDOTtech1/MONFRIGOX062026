import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const BADGE_RULES: Array<{ code: string; check: (userId: string) => Promise<boolean> }> = [
  { code: 'cook_1',   check: async (uid) => (await prisma.cookLog.count({ where: { userId: uid } })) >= 1 },
  { code: 'cook_10',  check: async (uid) => (await prisma.cookLog.count({ where: { userId: uid } })) >= 10 },
  { code: 'cook_50',  check: async (uid) => (await prisma.cookLog.count({ where: { userId: uid } })) >= 50 },
  { code: 'cook_100', check: async (uid) => (await prisma.cookLog.count({ where: { userId: uid } })) >= 100 },
  { code: 'diverse_5', check: async (uid) => {
    const distinct = await prisma.cookLog.findMany({ where: { userId: uid }, distinct: ['recipeId'], select: { recipeId: true } });
    return distinct.length >= 5;
  }},
  { code: 'diverse_20', check: async (uid) => {
    const distinct = await prisma.cookLog.findMany({ where: { userId: uid }, distinct: ['recipeId'], select: { recipeId: true } });
    return distinct.length >= 20;
  }},
  { code: 'rater_5', check: async (uid) => (await prisma.cookLog.count({ where: { userId: uid, rating: { not: null } } })) >= 5 },
  { code: 'fridge_20', check: async (uid) => (await prisma.fridgeItem.count({ where: { userId: uid } })) >= 20 },
  { code: 'anti_gaspi', check: async (uid) => {
    const logs = await prisma.cookLog.count({ where: { userId: uid } });
    const expired = await prisma.fridgeItem.count({ where: { userId: uid, expiresAt: { lt: new Date() } } });
    return logs >= 10 && expired === 0;
  }},
];

async function checkBadges(userId: string) {
  const existing = await prisma.badge.findMany({ where: { userId }, select: { code: true } });
  const owned = new Set(existing.map(b => b.code));
  for (const rule of BADGE_RULES) {
    if (owned.has(rule.code)) continue;
    try {
      if (await rule.check(userId)) {
        await prisma.badge.create({ data: { userId, code: rule.code } }).catch(() => {});
      }
    } catch {}
  }
}

// POST /api/cook-log  { recipeId, servings?, rating? }
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { recipeId, servings, rating } = await req.json();

  const log = await prisma.cookLog.create({
    data: {
      userId: user.id,
      recipeId,
      servings: servings ?? 4,
      rating: typeof rating === 'number' && rating >= 1 && rating <= 5 ? rating : null,
    },
  });

  // Update recipe average rating
  if (rating >= 1 && rating <= 5) {
    const agg = await prisma.cookLog.aggregate({
      where: { recipeId, rating: { not: null } },
      _avg: { rating: true },
      _count: { rating: true },
    });
    await prisma.recipe.update({
      where: { id: recipeId },
      data: {
        avgRating: +(agg._avg.rating ?? 0).toFixed(1),
        ratingCount: agg._count.rating,
      },
    }).catch(() => {});
  }

  // Check & award badges
  await checkBadges(user.id);

  return NextResponse.json(log);
}

// GET /api/cook-log?limit=20
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const limit = parseInt(new URL(req.url).searchParams.get('limit') ?? '20');

  const logs = await prisma.cookLog.findMany({
    where: { userId: user.id },
    include: {
      recipe: { select: { id: true, name: true, imageUrl: true, cuisine: true, prepTime: true, ingredients: { include: { ingredient: { select: { emoji: true } } }, take: 1 } } },
    },
    orderBy: { cookedAt: 'desc' },
    take: limit,
  });

  // Aggregate: count per recipe
  const counts = await prisma.cookLog.groupBy({
    by: ['recipeId'],
    where: { userId: user.id },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  return NextResponse.json({ logs, counts });
}

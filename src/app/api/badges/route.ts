import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const BADGE_META: Record<string, { emoji: string; label: string; desc: string }> = {
  cook_1:     { emoji: '👨‍🍳', label: 'Première recette',     desc: 'Cuisiner ta première recette' },
  cook_10:    { emoji: '🔥', label: '10 recettes',            desc: 'Cuisiner 10 recettes' },
  cook_50:    { emoji: '⭐', label: '50 recettes',            desc: 'Cuisiner 50 recettes' },
  cook_100:   { emoji: '🏆', label: 'Chef étoilé',            desc: 'Cuisiner 100 recettes' },
  diverse_5:  { emoji: '🌍', label: 'Explorateur',            desc: 'Essayer 5 recettes différentes' },
  diverse_20: { emoji: '🗺️', label: 'Globe-trotter culinaire', desc: 'Essayer 20 recettes différentes' },
  rater_5:    { emoji: '⭐', label: 'Critique gastronomique', desc: 'Noter 5 recettes' },
  fridge_20:  { emoji: '🧊', label: 'Frigo bien rempli',      desc: 'Avoir 20 ingrédients dans le frigo' },
  anti_gaspi: { emoji: '♻️', label: 'Anti-gaspi champion',    desc: '10 recettes cuisinées, 0 ingrédient expiré' },
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const earned = await prisma.badge.findMany({
    where: { userId: user.id },
    orderBy: { unlockedAt: 'desc' },
  });

  const badges = Object.entries(BADGE_META).map(([code, meta]) => {
    const userBadge = earned.find(b => b.code === code);
    return {
      code,
      ...meta,
      unlocked: !!userBadge,
      unlockedAt: userBadge?.unlockedAt ?? null,
    };
  });

  return NextResponse.json(badges);
}

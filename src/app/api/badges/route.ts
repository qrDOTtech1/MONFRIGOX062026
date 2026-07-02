import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

const FOUNDER_LIMIT = 100;

const BADGE_META: Record<string, { emoji: string; label: string; desc: string; topSecret?: boolean }> = {
  founder:    { emoji: '💎', label: 'Pionnier',               desc: 'Parmi les 100 premiers membres' },
  cook_1:     { emoji: '👨‍🍳', label: 'Première recette',     desc: 'Cuisiner ta première recette' },
  cook_10:    { emoji: '🔥', label: '10 recettes',            desc: 'Cuisiner 10 recettes' },
  cook_50:    { emoji: '⭐', label: '50 recettes',            desc: 'Cuisiner 50 recettes' },
  cook_100:   { emoji: '🏆', label: 'Chef étoilé',            desc: 'Cuisiner 100 recettes' },
  diverse_5:  { emoji: '🌍', label: 'Explorateur',            desc: 'Essayer 5 recettes différentes' },
  diverse_20: { emoji: '🗺️', label: 'Globe-trotter culinaire', desc: 'Essayer 20 recettes différentes' },
  rater_5:    { emoji: '⭐', label: 'Critique gastronomique', desc: 'Noter 5 recettes' },
  fridge_20:  { emoji: '🧊', label: 'Frigo bien rempli',      desc: 'Avoir 20 ingrédients dans le frigo' },
  anti_gaspi: { emoji: '♻️', label: 'Anti-gaspi champion',    desc: '10 recettes cuisinées, 0 ingrédient expiré' },
  secret_dj:         { emoji: '🎧', label: 'DJ caché',          desc: 'A trouvé une ambiance sonore secrète en mode cuisine', topSecret: true },
  secret_quizmaster: { emoji: '🧠', label: 'Quiz Master',       desc: 'A trouvé le quiz culinaire caché en mode cuisine', topSecret: true },
  secret_finder:     { emoji: '🕵️', label: 'Chasseur d\'œufs', desc: 'A débusqué un easter egg bien planqué', topSecret: true },
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const [earned, founderCount] = await Promise.all([
    prisma.badge.findMany({ where: { userId: user.id }, orderBy: { unlockedAt: 'desc' } }),
    prisma.badge.count({ where: { code: 'founder' } }),
  ]);

  const founderRemaining = Math.max(0, FOUNDER_LIMIT - founderCount);

  const badges = Object.entries(BADGE_META).map(([code, meta]) => {
    const userBadge = earned.find(b => b.code === code);
    const unlocked = !!userBadge;

    // Badges top secret verrouillés : on ne révèle ni le nom ni la description tant qu'ils ne sont pas trouvés
    const displayMeta = meta.topSecret && !unlocked
      ? { emoji: '🔒', label: '???', desc: 'Top secret — à découvrir…', topSecret: true }
      : meta;

    const base = {
      code,
      ...displayMeta,
      unlocked,
      unlockedAt: userBadge?.unlockedAt ?? null,
    };
    if (code === 'founder') {
      return {
        ...base,
        exclusive: true,
        remaining: founderRemaining,
        // épuisé pour ceux qui ne l'ont pas et arrivés trop tard
        soldOut: !unlocked && founderRemaining === 0,
      };
    }
    return base;
  });

  return NextResponse.json(badges);
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateTrialRecipe } from '@/lib/ollama';

// POST /api/ai/trial  { ingredients: string[] }
// Génère UNE recette IA pour un visiteur NON connecté — le « waouh » avant
// l'inscription. Protégé contre les abus :
//   - 1 essai par navigateur (cookie mf_trial),
//   - plafond quotidien global (protège le budget tokens).
const DAILY_GLOBAL_CAP = 300;

// ⚙️ INTERRUPTEUR : limiter l'essai à 1 par navigateur.
//    false = champ libre (phase de test) · true = limite active (production).
//    Repasser à true quand on veut re-limiter.
const ONE_TRY_PER_BROWSER = false;

function todayKey() { return new Date().toISOString().slice(0, 10); }

export async function POST(req: NextRequest) {
  // 1 essai par navigateur (désactivable via l'interrupteur ci-dessus).
  if (ONE_TRY_PER_BROWSER && req.cookies.get('mf_trial')?.value) {
    return NextResponse.json(
      { error: 'trial_used', message: 'Tu as déjà utilisé ton essai gratuit. Crée ton compte pour continuer — c’est gratuit !' },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const list: string[] = Array.isArray(body.ingredients)
    ? body.ingredients.map((s: unknown) => String(s).trim()).filter(Boolean).slice(0, 12)
    : [];
  if (list.length === 0) {
    return NextResponse.json({ error: 'Ajoute au moins un ingrédient.' }, { status: 400 });
  }
  // Nombre de personnes choisi par l'utilisateur (borné pour rester réaliste).
  const servings = Math.min(12, Math.max(1, parseInt(body.servings, 10) || 2));

  // Plafond quotidien global (garde-fou budget), stocké dans AppConfig (zéro migration).
  const capKey = `trial_gen_${todayKey()}`;
  const capRow = await prisma.appConfig.findUnique({ where: { key: capKey } });
  const usedToday = capRow ? parseInt(capRow.value, 10) || 0 : 0;
  if (usedToday >= DAILY_GLOBAL_CAP) {
    return NextResponse.json(
      { error: 'busy', message: 'Notre chef IA est débordé aujourd’hui 😅 Crée ton compte gratuit pour l’essayer sans attendre.' },
      { status: 503 },
    );
  }

  try {
    // 2 recettes EN PARALLÈLE : "chef" (cohérente) + "vide-frigo" (utilise tout).
    const [chef, videFrigo] = await Promise.all([
      generateTrialRecipe(list, servings, false),
      generateTrialRecipe(list, servings, true),
    ]);
    const recipes = [
      chef && { ...chef, kind: 'chef' as const },
      videFrigo && { ...videFrigo, kind: 'vide-frigo' as const },
    ].filter(Boolean);

    if (recipes.length === 0) {
      return NextResponse.json({ error: 'L’IA n’a pas réussi cette fois, réessaie avec d’autres ingrédients.' }, { status: 502 });
    }

    // Incrémente le compteur global (fire-and-forget).
    prisma.appConfig.upsert({
      where: { key: capKey },
      update: { value: String(usedToday + recipes.length) },
      create: { key: capKey, value: String(recipes.length) },
    }).catch(() => {});

    const res = NextResponse.json({ recipes });
    // Marque l'essai comme consommé (7 jours) — seulement si la limite est active.
    if (ONE_TRY_PER_BROWSER) {
      res.cookies.set('mf_trial', '1', {
        httpOnly: true, sameSite: 'lax', path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
      });
    }
    return res;
  } catch (e) {
    console.error('[ai/trial] Erreur:', e);
    return NextResponse.json({ error: 'Erreur pendant la génération. Réessaie.' }, { status: 500 });
  }
}

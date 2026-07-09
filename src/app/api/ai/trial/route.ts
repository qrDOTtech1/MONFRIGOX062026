import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateExpiryRecipe } from '@/lib/ollama';

// POST /api/ai/trial  { ingredients: string[] }
// Génère UNE recette IA pour un visiteur NON connecté — le « waouh » avant
// l'inscription. Protégé contre les abus :
//   - 1 essai par navigateur (cookie mf_trial),
//   - plafond quotidien global (protège le budget tokens).
const DAILY_GLOBAL_CAP = 300;

function todayKey() { return new Date().toISOString().slice(0, 10); }

export async function POST(req: NextRequest) {
  // 1 essai par navigateur.
  if (req.cookies.get('mf_trial')?.value) {
    return NextResponse.json(
      { error: 'trial_used', message: 'Tu as déjà utilisé ton essai gratuit. Crée ton compte pour continuer — c’est gratuit !' },
      { status: 429 },
    );
  }

  const { ingredients } = await req.json().catch(() => ({ ingredients: null }));
  const list: string[] = Array.isArray(ingredients)
    ? ingredients.map(s => String(s).trim()).filter(Boolean).slice(0, 12)
    : [];
  if (list.length === 0) {
    return NextResponse.json({ error: 'Ajoute au moins un ingrédient.' }, { status: 400 });
  }

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
    const recipe = await generateExpiryRecipe(list);
    if (!recipe) {
      return NextResponse.json({ error: 'L’IA n’a pas réussi cette fois, réessaie avec d’autres ingrédients.' }, { status: 502 });
    }

    // Incrémente le compteur global (fire-and-forget).
    prisma.appConfig.upsert({
      where: { key: capKey },
      update: { value: String(usedToday + 1) },
      create: { key: capKey, value: '1' },
    }).catch(() => {});

    const res = NextResponse.json({ recipe });
    // Marque l'essai comme consommé (7 jours).
    res.cookies.set('mf_trial', '1', {
      httpOnly: true, sameSite: 'lax', path: '/',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error('[ai/trial] Erreur:', e);
    return NextResponse.json({ error: 'Erreur pendant la génération. Réessaie.' }, { status: 500 });
  }
}

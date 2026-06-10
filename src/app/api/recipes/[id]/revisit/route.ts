import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { chatCompletion } from '@/lib/ollama';

// Limites hebdomadaires de revisites IA
const LIMITS = { FREE: 0, PREMIUM: 3, VIP: 15, ADMIN: 999999 };

function weekStr() {
  const now  = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
}

function getEffectivePlan(user: { plan: string; planExpiresAt: Date | null }) {
  if (user.plan === 'FREE') return 'FREE';
  if (user.planExpiresAt && user.planExpiresAt < new Date()) return 'FREE';
  return user.plan;
}

// POST /api/recipes/[id]/revisit
// Body: { instruction: string } — ex: "Rends cette recette végétarienne"
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authUser = await getCurrentUser();
  if (!authUser) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;
  const { instruction } = await req.json();
  if (!instruction?.trim()) return NextResponse.json({ error: 'Instruction manquante' }, { status: 400 });

  const userRecord = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { role: true, plan: true, planExpiresAt: true, revisitCount: true, revisitWeek: true },
  });
  if (!userRecord) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });

  const plan  = userRecord.role === 'ADMIN' ? 'ADMIN' : getEffectivePlan(userRecord);
  const limit = LIMITS[plan as keyof typeof LIMITS] ?? 0;

  if (limit === 0) {
    return NextResponse.json({
      error: 'La revisit IA est réservée aux abonnés Premium et VIP.',
      upgrade: true,
    }, { status: 403 });
  }

  // Vérif quota hebdomadaire
  const week = weekStr();
  const used = userRecord.revisitWeek === week ? userRecord.revisitCount : 0;

  if (plan !== 'ADMIN' && used >= limit) {
    return NextResponse.json({
      error: `Limite hebdomadaire atteinte (${limit}/semaine pour ${plan}).`,
      remaining: 0,
    }, { status: 429 });
  }

  // Charger la recette
  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: {
      name: true, instructions: true, description: true,
      ingredients: { select: { quantity: true, unit: true, ingredient: { select: { name: true } } } },
    },
  });
  if (!recipe) return NextResponse.json({ error: 'Recette introuvable' }, { status: 404 });

  const ingredientList = recipe.ingredients
    .map(i => `- ${i.quantity} ${i.unit} ${i.ingredient.name}`)
    .join('\n');

  const prompt = `Tu es un chef cuisinier professionnel. On te demande de revisiter une recette selon une instruction précise.

RECETTE : ${recipe.name}
DESCRIPTION : ${recipe.description}
INGRÉDIENTS ORIGINAUX :
${ingredientList}

INSTRUCTIONS ORIGINALES :
${recipe.instructions}

INSTRUCTION DE REVISIT : ${instruction}

Réponds en JSON avec ce format exact :
{
  "title": "Nouveau titre si changé, sinon titre original",
  "description": "Nouvelle description courte (1-2 phrases)",
  "ingredients": [
    {"name": "huile d'olive", "quantity": 2, "unit": "cs"},
    {"name": "oignons", "quantity": 2, "unit": "pièce"},
    {"name": "bœuf haché", "quantity": 400, "unit": "g"}
  ],
  "instructions": "Étape détaillée 1.\\nÉtape détaillée 2.\\nÉtape détaillée 3.",
  "tips": "1 astuce clé de chef pour cette version"
}

RÈGLES ABSOLUES pour les quantités :
- JAMAIS "1 unité" pour une huile, sauce, épice, herbe ou liquide
- Huiles → cs (cuillère à soupe). Ex: 2 cs d'huile d'olive pour faire revenir
- Épices, sel → cc ou pincée. Ex: 1 cc de cumin, 2 pincées de sel
- Viandes, légumes pesés → g. Ex: 400 g de bœuf haché, 300 g de courgettes
- Légumes entiers → pièce. Ex: 2 oignons, 1 poivron
- Liquides → ml. Ex: 200 ml de bouillon
- Beurre → g. Ex: 30 g de beurre
Réponds UNIQUEMENT avec le JSON, sans markdown, sans explication.`;

  const response = await chatCompletion([{ role: 'user', content: prompt }]);
  const raw = response?.message?.content ?? '';

  // Parser le JSON de la réponse
  let revisited: Record<string, unknown>;
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    revisited = match ? JSON.parse(match[0]) : {};
  } catch {
    return NextResponse.json({ error: "Erreur lors de la génération — réessaie." }, { status: 500 });
  }

  // Incrémenter le compteur
  await prisma.user.update({
    where: { id: authUser.id },
    data: { revisitCount: used + 1, revisitWeek: week },
  });

  return NextResponse.json({
    revisited,
    remaining: plan === 'ADMIN' ? 999 : limit - used - 1,
    plan,
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { chatCompletion } from '@/lib/ollama';
import { checkAndConsumeAI } from '@/lib/ai-rate-limit';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { messages } = await req.json() as { messages: Message[] };
  if (!messages?.length) return NextResponse.json({ error: 'Messages manquants' }, { status: 400 });

  // ── Rate limiting ──
  const rl = await checkAndConsumeAI(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.reason, upgrade: rl.upgrade, remaining: 0 }, { status: 429 });
  }

  // Charge toutes les recettes de la DB pour que l'IA ait le contexte complet
  const recipes = await prisma.recipe.findMany({
    select: {
      id: true, name: true, description: true, cuisine: true,
      difficulty: true, prepTime: true, servings: true,
      calories: true, protein: true, carbs: true, fat: true,
      kidFriendly: true, babyFriendly: true,
      ingredients: { select: { unit: true, quantity: true, ingredient: { select: { name: true } } } },
    },
  });

  const recipeContext = recipes.map(r =>
    `[ID:${r.id}] "${r.name}" | ${r.cuisine} | ${r.difficulty} | ${r.prepTime}min | ${r.servings} pers.` +
    (r.calories ? ` | ${r.calories}kcal` : '') +
    (r.kidFriendly ? ' | enfants' : '') +
    ` | Ingrédients: ${r.ingredients.map(i => i.ingredient.name).join(', ')}`
  ).join('\n');

  const systemPrompt = `Tu es un assistant culinaire dans l'application MonFrigo. Tu aides les utilisateurs à trouver des recettes PARMI CELLES DISPONIBLES dans la base de données ci-dessous. Tu ne crées PAS de nouvelles recettes.

CATALOGUE COMPLET (${recipes.length} recettes) :
${recipeContext}

COMPORTEMENT :
- Réponds toujours en français, de façon conversationnelle et chaleureuse.
- Propose des recettes du catalogue en te basant sur les demandes de l'utilisateur (ingrédients, envies, régimes, temps disponible, etc.).
- Si l'utilisateur demande une substitution ("je peux remplacer X par Y ?"), donne ton avis et propose des recettes adaptées.
- Si l'utilisateur affine ("et si j'ajoute de l'ail ?", "plutôt sans gluten"), tiens compte de tout le fil de conversation.
- Quand tu cites une recette, inclus son ID entre crochets exactement comme ça : [ID:xxxx]
- Cite 1 à 4 recettes max par réponse, les plus pertinentes.
- Si aucune recette ne correspond vraiment, dis-le honnêtement et propose ce qui s'en approche le plus.
- Reste concis (3-6 phrases max) sauf si l'utilisateur pose une question précise sur une recette.`;

  try {
    const resp = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      { temperature: 0.6 },
    );

    const reply = resp.message?.content || '';

    // Extraire les IDs de recettes mentionnées dans la réponse
    const idMatches = [...reply.matchAll(/\[ID:([a-z0-9]+)\]/gi)];
    const recipeIds = [...new Set(idMatches.map(m => m[1]))];

    // Nettoyer la réponse (retirer les [ID:xxx] du texte visible)
    const cleanReply = reply.replace(/\s*\[ID:[a-z0-9]+\]/gi, '');

    return NextResponse.json({ reply: cleanReply, recipeIds });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: 'Erreur IA — vérifie la configuration Ollama' }, { status: 500 });
  }
}

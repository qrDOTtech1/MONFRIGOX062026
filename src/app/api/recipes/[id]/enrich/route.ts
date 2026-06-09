import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { chatCompletion } from '@/lib/ollama';

// POST /api/recipes/[id]/enrich
// Accessible à tout utilisateur connecté.
// Traduit + calcule la nutrition si ce n'est pas déjà fait.
// Renvoie la recette mise à jour.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: { id: true, name: true, description: true, instructions: true, cuisine: true, servings: true, calories: true },
  });
  if (!recipe) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  // Déjà enrichi → on retourne directement
  if (recipe.calories !== null) {
    return NextResponse.json({ alreadyDone: true });
  }

  const prompt = `Tu es un assistant culinaire expert en nutrition.

Voici une recette (peut être en anglais ou dans une autre langue) :
- Nom: ${recipe.name}
- Description: ${recipe.description}
- Instructions: ${recipe.instructions}
- Cuisine: ${recipe.cuisine}
- Portions: ${recipe.servings}

Ta tâche :
1. Traduis le nom, la description et les instructions EN FRANÇAIS si ce n'est pas déjà le cas. Si c'est déjà en français, garde les textes tels quels.
2. Estime les valeurs nutritionnelles PAR PORTION (pour ${recipe.servings} portion${recipe.servings > 1 ? 's' : ''}).

Réponds UNIQUEMENT en JSON valide, sans commentaire, sans balise markdown :
{
  "name": "...",
  "description": "...",
  "instructions": "...",
  "calories": 450,
  "protein": 25.5,
  "carbs": 40.0,
  "fat": 18.0,
  "fiber": 4.5,
  "salt": 1.2
}

Pour les instructions : garde chaque étape sur une ligne séparée (\\n). Supprime les numéros en début d'étape.`;

  try {
    const resp = await chatCompletion(
      [
        { role: 'system', content: 'Tu es un assistant culinaire. Réponds UNIQUEMENT en JSON valide sans balise markdown.' },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.3 },
    );

    const raw = (resp.message?.content || '').trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Pas de JSON dans la réponse IA');

    const data = JSON.parse(jsonMatch[0]);

    const updated = await prisma.recipe.update({
      where: { id },
      data: {
        name:         typeof data.name === 'string' && data.name.trim()         ? data.name.trim()         : undefined,
        description:  typeof data.description === 'string' && data.description.trim() ? data.description.trim() : undefined,
        instructions: typeof data.instructions === 'string' && data.instructions.trim() ? data.instructions.trim() : undefined,
        calories: typeof data.calories === 'number' ? Math.round(data.calories) : undefined,
        protein:  typeof data.protein  === 'number' ? data.protein  : undefined,
        carbs:    typeof data.carbs    === 'number' ? data.carbs    : undefined,
        fat:      typeof data.fat      === 'number' ? data.fat      : undefined,
        fiber:    typeof data.fiber    === 'number' ? data.fiber    : undefined,
        salt:     typeof data.salt     === 'number' ? data.salt     : undefined,
      },
    });

    return NextResponse.json({ ok: true, recipe: updated });
  } catch (err) {
    console.error('Auto-enrich error:', err);
    return NextResponse.json({ error: 'Erreur IA', details: err instanceof Error ? err.message : '' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { chatCompletion } from '@/lib/ollama';

// POST /api/recipes/[id]/enrich
// Traduit recette + ingrédients en français + calcule valeurs nutritionnelles.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  const recipe = await prisma.recipe.findUnique({
    where: { id },
    select: {
      id: true, name: true, description: true, instructions: true,
      cuisine: true, servings: true, calories: true,
      ingredients: { include: { ingredient: true } },
    },
  });
  if (!recipe) return NextResponse.json({ error: 'Introuvable' }, { status: 404 });

  // Déjà enrichi → retour immédiat
  if (recipe.calories !== null) {
    return NextResponse.json({ alreadyDone: true });
  }

  // Ingrédients potentiellement en anglais
  const ingredientList = recipe.ingredients.map(i => ({
    id: i.ingredient.id,
    name: i.ingredient.name,
    unit: i.unit,
  }));

  const prompt = `Tu es un assistant culinaire expert en nutrition.

Voici une recette (peut être en anglais) :
- Nom: ${recipe.name}
- Description: ${recipe.description}
- Instructions: ${recipe.instructions}
- Cuisine: ${recipe.cuisine}
- Portions: ${recipe.servings}
- Ingrédients: ${ingredientList.map(i => `"${i.name}" (unité: "${i.unit}")`).join(', ')}

Ta tâche :
1. Traduis EN FRANÇAIS le nom, la description, les instructions et chaque ingrédient si ce n'est pas déjà le cas.
2. Traduis également les unités de mesure (cups → tasses ou ml, tbsp → cuillère à soupe, tsp → cuillère à café, oz → g, lb → g, etc.)
3. Estime les valeurs nutritionnelles PAR PORTION.

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
  "salt": 1.2,
  "ingredients": [
    { "id": "...", "nameFr": "...", "unitFr": "..." }
  ]
}

Pour les instructions : chaque étape sur une ligne séparée (\\n). Sans numéros en début d'étape.
Pour les ingrédients : traduis seulement, garde le même id.`;

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

    // Mise à jour de la recette
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

    // Mise à jour des noms d'ingrédients + unités
    if (Array.isArray(data.ingredients)) {
      for (const ing of data.ingredients) {
        if (!ing.id) continue;

        // Mettre à jour le nom de l'ingrédient en français (si pas déjà traduit)
        if (typeof ing.nameFr === 'string' && ing.nameFr.trim()) {
          await prisma.ingredient.update({
            where: { id: ing.id },
            data: { name: ing.nameFr.trim() },
          }).catch(() => {}); // ignore si conflit unique
        }

        // Mettre à jour l'unité dans RecipeIngredient
        if (typeof ing.unitFr === 'string' && ing.unitFr.trim()) {
          await prisma.recipeIngredient.updateMany({
            where: { recipeId: id, ingredientId: ing.id },
            data: { unit: ing.unitFr.trim() },
          }).catch(() => {});
        }
      }
    }

    return NextResponse.json({ ok: true, recipe: updated });
  } catch (err) {
    console.error('Auto-enrich error:', err);
    return NextResponse.json({ error: 'Erreur IA', details: err instanceof Error ? err.message : '' }, { status: 500 });
  }
}

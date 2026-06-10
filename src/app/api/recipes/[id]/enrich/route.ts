import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { chatCompletion } from '@/lib/ollama';
import { checkAndConsumeAI } from '@/lib/ai-rate-limit';

// POST /api/recipes/[id]/enrich
// Traduit recette + ingrédients en français + calcule valeurs nutritionnelles.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { id } = await params;

  // ── Rate limiting (skip si déjà enrichi — coût amorti) ──
  const rl = await checkAndConsumeAI(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.reason, upgrade: rl.upgrade }, { status: 429 });
  }

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

  const prompt = `Tu es un chef cuisinier professionnel et expert en nutrition.

Voici une recette (peut être en anglais) :
- Nom: ${recipe.name}
- Description: ${recipe.description}
- Instructions: ${recipe.instructions}
- Cuisine: ${recipe.cuisine}
- Portions: ${recipe.servings}
- Ingrédients actuels: ${ingredientList.map(i => `id="${i.id}" nom="${i.name}" unité_actuelle="${i.unit}"`).join(' | ')}

Ta tâche :
1. Traduis EN FRANÇAIS le nom, la description, les instructions et chaque ingrédient si ce n'est pas déjà le cas.
2. Vérifie la COHÉRENCE culinaire : si la recette s'appelle "crêpes" et qu'il manque la farine, le lait ou les œufs dans la liste, signale-le mais travaille avec ce qui est fourni.
3. Corrige les quantités et unités pour ${recipe.servings} portion(s) — JAMAIS "unité" sauf objets entiers :
   - Huiles → cs. Ex: 2 cs d'huile d'olive
   - Épices, sel → cc ou pincée
   - Viandes, féculents, légumes pesés → g
   - Herbes fraîches → brins ou g
   - Liquides (bouillon, lait, crème) → ml
   - Beurre → g
4. Estime les valeurs nutritionnelles PAR PORTION.

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
    { "id": "cuid_original", "nameFr": "huile d'olive", "quantity": 2, "unit": "cs" },
    { "id": "cuid_original", "nameFr": "oignon", "quantity": 1, "unit": "pièce" },
    { "id": "cuid_original", "nameFr": "bœuf haché", "quantity": 400, "unit": "g" }
  ]
}

Pour les instructions : chaque étape sur une ligne (\\n). Sans numéros en début d'étape.
IMPORTANT : garde le même "id" que celui fourni pour chaque ingrédient.`;

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

        // Mettre à jour quantité + unité dans RecipeIngredient
        const updateData: { unit?: string; quantity?: number } = {};
        if (typeof ing.unit === 'string' && ing.unit.trim()) {
          updateData.unit = ing.unit.trim();
        } else if (typeof ing.unitFr === 'string' && ing.unitFr.trim()) {
          updateData.unit = ing.unitFr.trim(); // compat ancien format
        }
        if (typeof ing.quantity === 'number' && ing.quantity > 0) {
          updateData.quantity = ing.quantity;
        }
        if (Object.keys(updateData).length > 0) {
          await prisma.recipeIngredient.updateMany({
            where: { recipeId: id, ingredientId: ing.id },
            data: updateData,
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

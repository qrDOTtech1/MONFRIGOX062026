import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isAdmin } from '@/lib/auth';
import { chatCompletion } from '@/lib/ollama';

// POST /api/admin/recipes/enrich
// body: { ids: string[] }  — enrichit les recettes données (ou toutes si ids vide)
// Pour chaque recette : traduit nom/desc/instructions en français + calcule valeurs nutritionnelles
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { ids } = await req.json() as { ids?: string[] };

  const where = ids && ids.length > 0 ? { id: { in: ids } } : {};
  const recipes = await prisma.recipe.findMany({
    where,
    select: { id: true, name: true, description: true, instructions: true, cuisine: true, servings: true },
  });

  const results: { id: string; ok: boolean; error?: string }[] = [];

  for (const recipe of recipes) {
    try {
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

      const resp = await chatCompletion([
        { role: 'system', content: 'Tu es un assistant culinaire. Réponds UNIQUEMENT en JSON valide sans balise markdown.' },
        { role: 'user', content: prompt },
      ], { temperature: 0.3 });

      const raw = (resp.message?.content || '').trim();
      // Extract JSON even if model adds markdown fences
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Pas de JSON dans la réponse IA');

      const data = JSON.parse(jsonMatch[0]);

      await prisma.recipe.update({
        where: { id: recipe.id },
        data: {
          name:         typeof data.name         === 'string' && data.name.trim()         ? data.name.trim()         : undefined,
          description:  typeof data.description  === 'string' && data.description.trim()  ? data.description.trim()  : undefined,
          instructions: typeof data.instructions === 'string' && data.instructions.trim() ? data.instructions.trim() : undefined,
          calories: typeof data.calories === 'number' ? Math.round(data.calories) : undefined,
          protein:  typeof data.protein  === 'number' ? data.protein  : undefined,
          carbs:    typeof data.carbs    === 'number' ? data.carbs    : undefined,
          fat:      typeof data.fat      === 'number' ? data.fat      : undefined,
          fiber:    typeof data.fiber    === 'number' ? data.fiber    : undefined,
          salt:     typeof data.salt     === 'number' ? data.salt     : undefined,
        },
      });

      results.push({ id: recipe.id, ok: true });
    } catch (err) {
      console.error(`Enrich error for recipe ${recipe.id}:`, err);
      results.push({ id: recipe.id, ok: false, error: err instanceof Error ? err.message : 'Erreur inconnue' });
    }
  }

  return NextResponse.json({ results, total: recipes.length });
}

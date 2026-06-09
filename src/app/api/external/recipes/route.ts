import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  mealdb_searchByName,
  mealdb_byArea,
  mealdb_random,
  spoonacular_search,
  spoonacular_byIngredients,
  spoonacular_random,
} from '@/lib/food-apis';

/**
 * GET /api/external/recipes
 * Params:
 *   source   = mealdb | spoonacular  (default: mealdb)
 *   q        = texte de recherche
 *   area     = pays (mealdb only)
 *   ingredients = liste séparée par des virgules (spoonacular only)
 *   random   = true pour une recette au hasard
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const source = sp.get('source') || 'mealdb';
  const query = sp.get('q') || '';
  const area = sp.get('area') || '';
  const ingredients = sp.get('ingredients') || '';
  const random = sp.get('random') === 'true';

  try {
    if (source === 'spoonacular') {
      if (ingredients) {
        const data = await spoonacular_byIngredients(ingredients.split(',').map(s => s.trim()));
        return NextResponse.json(data);
      }
      if (random) {
        const data = await spoonacular_random();
        return NextResponse.json(data);
      }
      const data = await spoonacular_search(query, area || undefined);
      return NextResponse.json(data);
    }

    // mealdb (default)
    if (random) {
      const meal = await mealdb_random();
      return NextResponse.json(meal ? [meal] : []);
    }
    if (area) {
      const data = await mealdb_byArea(area);
      return NextResponse.json(data);
    }
    const data = await mealdb_searchByName(query);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('External recipes error:', err);
    return NextResponse.json({ error: err?.message || 'Erreur API externe' }, { status: 500 });
  }
}

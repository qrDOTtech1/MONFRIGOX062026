import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { usda_search, usda_details } from '@/lib/food-apis';

/**
 * GET /api/external/ingredients
 * Params:
 *   q     = texte de recherche (USDA FoodData Central)
 *   fdcId = id USDA pour le détail
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const query = sp.get('q') || '';
  const fdcId = sp.get('fdcId') || '';

  try {
    if (fdcId) {
      const food = await usda_details(parseInt(fdcId, 10));
      if (!food) return NextResponse.json({ error: 'Ingrédient non trouvé' }, { status: 404 });
      return NextResponse.json(food);
    }

    if (query) {
      const foods = await usda_search(query);
      return NextResponse.json(foods);
    }

    return NextResponse.json({ error: 'Paramètre "q" ou "fdcId" requis' }, { status: 400 });
  } catch (err: any) {
    console.error('USDA API error:', err);
    return NextResponse.json({ error: err?.message || 'Erreur' }, { status: 500 });
  }
}

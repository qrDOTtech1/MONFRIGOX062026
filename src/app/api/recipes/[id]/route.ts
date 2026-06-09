import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { id: string } }): Promise<Response> {
  const { id } = params;
  // TheMealDB lookup by id endpoint
  const apiUrl = `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${id}`;
  try {
    const apiResp = await fetch(apiUrl, { next: { revalidate: 3600 } });
    if (!apiResp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch recipe' }), { status: apiResp.status });
    }
    const data = await apiResp.json();
    if (!data.meals || data.meals.length === 0) {
      return new Response(JSON.stringify({ error: 'Recipe not found' }), { status: 404 });
    }
    const meal = data.meals[0];

    const ingredients: Array<{ quantity: number; unit: string; ingredient: { name: string; emoji: string }; inFridge: boolean }> = [];
    for (let i = 1; i <= 20; i++) {
      const ingName: string | undefined = meal[(`strIngredient${i}` as keyof typeof meal)] as any;
      const measure: string | undefined = meal[(`strMeasure${i}` as keyof typeof meal)] as any;
      if (ingName && ingName.trim().length > 0) {
        let quantity = 1;
        let unit = '';
        if (measure) {
          // Very simple parsing: grab every numeric part
          const numMatch = measure.match(/([\d\.]+)[\s\/]?([\d\.]+)?/);
          if (numMatch) {
            if (numMatch[2]) {
              const a = parseFloat(numMatch[1]);
              const b = parseFloat(numMatch[2]);
              quantity = a + b / 10;
            } else {
              quantity = parseFloat(numMatch[1]);
            }
          }
          // remove the matched numbers from the string to isolate unit
          unit = measure.replace(/([\d\.]+)[\s\/]?([\d\.]+)?/, '').trim();
        }
        ingredients.push({
          quantity,
          unit,
          ingredient: { name: ingName.trim(), emoji: '' },
          inFridge: false,
        });
      }
    }

const recipe = {
      id: id,
      name: meal.strMeal,
      prepTime: 15,
      servings: 4,
      difficulty: 'FACILE',
      cuisine: meal.strArea ?? 'FR',
      ingredients,
      instructions: meal.strInstructions,
      description: meal.strInstructions.slice(0, 120) + '...',
      isFavorite: false,
    };

    return new Response(JSON.stringify(recipe), { status: 200 });
  }
  catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message ?? 'Unknown error' }), { status: 500 });
  }
}

}

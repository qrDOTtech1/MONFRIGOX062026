import { prisma } from './db';
import { chatCompletion } from './ollama';

const CUISINE_MAP: Record<string, string> = {
  French: 'Française', Italian: 'Italienne', Japanese: 'Japonaise',
  Chinese: 'Chinoise', Indian: 'Indienne', Mexican: 'Mexicaine',
  Thai: 'Thaïlandaise', Vietnamese: 'Vietnamienne', Moroccan: 'Marocaine',
  Spanish: 'Espagnole', Greek: 'Grecque', Turkish: 'Turque',
  American: 'Américaine', British: 'Britannique', Irish: 'Irlandaise',
  Canadian: 'Canadienne', Jamaican: 'Jamaïcaine', Filipino: 'Philippine',
  Malaysian: 'Malaisienne', Croatian: 'Croate', Dutch: 'Néerlandaise',
  Egyptian: 'Égyptienne', Kenyan: 'Kényane', Polish: 'Polonaise',
  Portuguese: 'Portugaise', Russian: 'Russe', Tunisian: 'Tunisienne',
  Korean: 'Coréenne', Lebanese: 'Libanaise', Ethiopian: 'Éthiopienne',
  Brazilian: 'Brésilienne', Peruvian: 'Péruvienne', Argentine: 'Argentine',
  Colombian: 'Colombienne', German: 'Allemande', Austrian: 'Autrichienne',
  Swedish: 'Suédoise', Norwegian: 'Norvégienne',
  Unknown: 'Internationale', '': 'Internationale',
};

interface MealDBMeal {
  idMeal: string;
  strMeal: string;
  strArea: string;
  strInstructions: string;
  strMealThumb: string;
  strCategory: string;
  [key: string]: string | null;
}

function extractIngredients(meal: MealDBMeal): Array<{ name: string; measure: string }> {
  const result: Array<{ name: string; measure: string }> = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`]?.trim();
    const measure = meal[`strMeasure${i}`]?.trim() || '';
    if (name) result.push({ name, measure });
  }
  return result;
}

function parseMeasure(measure: string): { quantity: number; unit: string } {
  const m = measure.trim().toLowerCase();
  if (!m) return { quantity: 1, unit: 'pièce' };
  const numMatch = m.match(/^([\d.,/]+)\s*(.*)/);
  if (!numMatch) return { quantity: 1, unit: m || 'pièce' };
  let qty = parseFloat(numMatch[1].replace(',', '.'));
  if (numMatch[1].includes('/')) {
    const [a, b] = numMatch[1].split('/');
    qty = parseInt(a) / parseInt(b);
  }
  if (isNaN(qty)) qty = 1;
  let unit = numMatch[2].trim();
  const unitMap: Record<string, string> = {
    g: 'g', kg: 'kg', ml: 'ml', l: 'l', tsp: 'cc', tbsp: 'cs',
    cup: 'tasse', cups: 'tasses', oz: 'g', lb: 'g', clove: 'gousse',
    cloves: 'gousses', bunch: 'botte', pinch: 'pincée', slice: 'tranche',
    slices: 'tranches', piece: 'pièce', pieces: 'pièces', fillet: 'filet',
    fillets: 'filets',
  };
  if (unit === 'oz') qty *= 28;
  if (unit === 'lb' || unit === 'lbs') qty *= 454;
  unit = unitMap[unit] || unit || 'pièce';
  return { quantity: Math.round(qty * 10) / 10, unit };
}

function guessDifficulty(instructions: string, ingredientCount: number): 'FACILE' | 'MOYEN' | 'DIFFICILE' {
  const steps = instructions.split(/\r?\n/).filter(Boolean).length;
  if (steps <= 4 && ingredientCount <= 6) return 'FACILE';
  if (steps >= 8 || ingredientCount >= 12) return 'DIFFICILE';
  return 'MOYEN';
}

function guessTime(instructions: string): number {
  const timeMatch = instructions.match(/(\d+)\s*(?:minutes?|min)/i);
  if (timeMatch) return Math.min(parseInt(timeMatch[1]), 120);
  const steps = instructions.split(/\r?\n/).filter(Boolean).length;
  return Math.max(15, Math.min(steps * 8, 90));
}

export async function importRecipesFromMealDB(opts: {
  count?: number;
  cuisine?: string;
  translateWithAI?: boolean;
}): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const count = Math.min(opts.count || 20, 50);
  const filterCuisine = opts.cuisine || '';
  const translateWithAI = opts.translateWithAI !== false;

  let imported = 0;
  let skipped = 0;
  const errors: string[] = [];

  // If filtering by cuisine, get the full list once
  let mealList: Array<{ idMeal: string }> | null = null;
  if (filterCuisine) {
    try {
      const listRes = await fetch(`https://www.themealdb.com/api/json/v1/1/filter.php?a=${filterCuisine}`);
      const listData = await listRes.json();
      mealList = listData.meals || [];
    } catch { mealList = []; }
    if (!mealList?.length) return { imported: 0, skipped: 0, errors: [`No meals for ${filterCuisine}`] };
  }

  for (let i = 0; i < count; i++) {
    try {
      let meal: MealDBMeal;
      if (mealList) {
        const pick = mealList[Math.floor(Math.random() * mealList.length)];
        const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${pick.idMeal}`);
        const data = await res.json();
        meal = data.meals?.[0];
      } else {
        const res = await fetch('https://www.themealdb.com/api/json/v1/1/random.php');
        const data = await res.json();
        meal = data.meals?.[0];
      }

      if (!meal) { errors.push('No meal returned'); continue; }

      const exists = await prisma.recipe.findFirst({ where: { externalId: meal.idMeal, externalSrc: 'themealdb' } });
      if (exists) { skipped++; continue; }

      const rawIngredients = extractIngredients(meal);
      const cuisine = CUISINE_MAP[meal.strArea] || CUISINE_MAP[meal.strArea?.trim()] || 'Internationale';
      const difficulty = guessDifficulty(meal.strInstructions, rawIngredients.length);
      const prepTime = guessTime(meal.strInstructions);

      let name = meal.strMeal;
      let description = `Recette ${cuisine.toLowerCase()} — ${meal.strCategory || 'plat'}`;
      let instructions = meal.strInstructions;
      let ingredientsFr = rawIngredients.map(i => ({ name: i.name, measure: i.measure }));

      if (translateWithAI) {
        try {
          const prompt = `Traduis cette recette en français de façon naturelle. Réponds UNIQUEMENT en JSON valide.

Recette: "${meal.strMeal}"
Instructions: "${meal.strInstructions.slice(0, 500)}"
Ingrédients: ${rawIngredients.map(i => `${i.measure} ${i.name}`).join(', ')}

Réponds: {"name":"nom français","description":"1 phrase appétissante","instructions":"étapes séparées par \\n","ingredients":[{"fr":"nom","measure":"mesure"}]}`;

          const reply = await chatCompletion([{ role: 'user', content: prompt }]);
          const replyText = typeof reply === 'string' ? reply : reply?.message?.content || '';
          const jsonMatch = replyText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (parsed.name) name = parsed.name;
            if (parsed.description) description = parsed.description;
            if (parsed.instructions) instructions = parsed.instructions;
            if (parsed.ingredients?.length) {
              ingredientsFr = parsed.ingredients.map((i: any, idx: number) => ({
                name: i.fr || rawIngredients[idx]?.name || 'Ingrédient',
                measure: i.measure || rawIngredients[idx]?.measure || '',
              }));
            }
          }
        } catch { /* keep English */ }
      }

      const recipeIngredients: Array<{ ingredientId: string; quantity: number; unit: string }> = [];
      for (const ing of ingredientsFr) {
        const { quantity, unit } = parseMeasure(ing.measure);
        const ingName = ing.name.charAt(0).toUpperCase() + ing.name.slice(1).toLowerCase();
        let ingredient = await prisma.ingredient.findFirst({
          where: { name: { equals: ingName, mode: 'insensitive' } },
        });
        if (!ingredient) {
          ingredient = await prisma.ingredient.create({
            data: { name: ingName, category: 'Autres', emoji: '🍽️' },
          });
        }
        recipeIngredients.push({ ingredientId: ingredient.id, quantity, unit });
      }

      await prisma.recipe.create({
        data: {
          name, description, instructions, difficulty, prepTime,
          cuisine, servings: 4,
          imageUrl: meal.strMealThumb || '',
          externalId: meal.idMeal, externalSrc: 'themealdb',
          ingredients: { create: recipeIngredients },
        },
      });

      imported++;
    } catch (err: any) {
      errors.push(err.message?.slice(0, 100) || 'Unknown error');
    }
  }

  return { imported, skipped, errors: errors.slice(0, 10) };
}

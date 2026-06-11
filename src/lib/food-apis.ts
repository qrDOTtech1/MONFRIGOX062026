/**
 * Intégrations API externes pour les recettes et ingrédients.
 *
 * - TheMealDB       : recettes mondiales (gratuit)
 * - Open Food Facts : scan code-barres produits (gratuit, illimité)
 * - USDA FoodData   : ingrédients + nutrition (gratuit, clé requise)
 * - Spoonacular     : recettes par ingrédients (50 pts/jour gratuit, clé requise)
 */

import { prisma } from './db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getApiKey(key: string): Promise<string> {
  const row = await prisma.appConfig.findUnique({ where: { key } });
  return row?.value ?? '';
}

// ---------------------------------------------------------------------------
// 1. TheMealDB  — 100 % gratuit, aucune clé
// ---------------------------------------------------------------------------

const MEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1';

export interface MealDBRecipe {
  id: string;
  name: string;
  category: string;
  area: string;
  instructions: string;
  thumbnail: string;
  ingredients: Array<{ name: string; measure: string }>;
}

function parseMeal(meal: Record<string, string | null>): MealDBRecipe {
  const ingredients: Array<{ name: string; measure: string }> = [];
  for (let i = 1; i <= 20; i++) {
    const name = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];
    if (name && name.trim()) {
      ingredients.push({ name: name.trim(), measure: measure?.trim() || '' });
    }
  }
  return {
    id: meal.idMeal ?? '',
    name: meal.strMeal ?? '',
    category: meal.strCategory ?? '',
    area: meal.strArea ?? '',
    instructions: meal.strInstructions ?? '',
    thumbnail: meal.strMealThumb ?? '',
    ingredients,
  };
}

export async function mealdb_searchByName(query: string): Promise<MealDBRecipe[]> {
  const res = await fetch(`${MEALDB_BASE}/search.php?s=${encodeURIComponent(query)}`);
  const data = await res.json();
  return (data.meals || []).map(parseMeal);
}

export async function mealdb_random(): Promise<MealDBRecipe | null> {
  const res = await fetch(`${MEALDB_BASE}/random.php`);
  const data = await res.json();
  return data.meals?.[0] ? parseMeal(data.meals[0]) : null;
}

export async function mealdb_byArea(area: string): Promise<MealDBRecipe[]> {
  const res = await fetch(`${MEALDB_BASE}/filter.php?a=${encodeURIComponent(area)}`);
  const data = await res.json();
  if (!data.meals) return [];
  // filter endpoint returns summaries — fetch full details
  const meals = await Promise.all(
    data.meals.slice(0, 10).map(async (m: { idMeal: string }) => {
      const r2 = await fetch(`${MEALDB_BASE}/lookup.php?i=${m.idMeal}`);
      const d2 = await r2.json();
      return d2.meals?.[0] ? parseMeal(d2.meals[0]) : null;
    })
  );
  return meals.filter(Boolean) as MealDBRecipe[];
}

export async function mealdb_categories(): Promise<string[]> {
  const res = await fetch(`${MEALDB_BASE}/list.php?c=list`);
  const data = await res.json();
  return (data.meals || []).map((m: { strCategory: string }) => m.strCategory);
}

export async function mealdb_areas(): Promise<string[]> {
  const res = await fetch(`${MEALDB_BASE}/list.php?a=list`);
  const data = await res.json();
  return (data.meals || []).map((m: { strArea: string }) => m.strArea);
}

// ---------------------------------------------------------------------------
// 2. Open Food Facts  — 100 % gratuit, aucune clé, illimité
// ---------------------------------------------------------------------------

const OFF_BASE = 'https://world.openfoodfacts.org';

export interface OpenFoodProduct {
  barcode: string;
  name: string;
  brands: string;
  categories: string;
  imageUrl: string;
  nutriScore: string;
  ingredients: string[];
  nutrients: Record<string, number>;
}

export async function openfoodfacts_barcode(barcode: string): Promise<OpenFoodProduct | null> {
  const res = await fetch(`${OFF_BASE}/api/v2/product/${barcode}.json`, {
    headers: { 'User-Agent': 'MonFrigo/1.0 (contact@monfrigo.app)' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  if (data.status !== 1) return null;
  const p = data.product;
  return {
    barcode,
    name: p.product_name_fr || p.product_name || '',
    brands: p.brands || '',
    categories: p.categories || '',
    imageUrl: p.image_front_url || '',
    nutriScore: p.nutriscore_grade || '',
    ingredients: (p.ingredients || []).map((i: { text: string }) => i.text),
    nutrients: {
      calories: p.nutriments?.['energy-kcal_100g'] ?? 0,
      fat: p.nutriments?.fat_100g ?? 0,
      carbs: p.nutriments?.carbohydrates_100g ?? 0,
      protein: p.nutriments?.proteins_100g ?? 0,
      fiber: p.nutriments?.fiber_100g ?? 0,
      salt: p.nutriments?.salt_100g ?? 0,
      iron: p.nutriments?.iron_100g ?? null,
      magnesium: p.nutriments?.magnesium_100g ?? null,
      calcium: p.nutriments?.calcium_100g ?? null,
      potassium: p.nutriments?.potassium_100g ?? null,
      zinc: p.nutriments?.zinc_100g ?? null,
      vitaminC: p.nutriments?.['vitamin-c_100g'] ?? null,
      vitaminD: p.nutriments?.['vitamin-d_100g'] ?? null,
      vitaminB12: p.nutriments?.['vitamin-b12_100g'] ?? null,
      vitaminB9: p.nutriments?.['vitamin-b9_100g'] ?? null,
      omega3: p.nutriments?.['omega-3-fat_100g'] ?? null,
      phosphorus: p.nutriments?.phosphorus_100g ?? null,
      selenium: p.nutriments?.selenium_100g ?? null,
      iodine: p.nutriments?.iodine_100g ?? null,
    },
  };
}

export async function openfoodfacts_search(query: string, page = 1): Promise<OpenFoodProduct[]> {
  const res = await fetch(
    `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page=${page}&page_size=10&lc=fr`,
    { headers: { 'User-Agent': 'MonFrigo/1.0 (contact@monfrigo.app)' } },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return (data.products || []).map((p: Record<string, any>) => ({
    barcode: p.code || '',
    name: p.product_name_fr || p.product_name || '',
    brands: p.brands || '',
    categories: p.categories || '',
    imageUrl: p.image_front_small_url || '',
    nutriScore: p.nutriscore_grade || '',
    ingredients: (p.ingredients || []).map((i: { text: string }) => i.text),
    nutrients: {
      calories: p.nutriments?.['energy-kcal_100g'] ?? 0,
      fat: p.nutriments?.fat_100g ?? 0,
      carbs: p.nutriments?.carbohydrates_100g ?? 0,
      protein: p.nutriments?.proteins_100g ?? 0,
    },
  }));
}

// ---------------------------------------------------------------------------
// 3. USDA FoodData Central  — gratuit, clé API requise
// ---------------------------------------------------------------------------

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

export interface USDAFood {
  fdcId: number;
  description: string;
  category: string;
  nutrients: Array<{ name: string; amount: number; unit: string }>;
}

export async function usda_search(query: string, pageSize = 10): Promise<USDAFood[]> {
  const key = await getApiKey('USDA_API_KEY');
  if (!key) return [];
  const res = await fetch(`${USDA_BASE}/foods/search?api_key=${key}&query=${encodeURIComponent(query)}&pageSize=${pageSize}&dataType=Foundation,SR%20Legacy`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.foods || []).map((f: Record<string, any>) => ({
    fdcId: f.fdcId,
    description: f.description || '',
    category: f.foodCategory || '',
    nutrients: (f.foodNutrients || []).slice(0, 10).map((n: Record<string, any>) => ({
      name: n.nutrientName || '',
      amount: n.value ?? 0,
      unit: n.unitName || '',
    })),
  }));
}

export async function usda_details(fdcId: number): Promise<USDAFood | null> {
  const key = await getApiKey('USDA_API_KEY');
  if (!key) return null;
  const res = await fetch(`${USDA_BASE}/food/${fdcId}?api_key=${key}`);
  if (!res.ok) return null;
  const f = await res.json();
  return {
    fdcId: f.fdcId,
    description: f.description || '',
    category: f.foodCategory?.description || '',
    nutrients: (f.foodNutrients || []).map((n: Record<string, any>) => ({
      name: n.nutrient?.name || '',
      amount: n.amount ?? 0,
      unit: n.nutrient?.unitName || '',
    })),
  };
}

// ---------------------------------------------------------------------------
// 4. Spoonacular  — 50 pts/jour gratuit, clé API requise
// ---------------------------------------------------------------------------

const SPOONACULAR_BASE = 'https://api.spoonacular.com';

export interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  readyInMinutes: number;
  servings: number;
  cuisines: string[];
  instructions: string;
  ingredients: Array<{ name: string; amount: number; unit: string }>;
}

async function spoonFetch(path: string, params: Record<string, string> = {}): Promise<any> {
  const key = await getApiKey('SPOONACULAR_API_KEY');
  if (!key) return null;
  const qs = new URLSearchParams({ apiKey: key, ...params });
  const res = await fetch(`${SPOONACULAR_BASE}${path}?${qs}`);
  if (!res.ok) return null;
  return res.json();
}

export async function spoonacular_byIngredients(ingredients: string[], count = 10): Promise<SpoonacularRecipe[]> {
  const data = await spoonFetch('/recipes/findByIngredients', {
    ingredients: ingredients.join(','),
    number: String(count),
    ranking: '1',
    ignorePantry: 'true',
  });
  if (!data) return [];
  // findByIngredients returns summaries, fetch full info
  const ids = data.map((r: { id: number }) => r.id).join(',');
  const full = await spoonFetch('/recipes/informationBulk', { ids });
  if (!full) return [];
  return full.map((r: Record<string, any>) => ({
    id: r.id,
    title: r.title || '',
    image: r.image || '',
    readyInMinutes: r.readyInMinutes || 0,
    servings: r.servings || 4,
    cuisines: r.cuisines || [],
    instructions: r.instructions || '',
    ingredients: (r.extendedIngredients || []).map((i: Record<string, any>) => ({
      name: i.name || '',
      amount: i.amount || 0,
      unit: i.unit || '',
    })),
  }));
}

export async function spoonacular_search(query: string, cuisine?: string, count = 10): Promise<SpoonacularRecipe[]> {
  const params: Record<string, string> = {
    query,
    number: String(count),
    addRecipeInformation: 'true',
    fillIngredients: 'true',
    instructionsRequired: 'true',
  };
  if (cuisine) params.cuisine = cuisine;
  const data = await spoonFetch('/recipes/complexSearch', params);
  if (!data?.results) return [];
  return data.results.map((r: Record<string, any>) => ({
    id: r.id,
    title: r.title || '',
    image: r.image || '',
    readyInMinutes: r.readyInMinutes || 0,
    servings: r.servings || 4,
    cuisines: r.cuisines || [],
    instructions: r.instructions || '',
    ingredients: (r.extendedIngredients || []).map((i: Record<string, any>) => ({
      name: i.name || '',
      amount: i.amount || 0,
      unit: i.unit || '',
    })),
  }));
}

export async function spoonacular_random(count = 5): Promise<SpoonacularRecipe[]> {
  const data = await spoonFetch('/recipes/random', { number: String(count) });
  if (!data?.recipes) return [];
  return data.recipes.map((r: Record<string, any>) => ({
    id: r.id,
    title: r.title || '',
    image: r.image || '',
    readyInMinutes: r.readyInMinutes || 0,
    servings: r.servings || 4,
    cuisines: r.cuisines || [],
    instructions: r.instructions || '',
    ingredients: (r.extendedIngredients || []).map((i: Record<string, any>) => ({
      name: i.name || '',
      amount: i.amount || 0,
      unit: i.unit || '',
    })),
  }));
}

// ---------------------------------------------------------------------------
// Checks — vérifie quelles APIs sont configurées
// ---------------------------------------------------------------------------

export async function getApiStatus(): Promise<Record<string, { configured: boolean; label: string; free: boolean }>> {
  const spoonKey = await getApiKey('SPOONACULAR_API_KEY');
  const usdaKey = await getApiKey('USDA_API_KEY');
  return {
    themealdb:       { configured: true, label: 'TheMealDB', free: true },
    openfoodfacts:   { configured: true, label: 'Open Food Facts', free: true },
    usda:            { configured: !!usdaKey, label: 'USDA FoodData', free: true },
    spoonacular:     { configured: !!spoonKey, label: 'Spoonacular', free: false },
  };
}

import { Ollama } from 'ollama';
import { prisma } from './db';

interface OllamaConfig {
  host: string;
  apiKey: string;
  model: string;
  visionModel: string;
}

interface BackupConfig {
  host: string;
  apiKey: string;
}

const CONFIG_KEYS = [
  'OLLAMA_HOST', 'OLLAMA_API_KEY', 'OLLAMA_MODEL', 'OLLAMA_VISION_MODEL',
  'OLLAMA_BACKUP_HOST', 'OLLAMA_BACKUP_API_KEY',
] as const;

async function getAllConfigs(): Promise<Record<string, string>> {
  const rows = await prisma.appConfig.findMany({
    where: { key: { in: [...CONFIG_KEYS] } },
  });
  return Object.fromEntries(rows.map(r => [r.key, r.value]));
}

async function getConfig(): Promise<OllamaConfig> {
  const c = await getAllConfigs();
  return {
    host: c['OLLAMA_HOST'] || 'https://ollama.com',
    apiKey: c['OLLAMA_API_KEY'] || '',
    model: c['OLLAMA_MODEL'] || 'qwen3.5',
    visionModel: c['OLLAMA_VISION_MODEL'] || 'gemma3:27b',
  };
}

async function getBackupConfig(): Promise<BackupConfig | null> {
  const c = await getAllConfigs();
  const host = c['OLLAMA_BACKUP_HOST'];
  const key = c['OLLAMA_BACKUP_API_KEY'];
  if (!key) return null;
  return { host: host || 'https://ollama.com', apiKey: key };
}

function createClient(host: string, apiKey: string): Ollama {
  return new Ollama({
    host,
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });
}

export async function chatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options?: { temperature?: number },
) {
  const config = await getConfig();
  const client = createClient(config.host, config.apiKey);

  try {
    const response = await client.chat({
      model: config.model,
      messages,
      options: { temperature: options?.temperature ?? 0.7 },
    });
    return response;
  } catch (err) {
    const backup = await getBackupConfig();
    if (backup) {
      const backupClient = createClient(backup.host, backup.apiKey);
      return backupClient.chat({
        model: config.model,
        messages,
        options: { temperature: options?.temperature ?? 0.7 },
      });
    }
    throw err;
  }
}

export async function analyzeImage(base64Image: string, prompt: string) {
  const config = await getConfig();
  const client = createClient(config.host, config.apiKey);

  const messages = [
    {
      role: 'user' as const,
      content: prompt,
      images: [base64Image],
    },
  ];

  try {
    return await client.chat({
      model: config.visionModel,
      messages,
      options: { temperature: 0.3 },
    });
  } catch (err) {
    const backup = await getBackupConfig();
    if (backup) {
      const backupClient = createClient(backup.host, backup.apiKey);
      return backupClient.chat({
        model: config.visionModel,
        messages,
        options: { temperature: 0.3 },
      });
    }
    throw err;
  }
}

export async function listModels() {
  const config = await getConfig();
  const client = createClient(config.host, config.apiKey);
  try {
    const response = await client.list();
    return response.models;
  } catch {
    return [];
  }
}

export async function suggestRecipes(ingredients: string[]) {
  return chatCompletion([
    {
      role: 'system',
      content: `Tu es un chef cuisinier expert. Tu suggères des recettes basées sur les ingrédients disponibles.
Réponds UNIQUEMENT en JSON valide avec ce format:
[{"name": "Nom", "description": "Description courte", "difficulty": "FACILE|MOYEN|DIFFICILE", "prepTime": 20, "cuisine": "FR", "ingredients": ["ingredient1", "ingredient2"], "instructions": "Première étape.\\nDeuxième étape.\\nTroisième étape."}]
IMPORTANT pour "instructions": fournis au minimum 3 étapes, chaque étape sur sa propre ligne séparée par un vrai saut de ligne \\n. N'utilise PAS de numéros ("1.", "2.") en début d'étape.
Suggère 3-5 recettes. Privilégie les recettes qui utilisent un maximum des ingrédients listés.`,
    },
    {
      role: 'user',
      content: `Voici mes ingrédients disponibles: ${ingredients.join(', ')}. Suggère-moi des recettes!`,
    },
  ]);
}

export async function translateToFrench(text: string, field: 'name' | 'description' | 'instructions' | 'ingredient'): Promise<string> {
  if (!text || text.trim().length === 0) return text;

  const prompts: Record<string, string> = {
    name: 'Traduis ce nom de recette en français. Réponds UNIQUEMENT avec le nom traduit, rien d\'autre.',
    description: 'Traduis cette description de recette en français. Réponds UNIQUEMENT avec la description traduite, rien d\'autre.',
    instructions: 'Traduis ces instructions de recette en français. Garde le même format (sauts de ligne, étapes). Réponds UNIQUEMENT avec les instructions traduites, rien d\'autre.',
    ingredient: 'Traduis ce nom d\'ingrédient en français. Réponds UNIQUEMENT avec le nom traduit en minuscules, rien d\'autre.',
  };

  try {
    const response = await chatCompletion([
      { role: 'system', content: prompts[field] },
      { role: 'user', content: text },
    ], { temperature: 0.2 });
    const result = response.message?.content?.trim();
    return result || text;
  } catch {
    return text; // Fallback: keep original if AI fails
  }
}

export async function translateRecipe(recipe: { name: string; description: string; instructions: string }): Promise<{ name: string; description: string; instructions: string }> {
  const [name, description, instructions] = await Promise.all([
    translateToFrench(recipe.name, 'name'),
    translateToFrench(recipe.description, 'description'),
    translateToFrench(recipe.instructions, 'instructions'),
  ]);
  return { name, description, instructions };
}

// Traduction des unités anglaises → françaises
const UNIT_MAP: Record<string, string> = {
  'cup': 'tasse', 'cups': 'tasses',
  'tbsp': 'c.à.s.', 'tbs': 'c.à.s.', 'tablespoon': 'c.à.s.', 'tablespoons': 'c.à.s.',
  'tsp': 'c.à.c.', 'teaspoon': 'c.à.c.', 'teaspoons': 'c.à.c.',
  'oz': 'g', 'ounce': 'g', 'ounces': 'g',
  'lb': 'g', 'lbs': 'g', 'pound': 'g', 'pounds': 'g',
  'clove': 'gousse', 'cloves': 'gousses',
  'pinch': 'pincée', 'pinches': 'pincées',
  'slice': 'tranche', 'slices': 'tranches',
  'piece': 'morceau', 'pieces': 'morceaux',
  'bunch': 'botte', 'bunches': 'bottes',
  'sprig': 'brin', 'sprigs': 'brins',
  'handful': 'poignée', 'handfuls': 'poignées',
  'dash': 'trait', 'dashes': 'traits',
  'can': 'boîte', 'cans': 'boîtes',
  'packet': 'sachet', 'packets': 'sachets',
  'stick': 'bâton', 'sticks': 'bâtons',
  'leaf': 'feuille', 'leaves': 'feuilles',
  'large': 'gros', 'medium': 'moyen', 'small': 'petit',
  'to taste': 'à goût', 'to serve': 'pour servir',
};

export function translateUnit(unit: string): string {
  if (!unit) return 'unité';
  const lower = unit.toLowerCase().trim();
  // Direct match
  if (UNIT_MAP[lower]) return UNIT_MAP[lower];
  // Partial match — check if unit starts with a known EN word
  for (const [en, fr] of Object.entries(UNIT_MAP)) {
    if (lower.startsWith(en + ' ') || lower === en) {
      return lower.replace(new RegExp('^' + en, 'i'), fr);
    }
  }
  // Convert oz to grams (1 oz ≈ 28g), lb to grams (1 lb ≈ 454g)
  return unit;
}

// Convertir les quantités oz/lb en grammes
export function convertToMetric(quantity: number, unit: string): { quantity: number; unit: string } {
  const lower = unit.toLowerCase().trim();
  if (['oz', 'ounce', 'ounces'].includes(lower)) {
    return { quantity: Math.round(quantity * 28), unit: 'g' };
  }
  if (['lb', 'lbs', 'pound', 'pounds'].includes(lower)) {
    return { quantity: Math.round(quantity * 454), unit: 'g' };
  }
  return { quantity, unit: translateUnit(unit) };
}

export interface NutritionEstimate {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  salt: number;
  nutriScore: string;
  kidFriendly: boolean;
  babyFriendly: boolean;
}

export async function estimateNutrition(
  recipeName: string,
  ingredients: Array<{ name: string; quantity: number; unit: string }>,
  servings: number,
): Promise<NutritionEstimate> {
  const ingList = ingredients.map(i => `${i.quantity} ${i.unit} ${i.name}`).join(', ');

  const response = await chatCompletion([
    {
      role: 'system',
      content: `Tu es un nutritionniste expert. Estime les valeurs nutritionnelles PAR PORTION d'une recette.
Réponds UNIQUEMENT en JSON valide avec ce format exact:
{"calories": 350, "protein": 25.0, "fat": 12.0, "carbs": 40.0, "fiber": 5.0, "salt": 1.2, "nutriScore": "B", "kidFriendly": true, "babyFriendly": false}

Règles:
- calories: entier (kcal par portion)
- protein, fat, carbs, fiber, salt: float (grammes par portion)
- nutriScore: "A", "B", "C", "D" ou "E" selon la qualité nutritionnelle
- kidFriendly: true si adapté aux enfants de 3+ ans (pas trop épicé, pas d'alcool)
- babyFriendly: true si adapté aux bébés 6-12 mois (pas de sel, pas de miel, textures simples)
- Sois réaliste dans tes estimations basées sur les ingrédients fournis.`,
    },
    {
      role: 'user',
      content: `Recette: "${recipeName}" pour ${servings} personnes\nIngrédients: ${ingList}`,
    },
  ], { temperature: 0.2 });

  const text = response.message?.content?.trim() || '';
  // Extract JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in AI response');
  const parsed = JSON.parse(jsonMatch[0]);

  return {
    calories: Math.round(parsed.calories || 0),
    protein: parseFloat(parsed.protein) || 0,
    fat: parseFloat(parsed.fat) || 0,
    carbs: parseFloat(parsed.carbs) || 0,
    fiber: parseFloat(parsed.fiber) || 0,
    salt: parseFloat(parsed.salt) || 0,
    nutriScore: ['A', 'B', 'C', 'D', 'E'].includes(parsed.nutriScore) ? parsed.nutriScore : '',
    kidFriendly: !!parsed.kidFriendly,
    babyFriendly: !!parsed.babyFriendly,
  };
}

export async function generateShoppingList(recipeName: string, availableIngredients: string[]) {
  return chatCompletion([
    {
      role: 'system',
      content: `Tu es un assistant cuisine. Génère une liste de courses pour une recette en tenant compte des ingrédients déjà disponibles.
Réponds UNIQUEMENT en JSON: [{"name": "ingredient", "quantity": 2, "unit": "unité"}]
N'inclus PAS les ingrédients déjà disponibles.`,
    },
    {
      role: 'user',
      content: `Recette: ${recipeName}\nIngrédients déjà disponibles: ${availableIngredients.join(', ')}\nQue dois-je acheter?`,
    },
  ]);
}

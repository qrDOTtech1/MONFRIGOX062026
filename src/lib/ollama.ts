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

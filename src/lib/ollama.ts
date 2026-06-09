import { prisma } from './db';

interface OllamaConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  visionModel: string;
}

async function getConfig(): Promise<OllamaConfig> {
  const configs = await prisma.appConfig.findMany({
    where: {
      key: {
        in: [
          'OLLAMA_API_URL', 'OLLAMA_API_KEY', 'OLLAMA_MODEL', 'OLLAMA_VISION_MODEL',
          'OLLAMA_BACKUP_API_URL', 'OLLAMA_BACKUP_API_KEY',
        ],
      },
    },
  });

  const configMap = Object.fromEntries(configs.map(c => [c.key, c.value]));

  return {
    apiUrl: configMap['OLLAMA_API_URL'] || process.env.OLLAMA_API_URL || 'https://api.together.xyz/v1',
    apiKey: configMap['OLLAMA_API_KEY'] || process.env.OLLAMA_API_KEY || '',
    model: configMap['OLLAMA_MODEL'] || process.env.OLLAMA_MODEL || 'meta-llama/Llama-3-70b-chat-hf',
    visionModel: configMap['OLLAMA_VISION_MODEL'] || process.env.OLLAMA_VISION_MODEL || 'meta-llama/Llama-4-Scout-17B-16E-Instruct',
  };
}

async function getBackupConfig(): Promise<{ apiUrl: string; apiKey: string } | null> {
  const configs = await prisma.appConfig.findMany({
    where: { key: { in: ['OLLAMA_BACKUP_API_URL', 'OLLAMA_BACKUP_API_KEY'] } },
  });
  const map = Object.fromEntries(configs.map(c => [c.key, c.value]));
  const url = map['OLLAMA_BACKUP_API_URL'] || process.env.OLLAMA_BACKUP_API_URL;
  const key = map['OLLAMA_BACKUP_API_KEY'] || process.env.OLLAMA_BACKUP_API_KEY;
  if (!url || !key) return null;
  return { apiUrl: url, apiKey: key };
}

async function callApi(url: string, apiKey: string, body: Record<string, unknown>) {
  const res = await fetch(`${url}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function chatCompletion(messages: Array<{ role: string; content: string }>) {
  const config = await getConfig();

  try {
    return await callApi(config.apiUrl, config.apiKey, {
      model: config.model,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    });
  } catch (err) {
    const backup = await getBackupConfig();
    if (backup) {
      return await callApi(backup.apiUrl, backup.apiKey, {
        model: config.model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      });
    }
    throw err;
  }
}

export async function analyzeImage(base64Image: string, prompt: string) {
  const config = await getConfig();

  const messages = [
    {
      role: 'user' as const,
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
      ],
    },
  ];

  try {
    return await callApi(config.apiUrl, config.apiKey, {
      model: config.visionModel,
      messages,
      temperature: 0.3,
      max_tokens: 2048,
    });
  } catch (err) {
    const backup = await getBackupConfig();
    if (backup) {
      return await callApi(backup.apiUrl, backup.apiKey, {
        model: config.visionModel,
        messages,
        temperature: 0.3,
        max_tokens: 2048,
      });
    }
    throw err;
  }
}

export async function suggestRecipes(ingredients: string[]) {
  const messages = [
    {
      role: 'system',
      content: `Tu es un chef cuisinier expert. Tu suggères des recettes basées sur les ingrédients disponibles.
Réponds UNIQUEMENT en JSON valide avec ce format:
[{"name": "Nom", "description": "Description courte", "difficulty": "FACILE|MOYEN|DIFFICILE", "prepTime": 20, "cuisine": "FR", "ingredients": ["ingredient1", "ingredient2"], "instructions": "Étape 1...\\nÉtape 2..."}]
Suggère 3-5 recettes. Privilégie les recettes qui utilisent un maximum des ingrédients listés.`,
    },
    {
      role: 'user',
      content: `Voici mes ingrédients disponibles: ${ingredients.join(', ')}. Suggère-moi des recettes!`,
    },
  ];

  return chatCompletion(messages);
}

export async function generateShoppingList(recipeName: string, availableIngredients: string[]) {
  const messages = [
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
  ];

  return chatCompletion(messages);
}

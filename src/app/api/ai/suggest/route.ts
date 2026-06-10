import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { suggestRecipes } from '@/lib/ollama';
import { checkAndConsumeAI } from '@/lib/ai-rate-limit';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const fridgeItems = await prisma.fridgeItem.findMany({
    where: { userId: user.id },
    include: { ingredient: true },
  });

  if (fridgeItems.length === 0) {
    return NextResponse.json({ error: "Ajoute des ingrédients à ton frigo d'abord!" }, { status: 400 });
  }

  // ── Rate limiting ──
  const rl = await checkAndConsumeAI(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.reason, upgrade: rl.upgrade, remaining: 0 }, { status: 429 });
  }

  const ingredientNames = fridgeItems.map(f => f.ingredient.name);

  try {
    const result = await suggestRecipes(ingredientNames);
    const content = result.message?.content || '[]';

    let recipes;
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      recipes = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      recipes = [];
    }

    // Règles de cohérence minimale par type de recette
    const COHERENCE_RULES: Array<{ keywords: string[]; requires: string[]; label: string }> = [
      { keywords: ['crêpe', 'crepe', 'galette de froment'], requires: ['farine', 'lait', 'oeuf', 'œuf'], label: 'crêpes' },
      { keywords: ['gâteau', 'cake', 'fondant', 'brownie', 'moelleux'], requires: ['farine', 'oeuf', 'œuf', 'sucre'], label: 'gâteau' },
      { keywords: ['pizza'], requires: ['farine', 'tomate', 'fromage'], label: 'pizza' },
      { keywords: ['pâte à pain', 'pain maison', 'baguette'], requires: ['farine', 'levure', 'eau'], label: 'pain' },
      { keywords: ['quiche', 'tarte salée'], requires: ['farine', 'oeuf', 'œuf', 'crème'], label: 'quiche' },
      { keywords: ['tarte', 'tartelette'], requires: ['farine', 'beurre'], label: 'tarte' },
    ];

    function checkCoherence(recipe: { name: string; ingredients: Array<{ name: string }> }): string | null {
      const nameLower = recipe.name.toLowerCase();
      const ingNames  = (recipe.ingredients || []).map((i: { name: string }) => i.name.toLowerCase());
      for (const rule of COHERENCE_RULES) {
        if (!rule.keywords.some(kw => nameLower.includes(kw))) continue;
        const missing = rule.requires.filter(req =>
          !ingNames.some(ing => ing.includes(req))
        );
        if (missing.length > 0) {
          return `"${recipe.name}" est une recette de ${rule.label} mais il manque : ${missing.join(', ')}`;
        }
      }
      return null;
    }

    // Save AI-generated recipes to DB
    const saved = [];
    const warnings: string[] = [];
    for (const r of recipes) {
      if (!r.name || !r.instructions) continue;

      // Vérif cohérence avant sauvegarde
      const incoherence = checkCoherence(r);
      if (incoherence) {
        warnings.push(incoherence);
        console.warn('[suggest] Recette incohérente ignorée :', incoherence);
        continue; // skip cette recette plutôt que la sauvegarder corrompue
      }

      const existing = await prisma.recipe.findFirst({ where: { name: r.name } });
      if (existing) { saved.push(existing); continue; }

      const recipe = await prisma.recipe.create({
        data: {
          name: r.name,
          description: r.description || '',
          instructions: r.instructions,
          difficulty: ['FACILE', 'MOYEN', 'DIFFICILE'].includes(r.difficulty) ? r.difficulty : 'FACILE',
          prepTime: r.prepTime || 20,
          cuisine: r.cuisine || 'FR',
          servings: r.servings || 4,
        },
      });

      // Link ingredients with proper quantity/unit from AI
      if (Array.isArray(r.ingredients)) {
        for (const ing of r.ingredients) {
          // Support both old format (string) and new format ({name, quantity, unit})
          const ingName   = typeof ing === 'string' ? ing : (ing?.name || '');
          const ingQty    = typeof ing === 'object' && ing?.quantity != null ? Number(ing.quantity) : 1;
          const ingUnit   = typeof ing === 'object' && ing?.unit ? String(ing.unit) : 'unité';

          if (!ingName.trim()) continue;

          let ingredient = await prisma.ingredient.findFirst({
            where: { name: { equals: ingName.trim(), mode: 'insensitive' } },
          });
          // Fuzzy fallback: contains first word
          if (!ingredient) {
            ingredient = await prisma.ingredient.findFirst({
              where: { name: { contains: ingName.trim().split(' ')[0], mode: 'insensitive' } },
            });
          }
          // Auto-create unknown ingredient
          if (!ingredient) {
            try {
              ingredient = await prisma.ingredient.create({
                data: { name: ingName.trim().toLowerCase(), category: 'Épicerie', emoji: '🛒' },
              });
            } catch {
              ingredient = await prisma.ingredient.findFirst({
                where: { name: { equals: ingName.trim(), mode: 'insensitive' } },
              });
            }
          }

          if (ingredient) {
            await prisma.recipeIngredient.create({
              data: {
                recipeId:     recipe.id,
                ingredientId: ingredient.id,
                quantity:     isNaN(ingQty) || ingQty <= 0 ? 1 : ingQty,
                unit:         ingUnit || 'unité',
              },
            }).catch(() => {});
          }
        }
      }

      saved.push(recipe);
    }

    return NextResponse.json({ recipes: saved, raw: recipes, warnings });
  } catch (err) {
    console.error('AI suggest error:', err);
    return NextResponse.json({ error: 'Erreur IA — vérifie la config Ollama dans le portail admin' }, { status: 500 });
  }
}

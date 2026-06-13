import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { chatCompletion } from '@/lib/ollama';
import { checkAndConsumeAI } from '@/lib/ai-rate-limit';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { messages } = await req.json() as { messages: Message[] };
  if (!messages?.length) return NextResponse.json({ error: 'Messages manquants' }, { status: 400 });

  // ── Rate limiting ──
  const rl = await checkAndConsumeAI(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.reason, upgrade: rl.upgrade, remaining: 0 }, { status: 429 });
  }

  // Charge toutes les recettes de la DB pour que l'IA ait le contexte complet
  const recipes = await prisma.recipe.findMany({
    select: {
      id: true, name: true, description: true, cuisine: true,
      difficulty: true, prepTime: true, servings: true,
      calories: true, protein: true, carbs: true, fat: true,
      kidFriendly: true, babyFriendly: true,
      ingredients: { select: { unit: true, quantity: true, ingredient: { select: { name: true } } } },
    },
  });

  const recipeContext = recipes.map(r =>
    `[ID:${r.id}] "${r.name}" | ${r.cuisine} | ${r.difficulty} | ${r.prepTime}min | ${r.servings} pers.` +
    (r.calories ? ` | ${r.calories}kcal` : '') +
    (r.kidFriendly ? ' | enfants' : '') +
    ` | Ingrédients: ${r.ingredients.map(i => i.ingredient.name).join(', ')}`
  ).join('\n');

  const systemPrompt = `Tu es un assistant culinaire vocal dans l'application MonFrigo. Tu aides les utilisateurs à trouver des recettes ET à naviguer dans l'app. Ton rôle est aussi d'être accessible aux personnes malvoyantes ou peu à l'aise avec la technologie.

CATALOGUE COMPLET (${recipes.length} recettes) :
${recipeContext}

COMPORTEMENT :
- Réponds toujours en français, de façon conversationnelle, chaleureuse et claire.
- Propose des recettes du catalogue en te basant sur les demandes (ingrédients, envies, régimes, temps disponible).
- Quand tu cites une recette, inclus son ID : [ID:xxxx]. Cite 1 à 4 recettes max.
- IMPORTANT : quand tu inclus des IDs de recettes, NE RÉPÈTE PAS leur nom, ingrédients, temps ou détails dans le texte — ces infos seront affichées automatiquement en cartes visuelles. Dis juste une phrase d'intro conversationnelle courte. Exemple : "Voici deux recettes express portugaises ! 🇵🇹" sans rien d'autre.
- Reste concis (1-2 phrases max quand tu suggères des recettes, plus si question précise sans recette).

NAVIGATION (IMPORTANT) :
Si l'utilisateur veut aller quelque part ou faire une action, ajoute UNE commande à la FIN de ta réponse :
- Voir le frigo / ses ingrédients → [NAV:/fridge]
- Scanner un produit / code-barres → [NAV:/scan]
- Voir les recettes / catalogue → [NAV:/dashboard]
- Planning / repas de la semaine → [NAV:/shopping]
- Son profil / abonnement → [NAV:/profile]
- Retour accueil → [NAV:/home]
- Ouvrir une recette spécifique → [NAV:/dashboard] (avec [ID:xxxx] pour l'identifier)
Exemples : "Je t'emmène dans ton frigo ! [NAV:/fridge]" / "Voilà le planning ! [NAV:/shopping]"
Ne mets JAMAIS la commande NAV au milieu du texte, toujours à la fin.`;

  try {
    const resp = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      { temperature: 0.6 },
    );

    const reply = resp.message?.content || '';

    // Extraire les IDs de recettes mentionnées dans la réponse
    const idMatches = [...reply.matchAll(/\[ID:([a-z0-9]+)\]/gi)];
    const recipeIds = [...new Set(idMatches.map(m => m[1]))];

    // Extraire commande de navigation [NAV:/path]
    const navMatch = reply.match(/\[NAV:(\/[^\]]*)\]/i);
    const navTo = navMatch ? navMatch[1] : null;

    // Nettoyer la réponse (retirer les balises internes)
    const cleanReply = reply
      .replace(/\s*\[ID:[a-z0-9]+\]/gi, '')
      .replace(/\s*\[NAV:\/[^\]]*\]/gi, '')
      .trim();

    return NextResponse.json({ reply: cleanReply, recipeIds, navTo });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: 'Erreur IA — vérifie la configuration Ollama' }, { status: 500 });
  }
}

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

  // ── Contexte recettes ──
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

  // ── Contexte frigo utilisateur ──
  const fridgeItems = await prisma.fridgeItem.findMany({
    where: { userId: user.id },
    select: {
      quantity: true, unit: true, expiresAt: true,
      ingredient: { select: { name: true, emoji: true } },
    },
  });

  const now = new Date();
  const fridgeContext = fridgeItems.length > 0
    ? fridgeItems.map(f => {
        const expiring = f.expiresAt && f.expiresAt < new Date(now.getTime() + 3 * 86_400_000);
        return `${f.ingredient.emoji || ''} ${f.ingredient.name}${f.quantity ? ` (${f.quantity} ${f.unit || ''})` : ''}${expiring ? ' ⚠️ BIENTÔT PÉRIMÉ' : ''}`;
      }).join(', ')
    : 'FRIGO VIDE';

  // ── Profil utilisateur ──
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { allergens: true, dietMode: true, tasteProfile: true },
  });

  let dietInfo = '';
  if (profile) {
    const parts: string[] = [];
    if (profile.dietMode) parts.push(`Régime: ${profile.dietMode}`);
    try {
      const allergens = JSON.parse(profile.allergens || '[]');
      if (allergens.length) parts.push(`Allergènes: ${allergens.join(', ')}`);
    } catch {}
    if (parts.length) dietInfo = `\nPROFIL UTILISATEUR : ${parts.join(' | ')}`;
  }

  const systemPrompt = `Tu es l'assistant culinaire vocal de MonFrigo. Tu aides les utilisateurs à trouver des recettes et naviguer dans l'app. Tu dois être accessible aux personnes malvoyantes et peu technophiles.

CONTENU DU FRIGO DE L'UTILISATEUR :
${fridgeContext}${dietInfo}

CATALOGUE (${recipes.length} recettes) :
${recipeContext}

RÈGLES DE RÉPONSE :
- Français conversationnel, chaleureux, clair. Pas de jargon.
- N'utilise JAMAIS de markdown (pas de **, *, _, #, - pour les listes). Écris en texte simple et naturel, comme si tu parlais à voix haute.
- Quand tu cites une recette du catalogue, inclus [ID:xxxx]. Max 4 recettes par réponse.
- QUAND TU INCLUS DES IDs : ne répète PAS le nom, les ingrédients ni le temps dans le texte. Tout ça s'affiche automatiquement en cartes visuelles. Dis juste 1-2 phrases d'intro. Exemple : "Voilà deux idées qui collent avec ton frigo !" suivi des [ID:xxx].
- Tu connais le frigo de l'utilisateur : propose des recettes qui utilisent ses ingrédients. Signale ceux qui périment bientôt.
- Si le frigo est vide, dis-le gentiment et propose quand même des recettes populaires.
- Reste concis : 1-2 phrases si tu suggères des recettes, 3-4 si c'est une question sans recette.

NAVIGATION :
Si l'utilisateur veut aller quelque part, ajoute UNE commande à LA FIN de ta réponse :
- Frigo → [NAV:/fridge]
- Scanner → [NAV:/scan]
- Recettes → [NAV:/dashboard]
- Planning → [NAV:/shopping]
- Profil → [NAV:/profile]
- Accueil → [NAV:/home]
Exemple : "Je t'emmène voir ton frigo ! [NAV:/fridge]"`;

  try {
    const resp = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      { temperature: 0.6 },
    );

    const reply = resp.message?.content || '';

    // Extraire les IDs de recettes mentionnées
    const idMatches = [...reply.matchAll(/\[ID:([a-z0-9]+)\]/gi)];
    const recipeIds = [...new Set(idMatches.map(m => m[1]))];

    // Extraire commande de navigation
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

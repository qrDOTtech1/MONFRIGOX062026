import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { chatCompletion } from '@/lib/ollama';
import { checkAndConsumeAI } from '@/lib/ai-rate-limit';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const MEAL_LABELS: Record<string, string> = {
  BREAKFAST: 'Petit-déj', LUNCH: 'Déjeuner', SNACK: 'Goûter', DINNER: 'Dîner',
};

function dateKey(d: Date) { return d.toISOString().split('T')[0]; }

function dayLabel(dateStr: string, today: string, tomorrow: string) {
  if (dateStr === today) return "aujourd'hui";
  if (dateStr === tomorrow) return 'demain';
  const d = new Date(dateStr + 'T12:00:00Z');
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const { messages, coachMode, lang } = await req.json() as { messages: Message[]; coachMode?: boolean; lang?: string };
  if (!messages?.length) return NextResponse.json({ error: 'Messages manquants' }, { status: 400 });

  // ── Rate limiting ──
  const rl = await checkAndConsumeAI(user.id);
  if (!rl.allowed) {
    return NextResponse.json({ error: rl.reason, upgrade: rl.upgrade, remaining: 0 }, { status: 429 });
  }

  // ── User plan check ──
  const userRecord = await prisma.user.findUnique({
    where: { id: user.id },
    select: { plan: true, planExpiresAt: true, role: true, allergens: true, dietMode: true, tasteProfile: true },
  });
  const now = new Date();
  const effectivePlan = (userRecord?.planExpiresAt && userRecord.planExpiresAt < now)
    ? 'FREE' : (userRecord?.plan || 'FREE');
  const isVipOrAdmin = effectivePlan === 'VIP' || userRecord?.role === 'ADMIN';

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
    (r.protein ? ` | ${r.protein}g prot` : '') +
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

  const fridgeContext = fridgeItems.length > 0
    ? fridgeItems.map(f => {
        const expiring = f.expiresAt && f.expiresAt < new Date(now.getTime() + 3 * 86_400_000);
        return `${f.ingredient.emoji || ''} ${f.ingredient.name}${f.quantity ? ` (${f.quantity} ${f.unit || ''})` : ''}${expiring ? ' ⚠️ BIENTÔT PÉRIMÉ' : ''}`;
      }).join(', ')
    : 'FRIGO VIDE';

  // ── Profil utilisateur ──
  let dietInfo = '';
  if (userRecord) {
    const parts: string[] = [];
    if (userRecord.dietMode) parts.push(`Régime: ${userRecord.dietMode}`);
    try {
      const allergens = JSON.parse(userRecord.allergens || '[]');
      if (allergens.length) parts.push(`Allergènes: ${allergens.join(', ')}`);
    } catch {}
    if (parts.length) dietInfo = `\nPROFIL UTILISATEUR : ${parts.join(' | ')}`;
  }

  // ── Planning de la semaine ──
  const todayStr = dateKey(now);
  const tomorrowDate = new Date(now);
  tomorrowDate.setDate(now.getDate() + 1);
  const tomorrowStr = dateKey(tomorrowDate);

  const weekStart = new Date(now);
  const dow = now.getDay() === 0 ? -6 : 1 - now.getDay();
  weekStart.setDate(now.getDate() + dow);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 13);
  weekEnd.setHours(23, 59, 59, 999);

  const mealPlans = await prisma.mealPlan.findMany({
    where: { userId: user.id, date: { gte: weekStart, lte: weekEnd } },
    include: { recipe: { select: { id: true, name: true, calories: true, protein: true, prepTime: true } } },
    orderBy: [{ date: 'asc' }, { mealType: 'asc' }],
  });

  let planningContext = '';
  if (mealPlans.length > 0) {
    const grouped = new Map<string, typeof mealPlans>();
    for (const p of mealPlans) {
      const key = dateKey(new Date(p.date));
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(p);
    }
    const lines: string[] = [];
    for (const [dateStr, plans] of grouped) {
      const label = dayLabel(dateStr, todayStr, tomorrowStr);
      const meals = plans.map(p =>
        `  ${MEAL_LABELS[p.mealType] || p.mealType}: "${p.recipe.name}" [ID:${p.recipe.id}]${p.recipe.calories ? ` (${p.recipe.calories}kcal)` : ''}`
      ).join('\n');
      lines.push(`${label} (${dateStr}) :\n${meals}`);
    }
    planningContext = lines.join('\n');
  } else {
    planningContext = 'AUCUN REPAS PLANIFIÉ';
  }

  const todayDate = now.toISOString().split('T')[0];

  let coachBlock = '';
  if (coachMode && isVipOrAdmin) {
    coachBlock = `

MODE COACH NUTRITIONNEL (activé) :
Tu es en mode coach. En plus de l'assistant normal, tu dois :
- Analyser le planning de la semaine et donner des conseils nutritionnels personnalisés
- Calculer les calories et protéines moyennes par jour
- Identifier les déséquilibres (trop de glucides, pas assez de légumes, manque de diversité)
- Suggérer des améliorations concrètes avec des recettes du catalogue
- Encourager l'utilisateur et célébrer ses bonnes habitudes
- Adapter tes conseils au profil (régime, allergènes)
- Répondre aux questions sur la nutrition de façon simple et accessible
Si le planning est vide ou incomplet, encourage à le remplir et propose un plan type.`;
  }

  const systemPrompt = `Tu es l'assistant culinaire vocal de MonFrigo. Tu aides les utilisateurs à trouver des recettes et naviguer dans l'app. Tu dois être accessible aux personnes malvoyantes et peu technophiles.

CONTENU DU FRIGO DE L'UTILISATEUR :
${fridgeContext}${dietInfo}

PLANNING DE LA SEMAINE :
${planningContext}

CATALOGUE (${recipes.length} recettes) :
${recipeContext}

RÈGLES DE RÉPONSE :
- ${lang === 'en' ? 'Respond in English. Warm, clear, conversational tone. No jargon.' : 'Français conversationnel, chaleureux, clair. Pas de jargon.'}
- N'utilise JAMAIS de markdown ni de puces (pas de **, *, _, #, •, - en début de ligne pour les listes). Écris en phrases naturelles, comme si tu parlais à voix haute. Si tu donnes plusieurs idées, enchaîne-les en phrases, jamais en liste à puces.
- Reste concis : 1-2 phrases si tu suggères des recettes, 3-4 si c'est une question sans recette. Jamais de pavé de texte.
- ⚠️ [NAV:/dashboard] N'EST JAMAIS UNE RÉPONSE VALABLE à une demande de recette. Si l'utilisateur demande une recette (même avec une contrainte comme "moins de 15 minutes" ou "avec mon frigo"), tu DOIS répondre par des [ID:xxx] du catalogue (cohérents avec le frigo) OU inventer une recette avec [RECIPE:...] (voir plus bas). Ne renvoie JAMAIS l'utilisateur vers /dashboard pour "qu'il cherche lui-même" — c'est un échec, pas une réponse.

⚠️ RÈGLE ABSOLUE — COHÉRENCE FRIGO AVANT TOUT :
Avant de citer une recette du catalogue avec [ID:xxx], VÉRIFIE que ses ingrédients principaux sont réellement présents dans le frigo (liste ci-dessus) ou sont des basiques de placard (sel, poivre, huile, farine, épices…).
- N'utilise JAMAIS [ID:xxx] pour une recette qui nécessite un ingrédient absent du frigo et absent du placard (ex: ne propose pas une recette aux champignons si l'utilisateur n'a pas de champignons).
- Si AUCUNE recette du catalogue ne correspond vraiment au frigo, ne force pas une carte inexploitable : INVENTE directement une recette avec la commande [RECIPE:...] (voir plus bas) en utilisant UNIQUEMENT ce qu'il y a dans le frigo + basiques de placard. C'est le comportement par défaut préférable à une suggestion de catalogue bancale.
- Quand tu cites une recette du catalogue, inclus [ID:xxxx]. Max 4 recettes par réponse.
- QUAND TU INCLUS DES IDs OU QUE TU CRÉES UNE RECETTE : ne répète PAS le nom, les ingrédients ni le temps dans le texte. Tout ça s'affiche automatiquement en cartes visuelles. Dis juste 1-2 phrases d'intro.
- Tu connais le planning : ne propose pas de recette pour un créneau déjà rempli sauf si l'utilisateur veut changer.
- Si le frigo est vide, dis-le gentiment et propose quand même des recettes populaires du catalogue (là seulement l'exigence de correspondance frigo ne s'applique pas).

NAVIGATION :
Si l'utilisateur veut aller quelque part, ajoute UNE commande à LA FIN de ta réponse :
- Frigo → [NAV:/fridge]
- Scanner → [NAV:/scan]
- Recettes → [NAV:/dashboard]
- Planning → [NAV:/shopping]
- Profil → [NAV:/profile]
- Accueil → [NAV:/home]
Exemple : "Je t'emmène voir ton frigo ! [NAV:/fridge]"

ACTIONS DIRECTES :
Tu peux effectuer des actions pour l'utilisateur. Ajoute la commande à la fin de ta réponse :
- Ajouter au planning : [ACTION:PLAN recipeId YYYY-MM-DD MEALTYPE] (MEALTYPE = BREAKFAST, LUNCH, DINNER ou SNACK)
- Retirer du planning : [ACTION:REMOVE_PLAN YYYY-MM-DD MEALTYPE]
- Ajouter au frigo : [ACTION:FRIDGE nomIngredient]
- Ajouter à la liste de courses : [ACTION:SHOP nomIngredient]
- Lancer le mode cuisine : [ACTION:COOK recipeId]
Exemples :
- "C'est noté, j'ajoute les oeufs à ton frigo ! [ACTION:FRIDGE oeufs]"
- "Je l'ajoute pour mardi soir ! [ACTION:PLAN abc123 2026-06-16 DINNER]"
- "OK je retire le dîner de demain. [ACTION:REMOVE_PLAN 2026-06-14 DINNER]"
- "On lance la recette ! [ACTION:COOK abc123]"
Tu peux combiner plusieurs actions : [ACTION:FRIDGE tomates] [ACTION:FRIDGE oignons]
Pour le planning, déduis la date et le repas du contexte (si "ce soir" → date du jour + DINNER, "demain midi" → date+1 + LUNCH).
La date d'aujourd'hui est : ${todayDate}

CRÉATION DE RECETTES PERSONNALISÉES :
IMPORTANT : Quand l'utilisateur accepte une recette que tu as proposée (ex: "go", "ok", "fais-le", "je veux celle-là"), quand tu inventes/adaptes une recette qui N'EXISTE PAS dans le catalogue, OU quand aucune recette du catalogue ne correspond réellement au frigo (voir règle de cohérence plus haut), tu DOIS la créer directement avec cette commande, sans demander confirmation :
[RECIPE:nom_recette|cuisine|difficulté|temps_minutes|portions|instructions complètes étape par étape|ingredient1:quantité:unité,ingredient2:quantité:unité,...]
Exemples :
- [RECIPE:Riz au bœuf épicé tchinné|Burkinabè|FACILE|35|4|Fais revenir l'oignon et l'ail dans l'huile d'olive. Ajoute le bœuf haché et fais dorer 5 min. Mélange la sauce tomate, le curry et le paprika. Laisse mijoter 15 min. Cuis le riz à part. Sers le bœuf sur le riz.|bœuf haché:400:g,riz:300:g,oignon:1:unité,ail:3:gousse,sauce tomate:200:ml,curry:1:cs,paprika:1:cc,huile d'olive:2:cs]
Après la commande, dis simplement "Je viens de créer la recette, la voici !" sans détailler les ingrédients ni les étapes (tout s'affiche dans la carte).
Difficultés possibles : FACILE, MOYEN, DIFFICILE.
Ne crée PAS de recette si elle existe déjà dans le catalogue (utilise [ID:xxx] à la place).
⚠️ N'OUBLIE JAMAIS un ingrédient structurel évident : une omelette a des œufs, une crêpe a farine+lait+œufs, un gâteau a farine+œufs+sucre, une pizza a pâte+sauce+fromage. Relis la liste d'ingrédients avant d'envoyer la commande et vérifie qu'elle est complète.${coachBlock}`;

  // Une demande de recette ("recette", "manger", "cuisiner", "plat"...) ne doit jamais
  // se solder par un simple [NAV:/dashboard] — détection pour déclencher un retry ciblé si besoin.
  const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const looksLikeRecipeRequest = /recette|cuisin|manger|repas|plat\b|idée.{0,10}(diner|dîner|déjeuner|repas)|quoi.{0,10}(manger|cuisiner|faire)/i.test(lastUserMessage);

  try {
    let resp = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      { temperature: 0.6 },
    );

    let reply = resp.message?.content || '';

    // Extraire les IDs de recettes mentionnées
    let idMatches = [...reply.matchAll(/\[ID:([a-z0-9]+)\]/gi)];
    let recipeIds = [...new Set(idMatches.map(m => m[1]))];
    let recipeTagCount = (reply.match(/\[RECIPE:/gi) || []).length;

    // Extraire commande de navigation
    let navMatch = reply.match(/\[NAV:(\/[^\]]*)\]/i);
    let navTo = navMatch ? navMatch[1] : null;

    // ── Garde-fou : demande de recette esquivée par un simple NAV, sans ID ni RECIPE → 1 seul retry forcé ──
    if (looksLikeRecipeRequest && recipeIds.length === 0 && recipeTagCount === 0 && navTo) {
      const retryResp = await chatCompletion(
        [
          { role: 'system', content: systemPrompt },
          ...messages,
          { role: 'assistant', content: reply },
          { role: 'user', content: 'Ta réponse précédente ne respecte pas la consigne : tu as renvoyé [NAV:/dashboard] au lieu de proposer une vraie recette. Réponds à nouveau à ma question avec des [ID:xxx] du catalogue cohérents avec mon frigo, ou invente une recette avec [RECIPE:...]. Pas de NAV cette fois.' },
        ],
        { temperature: 0.5 },
      );
      const retryReply = retryResp.message?.content || '';
      if (retryReply) {
        reply = retryReply;
        idMatches = [...reply.matchAll(/\[ID:([a-z0-9]+)\]/gi)];
        recipeIds = [...new Set(idMatches.map(m => m[1]))];
        recipeTagCount = (reply.match(/\[RECIPE:/gi) || []).length;
        navMatch = reply.match(/\[NAV:(\/[^\]]*)\]/i);
        navTo = navMatch ? navMatch[1] : null;
      }
    }

    // Extraire les actions
    const actionMatches = [...reply.matchAll(/\[ACTION:(PLAN|REMOVE_PLAN|FRIDGE|SHOP|COOK)\s+([^\]]+)\]/gi)];
    const actions = actionMatches.map(m => {
      const type = m[1].toUpperCase();
      const args = m[2].trim();
      if (type === 'PLAN') {
        const parts = args.split(/\s+/);
        return { type, recipeId: parts[0], date: parts[1], mealType: parts[2] };
      }
      if (type === 'REMOVE_PLAN') {
        const parts = args.split(/\s+/);
        return { type, date: parts[0], mealType: parts[1] };
      }
      if (type === 'COOK') return { type, recipeId: args };
      return { type, ingredientName: args };
    });

    // ── Cohérence minimale des recettes inventées : complète les ingrédients structurels oubliés ──
    // (ex: une "omelette" sans œufs) plutôt que de laisser passer une recette cassée.
    const COHERENCE_RULES: Array<{ keywords: string[]; requires: Array<{ match: string[]; add: { name: string; quantity: number; unit: string } }> }> = [
      { keywords: ['omelette'], requires: [{ match: ['oeuf', 'œuf'], add: { name: 'œufs', quantity: 3, unit: 'pièce' } }] },
      { keywords: ['crêpe', 'crepe', 'galette de froment'], requires: [
        { match: ['farine'], add: { name: 'farine', quantity: 250, unit: 'g' } },
        { match: ['lait'], add: { name: 'lait', quantity: 500, unit: 'ml' } },
        { match: ['oeuf', 'œuf'], add: { name: 'œufs', quantity: 3, unit: 'pièce' } },
      ] },
      { keywords: ['gâteau', 'gateau', 'cake', 'fondant', 'brownie', 'moelleux'], requires: [
        { match: ['farine'], add: { name: 'farine', quantity: 200, unit: 'g' } },
        { match: ['oeuf', 'œuf'], add: { name: 'œufs', quantity: 3, unit: 'pièce' } },
        { match: ['sucre'], add: { name: 'sucre', quantity: 150, unit: 'g' } },
      ] },
      { keywords: ['pizza'], requires: [
        { match: ['farine'], add: { name: 'farine', quantity: 300, unit: 'g' } },
        { match: ['tomate'], add: { name: 'sauce tomate', quantity: 200, unit: 'ml' } },
        { match: ['fromage'], add: { name: 'fromage râpé', quantity: 150, unit: 'g' } },
      ] },
      { keywords: ['quiche', 'tarte salée'], requires: [
        { match: ['farine'], add: { name: 'farine', quantity: 200, unit: 'g' } },
        { match: ['oeuf', 'œuf'], add: { name: 'œufs', quantity: 3, unit: 'pièce' } },
        { match: ['crème'], add: { name: 'crème fraîche', quantity: 200, unit: 'ml' } },
      ] },
      { keywords: ['pâte à pain', 'pain maison', 'baguette'], requires: [
        { match: ['farine'], add: { name: 'farine', quantity: 500, unit: 'g' } },
        { match: ['levure'], add: { name: 'levure boulangère', quantity: 1, unit: 'sachet' } },
      ] },
    ];

    // Extraire et créer les recettes personnalisées
    const recipeTagMatches = [...reply.matchAll(/\[RECIPE:([^\]]+)\]/gi)];
    const createdRecipeIds: string[] = [];
    for (const rm of recipeTagMatches) {
      try {
        const parts = rm[1].split('|');
        if (parts.length < 7) continue;
        const [rName, rCuisine, rDiff, rTime, rServings, rInstructions, rIngs] = parts;
        const validDiff = ['FACILE', 'MOYEN', 'DIFFICILE'].includes(rDiff) ? rDiff : 'FACILE';

        const newRecipe = await prisma.recipe.create({
          data: {
            name: rName.trim(),
            description: `Recette créée par l'assistant IA à partir de ton frigo`,
            instructions: rInstructions.trim(),
            cuisine: rCuisine.trim() || 'Maison',
            difficulty: validDiff as any,
            prepTime: parseInt(rTime) || 30,
            servings: parseInt(rServings) || 4,
            authorId: user.id,
            isPublic: true,
          },
        });

        const ingParts = rIngs.split(',').map((s: string) => s.trim()).filter(Boolean);

        // Complète les ingrédients structurels manquants selon le type de plat détecté par le nom
        const dishNameLower = rName.toLowerCase();
        const ingNamesLower = ingParts.map((p: string) => p.split(':')[0].trim().toLowerCase());
        for (const rule of COHERENCE_RULES) {
          if (!rule.keywords.some(kw => dishNameLower.includes(kw))) continue;
          for (const req of rule.requires) {
            const present = ingNamesLower.some((n: string) => req.match.some(m => n.includes(m)));
            if (!present) {
              ingParts.push(`${req.add.name}:${req.add.quantity}:${req.add.unit}`);
              ingNamesLower.push(req.add.name.toLowerCase());
              console.warn(`[chat] Recette "${rName.trim()}" complétée avec l'ingrédient manquant : ${req.add.name}`);
            }
          }
        }

        for (const ip of ingParts) {
          const [ingName, ingQty, ingUnit] = ip.split(':').map((s: string) => s.trim());
          if (!ingName) continue;
          let ingredient = await prisma.ingredient.findFirst({
            where: { name: { equals: ingName, mode: 'insensitive' } },
          });
          if (!ingredient) {
            ingredient = await prisma.ingredient.create({
              data: { name: ingName, category: 'IA', emoji: '🍳' },
            });
          }
          const qty = parseFloat((ingQty || '1').replace(',', '.')) || 1;
          await prisma.recipeIngredient.create({
            data: { recipeId: newRecipe.id, ingredientId: ingredient.id, quantity: qty, unit: ingUnit || 'unité' },
          }).catch(() => {});
        }

        createdRecipeIds.push(newRecipe.id);
      } catch (e) {
        console.error('Failed to create recipe from chat:', e);
      }
    }

    const allRecipeIds = [...recipeIds, ...createdRecipeIds];

    // Nettoyer la réponse (retirer les balises internes + puces markdown résiduelles)
    const cleanReply = reply
      .replace(/\s*\[ID:[a-z0-9]+\]/gi, '')
      .replace(/\s*\[NAV:\/[^\]]*\]/gi, '')
      .replace(/\s*\[ACTION:[^\]]*\]/gi, '')
      .replace(/\s*\[RECIPE:[^\]]*\]/gi, '')
      .replace(/(^|\n)\s*[•\-*]\s+/g, '$1')
      .replace(/\*\*/g, '')
      .trim();

    return NextResponse.json({
      reply: cleanReply, recipeIds: allRecipeIds, navTo, actions,
      createdRecipes: createdRecipeIds, isVip: isVipOrAdmin,
    });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ error: 'Erreur IA — vérifie la configuration Ollama' }, { status: 500 });
  }
}

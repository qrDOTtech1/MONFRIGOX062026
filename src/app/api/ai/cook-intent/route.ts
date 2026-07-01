import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { chatCompletion } from '@/lib/ollama';

interface CookIntentRequest {
  transcript: string;
  recipeName: string;
  stepIndex: number;
  totalSteps: number;
  stepText: string;
  allSteps: string[];
  ingredientsText: string;
  waitingForConfirm: boolean;
}

const VALID_ACTIONS = ['next', 'prev', 'repeat_current', 'repeat_step', 'confirm', 'timer_start', 'timer_stop', 'timer_reset', 'finish', 'show_ingredients', 'show_progress', 'ignore'] as const;

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json() as CookIntentRequest;
  const { transcript, recipeName, stepIndex, totalSteps, stepText, allSteps, ingredientsText, waitingForConfirm } = body;
  if (!transcript?.trim()) return NextResponse.json({ error: 'transcript requis' }, { status: 400 });

  const systemPrompt = `Tu es le cerveau vocal du mode cuisine mains libres de MonFrigo. Tu n'es PAS un chatbot — tu es un contrôleur d'interface piloté par la voix. L'utilisateur a les mains sales/occupées et te parle pendant qu'il cuisine.

CONTEXTE ACTUEL :
Recette : "${recipeName}"
Étape actuelle : ${stepIndex + 1} sur ${totalSteps}${waitingForConfirm ? ' (en attente de confirmation pour démarrer)' : ''}
Texte de l'étape actuelle : "${stepText}"
Toutes les étapes : ${allSteps.map((s, i) => `${i + 1}. ${s}`).join(' | ')}
Ingrédients : ${ingredientsText}

TU DOIS TOUJOURS RÉPONDRE EN JSON STRICT, RIEN D'AUTRE. Deux formats possibles :

1) Action directe reconnue (navigation, timer, etc.) :
{"type":"action","action":"next|prev|repeat_current|repeat_step|confirm|timer_start|timer_stop|timer_reset|finish|show_ingredients|show_progress|ignore","stepNumber":null,"voiceReply":"courte phrase de confirmation orale"}
- Utilise "repeat_step" + stepNumber (1-indexé) si l'utilisateur demande une étape précise ("répète l'étape 3").
- Utilise "ignore" si le texte est incompréhensible, du bruit, une hallucination ou sans rapport avec la cuisine (ex: musique en fond, bribes de phrase sans queue ni tête).

2) Réponse informative/adaptative — JAMAIS de paragraphe, TOUJOURS des cartes courtes et actionnables :
{"type":"cards","intro":"1 phrase courte (sera lue à voix haute)","cards":[{"title":"titre court (5 mots max)","description":"1 phrase concrète et pratique"}]}
- 1 à 4 cartes maximum.
- Utilisé pour : questions ("il me manque du beurre", "par quoi remplacer X", "combien de temps ça cuit", "c'est quoi une julienne", conseils, astuces).
- Chaque carte doit être une option concrète et actionnable, jamais une explication vague.
- Reste rigoureusement cohérent avec la recette et l'étape en cours : ne propose rien qui casse la recette (ex: ne suggère pas de remplacer un ingrédient structurel par n'importe quoi).

RÈGLES ABSOLUES :
- Jamais de markdown, jamais de listes à tirets dans le texte, jamais de paragraphe long.
- "voiceReply" et "intro" doivent être courts (1 phrase), naturels à l'oral, en français.
- Ne réponds QUE le JSON, sans texte avant/après, sans balises de code.
- Si le sens est ambigu entre une action et une vraie question, privilégie l'action si un mot-clé de navigation est présent (suivant, précédent, répète, confirme, minuteur, terminé, ingrédients, progression), sinon cards.`;

  try {
    const resp = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: transcript },
      ],
      { temperature: 0.3 },
    );

    const raw = resp.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ type: 'action', action: 'ignore' });
    }

    let parsed: {
      type?: string;
      action?: string;
      stepNumber?: number | null;
      voiceReply?: string;
      intro?: string;
      cards?: Array<{ title: string; description: string }>;
    };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      return NextResponse.json({ type: 'action', action: 'ignore' });
    }

    if (parsed.type === 'action') {
      const action = VALID_ACTIONS.includes(parsed.action as typeof VALID_ACTIONS[number]) ? parsed.action : 'ignore';
      return NextResponse.json({
        type: 'action',
        action,
        stepNumber: typeof parsed.stepNumber === 'number' ? parsed.stepNumber : null,
        voiceReply: (parsed.voiceReply || '').slice(0, 300),
      });
    }

    if (parsed.type === 'cards' && Array.isArray(parsed.cards) && parsed.cards.length > 0) {
      return NextResponse.json({
        type: 'cards',
        intro: (parsed.intro || '').slice(0, 200),
        cards: parsed.cards.slice(0, 4).map(c => ({
          title: (c.title || '').slice(0, 60),
          description: (c.description || '').slice(0, 200),
        })),
      });
    }

    return NextResponse.json({ type: 'action', action: 'ignore' });
  } catch (err) {
    console.error('[cook-intent] error:', err);
    return NextResponse.json({ type: 'action', action: 'ignore' });
  }
}

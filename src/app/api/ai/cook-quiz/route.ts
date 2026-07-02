import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { chatCompletion } from '@/lib/ollama';

interface CookQuizRequest {
  recipeName: string;
  stepText: string;
  ingredientsText: string;
  askedQuestions: string[];
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json() as CookQuizRequest;
  const { recipeName, stepText, ingredientsText, askedQuestions } = body;

  const systemPrompt = `Tu génères UNE question de quiz culinaire éclair, courte et amusante, en lien avec la recette en cours ou la culture culinaire générale. Le joueur cuisine en ce moment et répond à voix haute — reste simple, une question par tour, jamais de piège absurde.

CONTEXTE :
Recette : "${recipeName}"
Étape en cours : "${stepText}"
Ingrédients : ${ingredientsText}
${askedQuestions.length > 0 ? `Questions déjà posées cette partie (ne les répète pas) : ${askedQuestions.join(' | ')}` : ''}

RÉPONDS UNIQUEMENT EN JSON STRICT :
{"question":"Question courte et claire (1 phrase)","options":[{"text":"Option A","correct":false},{"text":"Option B","correct":true},{"text":"Option C","correct":false}],"funFact":"1 phrase rigolote ou instructive révélée après la réponse, quel que soit le résultat"}

RÈGLES :
- Exactement 3 options, une seule correcte.
- Mélange questions sur LA recette en cours (temps de cuisson, ingrédient clé, technique de l'étape) et culture culinaire générale amusante (origine d'un plat, record, anecdote) — varie d'un tour à l'autre.
- Ton léger, jamais scolaire. Pas de markdown.
- "funFact" doit être vrai et intéressant, pas juste "bravo".`;

  try {
    const resp = await chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Génère une question.' },
      ],
      { temperature: 0.9 },
    );

    const raw = resp.message?.content || '';
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return NextResponse.json({ error: 'quiz_generation_failed' }, { status: 502 });

    const parsed = JSON.parse(jsonMatch[0]) as {
      question?: string;
      options?: Array<{ text: string; correct: boolean }>;
      funFact?: string;
    };

    if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length < 2) {
      return NextResponse.json({ error: 'quiz_generation_failed' }, { status: 502 });
    }

    const correctIndex = parsed.options.findIndex(o => o.correct);

    return NextResponse.json({
      question: parsed.question.slice(0, 200),
      options: parsed.options.slice(0, 4).map(o => o.text.slice(0, 80)),
      correctIndex: correctIndex >= 0 ? correctIndex : 0,
      funFact: (parsed.funFact || '').slice(0, 250),
    });
  } catch (err) {
    console.error('[cook-quiz] error:', err);
    return NextResponse.json({ error: 'quiz_generation_failed' }, { status: 500 });
  }
}

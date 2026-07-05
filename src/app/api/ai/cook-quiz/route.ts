import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { chatCompletion } from '@/lib/ollama';

interface CookQuizRequest {
  recipeName: string;
  stepText: string;
  ingredientsText: string;
  askedQuestions: string[];
  lang?: string;
}

const LANG_NAMES: Record<string, string> = { fr: 'français', en: 'English', es: 'español', de: 'Deutsch', it: 'italiano', pt: 'português', nl: 'Nederlands', ru: 'русский', ar: 'العربية', zh: '中文', ja: '日本語', ko: '한국어', tr: 'Türkçe', pl: 'polski', sv: 'svenska', hi: 'हिन्दी' };

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });

  const body = await req.json() as CookQuizRequest;
  const { recipeName, stepText, ingredientsText, askedQuestions, lang } = body;
  const langName = LANG_NAMES[lang ?? 'fr'] ?? 'français';

  const systemPrompt = `You generate ONE short, fun culinary quiz question related to the recipe in progress or general food culture. The player is cooking and will answer out loud — keep it simple, one question per turn, no absurd tricks.
LANGUAGE: You MUST write ALL text (question, options, funFact) in ${langName}. Do not use any other language.

CONTEXT:
Recipe: "${recipeName}"
Current step: "${stepText}"
Ingredients: ${ingredientsText}
${askedQuestions.length > 0 ? `Questions already asked this game (do not repeat): ${askedQuestions.join(' | ')}` : ''}

RESPOND ONLY IN STRICT JSON:
{"question":"Short clear question (1 sentence)","options":[{"text":"Option A","correct":false},{"text":"Option B","correct":true},{"text":"Option C","correct":false}],"funFact":"1 fun or instructive sentence revealed after the answer, whatever the result"}

RULES:
- Exactly 3 options, exactly one correct.
- Mix questions about THIS recipe (cook time, key ingredient, technique) and fun general food culture (dish origins, records, anecdotes) — vary each round.
- Light tone, never academic. No markdown.
- "funFact" must be true and interesting, not just "well done".`;

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

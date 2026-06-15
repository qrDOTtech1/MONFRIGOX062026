import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_TL = 'https://translate.googleapis.com/translate_a/single';

const cache = new Map<string, string>();

async function translate(text: string, to: string): Promise<string> {
  if (!text || text.length < 2) return text;
  const key = `${to}:${text.slice(0, 200)}`;
  if (cache.has(key)) return cache.get(key)!;
  try {
    const params = new URLSearchParams({ client: 'gtx', sl: 'fr', tl: to, dt: 't', q: text });
    const res = await fetch(`${GOOGLE_TL}?${params}`);
    if (!res.ok) return text;
    const data = await res.json();
    const result = (data[0] as any[])?.map((s: any) => s[0]).join('') || text;
    cache.set(key, result);
    return result;
  } catch { return text; }
}

export async function POST(req: NextRequest) {
  try {
    const { name, description, instructions, ingredients, lang } = await req.json();
    if (!lang || lang === 'fr') return NextResponse.json({ name, description, instructions, ingredients });

    if (lang === 'en') {
      return NextResponse.json({ name, description, instructions, ingredients });
    }

    const [tName, tDesc, tInstructions] = await Promise.all([
      translate(name, lang),
      translate(description, lang),
      translate(instructions, lang),
    ]);

    let tIngredients = ingredients;
    if (ingredients?.length) {
      tIngredients = await Promise.all(
        ingredients.map(async (ing: any) => ({
          ...ing,
          ingredient: {
            ...ing.ingredient,
            name: await translate(ing.ingredient.name, lang),
          },
        }))
      );
    }

    return NextResponse.json({
      name: tName,
      description: tDesc,
      instructions: tInstructions,
      ingredients: tIngredients,
    });
  } catch {
    return NextResponse.json({ error: 'Translation failed' }, { status: 500 });
  }
}

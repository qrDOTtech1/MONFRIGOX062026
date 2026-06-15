import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_TL = 'https://translate.googleapis.com/translate_a/single';

async function googleTranslate(texts: string[], from: string, to: string): Promise<string[]> {
  const results: string[] = [];
  // Batch in chunks of 50 to avoid URL length limits
  for (let i = 0; i < texts.length; i += 50) {
    const chunk = texts.slice(i, i + 50);
    const promises = chunk.map(async (text) => {
      if (!text || text.length < 2) return text;
      try {
        const params = new URLSearchParams({ client: 'gtx', sl: from, tl: to, dt: 't', q: text });
        const res = await fetch(`${GOOGLE_TL}?${params}`, { next: { revalidate: 86400 } });
        if (!res.ok) return text;
        const data = await res.json();
        return (data[0] as any[])?.map((s: any) => s[0]).join('') || text;
      } catch {
        return text;
      }
    });
    results.push(...await Promise.all(promises));
  }
  return results;
}

export async function POST(req: NextRequest) {
  try {
    const { texts, from = 'fr', to } = await req.json() as { texts: string[]; from?: string; to: string };
    if (!to || !texts?.length) return NextResponse.json({ error: 'Missing params' }, { status: 400 });
    if (texts.length > 200) return NextResponse.json({ error: 'Too many texts (max 200)' }, { status: 400 });

    const translated = await googleTranslate(texts, from, to);
    return NextResponse.json({ translated });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Translation error' }, { status: 500 });
  }
}

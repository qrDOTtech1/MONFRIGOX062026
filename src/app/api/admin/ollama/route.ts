import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { listModels } from '@/lib/ollama';
import { Ollama } from 'ollama';
import { prisma } from '@/lib/db';

function dateKeysLastNDays(n: number): string[] {
  const keys: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

async function getUsageStats() {
  const last30 = dateKeysLastNDays(30);
  const rows = await prisma.appConfig.findMany({
    where: { key: { in: last30.map(k => `ollama_usage_${k}`) } },
  });
  const byDate = new Map(rows.map(r => [r.key.replace('ollama_usage_', ''), JSON.parse(r.value)]));

  const daily = last30.map(date => {
    const v = byDate.get(date) || { calls: 0, promptTokens: 0, completionTokens: 0 };
    return { date, calls: v.calls || 0, promptTokens: v.promptTokens || 0, completionTokens: v.completionTokens || 0 };
  }).reverse(); // ordre chronologique

  const today = daily[daily.length - 1];
  const last7 = daily.slice(-7);
  const sum = (arr: typeof daily, key: 'calls' | 'promptTokens' | 'completionTokens') => arr.reduce((s, d) => s + d[key], 0);

  return {
    today: { calls: today.calls, tokens: today.promptTokens + today.completionTokens },
    last7Days: { calls: sum(last7, 'calls'), tokens: sum(last7, 'promptTokens') + sum(last7, 'completionTokens') },
    last30Days: { calls: sum(daily, 'calls'), tokens: sum(daily, 'promptTokens') + sum(daily, 'completionTokens') },
    daily,
  };
}

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  try {
    const [models, usage] = await Promise.all([listModels(), getUsageStats()]);
    return NextResponse.json({ ok: true, models, usage });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Erreur de connexion',
      models: [],
      usage: null,
    });
  }
}

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  const { host, apiKey } = await req.json();

  try {
    const client = new Ollama({
      host: host || 'https://ollama.com',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    });

    const response = await client.list();
    return NextResponse.json({ ok: true, models: response.models });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Connexion échouée',
      models: [],
    });
  }
}

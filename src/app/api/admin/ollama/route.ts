import { NextResponse } from 'next/server';
import { isAdmin } from '@/lib/auth';
import { listModels } from '@/lib/ollama';
import { Ollama } from 'ollama';
import { prisma } from '@/lib/db';

export async function GET() {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });

  try {
    const models = await listModels();
    return NextResponse.json({ ok: true, models });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : 'Erreur de connexion',
      models: [],
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

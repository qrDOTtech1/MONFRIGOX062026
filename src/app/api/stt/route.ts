import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

async function getConfig(key: string): Promise<string> {
  const row = await prisma.appConfig.findUnique({ where: { key } });
  return row?.value || '';
}

export async function POST(req: NextRequest) {
  const apiKey = await getConfig('ELEVENLABS_API_KEY');

  if (!apiKey) {
    return NextResponse.json({ error: 'elevenlabs_not_configured' }, { status: 501 });
  }

  const formData = await req.formData();
  const audio = formData.get('audio') as Blob | null;
  if (!audio) {
    return NextResponse.json({ error: 'audio required' }, { status: 400 });
  }

  const elForm = new FormData();
  elForm.append('audio', audio, 'audio.webm');
  elForm.append('model_id', 'scribe_v1');
  elForm.append('language_code', 'fra');

  const elRes = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
    method: 'POST',
    headers: { 'xi-api-key': apiKey },
    body: elForm,
  });

  if (!elRes.ok) {
    const err = await elRes.text().catch(() => 'unknown');
    return NextResponse.json({ error: 'elevenlabs_stt_error', details: err }, { status: 502 });
  }

  const data = await elRes.json();
  return NextResponse.json({ text: data.text || '' });
}

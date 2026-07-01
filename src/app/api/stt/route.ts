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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form_data' }, { status: 400 });
  }

  const audio = formData.get('audio') as Blob | null;
  if (!audio || audio.size < 100) {
    return NextResponse.json({ error: 'audio required', size: audio?.size ?? 0 }, { status: 400 });
  }

  const elForm = new FormData();
  const ext = audio.type?.includes('mp4') ? 'mp4' : 'webm';
  elForm.append('file', audio, `audio.${ext}`);
  elForm.append('model_id', 'scribe_v1');
  elForm.append('language_code', 'fra');

  try {
    const elRes = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: elForm,
    });

    if (!elRes.ok) {
      const err = await elRes.text().catch(() => 'unknown');
      console.error('[STT] ElevenLabs error:', elRes.status, err);
      return NextResponse.json({ error: 'elevenlabs_stt_error', status: elRes.status, details: err }, { status: 502 });
    }

    const data = await elRes.json();
    return NextResponse.json({ text: data.text || '' });
  } catch (err) {
    console.error('[STT] Fetch error:', err);
    return NextResponse.json({ error: 'stt_fetch_failed' }, { status: 500 });
  }
}

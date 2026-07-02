import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

async function getConfig(key: string): Promise<string> {
  const row = await prisma.appConfig.findUnique({ where: { key } });
  return row?.value || '';
}

type VoiceChannel = 'cuisine' | 'ia' | 'easter';

const VOICE_CONFIG_KEYS: Record<VoiceChannel, string> = {
  cuisine: 'ELEVENLABS_VOICE_ID',
  ia: 'ELEVENLABS_VOICE_ID_IA',
  easter: 'ELEVENLABS_VOICE_ID_EE',
};

/** Résout le voice ID d'un canal, avec repli sur la voix cuisine (voix 1) si non configuré. */
async function resolveVoiceId(channel: VoiceChannel): Promise<string> {
  const specific = await getConfig(VOICE_CONFIG_KEYS[channel]);
  if (specific) return specific;
  if (channel === 'cuisine') return specific;
  return getConfig(VOICE_CONFIG_KEYS.cuisine);
}

export async function GET() {
  const apiKey = await getConfig('ELEVENLABS_API_KEY');
  const voiceId = await getConfig('ELEVENLABS_VOICE_ID');
  return NextResponse.json({
    configured: !!(apiKey && voiceId),
    hasKey: !!apiKey,
    hasVoice: !!voiceId,
  });
}

export async function POST(req: NextRequest) {
  const { text, lang, voice } = await req.json();
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text required' }, { status: 400 });
  }

  const channel: VoiceChannel = voice === 'ia' || voice === 'easter' ? voice : 'cuisine';

  const apiKey = await getConfig('ELEVENLABS_API_KEY');
  const voiceId = await resolveVoiceId(channel);

  if (!apiKey || !voiceId) {
    return NextResponse.json({ error: 'elevenlabs_not_configured' }, { status: 501 });
  }

  const elRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.3,
      },
    }),
  });

  if (!elRes.ok) {
    const err = await elRes.text().catch(() => 'unknown');
    console.error('[TTS] ElevenLabs error:', elRes.status, err);
    return NextResponse.json({ error: 'elevenlabs_error', status: elRes.status, details: err }, { status: 502 });
  }

  return new NextResponse(elRes.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';
import { DEEPGRAM_CONFIG } from '@/lib/utils/constants';

const log = createLogger('api/transcribe');

const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * POST /api/transcribe — Proxies audio transcription to Deepgram (server-side key)
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.DEEPGRAM_API_KEY;
    if (!apiKey) {
      log.error('DEEPGRAM_API_KEY not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const audioBuffer = await request.arrayBuffer();

    if (audioBuffer.byteLength === 0) {
      return NextResponse.json({ error: 'No audio data provided' }, { status: 400 });
    }

    if (audioBuffer.byteLength > MAX_AUDIO_SIZE) {
      return NextResponse.json({ error: 'Audio file too large (max 25MB)' }, { status: 413 });
    }

    const contentType = request.headers.get('content-type') || 'audio/wav';

    const params = new URLSearchParams({
      model: DEEPGRAM_CONFIG.model,
      smart_format: String(DEEPGRAM_CONFIG.smart_format),
      language: DEEPGRAM_CONFIG.language,
    });

    const response = await fetch(
      `https://api.deepgram.com/v1/listen?${params}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': contentType,
        },
        body: audioBuffer,
      }
    );

    if (!response.ok) {
      log.error('Deepgram API error', { status: String(response.status) });
      return NextResponse.json(
        { error: 'Transcription service error' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    log.error('Transcribe API error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

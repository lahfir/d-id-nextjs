import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';
import { OPENAI_CONFIG } from '@/lib/utils/constants';

const log = createLogger('api/chat');

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * POST /api/chat — Proxies chat completions to OpenAI (server-side key)
 */
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      log.error('OPENAI_API_KEY not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const body = await request.json();
    const messages: ChatMessage[] = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    for (const msg of messages) {
      if (!msg.role || !msg.content || typeof msg.content !== 'string') {
        return NextResponse.json({ error: 'Each message must have role and content' }, { status: 400 });
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_CONFIG.model,
        messages,
        temperature: OPENAI_CONFIG.temperature,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      log.error('OpenAI API error', { status: String(status) });

      const errorMap: Record<number, string> = {
        401: 'API key error. Please check your API configuration.',
        429: 'Rate limit exceeded. Please wait a moment and try again.',
        500: 'Server error. Please try again later.',
      };

      return NextResponse.json(
        { error: errorMap[status] || 'Error getting response from AI' },
        { status }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      log.error('No content in OpenAI response');
      return NextResponse.json({ error: 'Empty response from AI' }, { status: 502 });
    }

    return NextResponse.json({ content });
  } catch (error) {
    log.error('Chat API error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

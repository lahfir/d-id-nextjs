import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { AnimationResponse, AnimationsListResponse } from '@/types/did';
import { getApiConfig } from '@/lib/utils/env';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('api/animations');

const D_ID_API_BASE = 'https://api.d-id.com';

const createAnimationSchema = z.object({
  source_url: z.url(),
  config: z.record(z.string(), z.unknown()).optional(),
  webhook: z.url().optional(),
  name: z.string().optional(),
  user_data: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const config = getApiConfig();
    const body = await request.json();

    const parsed = createAnimationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid request' },
        { status: 400 }
      );
    }

    const response = await fetch(`${D_ID_API_BASE}/animations`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'authorization': `Basic ${config.didApiKey}`,
      },
      body: JSON.stringify(parsed.data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      log.error('D-ID API error', { errorData });
      return NextResponse.json(
        { error: errorData.message || 'Failed to create animation' },
        { status: response.status }
      );
    }

    const data: AnimationResponse = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    log.error('Error creating animation', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to create animation' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const animationId = searchParams.get('id');
    const config = getApiConfig();

    if (animationId) {
      const response = await fetch(`${D_ID_API_BASE}/animations/${encodeURIComponent(animationId)}`, {
        headers: {
          'accept': 'application/json',
          'authorization': `Basic ${config.didApiKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(
          { error: errorData.message || 'Failed to fetch animation' },
          { status: response.status }
        );
      }

      const data: AnimationResponse = await response.json();
      return NextResponse.json(data);

    } else {
      const limitParam = searchParams.get('limit') || '20';
      const limit = Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 100);
      const token = searchParams.get('token') || '';

      let url = `${D_ID_API_BASE}/animations?limit=${limit}`;
      if (token) {
        url += `&token=${encodeURIComponent(token)}`;
      }

      const response = await fetch(url, {
        headers: {
          'accept': 'application/json',
          'authorization': `Basic ${config.didApiKey}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        return NextResponse.json(
          { error: errorData.message || 'Failed to fetch animations' },
          { status: response.status }
        );
      }

      const data: AnimationsListResponse = await response.json();
      return NextResponse.json(data);
    }

  } catch (error) {
    log.error('Error fetching animations', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch animations' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const animationId = searchParams.get('id');
    const config = getApiConfig();

    if (!animationId) {
      return NextResponse.json(
        { error: 'Animation ID is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${D_ID_API_BASE}/animations/${encodeURIComponent(animationId)}`, {
      method: 'DELETE',
      headers: {
        'accept': 'application/json',
        'authorization': `Basic ${config.didApiKey}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.message || 'Failed to delete animation' },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    log.error('Error deleting animation', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to delete animation' },
      { status: 500 }
    );
  }
}

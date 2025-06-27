import { NextRequest, NextResponse } from 'next/server';
import { CreateAnimationRequest, AnimationResponse, AnimationsListResponse } from '@/types/did';
import { getApiConfig } from '@/lib/utils/env';

const D_ID_API_BASE = 'https://api.d-id.com';

export async function POST(request: NextRequest) {
  try {
    const config = getApiConfig();
    const body: CreateAnimationRequest = await request.json();

    // Validate required fields
    if (!body.source_url) {
      return NextResponse.json(
        { error: 'Missing required field: source_url' },
        { status: 400 }
      );
    }

    // Make request to D-ID API
    const response = await fetch(`${D_ID_API_BASE}/animations`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'content-type': 'application/json',
        'authorization': `Basic ${config.didApiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('D-ID API error:', errorData);
      return NextResponse.json(
        { error: errorData.message || 'Failed to create animation' },
        { status: response.status }
      );
    }

    const data: AnimationResponse = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Error creating animation:', error);
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
      // Get specific animation
      const response = await fetch(`${D_ID_API_BASE}/animations/${animationId}`, {
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
      // List animations
      const limit = searchParams.get('limit') || '20';
      const token = searchParams.get('token') || '';

      let url = `${D_ID_API_BASE}/animations?limit=${limit}`;
      if (token) {
        url += `&token=${token}`;
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
    console.error('Error fetching animations:', error);
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

    const response = await fetch(`${D_ID_API_BASE}/animations/${animationId}`, {
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
    console.error('Error deleting animation:', error);
    return NextResponse.json(
      { error: 'Failed to delete animation' },
      { status: 500 }
    );
  }
}
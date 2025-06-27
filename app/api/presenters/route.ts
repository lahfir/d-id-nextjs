import { NextResponse } from 'next/server';
import { PresentersApiResponse } from '@/types/did';
import { getApiConfig } from '@/utils/env';

// Cache for presenters data (5 minutes)
let presentersCache: {
  data: PresentersApiResponse | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export async function GET() {
  try {
    // Check cache
    const now = Date.now();
    if (presentersCache.data && now - presentersCache.timestamp < CACHE_DURATION) {
      return NextResponse.json(presentersCache.data);
    }

    // Get D-ID API key from environment
    const config = getApiConfig();

    // Fetch presenters from D-ID API
    const response = await fetch('https://api.d-id.com/clips/presenters?limit=100', {
      headers: {
        'accept': 'application/json',
        'authorization': `Basic ${config.didApiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`D-ID API error: ${response.status}`);
    }

    const data: PresentersApiResponse = await response.json();
    // Filter only streamable presenters

    for (const presenter of data.presenters) {
      if (presenter.is_streamable) {
        const driverId = presenter?.talking_preview_url?.split('/').slice(-2)[0];
        presenter.driver_id = driverId;
      }
    }

    // Update cache
    presentersCache = {
      data: data,
      timestamp: now,
    };

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching presenters:', error);
    return NextResponse.json(
      { error: 'Failed to fetch presenters' },
      { status: 500 }
    );
  }
}
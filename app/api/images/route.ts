import { NextRequest, NextResponse } from 'next/server';
import { getApiConfig } from '@/lib/utils/env';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('api/images');

const D_ID_API_BASE = 'https://api.d-id.com';

export async function POST(request: NextRequest) {
  try {
    const config = getApiConfig();
    const formData = await request.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    const didFormData = new FormData();
    didFormData.append('image', file);

    const response = await fetch(`${D_ID_API_BASE}/images`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'authorization': `Basic ${config.didApiKey}`,
      },
      body: didFormData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      log.error('D-ID API error', { errorData });
      return NextResponse.json(
        { error: errorData.message || 'Failed to upload image to D-ID' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    log.error('Error uploading image to D-ID', { error: String(error) });
    return NextResponse.json(
      { error: 'Failed to upload image to D-ID' },
      { status: 500 }
    );
  }
}
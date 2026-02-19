import { ApiConfig } from '@/types/api';

/**
 * Returns client-side configuration (browser-safe keys only).
 * OpenAI and Deepgram keys are now server-side only via /api/chat and /api/transcribe.
 */
export function getApiConfig(): ApiConfig {
  const config: ApiConfig = {
    didApiKey: process.env.NEXT_PUBLIC_DID_API_KEY || '',
    didWebsocketUrl: process.env.NEXT_PUBLIC_DID_WEBSOCKET_URL || 'wss://api.d-id.com',
    didService: process.env.NEXT_PUBLIC_DID_SERVICE as 'talks' | 'clips' | undefined,
    elevenlabsApiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
  };

  const missingKeys = Object.entries(config)
    .filter(([key, value]) => key !== 'didService' && !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
  }

  return config;
}

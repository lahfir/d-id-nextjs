import { ApiConfig } from '@/types/api';

/**
 * Validates and returns environment configuration
 */
export function getApiConfig(): ApiConfig {
  const config: ApiConfig = {
    didApiKey: process.env.NEXT_PUBLIC_DID_API_KEY || '',
    didWebsocketUrl: process.env.NEXT_PUBLIC_DID_WEBSOCKET_URL || 'wss://api.d-id.com',
    didService: process.env.NEXT_PUBLIC_DID_SERVICE as 'talks' | 'clips' | undefined, // Optional - managed by PresenterContext
    openaiApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || '',
    deepgramApiKey: process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY || '',
    elevenlabsApiKey: process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY || '',
  };

  // Filter out didService from required keys since it's now optional
  const missingKeys = Object.entries(config)
    .filter(([key, value]) => key !== 'didService' && !value)
    .map(([key]) => key);

  if (missingKeys.length > 0) {
    throw new Error(`Missing required environment variables: ${missingKeys.join(', ')}`);
  }

  return config;
}
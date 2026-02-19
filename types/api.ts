/**
 * Client-side API configuration.
 * Only contains keys that must be in the browser:
 * - D-ID key: needed for WebSocket URL auth parameter
 * - ElevenLabs key: sent via D-ID's WebSocket apiKeyExternal payload
 */
export interface ApiConfig {
  didApiKey: string;
  didWebsocketUrl: string;
  didService?: 'talks' | 'clips';
  elevenlabsApiKey: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

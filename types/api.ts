export interface ApiConfig {
  didApiKey: string;
  didWebsocketUrl: string;
  didService: 'talks' | 'clips';
  openaiApiKey: string;
  deepgramApiKey: string;
  elevenlabsApiKey: string;
  elevenlabsVoiceId: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
export interface ApiConfig {
  didApiKey: string;
  didWebsocketUrl: string;
  didService?: 'talks' | 'clips'; // Made optional - now managed by PresenterContext
  openaiApiKey: string;
  deepgramApiKey: string;
  elevenlabsApiKey: string;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
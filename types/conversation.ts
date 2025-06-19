export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

export interface OpenAIRequest {
  model: string;
  messages: ChatMessage[];
  temperature: number;
}

export interface OpenAIResponse {
  choices: {
    message: {
      role: 'assistant';
      content: string;
    };
  }[];
}

export interface DeepgramResponse {
  results: {
    channels: {
      alternatives: {
        transcript: string;
      }[];
    }[];
  };
}

export interface ConversationState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
}
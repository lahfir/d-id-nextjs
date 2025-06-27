import { ChatMessage, OpenAIRequest, OpenAIResponse } from '@/types/conversation';
import { ApiError } from '@/types/api';
import { OPENAI_CONFIG, ERROR_MESSAGES } from '@/lib/utils/constants';

/**
 * Client for OpenAI GPT-4o chat completions
 */
export class OpenAIClient {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Sends chat completion request to OpenAI API
   */
  async getChatCompletion(messages: ChatMessage[]): Promise<string> {
    try {
      const request: OpenAIRequest = {
        model: OPENAI_CONFIG.model,
        messages,
        temperature: OPENAI_CONFIG.temperature,
      };

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw this.handleApiError(response.status);
      }

      const data: OpenAIResponse = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  /**
   * Handles API errors with specific error messages
   */
  private handleApiError(status: number): ApiError {
    const errorMap: Record<number, string> = {
      401: ERROR_MESSAGES.API_KEY,
      429: ERROR_MESSAGES.RATE_LIMIT,
      500: ERROR_MESSAGES.SERVER_ERROR,
    };

    return {
      message: errorMap[status] || ERROR_MESSAGES.GENERIC,
      status,
    };
  }
}
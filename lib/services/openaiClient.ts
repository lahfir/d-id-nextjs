import { ChatMessage } from '@/types/conversation';
import { ERROR_MESSAGES } from '@/lib/utils/constants';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('OpenAIClient');

/**
 * Client for OpenAI chat completions via server-side proxy
 */
export class OpenAIClient {
  /**
   * Sends chat completion request through /api/chat proxy
   */
  async getChatCompletion(messages: ChatMessage[]): Promise<string> {
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || ERROR_MESSAGES.GENERIC);
      }

      const data = await response.json();
      return data.content;
    } catch (error) {
      log.error('OpenAI API error', { error: String(error) });
      throw error;
    }
  }
}

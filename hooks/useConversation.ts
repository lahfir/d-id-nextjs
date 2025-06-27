import { useState, useCallback } from 'react';
import { ChatMessage, ConversationState } from '@/types/conversation';
import { OpenAIClient } from '@/lib/services/openaiClient';
import { SYSTEM_PROMPT } from '@/lib/utils/constants';

/**
 * Hook for managing conversation history and LLM interactions
 */
export function useConversation(openaiClient: OpenAIClient | null) {
  const [state, setState] = useState<ConversationState>({
    messages: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
        timestamp: Date.now(),
      },
    ],
    isLoading: false,
    error: null,
  });

  /**
   * Sends message to LLM and returns response
   */
  const sendMessage = useCallback(async (userMessage: string): Promise<string> => {
    if (!openaiClient) {
      throw new Error('OpenAI client not initialized');
    }

    const userMsg: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };

    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMsg],
      isLoading: true,
      error: null,
    }));

    try {
      const updatedMessages = [...state.messages, userMsg];
      const assistantResponse = await openaiClient.getChatCompletion(updatedMessages);

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: assistantResponse,
        timestamp: Date.now(),
      };

      setState(prev => ({
        ...prev,
        messages: [...prev.messages, assistantMsg],
        isLoading: false,
      }));

      return assistantResponse;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      setState(prev => ({
        ...prev,
        messages: prev.messages.slice(0, -1), // Remove user message on error
        isLoading: false,
        error: errorMessage,
      }));

      throw error;
    }
  }, [openaiClient, state.messages]);

  /**
   * Clears conversation history (keeps system message)
   */
  const clearConversation = useCallback(() => {
    setState({
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
          timestamp: Date.now(),
        },
      ],
      isLoading: false,
      error: null,
    });
  }, []);

  /**
   * Clears error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    sendMessage,
    clearConversation,
    clearError,
  };
}
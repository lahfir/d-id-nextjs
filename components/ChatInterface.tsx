'use client';

import { useState, useCallback, KeyboardEvent } from 'react';
import { ChatMessage } from '@/types/conversation';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
  voiceRecording?: {
    isRecording: boolean;
    isProcessing: boolean;
    handleRecordStart: () => Promise<void>;
    handleRecordStop: () => Promise<string | null>;
    handleRecordCancel: () => Promise<string | null>;
  };
  onVoiceTranscription?: (text: string) => void;
}

/**
 * Component for text-based chat interface with integrated voice button
 */
export function ChatInterface({
  messages,
  onSendMessage,
  isLoading,
  disabled = false,
  placeholder = "Type your message here...",
  voiceRecording,
  onVoiceTranscription,
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('');

  /**
   * Handles sending message
   */
  const handleSend = useCallback(() => {
    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage || disabled || isLoading) return;

    onSendMessage(trimmedMessage);
    setInputValue('');
  }, [inputValue, disabled, isLoading, onSendMessage]);

  /**
   * Handles enter key press
   */
  const handleKeyPress = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  /**
   * Voice recording handlers
   */
  const handleVoiceStart = useCallback(async () => {
    if (!voiceRecording || disabled || voiceRecording.isProcessing) return;
    await voiceRecording.handleRecordStart();
  }, [voiceRecording, disabled]);

  const handleVoiceStop = useCallback(async () => {
    if (!voiceRecording || !voiceRecording.isRecording || !onVoiceTranscription) return;

    const transcription = await voiceRecording.handleRecordStop();
    if (transcription) {
      onVoiceTranscription(transcription);
    }
  }, [voiceRecording, onVoiceTranscription]);

  const handleVoiceCancel = useCallback(async () => {
    if (!voiceRecording || !voiceRecording.isRecording || !onVoiceTranscription) return;

    const transcription = await voiceRecording.handleRecordCancel();
    if (transcription) {
      onVoiceTranscription(transcription);
    }
  }, [voiceRecording, onVoiceTranscription]);

  /**
   * Filters messages for display (excludes system messages)
   */
  const displayMessages = messages.filter(msg => msg.role !== 'system');

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* Message History */}
      <div className="flex-1">
        {displayMessages.length > 0 ? (
          <div className="h-48 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
            {displayMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom duration-200`}
              >
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-lg text-xs ${message.role === 'user'
                    ? 'bg-white/20 text-white border border-white/10'
                    : 'bg-gray-800/60 text-gray-200 border border-gray-700/50'
                    }`}
                >
                  <p className="leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start animate-in slide-in-from-bottom duration-200">
                <div className="bg-gray-800/60 border border-gray-700/50 px-3 py-2 rounded-lg flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-xs text-gray-400">Thinking...</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="h-48 flex items-center justify-center text-center">
            <div className="space-y-2">
              <div className="text-white/30 text-2xl">💭</div>
              <p className="text-white/50 text-xs">
                Start a conversation
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Input Section with Integrated Voice */}
      <div className="border-t border-white/10 pt-3">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm placeholder-white/40 focus:ring-1 focus:ring-white/20 focus:border-white/20 disabled:bg-white/5 disabled:cursor-not-allowed transition-all duration-200 outline-none"
          />

          {/* Voice Button */}
          {voiceRecording && (
            <button
              onMouseDown={handleVoiceStart}
              onMouseUp={handleVoiceStop}
              onMouseLeave={handleVoiceCancel}
              onTouchStart={handleVoiceStart}
              onTouchEnd={handleVoiceStop}
              disabled={disabled || voiceRecording.isProcessing}
              className={`px-3 py-2 border rounded-lg transition-all duration-200 text-sm font-medium ${voiceRecording.isRecording
                ? 'bg-red-500/20 border-red-500/30 text-red-400 animate-pulse'
                : voiceRecording.isProcessing
                  ? 'bg-white/5 border-white/10 text-white/30 cursor-not-allowed'
                  : 'bg-white/10 border-white/10 text-white hover:bg-white/20 hover:border-white/20'
                }`}
            >
              {voiceRecording.isProcessing ? (
                <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : voiceRecording.isRecording ? (
                <div className="w-4 h-4 bg-red-400 rounded-sm"></div>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                </svg>
              )}
            </button>
          )}

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || disabled || isLoading}
            className="px-4 py-2 bg-white/10 border border-white/10 text-white rounded-lg hover:bg-white/20 disabled:bg-white/5 disabled:cursor-not-allowed disabled:text-white/30 transition-all duration-200 text-sm font-medium hover:border-white/20 disabled:border-white/5"
          >
            {isLoading ? (
              <div className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
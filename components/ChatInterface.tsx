'use client';

import { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const displayMessages = messages.filter(msg => msg.role !== 'system');

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages.length, isLoading]);

  const handleSend = useCallback(() => {
    const trimmedMessage = inputValue.trim();
    if (!trimmedMessage || disabled || isLoading) return;
    onSendMessage(trimmedMessage);
    setInputValue('');
  }, [inputValue, disabled, isLoading, onSendMessage]);

  const handleKeyPress = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const handleVoiceStart = useCallback(async () => {
    if (!voiceRecording || disabled || voiceRecording.isProcessing) return;
    await voiceRecording.handleRecordStart();
  }, [voiceRecording, disabled]);

  const handleVoiceStop = useCallback(async () => {
    if (!voiceRecording || !voiceRecording.isRecording || !onVoiceTranscription) return;
    const transcription = await voiceRecording.handleRecordStop();
    if (transcription) onVoiceTranscription(transcription);
  }, [voiceRecording, onVoiceTranscription]);

  const handleVoiceCancel = useCallback(async () => {
    if (!voiceRecording || !voiceRecording.isRecording || !onVoiceTranscription) return;
    const transcription = await voiceRecording.handleRecordCancel();
    if (transcription) onVoiceTranscription(transcription);
  }, [voiceRecording, onVoiceTranscription]);

  return (
    <div className="w-full flex flex-col gap-3">
      {/* ── Message History ── */}
      <div className="flex-1">
        {displayMessages.length > 0 ? (
          <div
            ref={scrollContainerRef}
            className="h-52 overflow-y-auto custom-scrollbar pr-1 space-y-2.5"
          >
            {displayMessages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} animate-slide-up`}
                style={{ animationDelay: `${Math.min(index * 0.03, 0.15)}s`, opacity: 0, animationFillMode: 'forwards' }}
              >
                {message.role === 'assistant' && (
                  <div className="w-5 h-5 rounded-md flex-shrink-0 mr-2 mt-0.5 flex items-center justify-center" style={{
                    background: 'var(--copper-glow)',
                    border: '1px solid var(--border-copper)',
                  }}>
                    <svg className="w-2.5 h-2.5" style={{ color: 'var(--copper)' }} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                    </svg>
                  </div>
                )}
                <div
                  className="max-w-[80%] px-3 py-2 rounded-lg text-[13px]"
                  style={{
                    background: message.role === 'user'
                      ? 'linear-gradient(135deg, var(--copper-dark), var(--copper))'
                      : 'var(--bg-tertiary)',
                    color: message.role === 'user' ? 'var(--bg-primary)' : 'var(--text-primary)',
                    border: message.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                  }}
                >
                  <p className="leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start animate-slide-up" style={{ opacity: 0, animationFillMode: 'forwards' }}>
                <div className="w-5 h-5 rounded-md flex-shrink-0 mr-2 mt-0.5 flex items-center justify-center" style={{
                  background: 'var(--copper-glow)',
                  border: '1px solid var(--border-copper)',
                }}>
                  <svg className="w-2.5 h-2.5" style={{ color: 'var(--copper)' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <div className="px-3 py-2.5 rounded-lg flex items-center gap-2" style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                }}>
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full animate-breathe"
                        style={{
                          background: 'var(--copper)',
                          animationDelay: `${i * 0.2}s`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="h-52 flex items-center justify-center text-center">
            <div className="space-y-3 animate-fade-in">
              {/* Geometric empty state */}
              <div className="w-12 h-12 mx-auto rounded-xl flex items-center justify-center" style={{
                background: 'var(--copper-subtle)',
                border: '1px solid var(--border-subtle)',
              }}>
                <svg className="w-5 h-5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  No messages yet
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Connect and start a conversation
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Input Section ── */}
      <div className="pt-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled || isLoading}
            className="input-base flex-1 !text-sm"
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
              className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-all duration-200"
              style={{
                background: voiceRecording.isRecording
                  ? 'var(--danger-muted)'
                  : 'rgba(255, 255, 255, 0.03)',
                border: voiceRecording.isRecording
                  ? '1px solid rgba(248, 113, 113, 0.3)'
                  : '1px solid var(--border-subtle)',
                color: voiceRecording.isRecording
                  ? 'var(--danger)'
                  : voiceRecording.isProcessing
                    ? 'var(--text-muted)'
                    : 'var(--text-secondary)',
                cursor: disabled || voiceRecording.isProcessing ? 'not-allowed' : 'pointer',
                opacity: disabled || voiceRecording.isProcessing ? 0.4 : 1,
                animation: voiceRecording.isRecording ? 'pulse-copper 1.5s ease-in-out infinite' : 'none',
              }}
            >
              {voiceRecording.isProcessing ? (
                <div className="w-4 h-4 rounded-full animate-spin" style={{
                  border: '2px solid var(--border-subtle)',
                  borderTopColor: 'var(--copper)',
                }} />
              ) : voiceRecording.isRecording ? (
                <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--danger)' }} />
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
            className="btn-copper w-10 h-10 !p-0 flex items-center justify-center flex-shrink-0"
          >
            {isLoading ? (
              <div className="w-4 h-4 rounded-full animate-spin" style={{
                border: '2px solid rgba(12, 10, 9, 0.3)',
                borderTopColor: 'var(--bg-primary)',
              }} />
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>

        {/* Voice recording indicator */}
        {voiceRecording?.isRecording && (
          <div className="flex items-center gap-2 mt-2 animate-fade-in">
            <div className="flex gap-0.5 items-end">
              {[8, 14, 10, 18, 6, 12, 16].map((h, i) => (
                <div
                  key={i}
                  className="w-0.5 rounded-full"
                  style={{
                    background: 'var(--danger)',
                    animation: `waveform 0.6s ease-in-out infinite`,
                    animationDelay: `${i * 0.08}s`,
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    ['--wave-height' as any]: `${h}px`,
                    height: '4px',
                  }}
                />
              ))}
            </div>
            <span className="text-xs" style={{ color: 'var(--danger)' }}>Recording... release to send</span>
          </div>
        )}
      </div>
    </div>
  );
}
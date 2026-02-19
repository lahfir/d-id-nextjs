'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { VideoDisplay } from './VideoDisplay';
import { ChatInterface } from './ChatInterface';
import { ErrorBoundary } from './ErrorBoundary';
import { PresenterSelector } from './PresenterSelector';
import { useDidStreaming } from '@/hooks/useDidStreaming';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useConversation } from '@/hooks/useConversation';
import { DeepgramClient } from '@/lib/services/deepgramClient';
import { OpenAIClient } from '@/lib/services/openaiClient';
import { getApiConfig } from '@/lib/utils/env';

export function StreamingChat() {
  const [clients, setClients] = useState<{
    deepgram: DeepgramClient | null;
    openai: OpenAIClient | null;
  }>({ deepgram: null, openai: null });

  const [initError, setInitError] = useState<string | null>(null);
  const [isInterfaceOpen, setIsInterfaceOpen] = useState(true);
  const [showPresenterSelector, setShowPresenterSelector] = useState(false);

  useEffect(() => {
    try {
      const config = getApiConfig();
      setClients({
        deepgram: new DeepgramClient(config.deepgramApiKey),
        openai: new OpenAIClient(config.openaiApiKey),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize';
      setInitError(message);
      console.error('Initialization error:', error);
    }
  }, []);

  const config = useMemo(() => {
    if (!clients.deepgram || !clients.openai) return null;
    try {
      return getApiConfig();
    } catch (error) {
      console.error('Error getting API config:', error);
      return null;
    }
  }, [clients.deepgram, clients.openai]);

  const streaming = useDidStreaming(config);
  const voiceRecording = useVoiceRecording(clients.deepgram);
  const conversation = useConversation(clients.openai);

  const handleSendMessage = useCallback(async (userMessage: string) => {
    if (!streaming.isReady()) {
      alert('Please connect to the streaming service first');
      return;
    }
    try {
      const assistantResponse = await conversation.sendMessage(userMessage);
      await streaming.sendTextMessage(assistantResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(errorMessage);
      console.error('Failed to send message:', error);
    }
  }, [streaming, conversation]);

  const handleVoiceTranscription = useCallback((transcription: string) => {
    console.log('Voice transcription:', transcription);
    handleSendMessage(transcription);
  }, [handleSendMessage]);

  const toggleInterface = useCallback(() => {
    setIsInterfaceOpen(!isInterfaceOpen);
  }, [isInterfaceOpen]);

  const getConnectionStatus = () => {
    const status = streaming.getConnectionStatus();
    return {
      isConnected: status.status === 'connected',
      isConnecting: status.status === 'connecting',
      statusText: status.message,
    };
  };

  // ── Init error screen ──
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blueprint" style={{ background: 'var(--bg-primary)' }}>
        <div className="panel-elevated max-w-md w-full p-10 text-center animate-scale-in">
          <div className="w-12 h-12 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: 'var(--danger-muted)' }}>
            <svg className="w-6 h-6" style={{ color: 'var(--danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="font-display text-2xl mb-3" style={{ color: 'var(--text-primary)' }}>
            Configuration Error
          </h2>
          <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>{initError}</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Check your environment variables in .env.local
          </p>
        </div>
      </div>
    );
  }

  // ── Loading screen ──
  if (!clients.deepgram || !clients.openai) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="text-center animate-fade-in">
          <div className="relative w-12 h-12 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full animate-spin" style={{
              border: '2px solid var(--border-subtle)',
              borderTopColor: 'var(--copper)',
            }} />
            <div className="absolute inset-2 rounded-full animate-spin" style={{
              border: '2px solid transparent',
              borderTopColor: 'var(--copper-light)',
              animationDirection: 'reverse',
              animationDuration: '0.8s',
            }} />
          </div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Initializing systems...</p>
        </div>
      </div>
    );
  }

  const connectionStatus = getConnectionStatus();

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen overflow-hidden bg-blueprint noise-overlay" style={{ background: 'var(--bg-primary)' }}>
        {/* ═══ Video Background ═══ */}
        <div className="absolute inset-0">
          <VideoDisplay
            streamVideo={streaming.streamVideo}
            idleVideoSrc={streaming.idleVideoSrc}
            isVideoPlaying={streaming.isVideoPlaying}
            isStreamReady={streaming.getConnectionStatus().status === 'connected'}
          />
        </div>

        {/* ═══ Content Layer ═══ */}
        <div className="relative z-10 min-h-screen flex flex-col">

          {/* ── Top Bar ── */}
          <header className="flex items-center justify-between px-5 py-4 animate-slide-down" style={{ opacity: 0, animationFillMode: 'forwards' }}>
            {/* Left: Brand + Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5">
                {/* Geometric logo mark */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{
                  background: 'linear-gradient(135deg, var(--copper-dark), var(--copper))',
                  boxShadow: 'var(--glow-copper-sm)',
                }}>
                  <svg className="w-4 h-4" style={{ color: 'var(--bg-primary)' }} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                </div>
                <div>
                  <h1 className="font-display text-lg leading-none tracking-tight" style={{ color: 'var(--text-primary)' }}>
                    D-ID Assistant
                  </h1>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Streaming Studio
                  </p>
                </div>
              </div>

              {/* Status LED */}
              <div className="flex items-center gap-2 ml-4">
                <div className={`led-indicator ${connectionStatus.isConnected ? 'led-green' : connectionStatus.isConnecting ? 'led-amber' : 'led-off'}`} />
                <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
                  {connectionStatus.statusText}
                </span>
              </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-2">
              {streaming.isVideoPlaying && (
                <div className="tag tag-danger animate-fade-in">
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--danger)' }} />
                  LIVE
                </div>
              )}

              {/* Presenter button */}
              <button
                onClick={() => setShowPresenterSelector(true)}
                disabled={connectionStatus.isConnected || connectionStatus.isConnecting}
                className="btn-ghost flex items-center gap-1.5 !px-3 !py-1.5 !text-xs disabled:opacity-30"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Presenter
              </button>

              {/* Connect / Disconnect */}
              {!connectionStatus.isConnected ? (
                <button
                  onClick={streaming.connect}
                  disabled={connectionStatus.isConnecting}
                  className="btn-copper flex items-center gap-1.5 !text-xs"
                >
                  {connectionStatus.isConnecting ? (
                    <>
                      <div className="w-3 h-3 rounded-full animate-spin" style={{
                        border: '2px solid rgba(12, 10, 9, 0.3)',
                        borderTopColor: 'var(--bg-primary)',
                      }} />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Connect
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={streaming.disconnect}
                  className="btn-ghost flex items-center gap-1.5 !text-xs !border-red-500/20 hover:!border-red-500/40 hover:!bg-red-500/10"
                  style={{ color: 'var(--danger)' }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Disconnect
                </button>
              )}
            </div>
          </header>

          {/* ── Spacer (pushes chat to bottom) ── */}
          <div className="flex-1" />

          {/* ── Right-side Floating Chat Panel ── */}
          {/* Collapsed toggle — bottom-right corner */}
          {!isInterfaceOpen && (
            <button
              onClick={toggleInterface}
              className="fixed bottom-5 right-5 z-30 w-11 h-11 rounded-full flex items-center justify-center copper-glow-sm animate-fade-in"
              style={{
                background: 'linear-gradient(135deg, var(--copper-dark), var(--copper))',
              }}
            >
              <svg className="w-5 h-5" style={{ color: 'var(--bg-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </button>
          )}

          {/* Chat container — pinned right, stretches top-to-bottom */}
          <div
            className={`fixed right-4 top-16 bottom-4 z-20 w-[340px] md:w-[360px] transition-all duration-500 ${
              isInterfaceOpen
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-8 pointer-events-none'
            }`}
            style={{ transitionTimingFunction: 'var(--ease-out-expo)' }}
          >
            <div className="h-full flex flex-col rounded-2xl overflow-hidden" style={{
              background: 'rgba(12, 10, 9, 0.55)',
              backdropFilter: 'blur(20px) saturate(1.4)',
              WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.03) inset',
            }}>
              {/* Copper accent line */}
              <div className="h-px flex-shrink-0" style={{
                background: 'linear-gradient(90deg, transparent, var(--copper), var(--copper-light), var(--copper), transparent)',
                opacity: 0.5,
              }} />

              {/* Chat header */}
              <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Conversation</span>
                  <div className={`led-indicator ${connectionStatus.isConnected ? 'led-green' : 'led-off'}`} style={{ width: '5px', height: '5px' }} />
                </div>
                <div className="flex items-center gap-0.5">
                  {conversation.messages.length > 0 && (
                    <button
                      onClick={conversation.clearConversation}
                      className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                      style={{ color: 'var(--text-muted)' }}
                      title="Clear conversation"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={toggleInterface}
                    className="p-1.5 rounded-md transition-colors hover:bg-white/5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Chat content — fills remaining space */}
              <div className="flex-1 min-h-0 px-3.5 pb-3.5 pt-0">
                <ChatInterface
                  messages={conversation.messages}
                  onSendMessage={handleSendMessage}
                  isLoading={conversation.isLoading}
                  disabled={!streaming.isReady()}
                  placeholder={streaming.isReady() ? "Type a message..." : "Connect to start"}
                  voiceRecording={voiceRecording}
                  onVoiceTranscription={handleVoiceTranscription}
                />
              </div>
            </div>
          </div>

          {/* ── Error Toast ── */}
          {(conversation.error || voiceRecording.error || streaming.connectionState.error) && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 max-w-md w-full px-4 animate-slide-down" style={{ zIndex: 50 }}>
              <div className="panel-elevated overflow-hidden" style={{ borderColor: 'rgba(248, 113, 113, 0.2)' }}>
                <div className="h-0.5" style={{ background: 'linear-gradient(90deg, var(--danger), transparent)' }} />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'var(--danger-muted)' }}>
                      <svg className="w-4 h-4" style={{ color: 'var(--danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="space-y-1.5 text-xs">
                        {streaming.connectionState.error && (
                          <div>
                            <span className="font-semibold" style={{ color: 'var(--danger)' }}>Stream: </span>
                            <span className="break-words" style={{ color: 'var(--text-secondary)' }}>{streaming.connectionState.error}</span>
                          </div>
                        )}
                        {conversation.error && (
                          <div>
                            <span className="font-semibold" style={{ color: 'var(--danger)' }}>AI: </span>
                            <span style={{ color: 'var(--text-secondary)' }}>{conversation.error}</span>
                          </div>
                        )}
                        {voiceRecording.error && (
                          <div>
                            <span className="font-semibold" style={{ color: 'var(--danger)' }}>Voice: </span>
                            <span style={{ color: 'var(--text-secondary)' }}>{voiceRecording.error}</span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          conversation.clearError();
                          voiceRecording.clearError();
                          if (streaming.connectionState.error) streaming.disconnect();
                        }}
                        className="mt-2 text-xs font-medium transition-colors"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ═══ Presenter Selector Modal ═══ */}
        {showPresenterSelector && (
          <PresenterSelector onClose={() => setShowPresenterSelector(false)} />
        )}
      </div>
    </ErrorBoundary>
  );
}
'use client';

import { useCallback, useEffect, useState, useMemo } from 'react';
import { VideoDisplay } from './VideoDisplay';
import { ChatInterface } from './ChatInterface';
import { ErrorBoundary } from './ErrorBoundary';
import { useDidStreaming } from '@/hooks/useDidStreaming';
import { useVoiceRecording } from '@/hooks/useVoiceRecording';
import { useConversation } from '@/hooks/useConversation';
import { DeepgramClient } from '@/services/deepgramClient';
import { OpenAIClient } from '@/services/openaiClient';
import { getApiConfig } from '@/utils/env';

/**
 * Main streaming chat component with simple compact interface
 */
export function StreamingChat() {
  const [clients, setClients] = useState<{
    deepgram: DeepgramClient | null;
    openai: OpenAIClient | null;
  }>({ deepgram: null, openai: null });

  const [initError, setInitError] = useState<string | null>(null);
  const [isInterfaceOpen, setIsInterfaceOpen] = useState(true);

  /**
   * Initialize API clients
   */
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

  // Memoize config to prevent recreating DidClient on every render
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

  /**
   * Handles text message submission (from both text input and voice)
   */
  const handleSendMessage = useCallback(async (userMessage: string) => {
    if (!streaming.isReady()) {
      alert('Please connect to the streaming service first');
      return;
    }

    try {
      const assistantResponse = await conversation.sendMessage(userMessage);
      // Use simple incremental indexing like vanilla version
      await streaming.sendTextMessage(assistantResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(errorMessage);
      console.error('Failed to send message:', error);
    }
  }, [streaming, conversation]);

  /**
   * Handles voice transcription
   */
  const handleVoiceTranscription = useCallback((transcription: string) => {
    console.log('Voice transcription:', transcription);
    handleSendMessage(transcription);
  }, [handleSendMessage]);

  /**
   * Toggle interface visibility
   */
  const toggleInterface = useCallback(() => {
    setIsInterfaceOpen(!isInterfaceOpen);
  }, [isInterfaceOpen]);

  /**
   * Connection status indicator
   */
  const getConnectionStatus = () => {
    const status = streaming.getConnectionStatus();
    return {
      isConnected: status.status === 'connected',
      isConnecting: status.status === 'connecting',
      statusText: status.message,
      statusColor: status.status === 'connected' ? 'text-green-500' :
        status.status === 'connecting' ? 'text-orange-500' :
          status.status === 'error' ? 'text-red-500' : 'text-gray-500'
    };
  };

  /**
   * Show initialization error if any
   */
  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="max-w-md w-full bg-gray-900/80 backdrop-blur-sm rounded-lg border border-gray-800 p-8 text-center">
          <div className="text-red-500 text-4xl mb-4">⚠</div>
          <h2 className="text-xl font-medium text-white mb-3">
            Configuration Error
          </h2>
          <p className="text-gray-400 mb-4 text-sm leading-relaxed">{initError}</p>
          <p className="text-xs text-gray-500">
            Please check your environment variables
          </p>
        </div>
      </div>
    );
  }

  /**
   * Show loading state while initializing
   */
  if (!clients.deepgram || !clients.openai) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Initializing...</p>
        </div>
      </div>
    );
  }

  const connectionStatus = getConnectionStatus();

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen overflow-hidden bg-black">
        {/* Full-screen Video Background */}
        <div className="absolute inset-0">
          <VideoDisplay
            streamVideo={streaming.streamVideo}
            idleVideoSrc={streaming.idleVideoSrc}
            isVideoPlaying={streaming.isVideoPlaying}
            isStreamReady={streaming.getConnectionStatus().status === 'connected'}
          />
        </div>

        {/* Main Interface */}
        <div className="relative z-10 min-h-screen">
          {/* Minimal Top Status */}
          <div className="absolute top-4 left-4 flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${connectionStatus.isConnected ? 'bg-green-500' : 'bg-gray-500'}`}></div>
            <span className="text-white/80 text-sm">D-ID Assistant</span>
            {streaming.isVideoPlaying && (
              <div className="flex items-center space-x-1 bg-red-500/20 px-2 py-1 rounded text-xs text-red-400">
                <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse"></div>
                <span>LIVE</span>
              </div>
            )}
          </div>

          {/* Compact Chat Interface */}
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 w-full max-w-sm md:max-w-md mx-4 md:mx-0">
            {/* Toggle Button (when minimized) */}
            {!isInterfaceOpen && (
              <div className="mb-2 flex justify-end">
                <button
                  onClick={toggleInterface}
                  className="p-3 bg-black/60 backdrop-blur-sm border border-white/20 text-white rounded-full hover:bg-black/80 transition-all duration-200 shadow-lg"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </button>
              </div>
            )}

            {/* Main Chat Container */}
            <div className={`transition-all duration-300 ${isInterfaceOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
              }`}>
              <div className="bg-black/60 backdrop-blur-lg rounded-lg border border-white/20 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-white/10">
                  <div className="flex items-center space-x-2">
                    <span className="text-white text-sm font-medium">Chat</span>
                    <div className={`w-1.5 h-1.5 rounded-full ${connectionStatus.isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {/* Connection Controls */}
                    {!connectionStatus.isConnected ? (
                      <button
                        onClick={streaming.connect}
                        disabled={connectionStatus.isConnecting}
                        className="px-3 py-1 bg-green-500/20 border border-green-500/30 text-green-400 rounded text-xs hover:bg-green-500/30 disabled:opacity-50 flex items-center space-x-1"
                      >
                        {connectionStatus.isConnecting ? (
                          <>
                            <div className="w-2 h-2 border border-green-400/50 border-t-green-400 rounded-full animate-spin"></div>
                            <span>Connecting...</span>
                          </>
                        ) : (
                          <span>Connect</span>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={streaming.disconnect}
                        className="px-3 py-1 bg-red-500/20 border border-red-500/30 text-red-400 rounded text-xs hover:bg-red-500/30"
                      >
                        Disconnect
                      </button>
                    )}
                    <button
                      onClick={toggleInterface}
                      className="p-1 text-white/60 hover:text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Chat Interface with Integrated Voice */}
                <div className="p-3">
                  <ChatInterface
                    messages={conversation.messages}
                    onSendMessage={handleSendMessage}
                    isLoading={conversation.isLoading}
                    disabled={!streaming.isReady()}
                    placeholder={streaming.isReady() ? "Type your message..." : "Connect to start"}
                    voiceRecording={voiceRecording}
                    onVoiceTranscription={handleVoiceTranscription}
                  />
                </div>

                {/* Clear Button */}
                {conversation.messages.length > 0 && (
                  <div className="px-3 pb-3">
                    <button
                      onClick={conversation.clearConversation}
                      className="w-full px-3 py-1 bg-white/5 border border-white/10 text-white/60 rounded text-xs hover:bg-white/10 hover:text-white/80 transition-all"
                    >
                      Clear Chat
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {(conversation.error || voiceRecording.error) && (
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 max-w-sm w-full mx-4">
              <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/20 rounded-lg p-3 animate-in slide-in-from-top duration-200">
                <div className="flex items-start space-x-2">
                  <div className="text-red-500 text-sm">⚠</div>
                  <div className="flex-1">
                    <p className="text-red-400 text-xs">
                      {conversation.error || voiceRecording.error}
                    </p>
                    <button
                      onClick={() => {
                        conversation.clearError();
                        voiceRecording.clearError();
                      }}
                      className="mt-1 text-xs text-red-400/80 hover:text-red-400 underline"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
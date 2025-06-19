import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { DidClient } from '@/services/didClient';
import { ConnectionState } from '@/types/did';
import { ApiConfig } from '@/types/api';

export interface StreamingState {
  connectionState: ConnectionState;
  streamVideo: MediaStream | null;
  streamStatus: string;
  isVideoPlaying: boolean;
  isStreaming: boolean;
}

/**
 * Hook for managing D-ID streaming connection and video display
 */
export function useDidStreaming(config: ApiConfig | null) {
  const [state, setState] = useState<StreamingState>({
    connectionState: {
      isConnecting: false,
      isConnected: false,
      streamId: null,
      sessionId: null,
      error: null,
    },
    streamVideo: null,
    streamStatus: '',
    isVideoPlaying: false,
    isStreaming: false,
  });

  const didClientRef = useRef<DidClient | null>(null);
  const messageIndexRef = useRef(0);
  const lastStreamTimeRef = useRef<number>(0);

  /**
   * Initialize D-ID client when config changes
   */
  useEffect(() => {
    if (!config) return;
    didClientRef.current = new DidClient(config);
  }, [config]);

  /**
   * Set idle video source based on service type
   */
  const idleVideoSrc = useMemo(() => {
    if (!config) return null;
    return config.didService === 'clips'
      ? '/alex_v2_idle.mp4'
      : '/emma_idle.mp4';
  }, [config]);

  /**
   * Connects to D-ID streaming service
   */
  const connect = useCallback(async () => {
    if (!didClientRef.current) return;

    try {
      await didClientRef.current.connect({
        onConnectionStateChange: (connectionState) => {
          setState(prev => ({ ...prev, connectionState }));
        },
        onVideoTrack: (stream) => {
          setState(prev => ({
            ...prev,
            streamVideo: stream,
            isVideoPlaying: true,
          }));
        },
        onStreamEvent: (status) => {
          console.log('Stream event received:', status);
          
          // Log timing for debugging
          if (status === 'started') {
            console.log('Stream started at:', new Date().toISOString());
          } else if (status === 'done') {
            console.log('Stream completed at:', new Date().toISOString());
            const streamDuration = Date.now() - lastStreamTimeRef.current;
            console.log('Stream duration:', streamDuration + 'ms');
            
            // WORKAROUND: Add delay after stream completion to let ElevenLabs reset
            setTimeout(() => {
              console.log('ElevenLabs reset delay completed - ready for next message');
              // Force reset streaming state in case it gets stuck
              setState(prev => ({ ...prev, isStreaming: false }));
            }, 2000);
          }
          
          setState(prev => ({
            ...prev,
            streamStatus: status,
            isVideoPlaying: status === 'started' ? true : status === 'done' ? false : prev.isVideoPlaying,
            isStreaming: status === 'started' ? true : status === 'done' ? false : prev.isStreaming,
          }));
        },
      });
    } catch (error) {
      console.error('Failed to connect to D-ID:', error);
    }
  }, []);

  /**
   * Disconnects from D-ID streaming service
   */
  const disconnect = useCallback(() => {
    if (didClientRef.current) {
      didClientRef.current.disconnect();
    }

    setState(prev => ({
      ...prev,
      connectionState: {
        isConnecting: false,
        isConnected: false,
        streamId: null,
        sessionId: null,
        error: null,
      },
      streamVideo: null,
      isVideoPlaying: false,
      streamStatus: '',
      isStreaming: false,
    }));

    messageIndexRef.current = 0;
    lastStreamTimeRef.current = 0;
  }, []);

  /**
   * Sends text message for streaming
   */
  const sendTextMessage = useCallback(async (text: string) => {
    if (!didClientRef.current || !state.connectionState.isConnected) {
      throw new Error('Not connected to streaming service');
    }

    if (state.isStreaming) {
      throw new Error('Already streaming a message. Please wait for current stream to complete.');
    }

    try {
      lastStreamTimeRef.current = Date.now();
      
      // WORKAROUND: Use index 0 for all messages to treat each as "first" for ElevenLabs
      console.log('Sending message with index 0 (workaround for ElevenLabs)');
      didClientRef.current.sendTextMessage(text, 0);
      
      // Still increment our internal counter for logging
      messageIndexRef.current++;
    } catch (error) {
      console.error('Failed to send text message:', error);
      throw error;
    }
  }, [state.connectionState.isConnected, state.isStreaming]);

  /**
   * Checks if streaming service is ready to accept messages
   */
  const isReady = useCallback(() => {
    const ready = state.connectionState.isConnected && !state.connectionState.isConnecting && !state.isStreaming;
    console.log('isReady check:', {
      isConnected: state.connectionState.isConnected,
      isConnecting: state.connectionState.isConnecting,
      isStreaming: state.isStreaming,
      ready
    });
    return ready;
  }, [state.connectionState, state.isStreaming]);

  /**
   * Gets current connection status for UI display
   */
  const getConnectionStatus = useCallback(() => {
    const { isConnecting, isConnected, error } = state.connectionState;

    if (error) return { status: 'error', message: error };
    if (isConnecting) return { status: 'connecting', message: 'Connecting...' };
    if (isConnected) return { status: 'connected', message: 'Connected' };
    return { status: 'disconnected', message: 'Disconnected' };
  }, [state.connectionState]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (didClientRef.current) {
        didClientRef.current.disconnect();
      }
    };
  }, []);

  return {
    ...state,
    idleVideoSrc,
    connect,
    disconnect,
    sendTextMessage,
    isReady,
    getConnectionStatus,
  };
}
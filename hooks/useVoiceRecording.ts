import { useState, useCallback, useRef } from 'react';
import { DeepgramClient } from '@/services/deepgramClient';

export interface VoiceRecordingState {
  isRecording: boolean;
  isProcessing: boolean;
  error: string | null;
}

/**
 * Hook for managing voice recording and transcription
 */
export function useVoiceRecording(deepgramClient: DeepgramClient | null) {
  const [state, setState] = useState<VoiceRecordingState>({
    isRecording: false,
    isProcessing: false,
    error: null,
  });

  const recordingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Starts voice recording
   */
  const startRecording = useCallback(async () => {
    if (!deepgramClient) {
      setState(prev => ({
        ...prev,
        error: 'Deepgram client not initialized',
      }));
      return;
    }

    try {
      await deepgramClient.startRecording();
      setState(prev => ({
        ...prev,
        isRecording: true,
        error: null,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      setState(prev => ({
        ...prev,
        error: errorMessage,
      }));
      console.error('Failed to start recording:', error);
    }
  }, [deepgramClient]);

  /**
   * Stops voice recording and returns transcription
   */
  const stopRecording = useCallback(async (): Promise<string | null> => {
    if (!state.isRecording || !deepgramClient) return null;

    setState(prev => ({
      ...prev,
      isRecording: false,
      isProcessing: true,
    }));

    try {
      const transcription = await deepgramClient.stopRecording();
      setState(prev => ({
        ...prev,
        isProcessing: false,
      }));
      
      return transcription;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to process recording';
      setState(prev => ({
        ...prev,
        isProcessing: false,
        error: errorMessage,
      }));
      console.error('Failed to process recording:', error);
      return null;
    }
  }, [deepgramClient, state.isRecording]);

  /**
   * Handles mouse/touch down event for recording
   */
  const handleRecordStart = useCallback(async () => {
    await startRecording();
  }, [startRecording]);

  /**
   * Handles mouse/touch up event for stopping recording
   */
  const handleRecordStop = useCallback(async (): Promise<string | null> => {
    return await stopRecording();
  }, [stopRecording]);

  /**
   * Handles mouse leave event (stops recording if active)
   */
  const handleRecordCancel = useCallback(async (): Promise<string | null> => {
    if (state.isRecording) {
      return await stopRecording();
    }
    return null;
  }, [state.isRecording, stopRecording]);

  /**
   * Clears error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Sets maximum recording time limit
   */
  const setRecordingTimeout = useCallback((timeoutMs: number) => {
    if (recordingTimeoutRef.current) {
      clearTimeout(recordingTimeoutRef.current);
    }

    recordingTimeoutRef.current = setTimeout(() => {
      if (state.isRecording) {
        stopRecording();
      }
    }, timeoutMs);
  }, [state.isRecording, stopRecording]);

  return {
    ...state,
    startRecording,
    stopRecording,
    handleRecordStart,
    handleRecordStop,
    handleRecordCancel,
    clearError,
    setRecordingTimeout,
  };
}
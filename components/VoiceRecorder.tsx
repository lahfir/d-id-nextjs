'use client';

import { useCallback } from 'react';

interface VoiceRecorderProps {
  isRecording: boolean;
  isProcessing: boolean;
  onRecordStart: () => Promise<void>;
  onRecordStop: () => Promise<string | null>;
  onRecordCancel: () => Promise<string | null>;
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

/**
 * Component for voice recording with minimal design
 */
export function VoiceRecorder({
  isRecording,
  isProcessing,
  onRecordStart,
  onRecordStop,
  onRecordCancel,
  onTranscription,
  disabled = false,
}: VoiceRecorderProps) {

  /**
   * Handles recording start
   */
  const handleMouseDown = useCallback(async () => {
    if (disabled || isProcessing) return;
    await onRecordStart();
  }, [disabled, isProcessing, onRecordStart]);

  /**
   * Handles recording stop and processes transcription
   */
  const handleMouseUp = useCallback(async () => {
    if (!isRecording) return;

    const transcription = await onRecordStop();
    if (transcription) {
      onTranscription(transcription);
    }
  }, [isRecording, onRecordStop, onTranscription]);

  /**
   * Handles mouse leave (cancel recording)
   */
  const handleMouseLeave = useCallback(async () => {
    if (!isRecording) return;

    const transcription = await onRecordCancel();
    if (transcription) {
      onTranscription(transcription);
    }
  }, [isRecording, onRecordCancel, onTranscription]);

  /**
   * Gets button styling based on state
   */
  const getButtonClass = () => {
    const baseClass = "relative w-16 h-16 rounded-full transition-all duration-200 select-none flex items-center justify-center border";

    if (disabled || isProcessing) {
      return `${baseClass} bg-white/5 text-white/30 cursor-not-allowed border-white/10`;
    }

    if (isRecording) {
      return `${baseClass} bg-red-500/20 text-red-400 border-red-500/30 animate-pulse`;
    }

    return `${baseClass} bg-white/10 text-white border-white/20 hover:bg-white/20 hover:border-white/30 active:scale-95`;
  };

  /**
   * Gets button icon based on state
   */
  const getButtonIcon = () => {
    if (isProcessing) {
      return (
        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
      );
    }

    if (isRecording) {
      return (
        <div className="w-4 h-4 bg-red-400 rounded-sm"></div>
      );
    }

    return (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
      </svg>
    );
  };

  /**
   * Gets status text based on state
   */
  const getStatusText = () => {
    if (isProcessing) return 'Processing...';
    if (isRecording) return 'Release to send';
    return 'Hold to record';
  };

  /**
   * Gets status color based on state
   */
  const getStatusColor = () => {
    if (disabled || isProcessing) return 'text-white/40';
    if (isRecording) return 'text-red-400';
    return 'text-white/60';
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* Record Button */}
      <button
        className={getButtonClass()}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={disabled || isProcessing}
      >
        {getButtonIcon()}

        {/* Recording pulse effect */}
        {isRecording && (
          <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping"></div>
        )}
      </button>

      {/* Status Text */}
      <div className="text-center space-y-1">
        <p className={`text-xs font-medium transition-colors duration-200 ${getStatusColor()}`}>
          {getStatusText()}
        </p>

        {/* Instructions */}
        {!isRecording && !isProcessing && (
          <p className="text-xs text-white/40 max-w-xs">
            Hold and speak clearly
          </p>
        )}
      </div>

      {/* Recording Visualization */}
      {isRecording && (
        <div className="flex items-center space-x-1 animate-in fade-in duration-200">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-0.5 bg-red-400 rounded-full animate-pulse"
              style={{
                height: `${Math.random() * 12 + 6}px`,
                animationDelay: `${i * 0.1}s`,
                animationDuration: '0.6s'
              }}
            />
          ))}
        </div>
      )}

      {/* Processing Animation */}
      {isProcessing && (
        <div className="flex items-center space-x-2 animate-in fade-in duration-200">
          <div className="flex space-x-1">
            <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce"></div>
            <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-1 h-1 bg-white/60 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          </div>
          <span className="text-xs text-white/60">Processing...</span>
        </div>
      )}
    </div>
  );
}
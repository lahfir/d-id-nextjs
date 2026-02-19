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

export function VoiceRecorder({
  isRecording,
  isProcessing,
  onRecordStart,
  onRecordStop,
  onRecordCancel,
  onTranscription,
  disabled = false,
}: VoiceRecorderProps) {
  const handleMouseDown = useCallback(async () => {
    if (disabled || isProcessing) return;
    await onRecordStart();
  }, [disabled, isProcessing, onRecordStart]);

  const handleMouseUp = useCallback(async () => {
    if (!isRecording) return;
    const transcription = await onRecordStop();
    if (transcription) onTranscription(transcription);
  }, [isRecording, onRecordStop, onTranscription]);

  const handleMouseLeave = useCallback(async () => {
    if (!isRecording) return;
    const transcription = await onRecordCancel();
    if (transcription) onTranscription(transcription);
  }, [isRecording, onRecordCancel, onTranscription]);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Record Button */}
      <button
        className="relative w-16 h-16 rounded-full flex items-center justify-center select-none transition-all duration-200"
        style={{
          background: isRecording
            ? 'var(--danger-muted)'
            : disabled || isProcessing
              ? 'rgba(255,255,255,0.03)'
              : 'var(--copper-glow)',
          border: isRecording
            ? '2px solid rgba(248, 113, 113, 0.4)'
            : `2px solid ${disabled || isProcessing ? 'var(--border-subtle)' : 'var(--border-copper)'}`,
          color: isRecording
            ? 'var(--danger)'
            : disabled || isProcessing
              ? 'var(--text-muted)'
              : 'var(--copper)',
          cursor: disabled || isProcessing ? 'not-allowed' : 'pointer',
          boxShadow: isRecording ? '0 0 20px rgba(248, 113, 113, 0.2)' : 'var(--glow-copper-sm)',
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleMouseDown}
        onTouchEnd={handleMouseUp}
        disabled={disabled || isProcessing}
      >
        {isProcessing ? (
          <div className="w-5 h-5 rounded-full animate-spin" style={{
            border: '2px solid var(--border-subtle)',
            borderTopColor: 'var(--copper)',
          }} />
        ) : isRecording ? (
          <div className="w-5 h-5 rounded-sm" style={{ background: 'var(--danger)' }} />
        ) : (
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
          </svg>
        )}

        {isRecording && (
          <div className="absolute inset-0 rounded-full animate-pulse-copper" />
        )}
      </button>

      {/* Status */}
      <div className="text-center space-y-1">
        <p className="text-xs font-medium" style={{
          color: isRecording ? 'var(--danger)' : disabled || isProcessing ? 'var(--text-muted)' : 'var(--text-secondary)',
        }}>
          {isProcessing ? 'Processing...' : isRecording ? 'Release to send' : 'Hold to record'}
        </p>
        {!isRecording && !isProcessing && (
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Hold and speak clearly</p>
        )}
      </div>

      {/* Waveform */}
      {isRecording && (
        <div className="flex items-end gap-0.5 animate-fade-in">
          {[10, 16, 8, 20, 12, 18, 14].map((h, i) => (
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
      )}

      {/* Processing dots */}
      {isProcessing && (
        <div className="flex items-center gap-2 animate-fade-in">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full animate-breathe"
                style={{ background: 'var(--copper)', animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Processing...</span>
        </div>
      )}
    </div>
  );
}
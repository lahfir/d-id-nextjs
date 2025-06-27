'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoDisplayProps {
  streamVideo: MediaStream | null;
  idleVideoSrc: string | null;
  isVideoPlaying: boolean;
  isStreamReady: boolean;
}

/**
 * Component for displaying D-ID streaming video as full-screen background
 */
export function VideoDisplay({
  streamVideo,
  idleVideoSrc,
  isVideoPlaying,
  isStreamReady
}: VideoDisplayProps) {
  const streamVideoRef = useRef<HTMLVideoElement>(null);
  const idleVideoRef = useRef<HTMLVideoElement>(null);
  const [fallbackVideoSrc, setFallbackVideoSrc] = useState<string | null>(null);
  const [idleLoading, setIdleLoading] = useState(false);
  const [idleProgress, setIdleProgress] = useState(0);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Set up stream video when available
   */
  useEffect(() => {
    if (streamVideoRef.current && streamVideo) {
      streamVideoRef.current.srcObject = streamVideo;
      streamVideoRef.current.muted = !isStreamReady;

      // Safari compatibility - handle play errors gracefully
      if (streamVideoRef.current.paused) {
        streamVideoRef.current.play().catch((error) => {
          // Ignore AbortError which happens when quickly switching between streams
          if (error.name !== 'AbortError') {
            console.error('Video play error:', error);
          }
        });
      }
    }
  }, [streamVideo, isStreamReady]);

  /**
   * Calculate video opacity based on stream state
   * - Show stream video only when actively playing
   * - Show idle video when connected but not streaming, or when not connected at all
   */
  const showStreamVideo = isVideoPlaying && isStreamReady;
  const showIdleVideo = !showStreamVideo;

  const streamOpacity = showStreamVideo ? 1 : 0;
  const idleOpacity = showIdleVideo ? 1 : 0;

  /**
   * Handle idle video playback
   */
  useEffect(() => {
    // Reset fallback when idleVideoSrc changes
    setFallbackVideoSrc(null);
  }, [idleVideoSrc]);

  useEffect(() => {
    if (idleVideoRef.current && (idleVideoSrc || fallbackVideoSrc) && showIdleVideo) {
      const video = idleVideoRef.current;
      const videoSource = fallbackVideoSrc || idleVideoSrc;

      const handleLoadStart = () => {
        setIdleLoading(true);
        setIdleProgress(0);

        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = setInterval(() => {
          setIdleProgress(prev => (prev < 90 ? prev + 1 : prev));
        }, 200);
      };

      const handleProgress = () => {
        if (!video.duration || isNaN(video.duration)) return;
        const bufferedEnd = video.buffered.length ? video.buffered.end(video.buffered.length - 1) : 0;
        const percent = Math.min(100, (bufferedEnd / video.duration) * 100);
        setIdleProgress(percent);
      };

      const handleCanPlay = () => {
        setIdleLoading(false);
        setIdleProgress(100);

        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      };

      const onError = () => {
        console.warn('Idle video failed to load:', videoSource);

        // If original video failed and we're not already using fallback, try fallback
        if (!fallbackVideoSrc && idleVideoSrc && idleVideoSrc.startsWith('http')) {
          console.log('Trying fallback local video...');
          setFallbackVideoSrc('/alex_v2_idle.mp4'); // Default fallback
        }
      };

      video.addEventListener('error', onError);
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('progress', handleProgress);
      video.addEventListener('canplaythrough', handleCanPlay);

      video.play().catch((error) => {
        if (error.name !== 'AbortError') {
          console.warn('Idle video play failed:', error.message);
        }
      });

      return () => {
        video.removeEventListener('error', onError);
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('progress', handleProgress);
        video.removeEventListener('canplaythrough', handleCanPlay);

        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      };
    }
  }, [idleVideoSrc, fallbackVideoSrc, showIdleVideo]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-gray-900">
      {/* Idle Video */}
      {(idleVideoSrc || fallbackVideoSrc) && (
        <video
          ref={idleVideoRef}
          src={fallbackVideoSrc || idleVideoSrc || undefined}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out"
          style={{ opacity: idleOpacity }}
          autoPlay
          loop
          muted
          playsInline
        />
      )}

      {/* Stream Video */}
      <video
        ref={streamVideoRef}
        className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out"
        style={{ opacity: streamOpacity }}
        autoPlay
        playsInline
      />

      {/* Initialization overlay */}
      {idleLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin mx-auto"></div>
            <div className="text-gray-400 text-sm">Downloading {idleProgress.toFixed(0)}%</div>
          </div>
        </div>
      )}

      {/* Initialization overlay */}
      {!isStreamReady && !idleLoading && !idleVideoSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin mx-auto"></div>
            <div className="text-gray-400 text-sm">
              Loading video...
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
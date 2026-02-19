'use client';

import { createLogger } from '@/lib/utils/logger';
import { useEffect, useRef, useState } from 'react';
import { usePresenter } from '@/contexts/PresenterContext';

const log = createLogger('VideoDisplay');

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
  const { serviceType, customAnimationUrl } = usePresenter();
  const streamVideoRef = useRef<HTMLVideoElement>(null);
  const idleVideoRef = useRef<HTMLVideoElement>(null);
  const animationVideoRef = useRef<HTMLVideoElement>(null);
  const [fallbackVideoSrc, setFallbackVideoSrc] = useState<string | null>(null);
  const [idleLoading, setIdleLoading] = useState(false);
  const [idleProgress, setIdleProgress] = useState(0);
  const [animationLoading, setAnimationLoading] = useState(false);
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
            log.error('Video play error', { error: String(error) });
          }
        });
      }
    }
  }, [streamVideo, isStreamReady]);

  /**
   * Calculate video opacity based on stream state and service type
   * - Show stream video when actively playing
   * - Show custom animation for talks mode when not streaming (if available)
   * - Show default idle video as fallback
   */
  const showStreamVideo = isVideoPlaying && isStreamReady;
  const showCustomAnimation = !showStreamVideo && serviceType === 'talks' && customAnimationUrl;
  const showIdleVideo = !showStreamVideo && !showCustomAnimation;

  const streamOpacity = showStreamVideo ? 1 : 0;
  const customAnimationOpacity = showCustomAnimation ? 1 : 0;
  const idleOpacity = showIdleVideo ? 1 : 0;

  /**
   * Handle idle video playback
   */
  useEffect(() => {
    // Reset fallback when idleVideoSrc changes
    setFallbackVideoSrc(null);
  }, [idleVideoSrc]);

  /**
   * Handle custom animation video playback
   */
  useEffect(() => {
    if (animationVideoRef.current && customAnimationUrl && showCustomAnimation) {
      const video = animationVideoRef.current;
      
      const handleLoadStart = () => {
        setAnimationLoading(true);
      };

      const handleCanPlay = () => {
        setAnimationLoading(false);
      };

      const onError = () => {
        log.warn('Custom animation video failed to load', { url: customAnimationUrl });
        setAnimationLoading(false);
      };

      video.addEventListener('error', onError);
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('canplaythrough', handleCanPlay);

      video.play().catch((error) => {
        if (error.name !== 'AbortError') {
          log.warn('Custom animation video play failed', { error: error.message });
        }
      });

      return () => {
        video.removeEventListener('error', onError);
        video.removeEventListener('loadstart', handleLoadStart);
        video.removeEventListener('canplaythrough', handleCanPlay);
      };
    }
  }, [customAnimationUrl, showCustomAnimation]);

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
        log.warn('Idle video failed to load', { videoSource });

        // If original video failed and we're not already using fallback, try fallback
        if (!fallbackVideoSrc && idleVideoSrc && idleVideoSrc.startsWith('http')) {
          log.info('Trying fallback local video...');
          setFallbackVideoSrc('/alex_v2_idle.mp4'); // Default fallback
        }
      };

      video.addEventListener('error', onError);
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('progress', handleProgress);
      video.addEventListener('canplaythrough', handleCanPlay);

      video.play().catch((error) => {
        if (error.name !== 'AbortError') {
          log.warn('Idle video play failed', { error: error.message });
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
      {/* Custom Animation Video (for talks mode) */}
      {customAnimationUrl && (
        <video
          ref={animationVideoRef}
          src={customAnimationUrl}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ease-in-out"
          style={{ opacity: customAnimationOpacity }}
          autoPlay
          loop
          muted
          playsInline
        />
      )}

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

      {/* Custom animation loading overlay */}
      {animationLoading && showCustomAnimation && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin mx-auto"></div>
            <div className="text-gray-400 text-sm">Loading custom animation...</div>
          </div>
        </div>
      )}

      {/* Idle loading overlay */}
      {idleLoading && showIdleVideo && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
          <div className="text-center space-y-3">
            <div className="w-8 h-8 border-2 border-gray-600 border-t-white rounded-full animate-spin mx-auto"></div>
            <div className="text-gray-400 text-sm">Downloading {idleProgress.toFixed(0)}%</div>
          </div>
        </div>
      )}

      {/* General loading overlay */}
      {!isStreamReady && !idleLoading && !animationLoading && !idleVideoSrc && !customAnimationUrl && (
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
'use client';

import { useEffect, useRef } from 'react';

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
    console.log('VideoDisplay state:', {
      idleVideoSrc,
      isVideoPlaying,
      isStreamReady,
      showIdleVideo,
      streamOpacity,
      idleOpacity
    });

    if (idleVideoRef.current && idleVideoSrc && showIdleVideo) {
      console.log('Attempting to play idle video:', idleVideoSrc);

      // Add event listeners for debugging
      const video = idleVideoRef.current;

      const onLoadedData = () => console.log('Idle video loaded successfully');
      const onError = (e: Event) => console.error('Idle video load error:', e);
      const onCanPlay = () => console.log('Idle video can play');

      video.addEventListener('loadeddata', onLoadedData);
      video.addEventListener('error', onError);
      video.addEventListener('canplay', onCanPlay);

      video.play().catch((error) => {
        if (error.name !== 'AbortError') {
          console.error('Idle video play error:', error);
        }
      });

      return () => {
        video.removeEventListener('loadeddata', onLoadedData);
        video.removeEventListener('error', onError);
        video.removeEventListener('canplay', onCanPlay);
      };
    }
  }, [idleVideoSrc, showIdleVideo]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-gray-900">
      {/* Idle Video */}
      {idleVideoSrc && (
        <video
          ref={idleVideoRef}
          src={idleVideoSrc}
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
      {!isStreamReady && !idleVideoSrc && (
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
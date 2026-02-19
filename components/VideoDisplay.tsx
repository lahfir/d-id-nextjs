'use client';

import { useEffect, useRef, useState } from 'react';
import { usePresenter } from '@/contexts/PresenterContext';

interface VideoDisplayProps {
  streamVideo: MediaStream | null;
  idleVideoSrc: string | null;
  isVideoPlaying: boolean;
  isStreamReady: boolean;
}

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

  useEffect(() => {
    if (streamVideoRef.current && streamVideo) {
      streamVideoRef.current.srcObject = streamVideo;
      streamVideoRef.current.muted = !isStreamReady;
      if (streamVideoRef.current.paused) {
        streamVideoRef.current.play().catch((error) => {
          if (error.name !== 'AbortError') console.error('Video play error:', error);
        });
      }
    }
  }, [streamVideo, isStreamReady]);

  const showStreamVideo = isVideoPlaying && isStreamReady;
  const showCustomAnimation = !showStreamVideo && serviceType === 'talks' && customAnimationUrl;
  const showIdleVideo = !showStreamVideo && !showCustomAnimation;

  const streamOpacity = showStreamVideo ? 1 : 0;
  const customAnimationOpacity = showCustomAnimation ? 1 : 0;
  const idleOpacity = showIdleVideo ? 1 : 0;

  useEffect(() => {
    setFallbackVideoSrc(null);
  }, [idleVideoSrc]);

  useEffect(() => {
    if (animationVideoRef.current && customAnimationUrl && showCustomAnimation) {
      const video = animationVideoRef.current;
      const handleLoadStart = () => setAnimationLoading(true);
      const handleCanPlay = () => setAnimationLoading(false);
      const onError = () => {
        console.warn('Custom animation video failed to load:', customAnimationUrl);
        setAnimationLoading(false);
      };
      video.addEventListener('error', onError);
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('canplaythrough', handleCanPlay);
      video.play().catch((error) => {
        if (error.name !== 'AbortError') console.warn('Custom animation video play failed:', error.message);
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
        console.warn('Idle video failed to load:', videoSource);
        if (!fallbackVideoSrc && idleVideoSrc && idleVideoSrc.startsWith('http')) {
          console.log('Trying fallback local video...');
          setFallbackVideoSrc('/alex_v2_idle.mp4');
        }
      };
      video.addEventListener('error', onError);
      video.addEventListener('loadstart', handleLoadStart);
      video.addEventListener('progress', handleProgress);
      video.addEventListener('canplaythrough', handleCanPlay);
      video.play().catch((error) => {
        if (error.name !== 'AbortError') console.warn('Idle video play failed:', error.message);
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

  const LoadingOverlay = ({ message }: { message: string }) => (
    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center animate-fade-in">
        <div className="relative w-14 h-14 mx-auto mb-5">
          <div className="absolute inset-0 rounded-full animate-spin" style={{
            border: '2px solid var(--border-subtle)',
            borderTopColor: 'var(--copper)',
          }} />
          <div className="absolute inset-2.5 rounded-full animate-spin" style={{
            border: '2px solid transparent',
            borderTopColor: 'var(--copper-light)',
            animationDirection: 'reverse',
            animationDuration: '0.8s',
          }} />
        </div>
        <p className="text-sm font-medium" style={{ color: 'var(--text-tertiary)' }}>{message}</p>
        {idleLoading && (
          <div className="mt-3 w-48 mx-auto">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${idleProgress}%`,
                  background: 'linear-gradient(90deg, var(--copper-dark), var(--copper))',
                }}
              />
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{idleProgress.toFixed(0)}%</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* Vignette overlay for cinematic feel */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at center, transparent 40%, var(--bg-primary) 100%)',
        zIndex: 10,
        opacity: 0.6,
      }} />

      {/* Custom Animation Video (talks mode) */}
      {customAnimationUrl && (
        <video
          ref={animationVideoRef}
          src={customAnimationUrl}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: customAnimationOpacity, transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
          autoPlay loop muted playsInline
        />
      )}

      {/* Idle Video */}
      {(idleVideoSrc || fallbackVideoSrc) && (
        <video
          ref={idleVideoRef}
          src={fallbackVideoSrc || idleVideoSrc || undefined}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity: idleOpacity, transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
          autoPlay loop muted playsInline
        />
      )}

      {/* Stream Video */}
      <video
        ref={streamVideoRef}
        className="absolute inset-0 w-full h-full object-cover"
        style={{ opacity: streamOpacity, transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)' }}
        autoPlay playsInline
      />

      {/* Loading overlays */}
      {animationLoading && showCustomAnimation && <LoadingOverlay message="Loading animation..." />}
      {idleLoading && showIdleVideo && <LoadingOverlay message="Loading presenter..." />}
      {!isStreamReady && !idleLoading && !animationLoading && !idleVideoSrc && !customAnimationUrl && (
        <LoadingOverlay message="Preparing video..." />
      )}
    </div>
  );
}
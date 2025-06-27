'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { PresenterConfig, ClipsPresenter } from '@/types/did';
import { PRESENTER_CONFIG } from '@/lib/utils/constants';

interface PresenterContextType {
  serviceType: 'talks' | 'clips';
  presenterConfig: PresenterConfig;
  idleVideoUrl: string | null;
  customAnimationUrl: string | null;
  setTalksMode: (imageUrl?: string, animationUrl?: string) => void;
  setClipsMode: (presenter: ClipsPresenter) => void;
  resetToDefault: () => void;
  onModeChange?: () => void; // Callback for when mode changes (for disconnecting)
  setOnModeChange: (callback: () => void) => void;
}

const PresenterContext = createContext<PresenterContextType | undefined>(undefined);

interface PresenterProviderProps {
  children: ReactNode;
}

export function PresenterProvider({ children }: PresenterProviderProps) {
  const [serviceType, setServiceType] = useState<'talks' | 'clips'>('talks');
  const [presenterConfig, setPresenterConfig] = useState<PresenterConfig>(PRESENTER_CONFIG);
  const [idleVideoUrl, setIdleVideoUrl] = useState<string | null>(null);
  const [customAnimationUrl, setCustomAnimationUrl] = useState<string | null>(null);
  const [onModeChangeCallback, setOnModeChangeCallback] = useState<(() => void) | undefined>();

  const setTalksMode = useCallback((imageUrl?: string, animationUrl?: string) => {
    // Trigger disconnect before changing mode
    if (onModeChangeCallback) {
      onModeChangeCallback();
    }

    setServiceType('talks');
    setPresenterConfig(prev => ({
      ...prev,
      talks: {
        source_url: imageUrl || PRESENTER_CONFIG.talks.source_url,
      },
    }));
    setIdleVideoUrl(null); // Use default idle video for talks
    setCustomAnimationUrl(animationUrl || null); // Set custom animation for idle
  }, [onModeChangeCallback]);

  const setClipsMode = useCallback((presenter: ClipsPresenter) => {
    // Trigger disconnect before changing mode
    if (onModeChangeCallback) {
      onModeChangeCallback();
    }

    setServiceType('clips');
    setPresenterConfig(prev => ({
      ...prev,
      clips: {
        presenter_id: presenter.presenter_id,
        driver_id: presenter.driver_id || 'e3nbserss8',
      },
    }));
    setIdleVideoUrl(presenter.idle_video || presenter.talking_preview_url || presenter.video_url || null);
  }, [onModeChangeCallback]);


  const resetToDefault = useCallback(() => {
    setServiceType('talks');
    setPresenterConfig(PRESENTER_CONFIG);
    setIdleVideoUrl(null);
    setCustomAnimationUrl(null);
  }, []);

  const setOnModeChange = useCallback((callback: () => void) => {
    setOnModeChangeCallback(() => callback);
  }, []);

  const value: PresenterContextType = {
    serviceType,
    presenterConfig,
    idleVideoUrl,
    customAnimationUrl,
    setTalksMode,
    setClipsMode,
    resetToDefault,
    onModeChange: onModeChangeCallback,
    setOnModeChange,
  };

  return (
    <PresenterContext.Provider value={value}>
      {children}
    </PresenterContext.Provider>
  );
}

export function usePresenter() {
  const context = useContext(PresenterContext);
  if (context === undefined) {
    throw new Error('usePresenter must be used within a PresenterProvider');
  }
  return context;
}
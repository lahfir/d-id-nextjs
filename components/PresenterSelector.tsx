'use client';

import { createLogger } from '@/lib/utils/logger';
import { useState, useEffect, useCallback } from 'react';
import { ClipsPresenter } from '@/types/did';
import { usePresenter } from '@/contexts/PresenterContext';
import { AnimationService } from '@/lib/services/animationService';
import Image from 'next/image';

const log = createLogger('PresenterSelector');

interface AnimationCache {
  id: string;
  sourceUrl: string;
  resultUrl: string | null;
  status: 'created' | 'started' | 'done' | 'error';
  createdAt: string;
  localPath?: string;
}

interface PresenterSelectorProps {
  onClose: () => void;
}

export function PresenterSelector({ onClose }: PresenterSelectorProps) {
  const { serviceType, presenterConfig, setTalksMode, setClipsMode, resetToDefault } = usePresenter();
  const [mode, setMode] = useState<'clips' | 'talks'>(serviceType);
  const [presenters, setPresenters] = useState<ClipsPresenter[]>([]);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState(presenterConfig.talks.source_url);
  const [selectedPresenter, setSelectedPresenter] = useState<string | null>(
    serviceType === 'clips' ? presenterConfig.clips.presenter_id : null
  );

  // Animation states for talks tab
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState<string>('');
  const [cachedAnimations, setCachedAnimations] = useState<AnimationCache[]>([]);

  useEffect(() => {
    if (mode === 'clips') {
      fetchPresenters();
    } else if (mode === 'talks') {
      loadCachedAnimations();
    }
  }, [mode]);

  const loadCachedAnimations = () => {
    const cached = AnimationService.getAllCached();
    const completedAnimations = cached.filter(
      (animation) => animation.status === 'done' && animation.resultUrl
    );
    setCachedAnimations(completedAnimations);
  };

  const fetchPresenters = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/presenters');
      if (!response.ok) throw new Error('Failed to fetch presenters');
      const data = await response.json();
      // Deduplicate presenters by presenter_id
      const uniquePresenters = data.presenters?.reduce((acc: ClipsPresenter[], presenter: ClipsPresenter) => {
        if (!acc.some(p => p.presenter_id === presenter.presenter_id)) {
          acc.push(presenter);
        }
        return acc;
      }, []) || [];
      setPresenters(uniquePresenters);
    } catch (err) {
      setError('Failed to load presenters. Please try again.');
      log.error('Error fetching presenters', { error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const handlePresenterSelect = (presenter: ClipsPresenter) => {
    setSelectedPresenter(presenter.presenter_id);
    setClipsMode(presenter);
    onClose();
  };

  const handleTalksSubmit = () => {
    setTalksMode(customImageUrl);
    onClose();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setCustomImageUrl('');
      setError(null);
    }
  };

  const handleUrlPreview = (url: string) => {
    setCustomImageUrl(url);
    if (url) {
      setPreviewUrl(url);
      setSelectedFile(null);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleCachedAnimationSelect = (animation: AnimationCache) => {
    setTalksMode(animation.sourceUrl, animation.resultUrl || undefined);
    onClose();
  };

  const handleCreateAnimation = async () => {
    if (!selectedFile && !customImageUrl) {
      setError('Please select an image or provide a URL');
      return;
    }

    setAnimating(true);
    setError(null);
    setAnimationProgress('Preparing...');

    try {
      let sourceUrl = customImageUrl;

      if (selectedFile) {
        setAnimationProgress('Uploading image...');
        const uploadResult = await AnimationService.uploadImage(selectedFile);
        sourceUrl = uploadResult.url;
      }

      const existing = AnimationService.findCachedAnimation(sourceUrl);
      if (existing && existing.resultUrl) {
        setAnimationProgress('Using cached animation...');
        setTalksMode(sourceUrl, existing.resultUrl);
        onClose();
        return;
      }

      setAnimationProgress('Creating animation...');
      const animationRequest = {
        source_url: sourceUrl,
        config: {
          stitch: true,
        },
      };

      const animation = await AnimationService.createAnimation(animationRequest);

      if (animation.status === 'done') {
        setAnimationProgress('Animation ready!');
        setTalksMode(sourceUrl, animation.result_url || undefined);
        onClose();
        return;
      }

      setAnimationProgress('Processing animation...');
      const finalAnimation = await AnimationService.pollAnimation(
        animation.id,
        (update) => {
          if (update.status === 'started') {
            setAnimationProgress('Animation in progress...');
          }
        }
      );

      if (finalAnimation.status === 'done' && finalAnimation.result_url) {
        setAnimationProgress('Animation complete!');
        loadCachedAnimations(); // Refresh cached animations
        setTalksMode(sourceUrl, finalAnimation.result_url);
        onClose();
      } else if (finalAnimation.status === 'error') {
        throw new Error(finalAnimation.error?.description || 'Animation failed');
      } else {
        throw new Error('Animation failed to complete');
      }

    } catch (err) {
      log.error('Animation creation error', { error: String(err) });
      setError(err instanceof Error ? err.message : 'Failed to create animation');
    } finally {
      setAnimating(false);
      setAnimationProgress('');
    }
  };

  const handleDefaultSelect = () => {
    resetToDefault();
    onClose();
  };

  const handleMouseEnter = useCallback((id: string) => {
    setHoveredId(id);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredId(null);
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden border border-white/20">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-semibold text-white">Select Presenter</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setMode('clips')}
            className={`px-4 py-2 rounded-lg transition-all ${mode === 'clips'
              ? 'bg-white/20 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
          >
            Clips
          </button>
          <button
            onClick={() => setMode('talks')}
            className={`px-4 py-2 rounded-lg transition-all ${mode === 'talks'
              ? 'bg-white/20 text-white'
              : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
          >
            Talks
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(80vh-200px)]">
          {mode === 'clips' ? (
            <div>
              {loading && (
                <div className="text-center py-8 text-white/60">
                  Loading presenters...
                </div>
              )}

              {error && (
                <div className="text-center py-8 text-red-400">
                  {error}
                </div>
              )}

              {!loading && !error && (
                <>
                  {/* Default Option */}
                  <div className="mb-4">
                    <button
                      onClick={handleDefaultSelect}
                      className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-left"
                    >
                      <h3 className="text-white font-medium mb-1">Default Presenter</h3>
                      <p className="text-white/60 text-sm">Use the default Alex presenter</p>
                    </button>
                  </div>

                  {/* Presenters Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {presenters.map((presenter) => (
                      <button
                        key={presenter.presenter_id}
                        onClick={() => handlePresenterSelect(presenter)}
                        onMouseEnter={() => handleMouseEnter(presenter.presenter_id)}
                        onMouseLeave={handleMouseLeave}
                        className={`group relative overflow-hidden rounded-lg bg-white/5 hover:bg-white/10 transition-all ${selectedPresenter === presenter.presenter_id ? 'ring-2 ring-white' : ''
                          }`}
                      >
                        <div className="aspect-square relative">
                          {presenter.thumbnail_url || presenter.preview_url ? (
                            <Image
                              src={presenter.thumbnail_url || presenter.preview_url || ''}
                              alt={presenter.name}
                              className="w-full h-full object-cover"
                              width={100}
                              height={100}
                            />
                          ) : (
                            <div className="w-full h-full bg-white/10 flex items-center justify-center">
                              <span className="text-white/40 text-4xl">{presenter.name[0]}</span>
                            </div>
                          )}
                          {hoveredId === presenter.presenter_id && (presenter.talking_preview_url || presenter.video_url) && (
                            <video
                              src={presenter.talking_preview_url || presenter.video_url}
                              className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                              autoPlay
                              loop
                              muted
                              playsInline
                              preload="none"
                              onLoadedData={(e) => {
                                (e.target as HTMLVideoElement).currentTime = 0;
                              }}
                            />
                          )}
                        </div>
                        <div className="p-3">
                          <h4 className="text-white text-sm font-medium truncate">{presenter.name}</h4>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Default Option */}
              <button
                onClick={handleDefaultSelect}
                className="w-full p-4 bg-white/5 hover:bg-white/10 rounded-lg transition-all text-left"
              >
                <h3 className="text-white font-medium mb-1">Default Image</h3>
                <p className="text-white/60 text-sm">Use the default presenter image</p>
              </button>

              {/* Error Display */}
              {error && (
                <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                  {error}
                </div>
              )}

              {/* Image Source Selection */}
              <div className="space-y-4">
                <h4 className="text-white font-medium">Select Image Source</h4>

                {/* File Upload */}
                <div>
                  <label className="block text-white/80 mb-2 text-sm">Upload Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="w-full px-4 py-2 bg-white/10 rounded-lg text-white file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:bg-white/20 file:text-white hover:file:bg-white/30"
                  />
                </div>

                {/* URL Input */}
                <div>
                  <label className="block text-white/80 mb-2 text-sm">Or Enter Image URL</label>
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => handleUrlPreview(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                    className="w-full px-4 py-2 bg-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              </div>

              {/* Preview */}
              {previewUrl && (
                <div>
                  <h4 className="text-white mb-2">Preview:</h4>
                  <div className="relative w-32 h-32 rounded-lg overflow-hidden bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        setError('Failed to load image preview');
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleTalksSubmit}
                  disabled={!customImageUrl && !selectedFile}
                  className="flex-1 px-6 py-2 bg-white/20 hover:bg-white/30 disabled:bg-white/5 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                >
                  Apply Image
                </button>
                <button
                  onClick={handleCreateAnimation}
                  disabled={(!selectedFile && !customImageUrl) || animating}
                  className="flex-1 px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                >
                  {animating ? 'Creating...' : 'Create Animation'}
                </button>
              </div>

              {/* Progress */}
              {animationProgress && (
                <div className="text-center">
                  <div className="text-white/80 text-sm mb-2">{animationProgress}</div>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                </div>
              )}

              {/* Cached Animations Section */}
              {cachedAnimations.length > 0 && (
                <div className="mt-6 pt-6 border-t border-white/10">
                  <h4 className="text-white font-medium mb-4">Your Animations</h4>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {cachedAnimations.map((animation) => (
                      <div key={animation.id} className="flex-shrink-0">
                        <button
                          onClick={() => handleCachedAnimationSelect(animation)}
                          className="group relative w-24 h-24 rounded-lg overflow-hidden bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-white/20"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={animation.sourceUrl}
                            alt="Cached animation"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="text-white text-xs font-medium">Select</div>
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                            <div className="text-white text-xs truncate">
                              {new Date(animation.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-white/60 text-xs mt-2">Click any animation to reuse it</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
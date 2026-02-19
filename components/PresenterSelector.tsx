'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipsPresenter } from '@/types/did';
import { usePresenter } from '@/contexts/PresenterContext';
import { AnimationService } from '@/lib/services/animationService';
import Image from 'next/image';

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [animationProgress, setAnimationProgress] = useState<string>('');
  const [cachedAnimations, setCachedAnimations] = useState<AnimationCache[]>([]);

  useEffect(() => {
    if (mode === 'clips') fetchPresenters();
    else if (mode === 'talks') loadCachedAnimations();
  }, [mode]);

  const loadCachedAnimations = () => {
    const cached = AnimationService.getAllCached();
    setCachedAnimations(cached.filter(a => a.status === 'done' && a.resultUrl));
  };

  const fetchPresenters = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/presenters');
      if (!response.ok) throw new Error('Failed to fetch presenters');
      const data = await response.json();
      const uniquePresenters = data.presenters?.reduce((acc: ClipsPresenter[], presenter: ClipsPresenter) => {
        if (!acc.some(p => p.presenter_id === presenter.presenter_id)) acc.push(presenter);
        return acc;
      }, []) || [];
      setPresenters(uniquePresenters);
    } catch (err) {
      setError('Failed to load presenters. Please try again.');
      console.error('Error fetching presenters:', err);
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
      if (file.size > 10 * 1024 * 1024) { setError('File size must be less than 10MB'); return; }
      if (!file.type.startsWith('image/')) { setError('Please select an image file'); return; }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setCustomImageUrl('');
      setError(null);
    }
  };

  const handleUrlPreview = (url: string) => {
    setCustomImageUrl(url);
    setPreviewUrl(url || null);
    if (url) setSelectedFile(null);
  };

  const handleCachedAnimationSelect = (animation: AnimationCache) => {
    setTalksMode(animation.sourceUrl, animation.resultUrl || undefined);
    onClose();
  };

  const handleCreateAnimation = async () => {
    if (!selectedFile && !customImageUrl) { setError('Please select an image or provide a URL'); return; }
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
      const animation = await AnimationService.createAnimation({
        source_url: sourceUrl,
        config: { stitch: true },
      });
      if (animation.status === 'done') {
        setAnimationProgress('Animation ready!');
        setTalksMode(sourceUrl, animation.result_url || undefined);
        onClose();
        return;
      }
      setAnimationProgress('Processing animation...');
      const finalAnimation = await AnimationService.pollAnimation(animation.id, (update) => {
        if (update.status === 'started') setAnimationProgress('Animation in progress...');
      });
      if (finalAnimation.status === 'done' && finalAnimation.result_url) {
        setAnimationProgress('Animation complete!');
        loadCachedAnimations();
        setTalksMode(sourceUrl, finalAnimation.result_url);
        onClose();
      } else if (finalAnimation.status === 'error') {
        throw new Error(finalAnimation.error?.description || 'Animation failed');
      } else {
        throw new Error('Animation failed to complete');
      }
    } catch (err) {
      console.error('Animation creation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create animation');
    } finally {
      setAnimating(false);
      setAnimationProgress('');
    }
  };

  const handleDefaultSelect = () => { resetToDefault(); onClose(); };
  const handleMouseEnter = useCallback((id: string) => setHoveredId(id), []);
  const handleMouseLeave = useCallback(() => setHoveredId(null), []);

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4 animate-fade-in" style={{ background: 'rgba(12, 10, 9, 0.8)', backdropFilter: 'blur(8px)' }}>
      <div
        className="panel-float w-full max-w-4xl max-h-[80vh] overflow-hidden animate-scale-in"
        style={{ opacity: 0, animationFillMode: 'forwards', animationDelay: '0.05s' }}
      >
        {/* Copper accent bar */}
        <div className="h-0.5" style={{ background: 'linear-gradient(90deg, transparent, var(--copper), var(--copper-light), var(--copper), transparent)' }} />

        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-display text-2xl" style={{ color: 'var(--text-primary)' }}>
                Select Presenter
              </h2>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                Choose a presenter or upload a custom image
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5"
              style={{ color: 'var(--text-muted)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-1 p-1 rounded-lg mb-6" style={{ background: 'var(--bg-primary)' }}>
            {(['clips', 'talks'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all capitalize"
                style={{
                  background: mode === m ? 'linear-gradient(135deg, var(--copper-dark), var(--copper))' : 'transparent',
                  color: mode === m ? 'var(--bg-primary)' : 'var(--text-tertiary)',
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="overflow-y-auto custom-scrollbar max-h-[calc(80vh-220px)]">
            {mode === 'clips' ? (
              <div>
                {loading && (
                  <div className="text-center py-12">
                    <div className="relative w-10 h-10 mx-auto mb-4">
                      <div className="absolute inset-0 rounded-full animate-spin" style={{
                        border: '2px solid var(--border-subtle)',
                        borderTopColor: 'var(--copper)',
                      }} />
                    </div>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading presenters...</p>
                  </div>
                )}

                {error && (
                  <div className="text-center py-8 panel p-4" style={{ borderColor: 'rgba(248, 113, 113, 0.2)' }}>
                    <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>
                  </div>
                )}

                {!loading && !error && (
                  <>
                    {/* Default option */}
                    <button
                      onClick={handleDefaultSelect}
                      className="w-full p-4 rounded-lg mb-4 text-left transition-all group"
                      style={{
                        background: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-copper)';
                        e.currentTarget.style.background = 'var(--copper-subtle)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-subtle)';
                        e.currentTarget.style.background = 'var(--bg-primary)';
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--copper-glow)', border: '1px solid var(--border-copper)' }}>
                          <svg className="w-5 h-5" style={{ color: 'var(--copper)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Default Presenter</h3>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Use the default Alex presenter</p>
                        </div>
                      </div>
                    </button>

                    {/* Presenters Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {presenters.map((presenter, index) => (
                        <button
                          key={presenter.presenter_id}
                          onClick={() => handlePresenterSelect(presenter)}
                          onMouseEnter={() => handleMouseEnter(presenter.presenter_id)}
                          onMouseLeave={handleMouseLeave}
                          className="group relative overflow-hidden rounded-lg transition-all animate-slide-up"
                          style={{
                            background: 'var(--bg-primary)',
                            border: selectedPresenter === presenter.presenter_id
                              ? '2px solid var(--copper)'
                              : '1px solid var(--border-subtle)',
                            boxShadow: selectedPresenter === presenter.presenter_id ? 'var(--glow-copper-sm)' : 'none',
                            opacity: 0,
                            animationFillMode: 'forwards',
                            animationDelay: `${Math.min(index * 0.04, 0.4)}s`,
                          }}
                        >
                          <div className="aspect-square relative overflow-hidden">
                            {presenter.thumbnail_url || presenter.preview_url ? (
                              <Image
                                src={presenter.thumbnail_url || presenter.preview_url || ''}
                                alt={presenter.name}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                width={200}
                                height={200}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                                <span className="text-3xl font-display" style={{ color: 'var(--text-muted)' }}>{presenter.name[0]}</span>
                              </div>
                            )}
                            {hoveredId === presenter.presenter_id && (presenter.talking_preview_url || presenter.video_url) && (
                              <video
                                src={presenter.talking_preview_url || presenter.video_url}
                                className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                                autoPlay loop muted playsInline preload="none"
                                onLoadedData={(e) => { (e.target as HTMLVideoElement).currentTime = 0; }}
                              />
                            )}
                            {/* Gradient overlay */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                          </div>
                          <div className="px-3 py-2.5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                            <h4 className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{presenter.name}</h4>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {/* Default option */}
                <button
                  onClick={handleDefaultSelect}
                  className="w-full p-4 rounded-lg text-left transition-all"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-copper)';
                    e.currentTarget.style.background = 'var(--copper-subtle)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.background = 'var(--bg-primary)';
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'var(--copper-glow)', border: '1px solid var(--border-copper)' }}>
                      <svg className="w-5 h-5" style={{ color: 'var(--copper)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Default Image</h3>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Use the default presenter image</p>
                    </div>
                  </div>
                </button>

                {/* Error */}
                {error && (
                  <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--danger-muted)', border: '1px solid rgba(248, 113, 113, 0.2)', color: 'var(--danger)' }}>
                    {error}
                  </div>
                )}

                {/* Image Source */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Image Source</h4>

                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Upload Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="w-full text-sm file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:cursor-pointer"
                      style={{
                        color: 'var(--text-secondary)',
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Or Enter Image URL</label>
                    <input
                      type="url"
                      value={customImageUrl}
                      onChange={(e) => handleUrlPreview(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                      className="input-base w-full"
                    />
                  </div>
                </div>

                {/* Preview */}
                {previewUrl && (
                  <div>
                    <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Preview</h4>
                    <div className="w-28 h-28 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
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
                    className="btn-ghost flex-1 !py-2.5"
                  >
                    Apply Image
                  </button>
                  <button
                    onClick={handleCreateAnimation}
                    disabled={(!selectedFile && !customImageUrl) || animating}
                    className="btn-copper flex-1 !py-2.5"
                  >
                    {animating ? 'Creating...' : 'Create Animation'}
                  </button>
                </div>

                {/* Progress */}
                {animationProgress && (
                  <div className="text-center p-4 rounded-lg" style={{ background: 'var(--bg-primary)' }}>
                    <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{animationProgress}</p>
                    <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="h-full rounded-full animate-shimmer" style={{
                        width: '60%',
                        background: 'linear-gradient(90deg, var(--copper-dark), var(--copper), var(--copper-light))',
                      }} />
                    </div>
                  </div>
                )}

                {/* Cached Animations */}
                {cachedAnimations.length > 0 && (
                  <div className="pt-5" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                    <h4 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Your Animations</h4>
                    <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                      {cachedAnimations.map((animation) => (
                        <button
                          key={animation.id}
                          onClick={() => handleCachedAnimationSelect(animation)}
                          className="group relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden transition-all"
                          style={{ border: '1px solid var(--border-subtle)' }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-copper)'; e.currentTarget.style.boxShadow = 'var(--glow-copper-sm)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none'; }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={animation.sourceUrl} alt="Cached animation" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" style={{ background: 'rgba(12, 10, 9, 0.6)' }}>
                            <span className="text-xs font-semibold" style={{ color: 'var(--copper-light)' }}>Select</span>
                          </div>
                          <div className="absolute bottom-0 inset-x-0 p-1" style={{ background: 'linear-gradient(to top, rgba(12, 10, 9, 0.8), transparent)' }}>
                            <span className="text-[10px] truncate block" style={{ color: 'var(--text-muted)' }}>
                              {new Date(animation.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>Click to reuse</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
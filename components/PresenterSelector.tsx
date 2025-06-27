'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClipsPresenter } from '@/types/did';
import { usePresenter } from '@/contexts/PresenterContext';
import Image from 'next/image';

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

  useEffect(() => {
    if (mode === 'clips') {
      fetchPresenters();
    }
  }, [mode]);

  const fetchPresenters = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/presenters');
      if (!response.ok) throw new Error('Failed to fetch presenters');
      const data = await response.json();
      setPresenters(data.presenters || []);
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

              {/* Custom URL Input */}
              <div>
                <label className="block text-white mb-2">Custom Image URL</label>
                <input
                  type="url"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-2 bg-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                />
                <button
                  onClick={handleTalksSubmit}
                  disabled={!customImageUrl}
                  className="mt-4 px-6 py-2 bg-white/20 hover:bg-white/30 disabled:bg-white/5 disabled:cursor-not-allowed text-white rounded-lg transition-all"
                >
                  Apply Custom Image
                </button>
              </div>

              {/* Preview */}
              {customImageUrl && (
                <div className="mt-6">
                  <h4 className="text-white mb-2">Preview:</h4>
                  <div className="relative w-48 h-48 rounded-lg overflow-hidden bg-white/5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={customImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
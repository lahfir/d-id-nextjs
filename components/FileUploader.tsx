'use client';

import { useState, useCallback, DragEvent } from 'react';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  acceptedTypes?: string[];
  maxSize?: number;
  className?: string;
}

export function FileUploader({
  onFileSelect,
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm'],
  maxSize = 10 * 1024 * 1024,
  className = '',
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback((file: File): boolean => {
    setError(null);
    if (!acceptedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload an image (JPEG, PNG, WebP) or video (MP4, MOV, WebM).');
      return false;
    }
    if (file.size > maxSize) {
      setError(`File size exceeds ${maxSize / 1024 / 1024}MB limit.`);
      return false;
    }
    return true;
  }, [acceptedTypes, maxSize]);

  const handleFile = useCallback((file: File) => {
    if (validateFile(file)) onFileSelect(file);
  }, [validateFile, onFileSelect]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setIsDragging(false); }, []);
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) handleFile(files[0]);
  }, [handleFile]);
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleFile(files[0]);
  }, [handleFile]);

  return (
    <div className={className}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className="relative rounded-lg p-8 text-center cursor-pointer transition-all duration-200"
        style={{
          border: isDragging ? '2px dashed var(--copper)' : '2px dashed var(--border-default)',
          background: isDragging ? 'var(--copper-subtle)' : 'transparent',
          transform: isDragging ? 'scale(1.01)' : 'scale(1)',
        }}
      >
        <input
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />

        <div className="pointer-events-none">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl flex items-center justify-center" style={{
            background: isDragging ? 'var(--copper-glow)' : 'var(--copper-subtle)',
            border: `1px solid ${isDragging ? 'var(--border-copper)' : 'var(--border-subtle)'}`,
          }}>
            <svg className="w-5 h-5" style={{ color: isDragging ? 'var(--copper)' : 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>

          <p className="text-sm font-medium mb-1" style={{ color: isDragging ? 'var(--copper)' : 'var(--text-primary)' }}>
            {isDragging ? 'Drop your file here' : 'Drag and drop your file here'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            or click to browse
          </p>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            JPEG, PNG, WebP, MP4, MOV, WebM &middot; Max {maxSize / 1024 / 1024}MB
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-3 p-3 rounded-lg text-sm" style={{
          background: 'var(--danger-muted)',
          border: '1px solid rgba(248, 113, 113, 0.2)',
          color: 'var(--danger)',
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
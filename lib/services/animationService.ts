import { CreateAnimationRequest, AnimationResponse } from '@/types/did';
import crypto from 'crypto';

interface AnimationCache {
  id: string;
  sourceUrl: string;
  resultUrl: string | null;
  status: 'created' | 'started' | 'done' | 'error';
  createdAt: string;
  localPath?: string;
}

const ANIMATION_CACHE_KEY = 'did-animations-cache';
const MAX_CACHE_SIZE = 50;

export class AnimationService {
  private static getCache(): AnimationCache[] {
    if (typeof window === 'undefined') return [];
    try {
      const cached = localStorage.getItem(ANIMATION_CACHE_KEY);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }

  private static setCache(cache: AnimationCache[]): void {
    if (typeof window === 'undefined') return;
    try {
      const limited = cache.slice(0, MAX_CACHE_SIZE);
      localStorage.setItem(ANIMATION_CACHE_KEY, JSON.stringify(limited));
    } catch (error) {
      console.warn('Failed to save animation cache:', error);
    }
  }

  static generateCacheKey(sourceUrl: string): string {
    return crypto.createHash('md5').update(sourceUrl).digest('hex');
  }

  static findCachedAnimation(sourceUrl: string): AnimationCache | null {
    const cache = this.getCache();
    return cache.find(item => 
      item.sourceUrl === sourceUrl && 
      item.status === 'done'
    ) || null;
  }

  static addToCache(animation: Omit<AnimationCache, 'createdAt'>): void {
    const cache = this.getCache();
    const newItem: AnimationCache = {
      ...animation,
      createdAt: new Date().toISOString(),
    };
    
    const existingIndex = cache.findIndex(item => item.id === animation.id);
    if (existingIndex >= 0) {
      cache[existingIndex] = newItem;
    } else {
      cache.unshift(newItem);
    }
    
    this.setCache(cache);
  }

  static getAllCached(): AnimationCache[] {
    return this.getCache();
  }

  static removeFromCache(id: string): void {
    const cache = this.getCache();
    const filtered = cache.filter(item => item.id !== id);
    this.setCache(filtered);
  }

  static clearCache(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ANIMATION_CACHE_KEY);
    }
  }

  static sanitizeFileName(fileName: string): string {
    // Remove invalid characters and replace spaces with underscores
    // Valid characters: a-z A-Z 0-9 . _ -
    let sanitized = fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
    
    // Ensure max 50 characters
    if (sanitized.length > 50) {
      const extension = sanitized.substring(sanitized.lastIndexOf('.'));
      const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
      sanitized = nameWithoutExt.substring(0, 50 - extension.length) + extension;
    }
    
    return sanitized || 'image.png'; // Fallback if name becomes empty
  }

  static async uploadImage(file: File): Promise<{ url: string; id: string }> {
    const sanitizedName = this.sanitizeFileName(file.name);
    
    // Create a new file with sanitized name
    const sanitizedFile = new File([file], sanitizedName, { type: file.type });
    
    const formData = new FormData();
    formData.append('image', sanitizedFile);

    const response = await fetch('/api/images', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to upload image');
    }

    return response.json();
  }

  static async createAnimation(request: CreateAnimationRequest): Promise<AnimationResponse> {
    const cached = this.findCachedAnimation(request.source_url);
    
    if (cached && cached.resultUrl) {
      return {
        id: cached.id,
        object: 'animation',
        created_at: cached.createdAt,
        created_by: 'cached',
        status: 'done',
        result_url: cached.resultUrl,
      } as AnimationResponse;
    }

    const response = await fetch('/api/animations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create animation');
    }

    const data = await response.json();
    
    this.addToCache({
      id: data.id,
      sourceUrl: request.source_url,
      resultUrl: null,
      status: data.status,
    });

    return data;
  }

  static async getAnimation(id: string): Promise<AnimationResponse> {
    const response = await fetch(`/api/animations?id=${id}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get animation');
    }

    const data = await response.json();
    
    if (data.status === 'done' && data.result_url) {
      const cache = this.getCache();
      const cached = cache.find(item => item.id === id);
      if (cached) {
        this.addToCache({
          ...cached,
          status: 'done',
          resultUrl: data.result_url,
        });
      }
    }

    return data;
  }

  static async pollAnimation(id: string, onUpdate?: (animation: AnimationResponse) => void): Promise<AnimationResponse> {
    const poll = async (): Promise<AnimationResponse> => {
      const animation = await this.getAnimation(id);
      
      if (onUpdate) {
        onUpdate(animation);
      }

      if (animation.status === 'done' || animation.status === 'error') {
        return animation;
      }

      await new Promise(resolve => setTimeout(resolve, 3000));
      return poll();
    };

    return poll();
  }
}
import { PresenterConfig } from '@/types/did';

export const PRESENTER_CONFIG: PresenterConfig = {
  talks: {
    // source_url: 'https://create-images-results.d-id.com/DefaultPresenters/Emma_f/v1_image.jpeg',
    source_url: 'https://cdn.pixabay.com/photo/2022/09/12/17/39/man-7450033_1280.jpg',
  },
  clips: {
    presenter_id: 'v2_public_alex@qcvo4gupoy',
    driver_id: 'e3nbserss8',
  },
};

export const STREAM_CONFIG = {
  warmup: true,
  stitch: true,
  ssml: false,
} as const;

export const OPENAI_CONFIG = {
  model: 'gpt-4.1-nano',
  temperature: 0.7,
} as const;

export const DEEPGRAM_CONFIG = {
  model: 'nova-3',
  smart_format: true,
  language: 'multi',
} as const;

export const ELEVENLABS_CONFIG = {
  model_id: 'eleven_flash_v2_5',
  voice_id: process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID || '2EiwWnXFnvU5JabPnv8n',
} as const;

export const TIMING = {
  /** Delay after stream/done for ElevenLabs reset */
  ELEVENLABS_RESET_MS: 2000,
  /** Fallback timeout to force stream/ready */
  STREAM_READY_FALLBACK_MS: 5000,
  /** Delay after stream/ready event before accepting messages */
  STREAM_READY_SETTLE_MS: 1000,
  /** WebRTC stats polling interval */
  STATS_POLL_INTERVAL_MS: 2000,
} as const;

export const SYSTEM_PROMPT = 'You are a helpful Spanish assistant that can answer questions and help with tasks.';

export const ERROR_MESSAGES = {
  RATE_LIMIT: 'Rate limit exceeded. Please wait a moment and try again.',
  API_KEY: 'API key error. Please check your API configuration.',
  SERVER_ERROR: 'Server error. Please try again later.',
  GENERIC: 'Error getting response from AI',
  NO_RECORDING: 'No recording in progress',
  WEBSOCKET_UNDEFINED: 'WebSocket instance is undefined. Cannot send message.',
  WEBSOCKET_NOT_OPEN: 'WebSocket is not open. Cannot send message.',
  ANIMATION_FAILED: 'Failed to create animation. Please try again.',
  UPLOAD_FAILED: 'Failed to upload file. Please try again.',
} as const;

export const ANIMATION_CONFIG = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  pollingInterval: 2000, // 2 seconds
  maxPollingRetries: 60, // 2 minutes max
  supportedImageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  supportedVideoTypes: ['video/mp4', 'video/quicktime', 'video/webm'],
} as const;
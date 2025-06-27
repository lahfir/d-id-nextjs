export interface PresenterConfig {
  talks: {
    source_url: string;
  };
  clips: {
    presenter_id: string;
    driver_id: string;
  };
}

export interface ClipsPresenter {
  presenter_id: string;
  name: string;
  preview_url?: string;
  talking_preview_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  is_streamable: boolean;
  driver_id?: string;
  idle_video?: string;
}

export interface PresentersApiResponse {
  presenters: ClipsPresenter[];
  token?: string;
}

export interface StreamMessage {
  type: 'init-stream' | 'stream-text' | 'sdp' | 'ice' | 'delete-stream' | 'error';
  payload: Record<string, unknown>;
}

export interface InitStreamMessage extends StreamMessage {
  type: 'init-stream';
  payload: {
    source_url?: string;
    presenter_id?: string;
    driver_id?: string;
    presenter_type: 'talk' | 'clip';
  };
}

export interface StreamTextMessage extends StreamMessage {
  type: 'stream-text';
  payload: {
    script: {
      type: 'text';
      input: string;
      provider: {
        type: 'elevenlabs' | 'microsoft';
        voice_id: string;
        model_id?: string;
      };
      ssml: boolean;
    };
    config: {
      stitch: boolean;
    };
    apiKeyExternal?: {
      elevenlabs: { key: string };
    };
    session_id: string;
    stream_id: string;
    index: number;
    presenter_type: 'talk' | 'clip';
  };
}

export interface WebSocketResponse {
  messageType: 'init-stream' | 'sdp' | 'delete-stream' | 'error' | 'ice' | 'stream-text';
  id?: string;
  session_id?: string;
  offer?: RTCSessionDescriptionInit;
  ice_servers?: RTCIceServer[];
  status?: string;
  error?: string;
  payload?: Record<string, unknown>;
}

export interface ConnectionState {
  isConnecting: boolean;
  isConnected: boolean;
  streamId: string | null;
  sessionId: string | null;
  error: string | null;
}

// Animation API Types
export interface AnimationScript {
  type: 'text' | 'audio';
  subtitles?: boolean;
  provider?: {
    type: 'microsoft' | 'amazon' | 'google' | 'elevenlabs';
    voice_id?: string;
    voice_config?: {
      style?: string;
      language?: string;
    };
  };
  ssml?: boolean;
  input?: string; // For text
  audio_url?: string; // For audio
}

export interface AnimationConfig {
  fluent?: boolean;
  driver_expressions?: {
    expressions: Array<{
      start_frame: number;
      expression: 'neutral' | 'happy' | 'serious' | 'surprise';
      intensity: number;
    }>;
  };
  align_driver?: boolean;
  align_expand_factor?: number;
  auto_match?: boolean;
  motion_factor?: number;
  normalization_factor?: number;
  sharpen?: boolean;
  stitch?: boolean;
  result_format?: 'mp4' | 'gif' | 'mov' | 'webm';
  fluent_factor?: number;
  pad_audio?: number;
  driver_url?: string;
  logo?: {
    url: string;
    position: Array<number>;
  };
}

export interface CreateAnimationRequest {
  source_url: string;
  config?: AnimationConfig;
  webhook?: string;
  name?: string;
  user_data?: string;
}

export interface AnimationResponse {
  id: string;
  object: string;
  created_at: string;
  created_by: string;
  status: 'created' | 'started' | 'done' | 'error' | 'rejected';
  driver_url?: string;
  config?: AnimationConfig;
  script?: AnimationScript;
  result_url?: string;
  metadata?: {
    size: number;
    duration: number;
    resolution: {
      width: number;
      height: number;
    };
  };
  error?: {
    kind: string;
    description: string;
  };
  webhook?: string;
  user_data?: string;
}

export interface AnimationsListResponse {
  animations: AnimationResponse[];
  token?: string;
}
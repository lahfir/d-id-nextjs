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
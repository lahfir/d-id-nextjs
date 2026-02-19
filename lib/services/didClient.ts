import { InitStreamMessage, StreamTextMessage, WebSocketResponse, ConnectionState, StreamMessage, PresenterConfig } from '@/types/did';
import { ApiConfig } from '@/types/api';
import { WebRTCManager, WebRTCCallbacks } from './webrtcManager';
import { PRESENTER_CONFIG, ELEVENLABS_CONFIG, ERROR_MESSAGES } from '@/lib/utils/constants';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('DidClient');

/** Shape of D-ID error responses */
interface DidErrorPayload {
  message?: string;
  error?: string | Record<string, unknown>;
  connectionId?: string;
  requestId?: string;
  payload?: {
    error?: string | Record<string, unknown>;
  };
}

/**
 * Client for D-ID streaming API with WebSocket and WebRTC
 */
export class DidClient {
  private ws: WebSocket | null = null;
  private webrtcManager: WebRTCManager;
  private config: ApiConfig;
  private presenterConfig: PresenterConfig;
  private serviceType: 'talks' | 'clips';
  private connectionState: ConnectionState = {
    isConnecting: false,
    isConnected: false,
    streamId: null,
    sessionId: null,
    error: null,
  };

  constructor(config: ApiConfig, serviceType: 'talks' | 'clips', presenterConfig?: PresenterConfig) {
    this.config = config;
    this.serviceType = serviceType;
    this.presenterConfig = presenterConfig || PRESENTER_CONFIG;
    this.webrtcManager = new WebRTCManager();
  }

  /**
   * Connects to D-ID WebSocket and initializes stream
   */
  async connect(callbacks: {
    onConnectionStateChange: (state: ConnectionState) => void;
    onVideoTrack: (stream: MediaStream) => void;
    onStreamEvent: (status: string) => void;
  }): Promise<void> {
    try {
      this.updateConnectionState({ isConnecting: true, error: null });
      callbacks.onConnectionStateChange(this.connectionState);

      this.ws = await this.connectToWebSocket();
      this.setupWebSocketHandlers(callbacks);

      const initMessage = this.createInitStreamMessage();
      log.debug('Sending init stream message', { type: initMessage.type });
      this.sendMessage(initMessage);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      this.updateConnectionState({
        isConnecting: false,
        error: errorMessage
      });
      callbacks.onConnectionStateChange(this.connectionState);
      throw error;
    }
  }

  /**
   * Sends text message for streaming
   */
  sendTextMessage(text: string, messageIndex: number): void {
    log.debug('Sending text message', {
      messageIndex: String(messageIndex),
      service: this.serviceType,
    });

    if (!this.ws || !this.connectionState.streamId || !this.connectionState.sessionId) {
      log.error('Connection check failed — not connected');
      throw new Error('Not connected to streaming service');
    }

    const payloadBase = {
      script: {
        type: 'text' as const,
        input: text,
        provider: {
          type: 'elevenlabs' as const,
          voice_id: ELEVENLABS_CONFIG.voice_id,
          model_id: ELEVENLABS_CONFIG.model_id,
        },
        ssml: this.serviceType === 'clips',
      },
      config: {
        stitch: true,
      },
      session_id: this.connectionState.sessionId,
      stream_id: this.connectionState.streamId,
      index: messageIndex,
      presenter_type: this.serviceType === 'clips' ? ('clip' as const) : ('talk' as const),
    };

    const message: StreamTextMessage = {
      type: 'stream-text',
      payload:
        this.serviceType === 'clips'
          ? {
            ...payloadBase,
          }
          : {
            ...payloadBase,
            apiKeyExternal: {
              elevenlabs: { key: this.config.elevenlabsApiKey },
            },
          },
    } as StreamTextMessage;

    log.debug('Sending stream-text message');
    this.sendMessage(message);
  }

  /**
   * Disconnects from D-ID service
   */
  disconnect(): void {
    if (this.ws) {
      const deleteMessage: StreamMessage = {
        type: 'delete-stream',
        payload: {
          session_id: this.connectionState.sessionId,
          stream_id: this.connectionState.streamId,
        },
      };
      this.sendMessage(deleteMessage);

      this.ws.close();
      this.ws = null;
    }

    this.webrtcManager.close();
    this.resetConnectionState();
  }

  /**
   * Gets current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.connectionState };
  }

  /**
   * Creates WebSocket connection
   */
  private connectToWebSocket(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${this.config.didWebsocketUrl}?authorization=Basic ${encodeURIComponent(this.config.didApiKey)}`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        log.info('WebSocket connection opened');
        resolve(ws);
      };

      ws.onerror = (error) => {
        log.error('WebSocket connection error', { error: String(error) });
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = () => {
        log.info('WebSocket connection closed');
      };
    });
  }

  /**
   * Sets up WebSocket message handlers
   */
  private setupWebSocketHandlers(callbacks: {
    onConnectionStateChange: (state: ConnectionState) => void;
    onVideoTrack: (stream: MediaStream) => void;
    onStreamEvent: (status: string) => void;
  }): void {
    if (!this.ws) return;

    this.ws.onmessage = async (event) => {
      try {
        const data: WebSocketResponse = JSON.parse(event.data);
        await this.handleWebSocketMessage(data, callbacks);
      } catch (error) {
        log.error('Error handling WebSocket message', { error: String(error) });
      }
    };
  }

  /**
   * Handles WebSocket messages
   */
  private async handleWebSocketMessage(
    data: WebSocketResponse,
    callbacks: {
      onConnectionStateChange: (state: ConnectionState) => void;
      onVideoTrack: (stream: MediaStream) => void;
      onStreamEvent: (status: string) => void;
    }
  ): Promise<void> {
    switch (data.messageType) {
      case 'init-stream':
        await this.handleInitStream(data, callbacks);
        break;
      case 'sdp':
        log.debug('SDP message received');
        break;
      case 'ice':
        log.debug('ICE message received');
        try {
          const pc = this.webrtcManager.getPeerConnection();
          if (pc && data.payload) {
            interface CandPayload { candidate: string; sdpMid?: string; sdpMLineIndex?: number; }
            const candPayload = (data.payload.candidate ?? data.payload) as CandPayload;
            if (candPayload && candPayload.candidate) {
              const rtcCandidate = new RTCIceCandidate({
                candidate: candPayload.candidate,
                sdpMid: candPayload.sdpMid,
                sdpMLineIndex: candPayload.sdpMLineIndex,
              });
              await pc.addIceCandidate(rtcCandidate);
            }
          }
        } catch (err) {
          log.error('Failed to add remote ICE candidate', { error: String(err) });
        }
        break;
      case 'stream-text':
        log.debug('Stream text response', { status: data.status ?? 'unknown' });
        if (data.status) {
          callbacks.onStreamEvent(data.status);
        }
        break;
      case 'delete-stream':
        log.debug('Stream deleted');
        break;
      case 'error': {
        log.error('D-ID API error received');
        const errorMessage = this.formatApiError(data as unknown as DidErrorPayload);
        this.updateConnectionState({ error: errorMessage, isConnecting: false });
        callbacks.onConnectionStateChange(this.connectionState);
        break;
      }
      default: {
        log.debug('Unhandled WebSocket message', { messageType: String(data.messageType) });
        const errorPayload = data as unknown as DidErrorPayload;
        if (errorPayload.error || ('message' in data)) {
          log.error('D-ID API error (unknown type)');
          const errorMessage = this.formatApiError(errorPayload);
          this.updateConnectionState({ error: errorMessage, isConnecting: false });
          callbacks.onConnectionStateChange(this.connectionState);
        } else {
          log.warn('Unknown WebSocket message type', { messageType: String(data.messageType) });
        }
        break;
      }
    }
  }

  /**
   * Handles init-stream response
   */
  private async handleInitStream(
    data: WebSocketResponse,
    callbacks: {
      onConnectionStateChange: (state: ConnectionState) => void;
      onVideoTrack: (stream: MediaStream) => void;
      onStreamEvent: (status: string) => void;
    }
  ): Promise<void> {
    log.debug('Processing init-stream response');

    if (!data.id || !data.session_id || !data.offer || !data.ice_servers) {
      log.error('Invalid init-stream response — missing required fields');
      throw new Error('Invalid init-stream response');
    }

    this.updateConnectionState({
      streamId: data.id,
      sessionId: data.session_id,
    });

    log.debug('Connection state updated', { streamId: data.id, sessionId: data.session_id });

    const webrtcCallbacks: WebRTCCallbacks = {
      onIceGatheringStateChange: (state) => log.debug('ICE gathering state', { state }),
      onIceCandidate: (event) => this.handleIceCandidate(event),
      onIceConnectionStateChange: (state) => log.debug('ICE connection state', { state }),
      onConnectionStateChange: (state) => {
        log.info('Peer connection state changed', { state });
        if (state === 'connected') {
          this.updateConnectionState({
            isConnecting: false,
            isConnected: true
          });
          callbacks.onConnectionStateChange(this.connectionState);
        }
      },
      onSignalingStateChange: (state) => log.debug('Signaling state', { state }),
      onTrack: (event) => {
        if (event.streams[0]) {
          callbacks.onVideoTrack(event.streams[0]);
        }
      },
      onStreamEvent: (event) => {
        log.debug('Data channel event', { data: String(event.data) });
        const { status } = this.webrtcManager.processStreamEvent(event.data);
        log.debug('Processed stream status', { status });
        callbacks.onStreamEvent(status);
      },
    };

    try {
      const answer = await this.webrtcManager.createPeerConnection(
        data.offer,
        data.ice_servers,
        webrtcCallbacks
      );

      const sdpMessage: StreamMessage = {
        type: 'sdp',
        payload: {
          answer,
          session_id: this.connectionState.sessionId,
          presenter_type: this.serviceType === 'clips' ? 'clip' : 'talk',
        },
      };

      this.sendMessage(sdpMessage);
    } catch (error) {
      log.error('WebRTC setup failed', { error: String(error) });
      this.updateConnectionState({
        isConnecting: false,
        error: 'WebRTC connection failed'
      });
      callbacks.onConnectionStateChange(this.connectionState);
      throw error;
    }
  }

  /**
   * Handles ICE candidate events
   */
  private handleIceCandidate(event: RTCPeerConnectionIceEvent): void {
    if (!event.candidate) {
      return;
    }

    const { candidate, sdpMid, sdpMLineIndex } = event.candidate;

    this.sendMessage({
      type: 'ice',
      payload: {
        stream_id: this.connectionState.streamId,
        session_id: this.connectionState.sessionId,
        presenter_type: this.serviceType === 'clips' ? 'clip' : 'talk',
        candidate,
        sdpMid,
        sdpMLineIndex,
      },
    });
  }

  /**
   * Formats API errors for user display
   */
  private formatApiError(data: DidErrorPayload): string {
    if (data.message) {
      const details: string[] = [];
      if (data.connectionId) details.push(`Connection: ${data.connectionId}`);
      if (data.requestId) details.push(`Request: ${data.requestId}`);

      let errorMsg = String(data.message);
      if (details.length > 0) {
        errorMsg += ` (${details.join(', ')})`;
      }

      return errorMsg;
    }

    if (data.error) {
      return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    }

    if (data.payload?.error) {
      return typeof data.payload.error === 'string' ? data.payload.error : JSON.stringify(data.payload.error);
    }

    return `API Error: ${JSON.stringify(data)}`;
  }

  /**
   * Creates init stream message
   */
  private createInitStreamMessage(): InitStreamMessage {
    const presenterConfig = this.presenterConfig[this.serviceType];

    if (this.serviceType === 'clips') {
      const clipsConfig = presenterConfig as { presenter_id: string; driver_id: string };
      if (!clipsConfig.presenter_id || !clipsConfig.driver_id) {
        log.error('Invalid clips configuration');
        throw new Error('Clips mode requires presenter_id and driver_id');
      }
    } else if (this.serviceType === 'talks') {
      const talksConfig = presenterConfig as { source_url: string };
      if (!talksConfig.source_url) {
        log.error('Invalid talks configuration');
        throw new Error('Talks mode requires source_url');
      }
    }

    const message = {
      type: 'init-stream' as const,
      payload: {
        ...presenterConfig,
        presenter_type: this.serviceType === 'clips' ? 'clip' as const : 'talk' as const,
      },
    };

    log.debug('Created init stream message', { mode: this.serviceType });
    return message;
  }

  /**
   * Sends message through WebSocket
   */
  private sendMessage(message: StreamMessage): void {
    if (!this.ws) {
      log.error(ERROR_MESSAGES.WEBSOCKET_UNDEFINED);
      return;
    }

    if (this.ws.readyState === WebSocket.OPEN) {
      log.debug('Sending WebSocket message', { type: message.type });
      this.ws.send(JSON.stringify(message));
    } else {
      log.error(ERROR_MESSAGES.WEBSOCKET_NOT_OPEN, { readyState: String(this.ws.readyState) });
    }
  }

  /**
   * Updates connection state
   */
  private updateConnectionState(updates: Partial<ConnectionState>): void {
    this.connectionState = { ...this.connectionState, ...updates };
  }

  /**
   * Resets connection state
   */
  private resetConnectionState(): void {
    this.connectionState = {
      isConnecting: false,
      isConnected: false,
      streamId: null,
      sessionId: null,
      error: null,
    };
  }

  /**
   * Switches between clips/talks at runtime.
   */
  public updateMode(service: 'clips' | 'talks', updatedPresenterCfg: PresenterConfig): void {
    this.serviceType = service;
    this.presenterConfig = updatedPresenterCfg;
  }
}

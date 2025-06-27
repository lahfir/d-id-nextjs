import { InitStreamMessage, StreamTextMessage, WebSocketResponse, ConnectionState, StreamMessage, PresenterConfig } from '@/types/did';
import { ApiConfig } from '@/types/api';
import { WebRTCManager, WebRTCCallbacks } from './webrtcManager';
import { PRESENTER_CONFIG, ELEVENLABS_CONFIG, ERROR_MESSAGES } from '@/lib/utils/constants';

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
      console.log('Sending init stream message:', initMessage);
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
    console.log('Attempting to send text message:', {
      text,
      messageIndex,
      hasWebSocket: !!this.ws,
      streamId: this.connectionState.streamId,
      sessionId: this.connectionState.sessionId,
      isConnected: this.connectionState.isConnected,
      service: this.serviceType,
      presenterConfig: this.presenterConfig,
      voiceId: ELEVENLABS_CONFIG.voice_id
    });

    if (!this.ws || !this.connectionState.streamId || !this.connectionState.sessionId) {
      console.error('Connection check failed:', {
        hasWebSocket: !!this.ws,
        streamId: this.connectionState.streamId,
        sessionId: this.connectionState.sessionId
      });
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
        ssml: this.serviceType === 'clips', // Enable SSML for clips (needed for breaks)
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
            // Only ElevenLabs requires an external API key
            apiKeyExternal: {
              elevenlabs: { key: this.config.elevenlabsApiKey },
            },
          },
    } as StreamTextMessage;

    console.log('Sending stream-text message');
    console.log('Full stream message payload:', JSON.stringify(message, null, 2));
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
        console.log('WebSocket connection opened');
        resolve(ws);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
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
        console.error('Error handling WebSocket message:', error);
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
        console.log('SDP message received:', data);
        break;
      case 'ice':
        console.log('ICE message received:', data.payload);
        try {
          const pc = this.webrtcManager.getPeerConnection();
          if (pc && data.payload) {
            // Support both nested and flat candidate formats
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
          console.error('Failed to add remote ICE candidate', err);
        }
        break;
      case 'stream-text':
        console.log('Stream text response:', data);
        if (data.status) {
          callbacks.onStreamEvent(data.status);
        }
        break;
      case 'delete-stream':
        console.log('Stream deleted:', data);
        break;
      case 'error':
        console.error('D-ID API Error:', data);
        const errorMessage = this.formatApiError(data);
        this.updateConnectionState({ error: errorMessage, isConnecting: false });
        callbacks.onConnectionStateChange(this.connectionState);
        break;
      default:
        // Handle internal server errors and other unknown messages
        console.log('Raw WebSocket message:', data);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if ((data as any).error || (typeof data === 'object' && 'message' in data)) {
          console.error('D-ID API Error (unknown type):', data);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const errorMessage = this.formatApiError(data as any);
          this.updateConnectionState({ error: errorMessage, isConnecting: false });
          callbacks.onConnectionStateChange(this.connectionState);
        } else {
          console.warn('Unknown WebSocket message type:', data);
        }
        break;
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
    console.log('Init stream data:', data);

    if (!data.id || !data.session_id || !data.offer || !data.ice_servers) {
      console.error('Invalid init-stream response:', data);
      throw new Error('Invalid init-stream response');
    }

    this.updateConnectionState({
      streamId: data.id,
      sessionId: data.session_id,
    });

    console.log('Updated connection state:', this.connectionState);

    const webrtcCallbacks: WebRTCCallbacks = {
      onIceGatheringStateChange: (state) => console.log('ICE gathering state:', state),
      onIceCandidate: (event) => this.handleIceCandidate(event),
      onIceConnectionStateChange: (state) => console.log('ICE connection state:', state),
      onConnectionStateChange: (state) => {
        console.log('Peer connection state:', state);
        if (state === 'connected') {
          this.updateConnectionState({
            isConnecting: false,
            isConnected: true
          });
          callbacks.onConnectionStateChange(this.connectionState);
        }
      },
      onSignalingStateChange: (state) => console.log('Signaling state:', state),
      onTrack: (event) => {
        if (event.streams[0]) {
          callbacks.onVideoTrack(event.streams[0]);
        }
      },
      onStreamEvent: (event) => {
        console.log('Raw data channel event:', event.data);
        const { status } = this.webrtcManager.processStreamEvent(event.data);
        console.log('Processed stream status:', status);
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
      console.error('Error during WebRTC setup:', error);
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
      // D-ID expects only real candidates. Do not send the synthetic
      // end-of-gathering notification – doing so yields "Invalid ice payload".
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
   * Formats API errors for better user display
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private formatApiError(data: any): string {
    // Handle different error message formats from D-ID API
    if (data.message) {
      const details = [];
      if (data.connectionId) details.push(`Connection: ${data.connectionId}`);
      if (data.requestId) details.push(`Request: ${data.requestId}`);

      let errorMsg = data.message.toString();
      if (details.length > 0) {
        errorMsg += ` (${details.join(', ')})`;
      }

      return errorMsg;
    }

    if (data.error) {
      return typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
    }

    if (data.payload && data.payload.error) {
      return typeof data.payload.error === 'string' ? data.payload.error : JSON.stringify(data.payload.error);
    }

    // Fallback for any other error format
    return `API Error: ${JSON.stringify(data)}`;
  }

  /**
   * Creates init stream message
   */
  private createInitStreamMessage(): InitStreamMessage {
    const presenterConfig = this.presenterConfig[this.serviceType];

    // Validate presenter configuration
    if (this.serviceType === 'clips') {
      const clipsConfig = presenterConfig as { presenter_id: string; driver_id: string };
      if (!clipsConfig.presenter_id || !clipsConfig.driver_id) {
        console.error('Invalid clips configuration:', presenterConfig);
        throw new Error('Clips mode requires presenter_id and driver_id');
      }
    } else if (this.serviceType === 'talks') {
      const talksConfig = presenterConfig as { source_url: string };
      if (!talksConfig.source_url) {
        console.error('Invalid talks configuration:', presenterConfig);
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

    console.log('Created init stream message for', this.serviceType, 'mode:', message);
    return message;
  }

  /**
   * Sends message through WebSocket
   */
  private sendMessage(message: StreamMessage): void {
    if (!this.ws) {
      console.error(ERROR_MESSAGES.WEBSOCKET_UNDEFINED);
      return;
    }

    if (this.ws.readyState === WebSocket.OPEN) {
      console.log('Sending message:', message.type, JSON.stringify(message, null, 2));
      this.ws.send(JSON.stringify(message));
    } else {
      console.error(ERROR_MESSAGES.WEBSOCKET_NOT_OPEN, this.ws.readyState);
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
   * Allow switching between clips / talks at runtime.
   * Call this right after the user selects a new presenter or image.
   */
  public updateMode(service: 'clips' | 'talks', updatedPresenterCfg: PresenterConfig): void {
    this.serviceType = service;
    this.presenterConfig = updatedPresenterCfg;
  }
}
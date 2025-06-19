import { InitStreamMessage, StreamTextMessage, WebSocketResponse, ConnectionState, StreamMessage } from '@/types/did';
import { ApiConfig } from '@/types/api';
import { WebRTCManager, WebRTCCallbacks } from './webrtcManager';
import { PRESENTER_CONFIG, ELEVENLABS_CONFIG, ERROR_MESSAGES } from '@/utils/constants';

/**
 * Client for D-ID streaming API with WebSocket and WebRTC
 */
export class DidClient {
  private ws: WebSocket | null = null;
  private webrtcManager: WebRTCManager;
  private config: ApiConfig;
  private connectionState: ConnectionState = {
    isConnecting: false,
    isConnected: false,
    streamId: null,
    sessionId: null,
    error: null,
  };

  constructor(config: ApiConfig) {
    this.config = config;
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
      service: this.config.didService,
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

    const message: StreamTextMessage = {
      type: 'stream-text',
      payload: {
        script: {
          type: 'text',
          input: text,
          provider: {
            type: 'elevenlabs',
            voice_id: ELEVENLABS_CONFIG.voice_id,
            model_id: ELEVENLABS_CONFIG.model_id,
          },
          ssml: 'false',
        },
        config: {
          stitch: true,
        },
        apiKeyExternal: {
          elevenlabs: { key: this.config.elevenlabsApiKey },
        },
        session_id: this.connectionState.sessionId,
        stream_id: this.connectionState.streamId,
        index: messageIndex,
        presenter_type: this.config.didService === 'clips' ? 'clip' : 'talk',
      },
    };

    console.log('Sending stream message with hardcoded ElevenLabs parameters');
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
        console.error('Server error:', data);
        this.updateConnectionState({ error: data.error || 'Unknown server error' });
        callbacks.onConnectionStateChange(this.connectionState);
        break;
      default:
        // Handle internal server errors and other unknown messages
        if (data.error && data.error.includes('Internal server error')) {
          console.error('D-ID Internal server error:', data);
          this.updateConnectionState({ error: 'D-ID service error - please try again' });
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
          presenter_type: this.config.didService === 'clips' ? 'clip' : 'talk',
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
    if (event.candidate) {
      const { candidate, sdpMid, sdpMLineIndex } = event.candidate;
      this.sendMessage({
        type: 'ice',
        payload: {
          session_id: this.connectionState.sessionId,
          candidate,
          sdpMid,
          sdpMLineIndex,
        },
      });
    } else {
      this.sendMessage({
        type: 'ice',
        payload: {
          stream_id: this.connectionState.streamId,
          session_id: this.connectionState.sessionId,
          presenter_type: this.config.didService === 'clips' ? 'clip' : 'talk',
        },
      });
    }
  }

  /**
   * Creates init stream message
   */
  private createInitStreamMessage(): InitStreamMessage {
    const presenterConfig = PRESENTER_CONFIG[this.config.didService];
    return {
      type: 'init-stream',
      payload: {
        ...presenterConfig,
        presenter_type: this.config.didService === 'clips' ? 'clip' : 'talk',
      },
    };
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
      console.log('Sending message:', message.type);
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
}
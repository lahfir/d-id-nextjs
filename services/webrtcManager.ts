import { STREAM_CONFIG } from '@/utils/constants';

export interface WebRTCCallbacks {
  onIceGatheringStateChange: (state: RTCIceGatheringState) => void;
  onIceCandidate: (event: RTCPeerConnectionIceEvent) => void;
  onIceConnectionStateChange: (state: RTCIceConnectionState) => void;
  onConnectionStateChange: (state: RTCPeerConnectionState) => void;
  onSignalingStateChange: (state: RTCSignalingState) => void;
  onTrack: (event: RTCTrackEvent) => void;
  onStreamEvent: (event: MessageEvent) => void;
}

/**
 * Manages WebRTC peer connection for D-ID streaming
 */
export class WebRTCManager {
  private peerConnection: RTCPeerConnection | null = null;
  private dataChannel: RTCDataChannel | null = null;
  private statsIntervalId: NodeJS.Timeout | null = null;
  private lastBytesReceived = 0;
  public isStreamReady = !STREAM_CONFIG.warmup;
  public videoIsPlaying = false;

  /**
   * Creates peer connection with provided offer and ice servers
   */
  async createPeerConnection(
    offer: RTCSessionDescriptionInit,
    iceServers: RTCIceServer[],
    callbacks: WebRTCCallbacks
  ): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      this.peerConnection = new RTCPeerConnection({ iceServers });
      this.dataChannel = this.peerConnection.createDataChannel('JanusDataChannel');
      this.setupEventListeners(callbacks);
    }

    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    return answer;
  }

  /**
   * Sets up WebRTC event listeners
   */
  private setupEventListeners(callbacks: WebRTCCallbacks): void {
    if (!this.peerConnection || !this.dataChannel) return;

    this.peerConnection.addEventListener('icegatheringstatechange', () => {
      callbacks.onIceGatheringStateChange(this.peerConnection!.iceGatheringState);
    });

    this.peerConnection.addEventListener('icecandidate', callbacks.onIceCandidate);

    this.peerConnection.addEventListener('iceconnectionstatechange', () => {
      const state = this.peerConnection!.iceConnectionState;
      callbacks.onIceConnectionStateChange(state);

      if (state === 'failed' || state === 'closed') {
        this.close();
      }
    });

    this.peerConnection.addEventListener('connectionstatechange', () => {
      const state = this.peerConnection!.connectionState;
      callbacks.onConnectionStateChange(state);

      if (state === 'connected') {
        this.handleConnectionEstablished();
      }
    });

    this.peerConnection.addEventListener('signalingstatechange', () => {
      callbacks.onSignalingStateChange(this.peerConnection!.signalingState);
    });

    this.peerConnection.addEventListener('track', (event) => {
      this.setupStatsMonitoring(event);
      callbacks.onTrack(event);
    });

    this.dataChannel.addEventListener('message', callbacks.onStreamEvent);
  }

  /**
   * Handles connection established event
   */
  private handleConnectionEstablished(): void {
    setTimeout(() => {
      if (!this.isStreamReady) {
        console.log('forcing stream/ready');
        this.isStreamReady = true;
      }
    }, 5000);
  }

  /**
   * Sets up video stats monitoring
   */
  private setupStatsMonitoring(event: RTCTrackEvent): void {
    if (!event.track) return;

    this.statsIntervalId = setInterval(async () => {
      if (!this.peerConnection) return;

      const stats = await this.peerConnection.getStats(event.track);
      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          const videoStatusChanged = this.videoIsPlaying !== (report.bytesReceived > this.lastBytesReceived);

          if (videoStatusChanged) {
            this.videoIsPlaying = report.bytesReceived > this.lastBytesReceived;
          }
          this.lastBytesReceived = report.bytesReceived;
        }
      });
    }, 500);
  }

  /**
   * Processes stream events from data channel
   */
  processStreamEvent(event: string): { status: string; isReady: boolean } {
    const [eventType] = event.split(':');
    let status: string;

    switch (eventType) {
      case 'stream/started':
        status = 'started';
        break;
      case 'stream/done':
        status = 'done';
        break;
      case 'stream/ready':
        status = 'ready';
        setTimeout(() => {
          this.isStreamReady = true;
        }, 1000);
        break;
      case 'stream/error':
        status = 'error';
        break;
      default:
        status = 'dont-care';
        break;
    }

    return { status, isReady: this.isStreamReady };
  }

  /**
   * Closes peer connection and cleans up resources
   */
  close(): void {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.dataChannel) {
      this.dataChannel = null;
    }

    if (this.statsIntervalId) {
      clearInterval(this.statsIntervalId);
      this.statsIntervalId = null;
    }

    this.isStreamReady = !STREAM_CONFIG.warmup;
    this.videoIsPlaying = false;
    this.lastBytesReceived = 0;
  }

  /**
   * Gets current peer connection
   */
  getPeerConnection(): RTCPeerConnection | null {
    return this.peerConnection;
  }

  /**
   * Gets current data channel
   */
  getDataChannel(): RTCDataChannel | null {
    return this.dataChannel;
  }
}
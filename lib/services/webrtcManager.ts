import { STREAM_CONFIG, TIMING } from '@/lib/utils/constants';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('WebRTCManager');

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
  private _isStreamReady = !STREAM_CONFIG.warmup;
  private _videoIsPlaying = false;

  get isStreamReady(): boolean { return this._isStreamReady; }
  get videoIsPlaying(): boolean { return this._videoIsPlaying; }

  /**
   * Creates peer connection with provided offer and ICE servers
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
   * Handles connection established event.
   * Forces stream/ready after a timeout as a fallback for configurations
   * that don't emit the event within a reasonable window.
   */
  private handleConnectionEstablished(): void {
    setTimeout(() => {
      if (!this._isStreamReady) {
        log.info('Forcing stream/ready after fallback timeout');
        this._isStreamReady = true;
      }
    }, TIMING.STREAM_READY_FALLBACK_MS);
  }

  /**
   * Sets up video stats monitoring to detect active video playback
   */
  private setupStatsMonitoring(event: RTCTrackEvent): void {
    if (!event.track) return;

    this.statsIntervalId = setInterval(async () => {
      if (!this.peerConnection) return;

      const stats = await this.peerConnection.getStats(event.track);
      stats.forEach((report) => {
        if (report.type === 'inbound-rtp' && report.kind === 'video') {
          const videoStatusChanged = this._videoIsPlaying !== (report.bytesReceived > this.lastBytesReceived);

          if (videoStatusChanged) {
            this._videoIsPlaying = report.bytesReceived > this.lastBytesReceived;
          }
          this.lastBytesReceived = report.bytesReceived;
        }
      });
    }, TIMING.STATS_POLL_INTERVAL_MS);
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
          this._isStreamReady = true;
        }, TIMING.STREAM_READY_SETTLE_MS);
        break;
      case 'stream/error':
        status = 'error';
        break;
      default:
        status = 'dont-care';
        break;
    }

    return { status, isReady: this._isStreamReady };
  }

  /**
   * Closes peer connection and cleans up all resources
   */
  close(): void {
    if (this.statsIntervalId) {
      clearInterval(this.statsIntervalId);
      this.statsIntervalId = null;
    }

    if (this.dataChannel) {
      this.dataChannel.onmessage = null;
      this.dataChannel.onerror = null;
      this.dataChannel.onclose = null;
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.getSenders().forEach(sender => {
        if (sender.track) sender.track.stop();
      });
      this.peerConnection.getReceivers().forEach(receiver => {
        if (receiver.track) receiver.track.stop();
      });

      this.peerConnection.onicecandidate = null;
      this.peerConnection.oniceconnectionstatechange = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.onsignalingstatechange = null;
      this.peerConnection.onicegatheringstatechange = null;
      this.peerConnection.ontrack = null;

      this.peerConnection.close();
      this.peerConnection = null;
    }

    this._isStreamReady = !STREAM_CONFIG.warmup;
    this._videoIsPlaying = false;
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

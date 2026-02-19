import { DeepgramResponse } from '@/types/conversation';
import { ERROR_MESSAGES } from '@/lib/utils/constants';
import { createLogger } from '@/lib/utils/logger';

const log = createLogger('DeepgramClient');

/**
 * Client for Deepgram speech-to-text transcription via server-side proxy
 */
export class DeepgramClient {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private stream: MediaStream | null = null;

  /**
   * Starts audio recording from user microphone
   */
  async startRecording(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(this.stream);
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
    } catch (error) {
      log.error('Error starting recording', { error: String(error) });
      throw error;
    }
  }

  /**
   * Stops recording and returns transcription
   */
  async stopRecording(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error(ERROR_MESSAGES.NO_RECORDING));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        try {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
          const transcription = await this.transcribeAudio(audioBlob);
          this.cleanup();
          resolve(transcription);
        } catch (error) {
          this.cleanup();
          reject(error);
        }
      };

      this.mediaRecorder.stop();
    });
  }

  /**
   * Transcribes audio blob through /api/transcribe proxy
   */
  private async transcribeAudio(audioBlob: Blob): Promise<string> {
    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'audio/wav' },
        body: audioBlob,
      });

      if (!response.ok) {
        throw new Error(`Transcription error: ${response.status}`);
      }

      const data: DeepgramResponse = await response.json();
      return data.results.channels[0].alternatives[0].transcript;
    } catch (error) {
      log.error('Transcription error', { error: String(error) });
      throw error;
    }
  }

  /**
   * Cleans up recording resources
   */
  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }
}

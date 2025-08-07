/**
 * Real-time Transcription Service
 * Handles audio recording and conversion to text for meeting summaries
 */

export interface TranscriptionConfig {
  meetingId: string;
  onTranscriptUpdate?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export interface TranscriptionState {
  isRecording: boolean;
  transcript: string;
  duration: number;
  error: string | null;
}

export class TranscriptionService {
  private meetingId: string;
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private transcript: string = '';
  private startTime: number = 0;
  private onTranscriptUpdate?: (transcript: string) => void;
  private onError?: (error: string) => void;
  private stream: MediaStream | null = null;
  private isRecording: boolean = false;
  private recognition: any = null;

  constructor(config: TranscriptionConfig) {
    this.meetingId = config.meetingId;
    this.onTranscriptUpdate = config.onTranscriptUpdate;
    this.onError = config.onError;
  }

  /**
   * Start real-time transcription
   */
  async startTranscription(): Promise<boolean> {
    // Prevent multiple simultaneous start attempts
    if (this.isRecording) {
      console.log('⚠️ Transcription already in progress, skipping start request');
      return true;
    }

    try {
      console.log('🎤 Starting real-time transcription for meeting:', this.meetingId);
      
      // Check if Web Speech API is available
      if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
        console.error('❌ Speech recognition not supported in this browser');
        throw new Error('Speech recognition not supported in this browser');
      }

      console.log('✅ Speech recognition API available');

      // Get audio stream
      console.log('🎙️ Requesting microphone access...');
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        },
        video: false
      });

      console.log('✅ Microphone access granted, audio tracks:', this.stream.getAudioTracks().length);

      // Initialize speech recognition
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      this.recognition = new SpeechRecognition();
      
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';
      this.recognition.maxAlternatives = 1;

      console.log('✅ Speech recognition initialized');

      // Handle recognition results
      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }

        // Update transcript with final results
        if (finalTranscript) {
          this.transcript += finalTranscript;
          console.log('📝 Transcript updated:', finalTranscript);
          console.log('📊 Total transcript length:', this.transcript.length);
          this.onTranscriptUpdate?.(this.transcript);
        }
      };

      // Handle recognition errors
      this.recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        this.onError?.(`Speech recognition error: ${event.error}`);
      };

      // Handle recognition end
      this.recognition.onend = () => {
        console.log('🔄 Speech recognition ended');
        // Only restart if we're still supposed to be recording and haven't been stopped
        if (this.isRecording && this.recognition) {
          console.log('🔄 Restarting speech recognition...');
          try {
            this.recognition.start();
          } catch (error) {
            console.warn('⚠️ Failed to restart speech recognition:', error);
            // Don't restart again if it fails
            this.isRecording = false;
          }
        }
      };

      this.startTime = Date.now();
      this.isRecording = true;
      this.recognition.start();

      console.log('✅ Real-time transcription started successfully');
      return true;

    } catch (error) {
      console.error('❌ Failed to start transcription:', error);
      this.onError?.(`Failed to start transcription: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  /**
   * Stop transcription and get final transcript
   */
  async stopTranscription(): Promise<string> {
    try {
      console.log('🛑 Stopping transcription...');
      
      if (!this.recognition || !this.isRecording) {
        console.warn('⚠️ No active transcription to stop');
        return this.transcript;
      }

      this.isRecording = false;
      this.recognition.stop();

      // Stop all tracks
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      // Wait for final processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      console.log('✅ Transcription stopped, final transcript length:', this.transcript.length);
      return this.transcript;

    } catch (error) {
      console.error('❌ Error stopping transcription:', error);
      this.onError?.(`Failed to stop transcription: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return this.transcript;
    }
  }

  /**
   * Get current transcript
   */
  getTranscript(): string {
    return this.transcript;
  }

  /**
   * Get transcription state
   */
  getState(): TranscriptionState {
    return {
      isRecording: this.isRecording,
      transcript: this.transcript,
      duration: this.startTime ? Date.now() - this.startTime : 0,
      error: null
    };
  }

  /**
   * Clear transcript
   */
  clearTranscript(): void {
    this.transcript = '';
    this.onTranscriptUpdate?.('');
  }

  /**
   * Check if speech recognition is supported
   */
  static isSupported(): boolean {
    return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
  }
}

/**
 * Create a new transcription service instance
 */
export const createTranscriptionService = (config: TranscriptionConfig): TranscriptionService => {
  return new TranscriptionService(config);
}; 
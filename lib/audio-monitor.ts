/**
 * Audio Monitoring System
 * Provides real-time audio health monitoring and automatic recovery
 */

export interface AudioHealthStatus {
  isHealthy: boolean;
  microphoneEnabled: boolean;
  audioLevel: number;
  connectionQuality: 'good' | 'fair' | 'poor';
  issues: string[];
  lastCheck: Date;
}

export interface AudioRecoveryOptions {
  maxRetries: number;
  retryDelay: number;
  enableAutoRecovery: boolean;
}

class AudioMonitor {
  private isMonitoring = false;
  private isInCall = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array | null = null;
  private onHealthChange: ((status: AudioHealthStatus) => void) | undefined = undefined;
  private lastCheck: Date | undefined = undefined;
  private recoveryOptions: AudioRecoveryOptions = {
    maxRetries: 3,
    retryDelay: 2000,
    enableAutoRecovery: true
  };

  public setInCall(value: boolean) {
    this.isInCall = value;
  }

  constructor(options?: Partial<AudioRecoveryOptions>) {
    if (options) {
      this.recoveryOptions = { ...this.recoveryOptions, ...options };
    }
  }

  /**
   * Start monitoring audio health
   */
  async startMonitoring(
    onHealthChange?: (status: AudioHealthStatus) => void
  ): Promise<void> {
    if (this.isMonitoring) {
      console.log('Audio monitoring already active');
      return;
    }

    this.onHealthChange = onHealthChange;
    this.isMonitoring = true;

    console.log('🎤 Starting audio health monitoring...');

    // Initial health check
    await this.performHealthCheck();

    // Set up periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop monitoring audio health
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    console.log('🎤 Stopping audio health monitoring...');
    
    this.isMonitoring = false;
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.cleanupAudioContext();
  }

  /**
   * Perform a comprehensive audio health check
   */
  private async performHealthCheck(): Promise<AudioHealthStatus> {
    // Be passive during a call: do not call getUserMedia() or auto-recovery,
    // because that can steal the device or fight the SDK.
    if (this.isInCall) {
      const status: AudioHealthStatus = {
        isHealthy: true,                  // assume OK; SDK is in control
        microphoneEnabled: true,          // we don't inspect; avoid device grabs
        audioLevel: 0,                    // skip level measurement
        connectionQuality: 'good',
        issues: [],
        lastCheck: new Date(),
      };

      // Notify listeners *without* triggering recovery
      if (this.onHealthChange) this.onHealthChange(status);

      // Skip auto recovery entirely while in-call
      return status;
    }

    const issues: string[] = [];
    let microphoneEnabled = false;
    let audioLevel = 0;
    let connectionQuality: 'good' | 'fair' | 'poor' = 'good';

    try {
      // Check microphone permissions
      const permission = await navigator.permissions.query({ 
        name: 'microphone' as PermissionName 
      });

      if (permission.state === 'denied') {
        issues.push('Microphone permission denied');
      } else if (permission.state === 'prompt') {
        issues.push('Microphone permission not granted');
      }

      // Test microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000,
          channelCount: 1,
        },
        video: false
      });

      const audioTracks = stream.getAudioTracks();
      microphoneEnabled = audioTracks.length > 0;

      if (!microphoneEnabled) {
        issues.push('No audio tracks available');
      } else {
        // Measure audio levels
        audioLevel = await this.measureAudioLevel(stream);
        
        if (audioLevel < 5) {
          issues.push('Very low audio levels detected');
        } else if (audioLevel < 20) {
          issues.push('Low audio levels detected');
        }
      }

      // Check connection quality
      connectionQuality = await this.checkConnectionQuality();

      // Clean up test stream
      stream.getTracks().forEach(track => track.stop());

    } catch (error) {
      issues.push(`Audio access error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const status: AudioHealthStatus = {
      isHealthy: issues.length === 0 && microphoneEnabled && audioLevel > 5,
      microphoneEnabled,
      audioLevel,
      connectionQuality,
      issues,
      lastCheck: new Date()
    };

    console.log('🎤 Audio health check:', status);
    this.lastCheck = new Date();

    // Notify listeners
    if (this.onHealthChange !== undefined) {
      this.onHealthChange(status);
    }

    // Auto-recovery if enabled
    if (!this.isInCall && this.recoveryOptions.enableAutoRecovery && !status.isHealthy) {
      await this.attemptRecovery(status);
    }

    return status;
  }

  /**
   * Measure audio levels from a stream
   */
  private async measureAudioLevel(stream: MediaStream): Promise<number> {
    try {
      this.audioContext = new AudioContext();
      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      
      this.analyser.fftSize = 256;
      source.connect(this.analyser);
      
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(this.dataArray);
      
      const average = this.dataArray.reduce((a, b) => a + b) / this.dataArray.length;
      
      return average;
    } catch (error) {
      console.error('Error measuring audio level:', error);
      return 0;
    }
  }

  /**
   * Check network connection quality
   */
  private async checkConnectionQuality(): Promise<'good' | 'fair' | 'poor'> {
    const connection = (navigator as any).connection || 
                     (navigator as any).mozConnection || 
                     (navigator as any).webkitConnection;

    if (connection) {
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        return 'poor';
      } else if (connection.effectiveType === '3g' || connection.downlink < 2) {
        return 'fair';
      }
    }

    return 'good';
  }

  /**
   * Attempt to recover from audio issues
   */
  private async attemptRecovery(status: AudioHealthStatus): Promise<void> {
    console.log('🔄 Attempting audio recovery...');

    let retryCount = 0;
    const maxRetries = this.recoveryOptions.maxRetries;

    while (retryCount < maxRetries) {
      try {
        // Force refresh audio devices
        await this.forceRefreshAudio();
        
        // Wait before checking again
        await new Promise(resolve => setTimeout(resolve, this.recoveryOptions.retryDelay));
        
        // Check if recovery was successful
        const newStatus = await this.performHealthCheck();
        
        if (newStatus.isHealthy) {
          console.log('✅ Audio recovery successful');
          return;
        }
        
        retryCount++;
      } catch (error) {
        console.error(`❌ Audio recovery attempt ${retryCount + 1} failed:`, error);
        retryCount++;
      }
    }

    console.warn('⚠️ Audio recovery failed after all attempts');
  }

  /**
   * Force refresh audio devices
   */
  private async forceRefreshAudio(): Promise<void> {
    try {
      // Stop all existing audio streams
      const streams = await navigator.mediaDevices.enumerateDevices();
      const audioDevices = streams.filter(device => device.kind === 'audioinput');
      
      // Request new audio stream to refresh devices
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false
      });
      
      // Stop the test stream
      newStream.getTracks().forEach(track => track.stop());
      
      console.log('🔄 Audio devices refreshed');
    } catch (error) {
      console.error('Error refreshing audio devices:', error);
      throw error;
    }
  }

  /**
   * Clean up audio context
   */
  private cleanupAudioContext(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
    this.dataArray = null;
  }

  /**
   * Get current monitoring status
   */
  getMonitoringStatus(): { isActive: boolean; lastCheck?: Date } {
    return {
      isActive: this.isMonitoring,
      lastCheck: this.lastCheck
    };
  }

  /**
   * Update recovery options
   */
  updateRecoveryOptions(options: Partial<AudioRecoveryOptions>): void {
    this.recoveryOptions = { ...this.recoveryOptions, ...options };
  }
}

// Export singleton instance
export const audioMonitor = new AudioMonitor();

// Export utility functions
export const checkAudioPermissions = async (): Promise<boolean> => {
  try {
    const permission = await navigator.permissions.query({ 
      name: 'microphone' as PermissionName 
    });
    return permission.state === 'granted';
  } catch (error) {
    console.error('Error checking audio permissions:', error);
    return false;
  }
};

export const testMicrophoneAccess = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioTracks = stream.getAudioTracks();
    
    // Clean up
    stream.getTracks().forEach(track => track.stop());
    
    return { success: audioTracks.length > 0 };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

export const getAudioDevices = async (): Promise<MediaDeviceInfo[]> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'audioinput');
  } catch (error) {
    console.error('Error getting audio devices:', error);
    return [];
  }
}; 
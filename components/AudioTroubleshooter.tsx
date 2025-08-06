'use client';

import { useState, useEffect } from 'react';
import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import { Mic, MicOff, Volume2, VolumeX, Settings, RefreshCw, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const AudioTroubleshooter = () => {
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);
  const [audioIssues, setAudioIssues] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  const [audioHealth, setAudioHealth] = useState<'good' | 'warning' | 'error'>('good');
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  
  const call = useCall();
  const { useLocalParticipant } = useCallStateHooks();
  const localParticipant = useLocalParticipant();

  const checkAudioPermissions = async () => {
    setIsChecking(true);
    const issues: string[] = [];

    try {
      // Check if microphone permission is granted
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      
      if (permission.state === 'denied') {
        issues.push('Microphone permission is denied. Please enable it in browser settings.');
        setAudioHealth('error');
      } else if (permission.state === 'prompt') {
        issues.push('Microphone permission not granted. Please allow microphone access.');
        setAudioHealth('warning');
      }

      // Check if we can access microphone
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
      
      if (audioTracks.length === 0) {
        issues.push('No audio tracks detected. Check your microphone connection.');
        setAudioHealth('error');
      } else {
        // Check audio levels
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        source.connect(analyser);
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(dataArray);
        
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        if (average < 5) {
          issues.push('Audio levels are very low. Check your microphone volume and speak louder.');
          setAudioHealth('warning');
        } else {
          setAudioHealth('good');
        }

        // Clean up
        stream.getTracks().forEach(track => track.stop());
        audioContext.close();
      }

    } catch (error) {
      issues.push(`Error accessing microphone: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAudioHealth('error');
    }

    setAudioIssues(issues);
    setIsChecking(false);
    setLastCheck(new Date());
  };

  // Replace the resetAudioDevices function with a simple browser-based reset
  const resetAudioDevices = async () => {
    try {
      // Try to get a new audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false 
      });
      stream.getTracks().forEach(track => track.stop());
      // If this doesn't fix, suggest rejoining
      alert('If your microphone is still not working, please leave and rejoin the meeting.');
    } catch (error) {
      alert('Unable to access microphone. Please check your device and browser permissions, or leave and rejoin the meeting.');
    }
  };

  const forceRefreshAudio = async () => {
    try {
      console.log('Force refreshing audio...');
      
      // Stop all audio tracks
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
      
      // Force refresh audio devices
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false 
      });
      
      // Stop the test stream
      stream.getTracks().forEach(track => track.stop());
      
      console.log('Audio devices refreshed');
      setTimeout(() => {
        checkAudioPermissions();
      }, 1000);
      
    } catch (error) {
      console.error('Error force refreshing audio:', error);
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await checkAudioPermissions();
    } catch (error) {
      setAudioIssues(['Failed to get microphone permission. Please allow access in browser settings.']);
      setAudioHealth('error');
    }
  };

  const checkNetworkConnection = () => {
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    
    if (connection) {
      const issues: string[] = [];
      
      if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
        issues.push('Slow internet connection detected. This may affect audio quality.');
      }
      
      if (connection.downlink < 1) {
        issues.push('Very slow download speed. Audio may be choppy.');
      }
      
      return issues;
    }
    
    return [];
  };

  useEffect(() => {
    // Auto-check audio when component mounts
    checkAudioPermissions();
    
    // Set up periodic audio health checks
    const healthCheckInterval = setInterval(() => {
      if (showTroubleshooter) {
        checkAudioPermissions();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(healthCheckInterval);
  }, [showTroubleshooter]);

  const getHealthColor = () => {
    switch (audioHealth) {
      case 'good': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getHealthIcon = () => {
    switch (audioHealth) {
      case 'good': return <Volume2 className="w-4 h-4" />;
      case 'warning': return <AlertCircle className="w-4 h-4" />;
      case 'error': return <VolumeX className="w-4 h-4" />;
      default: return <Volume2 className="w-4 h-4" />;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => setShowTroubleshooter(!showTroubleshooter)}
        variant="outline"
        size="sm"
        className={`bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20 ${getHealthColor()}`}
      >
        {getHealthIcon()}
        <span className="ml-2">Audio</span>
      </Button>

      {showTroubleshooter && (
        <Card className="w-80 mt-2 bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center">
                <Volume2 className="w-4 h-4 mr-2" />
                Audio Troubleshooter
              </div>
              <div className={`text-xs ${getHealthColor()}`}>
                {audioHealth.toUpperCase()}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isChecking && (
              <div className="flex items-center text-white">
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking audio devices...
              </div>
            )}

            {lastCheck && (
              <div className="text-xs text-white/70">
                Last checked: {lastCheck.toLocaleTimeString()}
              </div>
            )}

            {audioIssues.length > 0 && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-red-400 font-medium">Audio Issues Detected</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-white text-sm">
                  {audioIssues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-2">
              <Button
                onClick={checkAudioPermissions}
                variant="outline"
                size="sm"
                className="w-full bg-white/10 text-white hover:bg-white/20"
                disabled={isChecking}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Audio
              </Button>

              <Button
                onClick={resetAudioDevices}
                variant="outline"
                size="sm"
                className="w-full bg-white/10 text-white hover:bg-white/20"
              >
                <Mic className="w-4 h-4 mr-2" />
                Reset Audio
              </Button>

              <Button
                onClick={forceRefreshAudio}
                variant="outline"
                size="sm"
                className="w-full bg-white/10 text-white hover:bg-white/20"
              >
                <Wifi className="w-4 h-4 mr-2" />
                Force Refresh
              </Button>

              <Button
                onClick={requestMicrophonePermission}
                variant="outline"
                size="sm"
                className="w-full bg-white/10 text-white hover:bg-white/20"
              >
                <Mic className="w-4 h-4 mr-2" />
                Request Permission
              </Button>
            </div>

            <div className="text-xs text-white/70 space-y-1">
              <p><strong>Quick Fixes:</strong></p>
              <p>• Refresh the page</p>
              <p>• Check browser microphone settings</p>
              <p>• Try a different browser</p>
              <p>• Clear browser cache</p>
              <p>• Check internet connection</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AudioTroubleshooter; 
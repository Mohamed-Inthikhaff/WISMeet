'use client';

import { useState, useEffect } from 'react';
import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import { Mic, MicOff, Volume2, VolumeX, Settings, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';


const AudioTroubleshooter = () => {
  const [showTroubleshooter, setShowTroubleshooter] = useState(false);
  const [audioIssues, setAudioIssues] = useState<string[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  
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
      } else if (permission.state === 'prompt') {
        issues.push('Microphone permission not granted. Please allow microphone access.');
      }

      // Check if we can access microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioTracks = stream.getAudioTracks();
      
      if (audioTracks.length === 0) {
        issues.push('No audio tracks detected. Check your microphone connection.');
      }

      // Check audio levels
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      source.connect(analyser);
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(dataArray);
      
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      if (average < 10) {
        issues.push('Audio levels are very low. Check your microphone volume.');
      }

      // Clean up
      stream.getTracks().forEach(track => track.stop());
      audioContext.close();

    } catch (error) {
      issues.push(`Error accessing microphone: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    setAudioIssues(issues);
    setIsChecking(false);
  };

  const resetAudioDevices = async () => {
    try {
      // Reset audio devices by refreshing the page
      window.location.reload();
    } catch (error) {
      console.error('Error resetting audio devices:', error);
    }
  };

  const requestMicrophonePermission = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      await checkAudioPermissions();
    } catch (error) {
      setAudioIssues(['Failed to get microphone permission. Please allow access in browser settings.']);
    }
  };

  useEffect(() => {
    // Auto-check audio when component mounts
    checkAudioPermissions();
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => setShowTroubleshooter(!showTroubleshooter)}
        variant="outline"
        size="sm"
        className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
      >
        <Settings className="w-4 h-4 mr-2" />
        Audio Issues
      </Button>

      {showTroubleshooter && (
        <Card className="w-80 mt-2 bg-white/10 backdrop-blur-sm border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Volume2 className="w-4 h-4 mr-2" />
              Audio Troubleshooter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isChecking && (
              <div className="flex items-center text-white">
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking audio devices...
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
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AudioTroubleshooter; 
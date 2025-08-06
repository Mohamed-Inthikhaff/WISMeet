'use client';

import { useState, useEffect } from 'react';
import { useCall } from '@stream-io/video-react-sdk';
import { Mic, MicOff, AlertCircle } from 'lucide-react';

interface AudioMonitorProps {
  className?: string;
}

const AudioMonitor = ({ className = '' }: AudioMonitorProps) => {
  const [audioStatus, setAudioStatus] = useState<'good' | 'warning' | 'error'>('good');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isChecking, setIsChecking] = useState(false);
  
  const call = useCall();

  useEffect(() => {
    if (!call) return;

    let failCount = 0;
    const maxFails = 3;
    let checkInterval: NodeJS.Timeout;

    const checkAudio = async () => {
      if (isChecking) return;
      setIsChecking(true);

      try {
        // Simple microphone access test
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          video: false
        });

        const audioTracks = stream.getAudioTracks();
        stream.getTracks().forEach(track => track.stop());

        if (audioTracks.length === 0) {
          failCount++;
          console.warn(`🎤 Audio check failed (${failCount}/${maxFails})`);
          
          if (failCount >= maxFails) {
            setAudioStatus('error');
            setErrorMessage('Microphone not working. Please refresh the page.');
          } else {
            setAudioStatus('warning');
            setErrorMessage('Audio issues detected. Please check your microphone.');
          }
        } else {
          // Audio is working
          failCount = 0;
          setAudioStatus('good');
          setErrorMessage('');
        }
      } catch (error) {
        failCount++;
        console.warn('Audio check error:', error);
        
        if (failCount >= maxFails) {
          setAudioStatus('error');
          setErrorMessage('Cannot access microphone. Check permissions.');
        } else {
          setAudioStatus('warning');
          setErrorMessage('Audio access issues detected.');
        }
      }

      setIsChecking(false);
    };

    // Check every 30 seconds (less frequent)
    checkInterval = setInterval(checkAudio, 30000);

    return () => {
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, [call, isChecking]);

  if (audioStatus === 'good') return null;

  return (
    <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
      audioStatus === 'error' 
        ? 'bg-red-600 text-white border border-red-500' 
        : 'bg-yellow-600 text-white border border-yellow-500'
    } ${className}`}>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          {audioStatus === 'error' ? (
            <MicOff className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">
            {audioStatus === 'error' ? 'Audio Error' : 'Audio Warning'}
          </span>
        </div>
        
        {isChecking && (
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        )}
      </div>
      
      {errorMessage && (
        <p className="text-xs mt-2 opacity-90 max-w-xs">{errorMessage}</p>
      )}
      
      <button
        onClick={() => window.location.reload()}
        className="text-xs mt-2 underline hover:no-underline"
      >
        Refresh Page
      </button>
    </div>
  );
};

export default AudioMonitor; 
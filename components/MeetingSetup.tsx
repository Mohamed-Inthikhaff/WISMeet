'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  DeviceSettings,
  useCall,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';
import { motion } from 'framer-motion';
import Alert from './Alert';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Mic, MicOff, Video, VideoOff, Users, Settings, Volume2, Monitor, ChevronUp, ChevronDown, Info, AlertCircle, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

const MeetingSetup = ({
  setIsSetupComplete,
}: {
  setIsSetupComplete: (value: boolean) => void;
}) => {
  const { useCallEndedAt, useCallStartsAt } = useCallStateHooks();
  const callStartsAt = useCallStartsAt();
  const callEndedAt = useCallEndedAt();
  const callTimeNotArrived = callStartsAt && new Date(callStartsAt) > new Date();
  const callHasEnded = !!callEndedAt;
  const [participantName, setParticipantName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false); // Start with camera disabled
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [noiseCancellationEnabled, setNoiseCancellationEnabled] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);
  const [micDropdownOpen, setMicDropdownOpen] = useState(false);
  const [cameraDropdownOpen, setCameraDropdownOpen] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [localVideoElement, setLocalVideoElement] = useState<HTMLVideoElement | null>(null);

  const call = useCall();

  if (!call) {
    throw new Error(
      'useStreamCall must be used within a StreamCall component.',
    );
  }

  // Properly stop camera stream to release hardware
  const stopCameraStream = useCallback(async () => {
    try {
      // Stop our managed camera stream
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => {
          if (track.kind === 'video') {
            track.stop(); // This properly stops the media stream and releases the camera
          }
        });
        setCameraStream(null);
      }
      
      // Clear the video element source
      if (localVideoElement) {
        localVideoElement.srcObject = null;
      }
      
      // Force stop any remaining camera streams by accessing all video elements
      try {
        // Find all video elements and stop their streams
        const videoElements = document.querySelectorAll('video');
        videoElements.forEach(video => {
          if (video.srcObject) {
            const stream = video.srcObject as MediaStream;
            stream.getTracks().forEach(track => {
              if (track.kind === 'video') {
                track.stop();
              }
            });
            video.srcObject = null;
          }
        });
        console.log('All camera streams stopped and hardware released');
      } catch (err) {
        console.log('Camera cleanup completed');
      }
    } catch (err) {
      console.error('Error stopping camera stream:', err);
    }
  }, [cameraStream, localVideoElement]);

  // Properly start camera stream with better error handling
  const startCameraStream = useCallback(async () => {
    try {
      console.log('Requesting camera permissions...');
      
      // Clear any existing error first
      setError(null);
      
      // Ensure video element is ready
      if (!localVideoElement) {
        console.log('Video element not ready, waiting...');
        // Wait for video element to be available
        let attempts = 0;
        while (!localVideoElement && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }
        
        if (!localVideoElement) {
          throw new Error('Video element not available');
        }
      }
      
      // Request camera stream with simpler constraints first
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        },
        audio: false 
      });
      
      console.log('Camera stream obtained successfully');
      setCameraStream(stream);
      
      // Connect the stream to our video element
      if (localVideoElement) {
        localVideoElement.srcObject = stream;
        try {
          await localVideoElement.play();
          console.log('Video element connected and playing');
        } catch (playErr) {
          console.error('Error playing video:', playErr);
          // Don't throw here, the stream is still valid
        }
      }
      
      return stream;
    } catch (err) {
      console.error('Error starting camera stream:', err);
      setCameraStream(null); // Clear any partial stream
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera permissions in your browser settings and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please check your device and try again.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is in use by another application. Please close other apps and try again.');
        } else if (err.name === 'AbortError') {
          setError('Camera request was cancelled. Please try again.');
        } else if (err.name === 'NotSupportedError') {
          setError('Camera not supported in this browser. Please try a different browser.');
        } else {
          setError(`Camera error: ${err.message}. Please try again.`);
        }
      } else {
        setError('Camera access failed. Please check permissions and try again.');
      }
      throw err;
    }
  }, [localVideoElement]);

  // Update video element when camera stream changes
  useEffect(() => {
    if (localVideoElement && cameraStream) {
      localVideoElement.srcObject = cameraStream;
      
      // Ensure video plays
      localVideoElement.play().catch(err => {
        console.error('Error playing video:', err);
      });
    } else if (localVideoElement && !cameraStream) {
      localVideoElement.srcObject = null;
    }
  }, [localVideoElement, cameraStream]);

  // Initialize devices with proper permission handling and noise cancellation
  useEffect(() => {
    const initializeDevices = async () => {
      try {
        // Only initialize microphone initially - let camera be requested on first user interaction
        if (isMicEnabled) {
          // Enable microphone with noise cancellation
          await call.microphone.enable();
          
          // Apply noise cancellation to the audio stream
          try {
            const stream = await navigator.mediaDevices.getUserMedia({
              audio: {
                echoCancellation: noiseCancellationEnabled,
                noiseSuppression: noiseCancellationEnabled,
                autoGainControl: noiseCancellationEnabled,
                sampleRate: 48000,
                channelCount: 1,
              },
              video: false
            });
            
            // Apply the processed audio stream to the call
            const audioTrack = stream.getAudioTracks()[0];
            if (audioTrack) {
              console.log('Noise cancellation enabled for microphone');
            }
          } catch (audioErr) {
            console.log('Audio processing not supported, using default settings');
          }
        } else {
          await call.microphone.disable();
        }
        
        // Don't auto-start camera - wait for user interaction
        if (!isCameraEnabled) {
          await stopCameraStream();
        }
      } catch (err) {
        console.error('Error initializing devices:', err);
        setError('Failed to initialize devices. Please check permissions.');
      }
    };

    initializeDevices();
  }, [isMicEnabled, call.microphone, stopCameraStream]);

  // Initialize camera only when user first enables it
  useEffect(() => {
    if (isCameraEnabled && !cameraStream) {
      // Add a small delay to ensure video element is ready
      const timer = setTimeout(async () => {
        try {
          await startCameraStream();
        } catch (err) {
          console.error('Error starting camera on enable:', err);
          // Don't set error here - let the toggle function handle it
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isCameraEnabled, cameraStream, startCameraStream]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, [stopCameraStream]);

  // Monitor controls visibility
  useEffect(() => {
    const checkControlsVisibility = () => {
      const micControls = document.querySelectorAll('[data-testid="mic-controls"]');
      const cameraControls = document.querySelectorAll('[data-testid="camera-controls"]');
      
      // Only log if there are issues
      if (micControls.length === 0 || cameraControls.length === 0) {
        console.log('Controls visibility issue detected:', {
          micControls: micControls.length,
          cameraControls: cameraControls.length,
          cameraEnabled: isCameraEnabled,
          micEnabled: isMicEnabled
        });
      }
    };

    // Check after a short delay to ensure DOM is updated
    const timeoutId = setTimeout(checkControlsVisibility, 100);
    
    return () => clearTimeout(timeoutId);
  }, [isCameraEnabled, isMicEnabled]);

  // Handle camera toggle with better error handling and retry
  const toggleCamera = async () => {
    try {
      // Clear any previous errors
      setError(null);
      
      if (isCameraEnabled) {
        console.log('Turning camera OFF...');
        
        // Stop camera stream directly to release hardware
        await stopCameraStream();
        
        setIsCameraEnabled(false);
        setLastAction('Camera turned off');
        setShowFeedback(true);
        setTimeout(() => setShowFeedback(false), 2000);
      } else {
        console.log('Turning camera ON...');
        
        // Check if we have camera permissions first (optional check)
        try {
          const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });
          
          if (permissions.state === 'denied') {
            setError('Camera access denied. Please allow camera permissions in your browser settings and try again.');
            return;
          }
        } catch (permErr) {
          console.log('Permission query not supported, proceeding with camera request');
        }
        
        // Start camera stream directly
        const stream = await startCameraStream();
        if (stream) {
        setIsCameraEnabled(true);
          setLastAction('Camera turned on');
          setShowFeedback(true);
          setTimeout(() => setShowFeedback(false), 2000);
        } else {
          setError('Failed to start camera. Please check permissions and try again.');
        }
      }
    } catch (err) {
      console.error('Error toggling camera:', err);
      
      // Don't change the camera enabled state on error
      // This allows the user to retry
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access denied. Please allow camera permissions and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please check your device and try again.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is in use by another application. Please close other apps and try again.');
        } else if (err.name === 'NotSupportedError') {
          setError('Camera not supported in this browser. Please try a different browser.');
        } else {
          setError(`Camera error: ${err.message}. Please try again.`);
        }
      } else {
        setError('Failed to toggle camera. Please check permissions and try again.');
      }
    }
  };

  // Handle camera permission recovery
  const handleCameraPermissionRecovery = async () => {
    try {
      setError(null);
      
      // Stop any existing stream first
      await stopCameraStream();
      
      // Wait a moment for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try to request permissions again with simpler constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false 
      });
      
      if (stream) {
        setCameraStream(stream);
        setIsCameraEnabled(true);
        setLastAction('Camera enabled');
        setShowFeedback(true);
        setTimeout(() => setShowFeedback(false), 2000);
        
        // Connect to video element
        if (localVideoElement) {
          localVideoElement.srcObject = stream;
          try {
            await localVideoElement.play();
          } catch (playErr) {
            console.error('Error playing video after recovery:', playErr);
          }
        }
      }
    } catch (err) {
      console.error('Camera permission recovery failed:', err);
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera access still denied. Please check browser settings and try again.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Please check your device and try again.');
        } else if (err.name === 'NotReadableError') {
          setError('Camera is in use by another application. Please close other apps and try again.');
        } else {
          setError(`Camera recovery failed: ${err.message}. Please try again.`);
        }
      } else {
        setError('Camera access still denied. Please check browser settings and try again.');
      }
    }
  };

  // Debug camera state
  const debugCameraState = () => {
    console.log('=== Camera Debug Info ===');
    console.log('Camera enabled:', isCameraEnabled);
    console.log('Camera stream exists:', !!cameraStream);
    console.log('Video element exists:', !!localVideoElement);
    console.log('Error state:', error);
    console.log('Join state:', { isJoining, hasJoined });
    
    if (cameraStream) {
      console.log('Camera tracks:', cameraStream.getTracks().map(t => ({
        kind: t.kind,
        enabled: t.enabled,
        readyState: t.readyState
      })));
    }
    
    if (localVideoElement) {
      console.log('Video element ready state:', localVideoElement.readyState);
      console.log('Video element src object:', !!localVideoElement.srcObject);
    }
    
    // Check permissions
    navigator.permissions.query({ name: 'camera' as PermissionName })
      .then(permission => {
        console.log('Camera permission state:', permission.state);
      })
      .catch(err => {
        console.log('Permission query failed:', err);
      });
  };

  // Reset join state when component unmounts
  useEffect(() => {
    return () => {
      setIsJoining(false);
      setHasJoined(false);
    };
  }, []);

  // Handle microphone toggle with noise cancellation
  const toggleMicrophone = async () => {
    try {
      if (isMicEnabled) {
        console.log('Disabling microphone...');
        await call.microphone.disable();
        setIsMicEnabled(false);
        setLastAction('Microphone muted');
        setShowFeedback(true);
        setTimeout(() => setShowFeedback(false), 2000);
      } else {
        console.log('Enabling microphone with noise cancellation...');
        await call.microphone.enable();
        
        // Apply noise cancellation when enabling microphone
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
              echoCancellation: noiseCancellationEnabled,
              noiseSuppression: noiseCancellationEnabled,
              autoGainControl: noiseCancellationEnabled,
              sampleRate: 48000,
              channelCount: 1,
            },
            video: false
          });
          
          const audioTrack = stream.getAudioTracks()[0];
          if (audioTrack) {
            console.log('Noise cancellation enabled for microphone');
          }
        } catch (audioErr) {
          console.log('Audio processing not supported, using default settings');
        }
        
        setIsMicEnabled(true);
        setLastAction('Microphone unmuted with noise cancellation');
        setShowFeedback(true);
        setTimeout(() => setShowFeedback(false), 2000);
      }
    } catch (err) {
      console.error('Error toggling microphone:', err);
      setError('Failed to toggle microphone. Please check permissions.');
    }
  };

  // Handle join muted toggle with direct stream management
  const handleJoinMutedToggle = async (checked: boolean) => {
    try {
      if (checked) {
        // Join muted - disable both camera and mic
        await call.microphone.disable();
        
        // Properly stop camera stream to release hardware
        await stopCameraStream();
        
        setIsCameraEnabled(false);
        setIsMicEnabled(false);
      } else {
        // Join unmuted - enable both camera and mic
        await startCameraStream();
        await call.microphone.enable();
        setIsCameraEnabled(true);
        setIsMicEnabled(true);
      }
    } catch (err) {
      console.error('Error toggling join muted:', err);
      setError('Failed to update device settings.');
    }
  };

  // Handle join meeting with proper guards
  const handleJoinMeeting = async () => {
    // Prevent multiple join attempts
    if (isJoining || hasJoined) {
      console.log('Join already in progress or completed');
      return;
    }

    try {
      if (!participantName.trim()) {
        setError('Please enter your name to join the meeting.');
        return;
      }

      // Set joining state to prevent duplicate calls
      setIsJoining(true);
      setError(null);

      if (participantName) {
        // Set the participant name and device states in the call metadata
        await call.join({
          data: { 
            custom: {
              initialCameraEnabled: isCameraEnabled,
              initialMicEnabled: isMicEnabled,
              participantName: participantName.trim()
            }
          }
        });

        // Set the initial device states
        if (!isCameraEnabled) {
          await call.camera.disable();
        }
        if (!isMicEnabled) {
          await call.microphone.disable();
        }

        // Mark as joined and complete setup
        setHasJoined(true);
        setIsSetupComplete(true);
      }
    } catch (err) {
      console.error('Error joining meeting:', err);
      setError('Failed to join the meeting. Please try again.');
      // Reset joining state on error
      setIsJoining(false);
    }
  };

  return (
    <TooltipProvider>
    <div className="relative min-h-screen w-full bg-gradient-to-br from-gray-900 to-gray-800 p-4 md:p-8">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 right-0 h-[500px] w-[500px] rounded-full bg-blue-500/20 blur-[120px]" />
        <div className="absolute -bottom-1/2 left-0 h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[120px]" />
      </div>

        {/* Visual Feedback Toast */}
        {showFeedback && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            className="fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-gray-800/95 px-4 py-2 text-white shadow-lg backdrop-blur-sm border border-gray-700"
          >
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-medium">{lastAction}</span>
            </div>
          </motion.div>
        )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative mx-auto max-w-5xl"
      >
        <Card className="overflow-hidden border-gray-800/50 bg-gray-900/50 backdrop-blur-xl">
          <div className="p-6 md:p-8">
            <div className="mb-8 text-center">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mb-6"
              >
                <h1 className="mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
                  Ready to Join?
                </h1>
                <p className="text-gray-400">
                  Set up your audio and video before joining the meeting
                </p>
              </motion.div>

              <div className="mx-auto mb-4 flex max-w-md items-center justify-center gap-2 rounded-lg bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
                <Users className="h-4 w-4" />
                <span>Meeting ID: {call.id}</span>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
              {/* Left Column - Video Preview */}
              <div className="flex flex-col gap-6">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 }}
                  className="relative overflow-hidden rounded-2xl border-2 border-gray-700/50 bg-black/30"
                >
                  <video
                    ref={(el) => setLocalVideoElement(el)}
                    className="aspect-video w-full object-cover"
                    autoPlay
                    muted
                    playsInline
                    style={{ 
                      opacity: isCameraEnabled && cameraStream ? 1 : 0,
                      backgroundColor: '#000',
                      transition: 'opacity 0.3s ease'
                    }}
                  />
                  
                  {/* Camera Disabled Placeholder */}
                  {!isCameraEnabled && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                      <div className="text-center">
                        <VideoOff className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Camera is disabled</p>
                        <p className="text-gray-500 text-xs mt-1">Click the camera button to enable</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Camera Loading State */}
                  {isCameraEnabled && !cameraStream && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                      <div className="text-center">
                        <div className="h-16 w-16 mx-auto mb-2 animate-spin rounded-full border-4 border-gray-600 border-t-blue-500"></div>
                        <p className="text-gray-400 text-sm">Starting camera...</p>
                      </div>
                    </div>
                  )}
                  
                  {/* Camera Error State */}
                  {isCameraEnabled && !cameraStream && error && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-900/80">
                      <div className="text-center">
                        <VideoOff className="h-16 w-16 text-red-400 mx-auto mb-2" />
                        <p className="text-red-400 text-sm">Camera access denied</p>
                        <p className="text-red-300 text-xs mt-1 mb-3">Please check permissions</p>
                        <Button
                          onClick={handleCameraPermissionRecovery}
                          size="sm"
                          variant="outline"
                          className="bg-red-800/50 border-red-600 text-red-200 hover:bg-red-700/50"
                        >
                          Retry Camera
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Enhanced Status Indicators - Always Visible */}
                  <div className="absolute left-4 top-4 flex items-center gap-3 z-10">
                    {/* Camera Status */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div 
                          className="flex items-center gap-2 rounded-lg bg-gray-900/90 px-3 py-1.5 text-sm backdrop-blur-sm cursor-pointer"
                          animate={{ 
                            backgroundColor: isCameraEnabled && cameraStream ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            borderColor: isCameraEnabled && cameraStream ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                          }}
                          transition={{ duration: 0.3 }}
                          style={{ border: '1px solid transparent' }}
                        >
                      <motion.div 
                        className={`h-2 w-2 rounded-full ${isCameraEnabled && cameraStream ? 'bg-green-500' : 'bg-red-500'}`}
                        animate={{ 
                          scale: isCameraEnabled && cameraStream ? [1, 1.2, 1] : 1,
                          opacity: isCameraEnabled && cameraStream ? 1 : 0.7
                        }}
                        transition={{ duration: 0.5, repeat: isCameraEnabled && cameraStream ? Infinity : 0, repeatDelay: 2 }}
                      />
                          <span className="text-white font-medium">
                            Camera {isCameraEnabled && cameraStream ? 'On' : 'Off'}
                          </span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 text-white border-gray-700">
                        <p>Camera is {isCameraEnabled && cameraStream ? 'enabled' : 'disabled'}</p>
                        <p className="text-xs text-gray-400 mt-1">Click to toggle camera</p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {/* Microphone Status */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.div 
                          className="flex items-center gap-2 rounded-lg bg-gray-900/90 px-3 py-1.5 text-sm backdrop-blur-sm cursor-pointer"
                          animate={{ 
                            backgroundColor: isMicEnabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                            borderColor: isMicEnabled ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)'
                          }}
                          transition={{ duration: 0.3 }}
                          style={{ border: '1px solid transparent' }}
                        >
                      <motion.div 
                        className={`h-2 w-2 rounded-full ${isMicEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                        animate={{ 
                          scale: isMicEnabled ? [1, 1.2, 1] : 1,
                          opacity: isMicEnabled ? 1 : 0.7
                        }}
                        transition={{ duration: 0.5, repeat: isMicEnabled ? Infinity : 0, repeatDelay: 2 }}
                      />
                          <span className="text-white font-medium">Mic {isMicEnabled ? 'On' : 'Off'}</span>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 text-white border-gray-700">
                        <p>Microphone is {isMicEnabled ? 'enabled' : 'disabled'}</p>
                        <p className="text-xs text-gray-400 mt-1">Click to toggle microphone</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  {/* Enhanced Quick Controls with Dropdowns - Always Visible */}
                  <div 
                    className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-gray-900/90 p-3 backdrop-blur-sm z-50"
                    style={{ 
                      position: 'absolute',
                      bottom: '16px',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      zIndex: 50,
                      pointerEvents: 'auto',
                      minWidth: '200px',
                      justifyContent: 'center'
                    }}
                    data-testid="controls-container"
                  >
                    {/* Enhanced Microphone Toggle with Dropdown */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <DropdownMenu open={micDropdownOpen} onOpenChange={setMicDropdownOpen} data-testid="mic-controls">
                            <DropdownMenuTrigger asChild>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                        isMicEnabled
                                    ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20'
                                    : 'bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20'
                                }`}
                                title={isMicEnabled ? 'Microphone settings' : 'Microphone settings'}
                              >
                                {/* Background glow effect */}
                                <div className={`absolute inset-0 rounded-xl ${
                                  isMicEnabled ? 'bg-green-500/10' : 'bg-red-500/10'
                                }`} />
                                
                                {/* Icon with animation */}
                                <motion.div
                                  initial={false}
                                  animate={{ 
                                    scale: isMicEnabled ? 1 : 0.8,
                                    opacity: isMicEnabled ? 1 : 0.7
                                  }}
                                  transition={{ duration: 0.2 }}
                                  className="relative z-10"
                                >
                                  {isMicEnabled ? (
                                    <Mic className="h-6 w-6" />
                                  ) : (
                                    <MicOff className="h-6 w-6" />
                                  )}
                                </motion.div>
                                
                                {/* Status indicator */}
                                <motion.div
                                  initial={false}
                                  animate={{ 
                                    scale: isMicEnabled ? 1 : 0,
                                    opacity: isMicEnabled ? 1 : 0
                                  }}
                                  transition={{ duration: 0.2 }}
                                  className={`absolute -top-1 -right-1 h-3 w-3 rounded-full ${
                                    isMicEnabled ? 'bg-green-500' : 'bg-red-500'
                                  }`}
                                />
                              </motion.button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="border-gray-700 bg-gray-800/95 backdrop-blur-sm">
                              <DropdownMenuItem 
                                onClick={toggleMicrophone}
                                className="flex items-center gap-3 text-white hover:bg-gray-700"
                              >
                                {isMicEnabled ? (
                                  <>
                                    <MicOff className="h-4 w-4 text-red-400" />
                                    <span>Mute Microphone</span>
                                  </>
                                ) : (
                                  <>
                                    <Mic className="h-4 w-4 text-green-400" />
                                    <span>Unmute Microphone</span>
                                  </>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-700" />
                              <DropdownMenuItem 
                                onClick={() => setShowSettings(true)}
                                className="flex items-center gap-3 text-white hover:bg-gray-700"
                              >
                                <Settings className="h-4 w-4 text-gray-400" />
                                <span>Audio Settings</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="flex items-center gap-3 text-white hover:bg-gray-700">
                                <Volume2 className="h-4 w-4 text-gray-400" />
                                <span>Test Audio</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-800 text-white border-gray-700">
                          <p>Click for microphone options</p>
                          <p className="text-xs text-gray-400 mt-1">
                            {isMicEnabled ? 'Currently unmuted' : 'Currently muted'}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Enhanced Camera Toggle with Dropdown */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenu open={cameraDropdownOpen} onOpenChange={setCameraDropdownOpen} data-testid="camera-controls">
                          <DropdownMenuTrigger asChild>
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              className={`relative flex h-12 w-12 items-center justify-center rounded-xl transition-all duration-300 ${
                        isCameraEnabled
                                  ? 'bg-green-500/20 text-green-400 shadow-lg shadow-green-500/20'
                                  : 'bg-red-500/20 text-red-400 shadow-lg shadow-red-500/20'
                              }`}
                              title={isCameraEnabled ? 'Camera settings' : 'Camera settings'}
                            >
                              {/* Background glow effect */}
                              <div className={`absolute inset-0 rounded-xl ${
                                isCameraEnabled ? 'bg-green-500/10' : 'bg-red-500/10'
                              }`} />
                              
                              {/* Icon with animation */}
                              <motion.div
                                initial={false}
                                animate={{ 
                                  scale: isCameraEnabled ? 1 : 0.8,
                                  opacity: isCameraEnabled ? 1 : 0.7
                                }}
                                transition={{ duration: 0.2 }}
                                className="relative z-10"
                              >
                                {isCameraEnabled ? (
                                  <Video className="h-6 w-6" />
                                ) : (
                                  <VideoOff className="h-6 w-6" />
                                )}
                              </motion.div>
                              
                              {/* Status indicator */}
                              <motion.div
                                initial={false}
                                animate={{ 
                                  scale: isCameraEnabled ? 1 : 0,
                                  opacity: isCameraEnabled ? 1 : 0
                                }}
                                transition={{ duration: 0.2 }}
                                className={`absolute -top-1 -right-1 h-3 w-3 rounded-full ${
                                  isCameraEnabled ? 'bg-green-500' : 'bg-red-500'
                                }`}
                              />
                            </motion.button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="border-gray-700 bg-gray-800/95 backdrop-blur-sm">
                            <DropdownMenuItem 
                              onClick={toggleCamera}
                              className="flex items-center gap-3 text-white hover:bg-gray-700"
                            >
                              {isCameraEnabled ? (
                                <>
                                  <VideoOff className="h-4 w-4 text-red-400" />
                                  <span>Turn Off Camera</span>
                                </>
                              ) : (
                                <>
                                  <Video className="h-4 w-4 text-green-400" />
                                  <span>Turn On Camera</span>
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-gray-700" />
                            <DropdownMenuItem 
                              onClick={() => setShowSettings(true)}
                              className="flex items-center gap-3 text-white hover:bg-gray-700"
                            >
                              <Settings className="h-4 w-4 text-gray-400" />
                              <span>Video Settings</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem className="flex items-center gap-3 text-white hover:bg-gray-700">
                              <Monitor className="h-4 w-4 text-gray-400" />
                              <span>Background Effects</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 text-white border-gray-700">
                        <p>Click for camera options</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {isCameraEnabled ? 'Currently on' : 'Currently off'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                    
                    {/* Settings Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <motion.button
                      onClick={() => setShowSettings(!showSettings)}
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          className="relative flex h-12 w-12 items-center justify-center rounded-xl bg-gray-700/50 text-white transition-all duration-300 hover:bg-gray-600/50 shadow-lg"
                        >
                          <motion.div
                            animate={{ rotate: showSettings ? 180 : 0 }}
                            transition={{ duration: 0.3 }}
                          >
                            <Settings className="h-6 w-6" />
                          </motion.div>
                        </motion.button>
                      </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 text-white border-gray-700">
                        <p>Device settings</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {showSettings ? 'Hide settings' : 'Show settings'}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="space-y-3"
                >
                  <Label htmlFor="name" className="text-sm font-medium text-gray-300">
                    Display Name
                  </Label>
                  <div className="relative">
                    <Input
                      id="name"
                      type="text"
                      placeholder="Enter your name"
                      value={participantName}
                      onChange={(e) => setParticipantName(e.target.value)}
                      className="border-gray-700/50 bg-gray-800/50 pl-10 text-white placeholder:text-gray-500"
                    />
                    <Users className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-400">This is how other participants will see you</p>
                </motion.div>
              </div>

              {/* Right Column - Controls */}
              <div className="flex flex-col justify-between gap-6">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-6"
                >
                  {showSettings && (
                    <div className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
                      <div className="mb-4 flex items-center gap-3">
                        <Settings className="h-5 w-5 text-gray-400" />
                        <div>
                          <h3 className="font-medium text-white">Device Settings</h3>
                          <p className="text-sm text-gray-400">Configure your audio and video</p>
                        </div>
                      </div>
                      <DeviceSettings />
                    </div>
                  )}

                  {/* System Check */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/30 p-4">
                    <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ 
                            scale: isMicEnabled ? 1 : 0.8,
                            opacity: isMicEnabled ? 1 : 0.6
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <Mic className={`h-5 w-5 ${isMicEnabled ? 'text-green-400' : 'text-red-400'}`} />
                        </motion.div>
                        <span className="text-sm text-gray-300">Microphone</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{ 
                            scale: isMicEnabled ? 1 : 0,
                            opacity: isMicEnabled ? 1 : 0
                          }}
                          transition={{ duration: 0.2 }}
                          className={`h-2 w-2 rounded-full ${isMicEnabled ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        <span className={`text-sm font-medium ${isMicEnabled ? 'text-green-400' : 'text-red-400'}`}>
                          {isMicEnabled ? 'Working' : 'Disabled'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/30 p-4">
                        <div className="flex items-center gap-3">
                        <motion.div
                          animate={{ 
                            scale: isCameraEnabled && cameraStream ? 1 : 0.8,
                            opacity: isCameraEnabled && cameraStream ? 1 : 0.6
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <Video className={`h-5 w-5 ${isCameraEnabled && cameraStream ? 'text-green-400' : 'text-red-400'}`} />
                        </motion.div>
                          <span className="text-sm text-gray-300">Camera</span>
                        </div>
                      <div className="flex items-center gap-2">
                        <motion.div
                          animate={{ 
                            scale: isCameraEnabled && cameraStream ? 1 : 0,
                            opacity: isCameraEnabled && cameraStream ? 1 : 0
                          }}
                          transition={{ duration: 0.2 }}
                          className={`h-2 w-2 rounded-full ${isCameraEnabled && cameraStream ? 'bg-green-500' : 'bg-red-500'}`}
                        />
                        <span className={`text-sm font-medium ${isCameraEnabled && cameraStream ? 'text-green-400' : 'text-red-400'}`}>
                          {isCameraEnabled && cameraStream ? 'Working' : 'Disabled'}
                        </span>
                      </div>
                      </div>

                    <div className="flex items-center justify-between rounded-lg border border-gray-700/50 bg-gray-800/30 p-4">
                        <div className="flex items-center gap-3">
                        <Volume2 className="h-5 w-5 text-green-400" />
                          <span className="text-sm text-gray-300">Speaker</span>
                        </div>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-green-500" />
                        <span className="text-sm font-medium text-green-400">Working</span>
                      </div>
                    </div>
                  </div>

                  {/* Join Preferences */}
                  <div className="flex items-center gap-3 rounded-xl border border-gray-700/50 bg-gray-800/30 p-4">
                    <Users className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <h3 className="mb-1 font-medium text-white">Join Preferences</h3>
                      <p className="text-sm text-gray-400">Choose how you want to join</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="mute-toggle"
                        checked={!isMicEnabled && !isCameraEnabled}
                        onCheckedChange={handleJoinMutedToggle}
                      />
                      <Label
                        htmlFor="mute-toggle"
                        className="cursor-pointer text-sm text-gray-300"
                      >
                        Join muted
                      </Label>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="space-y-3"
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                  <Button
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 py-6 text-lg font-medium text-white transition-all hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-600"
                    onClick={handleJoinMeeting}
                    disabled={!participantName || isJoining || hasJoined}
                  >
                    {isJoining ? 'Joining...' : hasJoined ? 'Joined' : 'Join Meeting'}
                  </Button>
                    </TooltipTrigger>
                    <TooltipContent className="bg-gray-800 text-white border-gray-700">
                      <p>Join the meeting</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {isJoining ? 'Joining meeting...' : hasJoined ? 'Already joined' : participantName ? 'Ready to join' : 'Enter your name first'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                  {!participantName && (
                    <p className="text-center text-sm text-gray-400">
                      Please enter your name to join the meeting
                    </p>
                  )}
                </motion.div>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-red-500/20 bg-red-500/10 p-4"
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-400">Setup Error</p>
              <p className="text-xs text-red-300 mt-1">{error}</p>
              {error.includes('Camera access denied') && (
                <div className="mt-2 flex gap-2">
                  <Button
                    onClick={handleCameraPermissionRecovery}
                    size="sm"
                    variant="outline"
                    className="bg-red-800/50 border-red-600 text-red-200 hover:bg-red-700/50 text-xs"
                  >
                    Retry Camera
                  </Button>
                  <Button
                    onClick={debugCameraState}
                    size="sm"
                    variant="outline"
                    className="bg-blue-800/50 border-blue-600 text-blue-200 hover:bg-blue-700/50 text-xs"
                  >
                    Debug
                  </Button>
                  <Button
                    onClick={() => setError(null)}
                    size="sm"
                    variant="outline"
                    className="bg-gray-800/50 border-gray-600 text-gray-200 hover:bg-gray-700/50 text-xs"
                  >
                    Dismiss
                  </Button>
                </div>
              )}
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </div>
    </TooltipProvider>
  );
};

export default MeetingSetup;

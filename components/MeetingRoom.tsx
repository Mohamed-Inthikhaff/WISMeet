'use client';
import { useState, useEffect } from 'react';
import {
  CallControls,
  CallParticipantsList,
  CallStatsButton,
  CallingState,
  PaginatedGridLayout,
  SpeakerLayout,
  useCallStateHooks,
  useCall,
} from '@stream-io/video-react-sdk';
import { useRouter, useSearchParams } from 'next/navigation';
import { Users, LayoutList, X, ChevronLeft, Video, VideoOff, Mic, MicOff, Square, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import Loader from './Loader';
import EndCallButton from './EndCallButton';

import { cn } from '@/lib/utils';

type CallLayoutType = 'grid' | 'speaker-left' | 'speaker-right';

const MeetingRoom = () => {
  const searchParams = useSearchParams();
  const isPersonalRoom = !!searchParams.get('personal');
  const router = useRouter();
  const [layout, setLayout] = useState<CallLayoutType>('speaker-left');
  const [showParticipants, setShowParticipants] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [isProcessingRecording, setIsProcessingRecording] = useState(false);
  const [recordingStopTime, setRecordingStopTime] = useState<Date | null>(null);
  const { useCallCallingState, useLocalParticipant } = useCallStateHooks();
  const callingState = useCallCallingState();
  const localParticipant = useLocalParticipant();
  const call = useCall();

  // Get participants from call state
  const participants = call?.state.participants || [];

  // Check if user is meeting owner (can start/stop recording)
  const isMeetingOwner = localParticipant && call?.state.createdBy && 
    localParticipant.userId === call.state.createdBy.id;

  // Check if recording is enabled for this call
  const canRecord = call?.state.custom?.allowRecording !== false;



  // Initialize devices based on setup preferences
  useEffect(() => {
    if (call) {
      const initialCameraEnabled = call.state.custom?.initialCameraEnabled;
      const initialMicEnabled = call.state.custom?.initialMicEnabled;

      if (initialCameraEnabled === false) {
        call.camera.disable();
      }
      if (initialMicEnabled === false) {
        call.microphone.disable();
      }
    }
  }, [call]);

  // Monitor participant state changes
  useEffect(() => {
    if (!call) return;

    // Monitor recording state
    const checkRecordingState = () => {
      const wasRecording = isRecording;
      const isCurrentlyRecording = !!call.state.recording;
      
      if (isCurrentlyRecording !== wasRecording) {
        setIsRecording(isCurrentlyRecording);
        
        // If recording just stopped, set processing state
        if (wasRecording && !isCurrentlyRecording) {
          setIsProcessingRecording(true);
          setRecordingStopTime(new Date());
        }
        
        // If recording started, clear processing state
        if (!wasRecording && isCurrentlyRecording) {
          setIsProcessingRecording(false);
          setRecordingStopTime(null);
        }
      }
      
      // Check if we're still processing a recording that was stopped
      if (isProcessingRecording && recordingStopTime) {
        const timeSinceStop = Date.now() - recordingStopTime.getTime();
        if (timeSinceStop > 60000) { // 60 seconds - longer timeout
          setIsProcessingRecording(false);
          setRecordingStopTime(null);
        }
      }
    };

    checkRecordingState();
    
    // Set up interval to check recording state - much less frequent
    const interval = setInterval(checkRecordingState, 10000); // Changed to 10 seconds

    return () => {
      clearInterval(interval);
    };
  }, [call, isRecording, isProcessingRecording, recordingStopTime]);

  // Handle recording start/stop
  const toggleRecording = async () => {
    if (!call || !isMeetingOwner) {
      return;
    }

    try {
      setRecordingError(null);
      
      if (isRecording) {
        await call.stopRecording();
      } else {
        // Check if recording is already in progress
        if (call.state.recording) {
          setRecordingError('Recording is already in progress');
          return;
        }
        
        await call.startRecording();
      }
    } catch (error) {
      console.error('Recording error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown recording error';
      setRecordingError(`Failed to toggle recording: ${errorMessage}`);
    }
  };

  if (callingState !== CallingState.JOINED) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Loader />
        </motion.div>
      </div>
    );
  }

  const CallLayout = () => {
    switch (layout) {
      case 'grid':
        return (
          <div className="h-full w-full">
            <PaginatedGridLayout />
          </div>
        );
      case 'speaker-right':
      case 'speaker-left':
        return (
          <div className="h-full w-full">
            <SpeakerLayout
              participantsBarPosition={layout === 'speaker-right' ? 'left' : 'right'}
            />
          </div>
        );
      default:
        return (
          <div className="h-full w-full">
            <SpeakerLayout participantsBarPosition="right" />
          </div>
        );
    }
  };

  return (
    <div className="relative flex h-screen flex-col bg-gradient-to-br from-gray-900 to-gray-800">

      
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 right-0 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute -bottom-1/2 left-0 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      {/* Recording Status Indicator */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-lg bg-red-500/90 px-4 py-2 text-white backdrop-blur-sm"
        >
          <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
          <span className="text-sm font-medium">Recording</span>
        </motion.div>
      )}

      {/* Recording Processing Indicator */}
      {isProcessingRecording && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-16 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-lg bg-yellow-500/90 px-4 py-2 text-white backdrop-blur-sm"
        >
          <div className="h-2 w-2 rounded-full bg-white animate-spin" />
          <span className="text-sm font-medium">Processing Recording...</span>
          <button 
            onClick={() => window.location.reload()}
            className="ml-2 text-xs underline hover:no-underline"
          >
            Check Now
          </button>
        </motion.div>
      )}

      {/* Recording Success Indicator */}
      {!isRecording && !isProcessingRecording && call?.state.recording && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-16 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-lg bg-green-500/90 px-4 py-2 text-white backdrop-blur-sm"
        >
          <div className="h-2 w-2 rounded-full bg-white" />
          <span className="text-sm font-medium">Recording Ready</span>
          <button 
            onClick={() => window.location.reload()}
            className="ml-2 text-xs underline hover:no-underline"
          >
            View
          </button>
        </motion.div>
      )}

      {/* Recording Error */}
      {recordingError && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-1/2 z-50 -translate-x-1/2 flex items-center gap-2 rounded-lg bg-red-500/90 px-4 py-2 text-white backdrop-blur-sm"
        >
          <span className="text-sm font-medium">{recordingError}</span>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Video Layout */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative flex flex-1 items-center justify-center p-4"
          style={{ 
            willChange: 'auto', // Prevent unnecessary GPU acceleration
            transform: 'translateZ(0)' // Force hardware acceleration
          }}
        >
          <div className="relative h-full w-full max-w-[1440px]">
            <CallLayout />
          </div>
        </motion.div>

        {/* Participants List */}
        <AnimatePresence>
          {showParticipants && (
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20 }}
              className="fixed right-0 top-0 bottom-0 z-50 w-full border-l border-gray-800 bg-gray-900/95 backdrop-blur-xl md:relative md:w-80"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-gray-800 p-4">
                  <h2 className="text-lg font-semibold text-white">Participants ({participants.length})</h2>
                  <button
                    onClick={() => setShowParticipants(false)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <CallParticipantsList 
                  onClose={() => setShowParticipants(false)}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Participants Toggle */}
        <AnimatePresence>
          {!showParticipants && (
            <motion.button
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onClick={() => setShowParticipants(true)}
              className="fixed right-4 top-1/2 z-40 -translate-y-1/2 rounded-l-xl bg-gray-800/90 p-2 text-white backdrop-blur-sm hover:bg-gray-700 md:hidden"
            >
              <ChevronLeft className="h-6 w-6" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Controls */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative flex flex-wrap items-center justify-center gap-2 bg-gray-900/90 p-4 backdrop-blur-sm md:gap-4"
      >
        <CallControls 
          onLeave={() => router.push('/')}
        />

        {/* Custom Recording Control */}
        {isMeetingOwner && canRecord && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleRecording}
            disabled={recordingError !== null}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors md:px-4",
              isRecording
                ? "bg-red-500 text-white hover:bg-red-600"
                : "bg-gray-800 text-white hover:bg-gray-700"
            )}
          >
            {isRecording ? (
              <>
                <Square className="h-5 w-5" />
                <span className="hidden text-sm md:inline">Stop Recording</span>
              </>
            ) : (
              <>
                <Circle className="h-5 w-5" />
                <span className="hidden text-sm md:inline">Start Recording</span>
              </>
            )}
          </motion.button>
        )}

        {/* Manual Refresh Button */}
        {isProcessingRecording && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-white transition-colors hover:bg-blue-700 md:px-4"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="hidden text-sm md:inline">Check Recordings</span>
          </motion.button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-lg bg-gray-800 px-3 py-2 text-white transition-colors hover:bg-gray-700 md:px-4">
            <LayoutList className="h-5 w-5" />
            <span className="hidden text-sm md:inline">Layout</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-gray-700 bg-gray-800">
            {['Grid', 'Speaker-Left', 'Speaker-Right'].map((item) => (
              <DropdownMenuItem
                key={item}
                onClick={() => setLayout(item.toLowerCase() as CallLayoutType)}
                className="text-white hover:bg-gray-700"
              >
                {item}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <CallStatsButton />

        <button
          onClick={() => setShowParticipants((prev) => !prev)}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors md:px-4",
            showParticipants 
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-800 text-white hover:bg-gray-700"
          )}
        >
          <Users className="h-5 w-5" />
          <span className="hidden text-sm md:inline">Participants ({participants.length})</span>
        </button>

        {!isPersonalRoom && <EndCallButton />}
      </motion.div>
    </div>
  );
};

export default MeetingRoom;

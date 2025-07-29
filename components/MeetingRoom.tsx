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
import { Users, LayoutList, X, ChevronLeft, Mic, MicOff, Video, VideoOff, ChevronUp } from 'lucide-react';
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
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCameraEnabled, setIsCameraEnabled] = useState(true);
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const call = useCall();

  // Get participants from call state
  const participants = call?.state.participants || [];

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
  }, [call]);

  // Toggle microphone
  const toggleMicrophone = async () => {
    if (!call) return;
    try {
      if (isMicEnabled) {
        await call.microphone.disable();
        setIsMicEnabled(false);
      } else {
        await call.microphone.enable();
        setIsMicEnabled(true);
      }
    } catch (err) {
      console.error('Error toggling microphone:', err);
    }
  };

  // Toggle camera
  const toggleCamera = async () => {
    if (!call) return;
    try {
      if (isCameraEnabled) {
        await call.camera.disable();
        setIsCameraEnabled(false);
      } else {
        await call.camera.enable();
        setIsCameraEnabled(true);
      }
    } catch (err) {
      console.error('Error toggling camera:', err);
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
        return null;
    }
  };

  return (
    <div className="relative flex h-screen flex-col bg-gradient-to-br from-gray-900 to-gray-800">

      
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 right-0 h-[500px] w-[500px] rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute -bottom-1/2 left-0 h-[500px] w-[500px] rounded-full bg-purple-500/10 blur-[120px]" />
      </div>

      {/* Main Content */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Video Layout */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="relative flex flex-1 items-center justify-center p-4"
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
        {/* Custom Pill-Style Microphone Toggle */}
        <motion.button
          onClick={toggleMicrophone}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`relative flex h-10 items-center overflow-hidden rounded-full transition-all duration-300 ${
            isMicEnabled 
              ? 'bg-blue-600 shadow-lg shadow-blue-600/25' 
              : 'bg-gray-700 shadow-lg'
          }`}
          aria-pressed={isMicEnabled}
          aria-label={isMicEnabled ? 'Mute microphone' : 'Unmute microphone'}
        >
          {/* Left half - Icon */}
          <motion.div
            className="flex h-full w-12 items-center justify-center"
            animate={{
              backgroundColor: isMicEnabled ? '#1e40af' : '#374151'
            }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              animate={{ 
                scale: isMicEnabled ? 1 : 0.8,
                opacity: isMicEnabled ? 1 : 0.7
              }}
              transition={{ duration: 0.2 }}
            >
              {isMicEnabled ? (
                <Mic className="h-5 w-5 text-white" />
              ) : (
                <MicOff className="h-5 w-5 text-white" />
              )}
            </motion.div>
          </motion.div>

          {/* Right half - Chevron */}
          <motion.div
            className="flex h-full w-8 items-center justify-center"
            animate={{
              backgroundColor: isMicEnabled ? '#1e40af' : '#dc2626'
            }}
            transition={{ duration: 0.3 }}
          >
            <ChevronUp className="h-4 w-4 text-white" />
          </motion.div>
        </motion.button>

        {/* Custom Pill-Style Camera Toggle */}
        <motion.button
          onClick={toggleCamera}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className={`relative flex h-10 items-center overflow-hidden rounded-full transition-all duration-300 ${
            isCameraEnabled 
              ? 'bg-blue-600 shadow-lg shadow-blue-600/25' 
              : 'bg-gray-700 shadow-lg'
          }`}
          aria-pressed={isCameraEnabled}
          aria-label={isCameraEnabled ? 'Turn off camera' : 'Turn on camera'}
        >
          {/* Left half - Icon */}
          <motion.div
            className="flex h-full w-12 items-center justify-center"
            animate={{
              backgroundColor: isCameraEnabled ? '#1e40af' : '#374151'
            }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              animate={{ 
                scale: isCameraEnabled ? 1 : 0.8,
                opacity: isCameraEnabled ? 1 : 0.7
              }}
              transition={{ duration: 0.2 }}
            >
              {isCameraEnabled ? (
                <Video className="h-5 w-5 text-white" />
              ) : (
                <VideoOff className="h-5 w-5 text-white" />
              )}
            </motion.div>
          </motion.div>

          {/* Right half - Chevron */}
          <motion.div
            className="flex h-full w-8 items-center justify-center"
            animate={{
              backgroundColor: isCameraEnabled ? '#1e40af' : '#dc2626'
            }}
            transition={{ duration: 0.3 }}
          >
            <ChevronUp className="h-4 w-4 text-white" />
          </motion.div>
        </motion.button>

        {/* Leave Call Button */}
        <motion.button
          onClick={() => router.push('/')}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex h-10 items-center gap-2 rounded-full bg-red-600 px-4 text-white transition-all duration-300 hover:bg-red-700 shadow-lg"
          aria-label="Leave call"
        >
          <span className="text-sm font-medium">Leave</span>
        </motion.button>

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

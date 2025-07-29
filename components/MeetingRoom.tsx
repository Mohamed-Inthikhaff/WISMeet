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
import { 
  Users, 
  LayoutList, 
  X, 
  ChevronLeft, 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  Phone, 
  PhoneOff,
  Monitor,
  MonitorOff,
  MessageSquare,
  Settings,
  Share2,
  MoreHorizontal,
  Volume2,
  VolumeX
} from 'lucide-react';
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
  const [showChat, setShowChat] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
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
        setIsVideoOff(true);
      }
      if (initialMicEnabled === false) {
        call.microphone.disable();
        setIsMuted(true);
      }
    }
  }, [call]);

  // Monitor participant state changes
  useEffect(() => {
    if (!call) return;
  }, [call]);

  // Handle microphone toggle
  const toggleMicrophone = async () => {
    if (!call) return;
    
    try {
      if (isMuted) {
        await call.microphone.enable();
        setIsMuted(false);
      } else {
        await call.microphone.disable();
        setIsMuted(true);
      }
    } catch (error) {
      console.error('Error toggling microphone:', error);
    }
  };

  // Handle camera toggle
  const toggleCamera = async () => {
    if (!call) return;
    
    try {
      if (isVideoOff) {
        await call.camera.enable();
        setIsVideoOff(false);
      } else {
        await call.camera.disable();
        setIsVideoOff(true);
      }
    } catch (error) {
      console.error('Error toggling camera:', error);
    }
  };

  // Handle screen sharing toggle (placeholder for future implementation)
  const toggleScreenSharing = async () => {
    if (!call) return;
    
    try {
      // TODO: Implement screen sharing when Stream Video SDK supports it
      setIsScreenSharing(!isScreenSharing);
      console.log('Screen sharing feature coming soon');
    } catch (error) {
      console.error('Error toggling screen sharing:', error);
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

      {/* Enhanced Controls Toolbar */}
      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative bg-gray-900/95 backdrop-blur-xl border-t border-gray-800/50"
      >
        {/* Primary Controls - Center */}
        <div className="flex items-center justify-center gap-3 p-4">
          {/* Left Side - Audio/Video Controls */}
          <div className="flex items-center gap-2">
            {/* Microphone Button */}
            <button
              onClick={toggleMicrophone}
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 hover:scale-105",
                isMuted 
                  ? "bg-red-500 text-white hover:bg-red-600" 
                  : "bg-gray-700 text-white hover:bg-gray-600"
              )}
              title={isMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </button>

            {/* Camera Button */}
            <button
              onClick={toggleCamera}
              className={cn(
                "flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 hover:scale-105",
                isVideoOff 
                  ? "bg-red-500 text-white hover:bg-red-600" 
                  : "bg-gray-700 text-white hover:bg-gray-600"
              )}
              title={isVideoOff ? "Turn on camera" : "Turn off camera"}
            >
              {isVideoOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
            </button>
          </div>

          {/* Center - Main Controls */}
          <div className="flex items-center gap-3">
            {/* Screen Share Button */}
            <button
              onClick={toggleScreenSharing}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105",
                isScreenSharing 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "bg-gray-700 text-white hover:bg-gray-600"
              )}
              title={isScreenSharing ? "Stop sharing screen" : "Share screen"}
            >
              {isScreenSharing ? <MonitorOff className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
              <span className="hidden md:inline text-sm font-medium">Screen Share</span>
            </button>

            {/* Chat Button */}
            <button
              onClick={() => setShowChat(!showChat)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105",
                showChat 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "bg-gray-700 text-white hover:bg-gray-600"
              )}
              title="Toggle chat"
            >
              <MessageSquare className="h-4 w-4" />
              <span className="hidden md:inline text-sm font-medium">Chat</span>
            </button>
          </div>

          {/* Right Side - Meeting Controls */}
          <div className="flex items-center gap-2">
            {/* Participants Button */}
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105",
                showParticipants 
                  ? "bg-blue-600 text-white hover:bg-blue-700" 
                  : "bg-gray-700 text-white hover:bg-gray-600"
              )}
              title="Show participants"
            >
              <Users className="h-4 w-4" />
              <span className="hidden md:inline text-sm font-medium">Participants ({participants.length})</span>
            </button>

            {/* Layout Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-700 text-white transition-all duration-200 hover:bg-gray-600 hover:scale-105">
                <LayoutList className="h-4 w-4" />
                <span className="hidden md:inline text-sm font-medium">Layout</span>
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

            {/* More Options */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-700 text-white transition-all duration-200 hover:bg-gray-600 hover:scale-105">
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="border-gray-700 bg-gray-800">
                <DropdownMenuItem className="text-white hover:bg-gray-700">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white hover:bg-gray-700">
                  <Volume2 className="h-4 w-4 mr-2" />
                  Audio Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="text-white hover:bg-gray-700">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Meeting Link
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Secondary Controls - Bottom */}
        <div className="flex items-center justify-center gap-4 pb-4 px-4">
          {/* Leave Call Button */}
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-700 text-white transition-all duration-200 hover:bg-gray-600 hover:scale-105"
            title="Leave call"
          >
            <PhoneOff className="h-4 w-4" />
            <span className="text-sm font-medium">Leave Call</span>
          </button>

          {/* End Call for Everyone (Host Only) */}
          {!isPersonalRoom && <EndCallButton />}
        </div>
      </motion.div>
    </div>
  );
};

export default MeetingRoom;

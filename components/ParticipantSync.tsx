'use client';

import { useEffect, useState } from 'react';
import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';

const ParticipantSync = () => {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const call = useCall();
  const { user } = useUser();
  const [syncStatus, setSyncStatus] = useState<string>('Initializing...');

  // Get participants from call state
  const participants = call?.state.participants || [];

  useEffect(() => {
    if (!call || !user) return;

    const checkParticipantSync = () => {
      const currentUser = participants.find((p: any) => p.userId === user.id);
      const otherParticipants = participants.filter((p: any) => p.userId !== user.id);
      
      console.log('Current user in call:', currentUser);
      console.log('Other participants:', otherParticipants);
      console.log('Total participants:', participants.length);

      if (currentUser) {
        setSyncStatus(`Connected - ${participants.length} participants`);
      } else {
        setSyncStatus('Not properly connected');
      }
    };

    // Check immediately
    checkParticipantSync();

    // Set up interval to monitor sync
    const interval = setInterval(checkParticipantSync, 5000);

    return () => clearInterval(interval);
  }, [call, user, participants]);

  useEffect(() => {
    if (!call) return;

    const handleCallUpdated = (event: any) => {
      console.log('🔄 Call updated:', event);
    };

    // Subscribe to call events
    call.on('call.updated', handleCallUpdated);

    return () => {
      call.off('call.updated', handleCallUpdated);
    };
  }, [call, participants.length]);

  // Debug info (only in development)
  if (process.env.NODE_ENV === 'development') {
    return (
      <div className="fixed top-4 left-4 z-50 rounded-lg bg-gray-900/90 p-3 text-xs text-white backdrop-blur-sm">
        <div className="font-semibold">Sync Status: {syncStatus}</div>
        <div>Participants: {participants.length}</div>
        <div>Call ID: {call?.id}</div>
        <div>User ID: {user?.id}</div>
      </div>
    );
  }

  return null;
};

export default ParticipantSync; 
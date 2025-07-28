'use client';

import { useEffect, useState } from 'react';
import { useCall, useCallStateHooks } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';
import { Button } from './ui/button';
import { Card } from './ui/card';

const ParticipantVisibilityTest = () => {
  const { useCallCallingState } = useCallStateHooks();
  const callingState = useCallCallingState();
  const call = useCall();
  const { user } = useUser();
  const [testResults, setTestResults] = useState<string[]>([]);

  // Get participants from call state
  const participants = call?.state.participants || [];

  const runVisibilityTest = () => {
    const results: string[] = [];
    
    // Test 1: Check if current user is in participants list
    const currentUserInCall = participants.find((p: any) => p.userId === user?.id);
    if (currentUserInCall) {
      results.push('✅ Current user found in participants list');
    } else {
      results.push('❌ Current user NOT found in participants list');
    }

    // Test 2: Check if other participants are visible
    const otherParticipants = participants.filter((p: any) => p.userId !== user?.id);
    if (otherParticipants.length > 0) {
      results.push(`✅ Found ${otherParticipants.length} other participants`);
      otherParticipants.forEach((p: any) => {
        results.push(`  - ${p.user?.name || p.userId} (${p.publishedTracks?.length || 0} tracks)`);
      });
    } else {
      results.push('❌ No other participants visible');
    }

    // Test 3: Check call state
    if (call) {
      results.push(`✅ Call participants: ${call.state.participants.length}`);
      results.push(`✅ Call members: ${call.state.members.length}`);
    } else {
      results.push('❌ No call object available');
    }

    // Test 4: Check published tracks
    participants.forEach((p: any) => {
      const audioTrack = p.publishedTracks?.find((t: any) => t.type === 'audio');
      const videoTrack = p.publishedTracks?.find((t: any) => t.type === 'video');
      results.push(`👤 ${p.user?.name || p.userId}: Audio=${!!audioTrack}, Video=${!!videoTrack}`);
    });

    setTestResults(results);
  };

  useEffect(() => {
    // Run test automatically when participants change
    const timer = setTimeout(runVisibilityTest, 2000);
    return () => clearTimeout(timer);
  }, [participants, call?.state]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 max-w-sm border-gray-700 bg-gray-900/95 p-4 text-xs text-white backdrop-blur-sm">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Participant Visibility Test</h3>
        <Button 
          size="sm" 
          onClick={runVisibilityTest}
          className="h-6 px-2 text-xs"
        >
          Run Test
        </Button>
      </div>
      <div className="max-h-40 overflow-y-auto space-y-1">
        {testResults.map((result, index) => (
          <div key={index} className="text-xs">
            {result}
          </div>
        ))}
      </div>
    </Card>
  );
};

export default ParticipantVisibilityTest; 
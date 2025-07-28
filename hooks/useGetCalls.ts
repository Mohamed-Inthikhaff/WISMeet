'use client';

import { useEffect, useState } from 'react';
import { useStreamVideoClient, Call, CallRecording } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';

export const useGetCalls = () => {
  const client = useStreamVideoClient();
  const { user, isLoaded: isUserLoaded } = useUser();
  const [endedCalls, setEndedCalls] = useState<Call[]>([]);
  const [upcomingCalls, setUpcomingCalls] = useState<Call[]>([]);
  const [callRecordings, setCallRecordings] = useState<Call[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchCalls = async () => {
      if (!client || !isUserLoaded || !user) {
        setIsLoading(true);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch upcoming calls
        const upcomingCallsResponse = await client.queryCalls({
          filter_conditions: {
            starts_at: { $gt: new Date().toISOString() },
            $or: [
              { created_by_user_id: user.id },
              { members: { $in: [user.id] } }
            ]
          },
          sort: [{ field: 'starts_at', direction: 1 }],
          limit: 10,
        });

        // Fetch ended calls
        const endedCallsResponse = await client.queryCalls({
          filter_conditions: {
            ended_at: { $exists: true },
            $or: [
              { created_by_user_id: user.id },
              { members: { $in: [user.id] } }
            ]
          },
          sort: [{ field: 'ended_at', direction: -1 }],
          limit: 10,
        });

        // Fetch calls with recordings
        const recordingsResponse = await client.queryCalls({
          filter_conditions: {
            ended_at: { $exists: true },
            recording_status: 'ready',
            $or: [
              { created_by_user_id: user.id },
              { members: { $in: [user.id] } }
            ]
          },
          sort: [{ field: 'ended_at', direction: -1 }],
          limit: 10,
        });

        // Initialize and load call objects
        const initializeCallObjects = async (calls: any[]) => {
          const callObjects = await Promise.all(
            calls.map(async (call) => {
              const callObj = client.call('default', call.id);
              await callObj.get();
              // Set the start time in the call state
              if (call.starts_at) {
                callObj.state.startsAt = new Date(call.starts_at);
              }
              // Set the description in custom data if available
              if (call.custom?.description) {
                callObj.state.custom = {
                  ...callObj.state.custom,
                  description: call.custom.description
                };
              }
              return callObj;
            })
          );
          return callObjects;
        };

        // Initialize all call objects
        const [upcomingCallObjects, endedCallObjects, recordingCallObjects] = await Promise.all([
          initializeCallObjects(upcomingCallsResponse.calls),
          initializeCallObjects(endedCallsResponse.calls),
          initializeCallObjects(recordingsResponse.calls)
        ]);

        setUpcomingCalls(upcomingCallObjects);
        setEndedCalls(endedCallObjects);
        setCallRecordings(recordingCallObjects);

      } catch (err) {
        console.error('Error fetching calls:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCalls();

    // Set up periodic refresh
    const intervalId = setInterval(fetchCalls, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [client, user, isUserLoaded]);

  return {
    endedCalls,
    upcomingCalls,
    callRecordings,
    isLoading,
  };
};
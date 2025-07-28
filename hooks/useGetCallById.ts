import { useEffect, useState } from 'react';
import { Call, useStreamVideoClient } from '@stream-io/video-react-sdk';

export const useGetCallById = (id: string | string[]) => {
  const [call, setCall] = useState<Call>();
  const [isCallLoading, setIsCallLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const client = useStreamVideoClient();

  useEffect(() => {
    if (!client) return;
    
    const loadCall = async () => {
      try {
        setIsCallLoading(true);
        setError(null);
        
        // https://getstream.io/video/docs/react/guides/querying-calls/#filters
        const { calls } = await client.queryCalls({ filter_conditions: { id } });

        if (calls.length > 0) {
          const foundCall = calls[0];
          console.log('Found call:', foundCall);
          console.log('Call participants:', foundCall.state.participants);
          console.log('Call members:', foundCall.state.members);
          setCall(foundCall);
        } else {
          setError('Call not found');
        }

        setIsCallLoading(false);
      } catch (error) {
        console.error('Error loading call:', error);
        setError('Failed to load call');
        setIsCallLoading(false);
      }
    };

    loadCall();
  }, [client, id]);

  return { call, isCallLoading, error };
};

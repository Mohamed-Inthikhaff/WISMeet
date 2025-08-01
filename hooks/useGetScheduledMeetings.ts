'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

interface ScheduledMeeting {
  _id: string;
  meetingId: string;
  title: string;
  description?: string;
  startTime: string;
  endTime?: string;
  hostId: string;
  participants: string[];
  status: 'scheduled' | 'active' | 'ended';
  createdAt: string;
  updatedAt: string;
}

export const useGetScheduledMeetings = () => {
  const { user, isLoaded: isUserLoaded } = useUser();
  const [scheduledMeetings, setScheduledMeetings] = useState<ScheduledMeeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchScheduledMeetings = async () => {
      if (!isUserLoaded || !user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch('/api/meetings/scheduled');
        const data = await response.json();
        
        if (data.success) {
          setScheduledMeetings(data.meetings);
        } else {
          console.error('Error fetching scheduled meetings:', data.error);
        }
      } catch (error) {
        console.error('Error fetching scheduled meetings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchScheduledMeetings();

    // Set up periodic refresh
    const intervalId = setInterval(fetchScheduledMeetings, 30000); // Refresh every 30 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [user, isUserLoaded]);

  return {
    scheduledMeetings,
    isLoading,
  };
}; 
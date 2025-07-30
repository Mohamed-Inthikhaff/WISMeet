'use client';

import { StreamVideo, StreamVideoClient, StreamTheme } from '@stream-io/video-react-sdk';
import { useUser } from '@clerk/nextjs';
import { useEffect, useState, ReactNode, useMemo, useRef } from 'react';
import { tokenProvider } from '@/actions/stream.actions';
import Loader from '@/components/Loader';

const API_KEY = process.env.NEXT_PUBLIC_STREAM_API_KEY;

const StreamVideoProvider = ({ children }: { children: ReactNode }) => {
  const [error, setError] = useState<string | null>(null);
  const { user, isLoaded } = useUser();
  const initializationRef = useRef(false);

  // Create client only once per user session using useMemo
  const videoClient = useMemo(() => {
    if (!isLoaded || !user || !API_KEY) {
      return null;
    }

    // Prevent multiple initializations
    if (initializationRef.current) {
      return null;
    }

    try {
      console.log('StreamVideoProvider: Creating new Stream client for user:', user.id);
      initializationRef.current = true;

      const client = new StreamVideoClient({
        apiKey: API_KEY,
        user: {
          id: user.id,
          name: user.firstName || user.username || user.id,
          image: user.imageUrl,
        },
        tokenProvider,
      });

      console.log('StreamVideoProvider: Stream client created successfully');
      return client;
    } catch (error) {
      console.error('StreamVideoProvider: Error creating Stream client:', error);
      setError('Failed to initialize video client');
      return null;
    }
  }, [user?.id, isLoaded]); // Only depend on user ID and loading state

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (videoClient) {
        console.log('StreamVideoProvider: Cleaning up video client');
        videoClient.disconnectUser();
        initializationRef.current = false;
      }
    };
  }, [videoClient]);

  // Reset initialization flag when user changes
  useEffect(() => {
    if (!user) {
      initializationRef.current = false;
    }
  }, [user?.id]);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center text-white">
          <h2 className="text-xl font-bold mb-4">Video Client Error</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <p className="text-sm text-gray-500">Please check your environment variables and try again.</p>
        </div>
      </div>
    );
  }

  if (!videoClient) {
    if (!isLoaded) {
      return <Loader />;
    }
    if (!user) {
      return <Loader />;
    }
    return <Loader />;
  }

  return (
    <StreamVideo client={videoClient}>
      <StreamTheme>{children}</StreamTheme>
    </StreamVideo>
  );
};

export default StreamVideoProvider;

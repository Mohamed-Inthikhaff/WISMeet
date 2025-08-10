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

  const videoClient = useMemo(() => {
    if (!isLoaded || !user || !API_KEY) return null;
    try {
      return new StreamVideoClient({
        apiKey: API_KEY,
        user: { id: user.id, name: user.firstName || user.username || user.id, image: user.imageUrl },
        tokenProvider,
      });
    } catch (e) {
      console.error('StreamVideoProvider: client create error', e);
      setError('Failed to initialize video client');
      return null;
    }
  }, [isLoaded, user?.id, API_KEY]);

  useEffect(() => {
    return () => { if (videoClient) videoClient.disconnectUser(); };
  }, [videoClient]);

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

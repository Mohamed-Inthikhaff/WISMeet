import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import io, { Socket } from 'socket.io-client';
import { Message } from '@/lib/types/chat';

interface UseChatProps {
  meetingId: string;
}

interface UseChatReturn {
  messages: Message[];
  sendMessage: (message: string) => Promise<void>;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  typingUsers: Array<{ userId: string; userName: string }>;
}

export const useChat = ({ meetingId }: UseChatProps): UseChatReturn => {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typingUsers, setTypingUsers] = useState<Array<{ userId: string; userName: string }>>([]);

  // Load existing messages
  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/chat/messages?meetingId=${meetingId}&limit=50`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }
      
      const data = await response.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load chat history');
    } finally {
      setIsLoading(false);
    }
  }, [meetingId]);

  // Initialize socket connection
  useEffect(() => {
    if (!user || !meetingId) return;

    const newSocket = io(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
      
      // Join the meeting room
      newSocket.emit('join_meeting', {
        meetingId,
        userId: user.id,
        userName: user.fullName || user.emailAddresses[0].emailAddress
      });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
    });

    newSocket.on('new_message', (message: Message) => {
      setMessages(prev => [...prev, message]);
    });

    newSocket.on('user_typing', (data: { userId: string; userName: string }) => {
      setTypingUsers(prev => {
        const existing = prev.find(u => u.userId === data.userId);
        if (existing) return prev;
        return [...prev, { userId: data.userId, userName: data.userName }];
      });
    });

    newSocket.on('user_stopped_typing', (data: { userId: string }) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
    });

    newSocket.on('user_joined', (data: { userId: string; userName: string }) => {
      // Add system message for user joined
      const systemMessage: Message = {
        meetingId,
        senderId: 'system',
        senderName: 'System',
        message: `${data.userName} joined the meeting`,
        messageType: 'system',
        timestamp: new Date(),
        isEdited: false,
        reactions: []
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    newSocket.on('user_left', (data: { userId: string; userName: string }) => {
      // Add system message for user left
      const systemMessage: Message = {
        meetingId,
        senderId: 'system',
        senderName: 'System',
        message: `${data.userName} left the meeting`,
        messageType: 'system',
        timestamp: new Date(),
        isEdited: false,
        reactions: []
      };
      setMessages(prev => [...prev, systemMessage]);
    });

    newSocket.on('error', (data: { message: string }) => {
      setError(data.message);
    });

    setSocket(newSocket);

    // Load existing messages
    fetchMessages();

    return () => {
      newSocket.disconnect();
    };
  }, [user, meetingId, fetchMessages]);

  // Send message function
  const sendMessage = useCallback(async (message: string) => {
    if (!message.trim() || !user || !socket) return;

    const messageData = {
      meetingId,
      message: message.trim(),
      senderId: user.id,
      senderName: user.fullName || user.emailAddresses[0].emailAddress,
      senderAvatar: user.imageUrl
    };

    try {
      // Send via socket for real-time
      socket.emit('send_message', messageData);
      
      // Also save via API for persistence
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageData)
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  }, [meetingId, user, socket]);

  return {
    messages,
    sendMessage,
    isConnected,
    isLoading,
    error,
    typingUsers
  };
}; 
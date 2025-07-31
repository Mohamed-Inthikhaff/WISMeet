'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import io, { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageSquare, 
  X, 
  Send, 
  Smile, 
  MoreVertical,
  Clock,
  User
} from 'lucide-react';
import { Message, MessageReaction } from '@/lib/types/chat';
import { format } from 'date-fns';

interface MeetingChatProps {
  meetingId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface TypingUser {
  userId: string;
  userName: string;
}

const MeetingChat = ({ meetingId, isOpen, onClose }: MeetingChatProps) => {
  const { user } = useUser();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Load existing messages
  const fetchMessages = useCallback(async () => {
    try {
      setIsLoading(true);
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

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!socket || !user) return;

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing start
    socket.emit('typing_start', {
      meetingId,
      userId: user.id,
      userName: user.fullName || user.emailAddresses[0].emailAddress
    });

    // Set timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('typing_stop', { meetingId, userId: user.id });
    }, 3000);
  }, [socket, user, meetingId]);

  // Send message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !user || !socket) return;

    const messageData = {
      meetingId,
      message: newMessage.trim(),
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

      setNewMessage('');
      
      // Stop typing indicator
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.emit('typing_stop', { meetingId, userId: user.id });
      
    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message');
    }
  }, [newMessage, user, socket, meetingId]);

  // Handle Enter key
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  // Handle input change with typing indicator
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
  }, [handleTyping]);

  // Add reaction to message
  const addReaction = useCallback((messageId: string, emoji: string) => {
    if (!socket || !user) return;
    
    socket.emit('react_to_message', {
      messageId,
      userId: user.id,
      emoji
    });
  }, [socket, user]);

  // Format timestamp
  const formatTime = (timestamp: Date) => {
    return format(new Date(timestamp), 'HH:mm');
  };

  // Check if message is from current user
  const isOwnMessage = (message: Message) => {
    return message.senderId === user?.id;
  };

  // Get user initials for avatar
  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="fixed right-0 top-0 bottom-0 z-50 w-full border-l border-gray-800 bg-gray-900/95 backdrop-blur-xl md:relative md:w-80"
        >
          <div className="flex h-full flex-col">
            {/* Chat Header */}
            <div className="flex items-center justify-between border-b border-gray-800 p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Meeting Chat</h2>
                {isConnected && (
                  <div className="h-2 w-2 rounded-full bg-green-400"></div>
                )}
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-red-400 text-sm">{error}</p>
                  <button
                    onClick={fetchMessages}
                    className="mt-2 text-blue-400 text-sm hover:underline"
                  >
                    Retry
                  </button>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 text-gray-500 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No messages yet</p>
                  <p className="text-gray-500 text-xs mt-1">Start the conversation!</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message._id?.toString() || `temp-${Date.now()}`} className="flex">
                    {message.messageType === 'system' ? (
                      // System message
                      <div className="w-full text-center">
                        <span className="inline-block bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full">
                          {message.message}
                        </span>
                      </div>
                    ) : (
                      // User message
                      <div className={`flex w-full ${isOwnMessage(message) ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs ${isOwnMessage(message) ? 'order-2' : 'order-1'}`}>
                          {/* Avatar */}
                          {!isOwnMessage(message) && (
                            <div className="flex items-center gap-2 mb-1">
                              <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
                                <span className="text-xs text-white font-medium">
                                  {getUserInitials(message.senderName)}
                                </span>
                              </div>
                              <span className="text-xs text-gray-400">{message.senderName}</span>
                            </div>
                          )}
                          
                          {/* Message bubble */}
                          <div className={`px-3 py-2 rounded-lg ${
                            isOwnMessage(message)
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-white'
                          }`}>
                            <p className="text-sm">{message.message}</p>
                            
                            {/* Message footer */}
                            <div className={`flex items-center gap-2 mt-1 ${
                              isOwnMessage(message) ? 'justify-end' : 'justify-start'
                            }`}>
                              <span className="text-xs opacity-70">
                                {formatTime(message.timestamp)}
                              </span>
                              
                              {/* Reactions */}
                              {message.reactions.length > 0 && (
                                <div className="flex gap-1">
                                  {message.reactions.map((reaction, index) => (
                                    <span key={index} className="text-xs bg-gray-800 px-1 rounded">
                                      {reaction.emoji}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              
              {/* Typing indicators */}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span>{typingUsers.map(u => u.userName).join(', ')} typing...</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="border-t border-gray-800 p-4">
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-3 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                  disabled={!isConnected}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || !isConnected}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MeetingChat; 
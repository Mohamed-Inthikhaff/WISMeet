import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';
import { getDb, COLLECTIONS } from './mongodb';
import { Message, MessageReaction } from './types/chat';

interface ConnectedUser {
  userId: string;
  userName: string;
  socketId: string;
  meetingId: string;
}

class ChatSocketManager {
  private io: SocketIOServer | null = null;
  private connectedUsers = new Map<string, ConnectedUser>(); // socketId -> user info
  private meetingUsers = new Map<string, Set<string>>(); // meetingId -> Set of socketIds
  private typingUsers = new Map<string, Map<string, { userId: string; userName: string; timer: NodeJS.Timeout }>>(); // meetingId -> Map of typing users

  init(server: NetServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    console.log('Socket.io server initialized');
  }

  private setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Join meeting room
      socket.on('join_meeting', async (data: { meetingId: string; userId: string; userName: string }) => {
        const { meetingId, userId, userName } = data;
        
        // Store user info
        this.connectedUsers.set(socket.id, {
          userId,
          userName,
          socketId: socket.id,
          meetingId
        });

        // Add to meeting users
        if (!this.meetingUsers.has(meetingId)) {
          this.meetingUsers.set(meetingId, new Set());
        }
        this.meetingUsers.get(meetingId)!.add(socket.id);

        // Join socket room
        socket.join(meetingId);

        // Create or update chat session
        await this.createChatSession(meetingId, userId);

        // Notify others in the meeting
        socket.to(meetingId).emit('user_joined', { userId, userName });

        console.log(`User ${userName} (${userId}) joined meeting ${meetingId}`);
      });

      // Send message
      socket.on('send_message', async (data: {
        meetingId: string;
        message: string;
        senderId: string;
        senderName: string;
        senderAvatar?: string;
      }) => {
        try {
          const { meetingId, message, senderId, senderName, senderAvatar } = data;

          // Save message to database
          const savedMessage = await this.saveMessageToDatabase({
            meetingId,
            senderId,
            senderName,
            senderAvatar,
            message: message.trim(),
            messageType: 'text',
            timestamp: new Date(),
            isEdited: false,
            reactions: []
          });

          // Broadcast to all users in the meeting
          this.io!.to(meetingId).emit('new_message', savedMessage);

          console.log(`Message sent in meeting ${meetingId} by ${senderName}`);
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Typing indicators
      socket.on('typing_start', (data: { meetingId: string; userId: string; userName: string }) => {
        const { meetingId, userId, userName } = data;
        
        // Clear existing timer if any
        if (this.typingUsers.has(meetingId)) {
          const userTimer = this.typingUsers.get(meetingId)!.get(userId);
          if (userTimer) {
            clearTimeout(userTimer.timer);
          }
        } else {
          this.typingUsers.set(meetingId, new Map());
        }

        // Set new timer
        const timer = setTimeout(() => {
          this.handleTypingStop(meetingId, userId);
        }, 3000); // Stop typing indicator after 3 seconds

        this.typingUsers.get(meetingId)!.set(userId, { userId, userName, timer });

        // Notify others
        socket.to(meetingId).emit('user_typing', { userId, userName });
      });

      socket.on('typing_stop', (data: { meetingId: string; userId: string }) => {
        this.handleTypingStop(data.meetingId, data.userId);
      });

      // Message reactions
      socket.on('react_to_message', async (data: { messageId: string; userId: string; emoji: string }) => {
        try {
          const { messageId, userId, emoji } = data;
          
          const reaction: MessageReaction = {
            userId,
            emoji,
            timestamp: new Date()
          };

          // Save reaction to database
          await this.saveReactionToDatabase(messageId, reaction);

          // Broadcast to all users in the meeting
          const user = this.connectedUsers.get(socket.id);
          if (user) {
            this.io!.to(user.meetingId).emit('message_reaction', { messageId, reaction });
          }
        } catch (error) {
          console.error('Error adding reaction:', error);
          socket.emit('error', { message: 'Failed to add reaction' });
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          // Remove from meeting users
          const meetingUsers = this.meetingUsers.get(user.meetingId);
          if (meetingUsers) {
            meetingUsers.delete(socket.id);
            if (meetingUsers.size === 0) {
              this.meetingUsers.delete(user.meetingId);
            }
          }

          // Notify others
          socket.to(user.meetingId).emit('user_left', { userId: user.userId, userName: user.userName });

          // Update chat session
          this.updateChatSession(user.meetingId, user.userId);

          console.log(`User ${user.userName} left meeting ${user.meetingId}`);
        }

        this.connectedUsers.delete(socket.id);
        console.log(`User disconnected: ${socket.id}`);
      });
    });
  }

  private handleTypingStop(meetingId: string, userId: string) {
    const typingMap = this.typingUsers.get(meetingId);
    if (typingMap) {
      const userTimer = typingMap.get(userId);
      if (userTimer) {
        clearTimeout(userTimer.timer);
        typingMap.delete(userId);
        
        // Notify others that user stopped typing
        this.io!.to(meetingId).emit('user_stopped_typing', { userId });
      }
    }
  }

  private async saveMessageToDatabase(messageData: Omit<Message, '_id'>): Promise<Message> {
    const db = await getDb();
    const messagesCollection = db.collection(COLLECTIONS.MESSAGES);

    const result = await messagesCollection.insertOne(messageData);
    return {
      ...messageData,
      _id: result.insertedId
    };
  }

  private async saveReactionToDatabase(messageId: string, reaction: MessageReaction) {
    const db = await getDb();
    const messagesCollection = db.collection(COLLECTIONS.MESSAGES);

    await messagesCollection.updateOne(
      { _id: new (await import('mongodb')).ObjectId(messageId) },
      { $push: { reactions: reaction } } as any
    );
  }

  private async createChatSession(meetingId: string, userId: string) {
    try {
      const db = await getDb();
      const chatSessionsCollection = db.collection(COLLECTIONS.CHAT_SESSIONS);

      // Check if session already exists
      const existingSession = await chatSessionsCollection.findOne({
        meetingId,
        userId
      });

      if (!existingSession) {
        await chatSessionsCollection.insertOne({
          meetingId,
          userId,
          joinedAt: new Date()
        });
      }
    } catch (error) {
      console.error('Error creating chat session:', error);
    }
  }

  private async updateChatSession(meetingId: string, userId: string) {
    try {
      const db = await getDb();
      const chatSessionsCollection = db.collection(COLLECTIONS.CHAT_SESSIONS);

      await chatSessionsCollection.updateOne(
        { meetingId, userId },
        { $set: { leftAt: new Date() } }
      );
    } catch (error) {
      console.error('Error updating chat session:', error);
    }
  }

  // Public method to get connected users for a meeting
  getConnectedUsers(meetingId: string): ConnectedUser[] {
    const socketIds = this.meetingUsers.get(meetingId);
    if (!socketIds) return [];

    return Array.from(socketIds)
      .map(socketId => this.connectedUsers.get(socketId))
      .filter(Boolean) as ConnectedUser[];
  }
}

// Export singleton instance
export const chatSocketManager = new ChatSocketManager(); 
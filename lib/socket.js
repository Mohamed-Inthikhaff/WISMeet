const { Server: SocketIOServer } = require('socket.io');
const { getDb, COLLECTIONS } = require('./mongodb');

class ChatSocketManager {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // socketId -> user info
    this.meetingUsers = new Map(); // meetingId -> Set of socketIds
    this.typingUsers = new Map(); // meetingId -> Map of typing users
  }

  init(server) {
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

  setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`User connected: ${socket.id}`);

      // Join meeting room
      socket.on('join_meeting', async (data) => {
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
        this.meetingUsers.get(meetingId).add(socket.id);

        // Join socket room
        socket.join(meetingId);

        // Create or update chat session
        await this.createChatSession(meetingId, userId);

        // Notify others in the meeting
        socket.to(meetingId).emit('user_joined', { userId, userName });

        console.log(`User ${userName} (${userId}) joined meeting ${meetingId}`);
      });

      // Send message
      socket.on('send_message', async (data) => {
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
          this.io.to(meetingId).emit('new_message', savedMessage);

          console.log(`Message sent in meeting ${meetingId} by ${senderName}`);
        } catch (error) {
          console.error('Error sending message:', error);
          socket.emit('error', { message: 'Failed to send message' });
        }
      });

      // Typing indicators
      socket.on('typing_start', (data) => {
        const { meetingId, userId, userName } = data;
        
        // Clear existing timer if any
        if (this.typingUsers.has(meetingId)) {
          const userTimer = this.typingUsers.get(meetingId).get(userId);
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

        this.typingUsers.get(meetingId).set(userId, { userId, userName, timer });

        // Notify others
        socket.to(meetingId).emit('user_typing', { userId, userName });
      });

      socket.on('typing_stop', (data) => {
        this.handleTypingStop(data.meetingId, data.userId);
      });

      // Message reactions
      socket.on('react_to_message', async (data) => {
        try {
          const { messageId, userId, emoji } = data;
          
          const reaction = {
            userId,
            emoji,
            timestamp: new Date()
          };

          // Save reaction to database
          await this.saveReactionToDatabase(messageId, reaction);

          // Broadcast to all users in the meeting
          const user = this.connectedUsers.get(socket.id);
          if (user) {
            this.io.to(user.meetingId).emit('message_reaction', { messageId, reaction });
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

  handleTypingStop(meetingId, userId) {
    const typingMap = this.typingUsers.get(meetingId);
    if (typingMap) {
      const userTimer = typingMap.get(userId);
      if (userTimer) {
        clearTimeout(userTimer.timer);
        typingMap.delete(userId);
        
        // Notify others that user stopped typing
        this.io.to(meetingId).emit('user_stopped_typing', { userId });
      }
    }
  }

  async saveMessageToDatabase(messageData) {
    const db = await getDb();
    const messagesCollection = db.collection(COLLECTIONS.MESSAGES);

    const result = await messagesCollection.insertOne(messageData);
    return {
      ...messageData,
      _id: result.insertedId
    };
  }

  async saveReactionToDatabase(messageId, reaction) {
    const db = await getDb();
    const messagesCollection = db.collection(COLLECTIONS.MESSAGES);

    await messagesCollection.updateOne(
      { _id: new (await import('mongodb')).ObjectId(messageId) },
      { $push: { reactions: reaction } }
    );
  }

  async createChatSession(meetingId, userId) {
    try {
      const db = await getDb();
      const chatSessionsCollection = db.collection(COLLECTIONS.CHAT_SESSIONS);
      const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

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

      // Create or update meeting record
      const existingMeeting = await meetingsCollection.findOne({ meetingId });
      
      if (!existingMeeting) {
        // Create new meeting record
        await meetingsCollection.insertOne({
          meetingId,
          title: `Meeting ${meetingId.slice(0, 8)}`, // Generate a title from meeting ID
          hostId: userId,
          participants: [userId],
          startTime: new Date(),
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        });
        console.log(`Created new meeting record for ${meetingId}`);
      } else {
        // Update existing meeting to add participant if not already present
        if (!existingMeeting.participants.includes(userId)) {
          await meetingsCollection.updateOne(
            { meetingId },
            { 
              $addToSet: { participants: userId },
              $set: { updatedAt: new Date() }
            }
          );
          console.log(`Added participant ${userId} to meeting ${meetingId}`);
        }
      }
    } catch (error) {
      console.error('Error creating chat session:', error);
    }
  }

  async updateChatSession(meetingId, userId) {
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
  getConnectedUsers(meetingId) {
    const socketIds = this.meetingUsers.get(meetingId);
    if (!socketIds) return [];

    return Array.from(socketIds)
      .map(socketId => this.connectedUsers.get(socketId))
      .filter(Boolean);
  }
}

// Export singleton instance
module.exports = { chatSocketManager: new ChatSocketManager() }; 
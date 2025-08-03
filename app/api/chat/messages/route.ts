import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import { GetMessagesRequest, SendMessageRequest, Message } from '@/lib/types/chat';

// GET /api/chat/messages?meetingId=xxx&limit=50&before=timestamp&page=1
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const before = searchParams.get('before');
    const page = parseInt(searchParams.get('page') || '1');

    if (!meetingId) {
      return NextResponse.json({ error: 'Meeting ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const messagesCollection = db.collection(COLLECTIONS.MESSAGES);
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

    // Verify user has access to this meeting
    const meeting = await meetingsCollection.findOne({ meetingId });
    if (!meeting) {
      return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
    }

    if (meeting.hostId !== userId && !meeting.participants.includes(userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build query
    const query: any = { meetingId };
    if (before) {
      query.timestamp = { $lt: new Date(before) };
    }

    // Calculate skip for pagination
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalCount = await messagesCollection.countDocuments(query);

    // Get messages with pagination
    const messages = await messagesCollection
      .find(query)
      .sort({ timestamp: -1 }) // Most recent first
      .skip(skip)
      .limit(limit)
      .toArray();

    // Check if there are more messages
    const hasMore = skip + messages.length < totalCount;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      messages: messages.reverse(), // Return in chronological order
      hasMore,
      total: messages.length,
      totalCount,
      pagination: {
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/chat/messages
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: SendMessageRequest = await request.json();
    const { meetingId, message, senderId, senderName, senderAvatar } = body;

    // Validate required fields
    if (!meetingId || !message || !senderId || !senderName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate that the sender is the authenticated user
    if (senderId !== userId) {
      return NextResponse.json(
        { error: 'Sender ID must match authenticated user' },
        { status: 403 }
      );
    }

    const db = await getDb();
    const messagesCollection = db.collection(COLLECTIONS.MESSAGES);

    // Create new message
    const newMessage: Omit<Message, '_id'> = {
      meetingId,
      senderId,
      senderName,
      senderAvatar,
      message: message.trim(),
      messageType: 'text',
      timestamp: new Date(),
      isEdited: false,
      reactions: []
    };

    const result = await messagesCollection.insertOne(newMessage);
    const insertedMessage = {
      ...newMessage,
      _id: result.insertedId
    };

    return NextResponse.json({
      success: true,
      messageId: result.insertedId.toString(),
      message: insertedMessage
    });

  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
} 
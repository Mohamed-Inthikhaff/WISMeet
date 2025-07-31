import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import { Meeting, ChatSession } from '@/lib/types/chat';

// GET /api/chat/meetings?userId=xxx
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId') || userId;
    const limit = parseInt(searchParams.get('limit') || '20');

    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);
    const chatSessionsCollection = db.collection(COLLECTIONS.CHAT_SESSIONS);

    // Get meetings where user participated
    const meetings = await meetingsCollection
      .find({
        $or: [
          { hostId: queryUserId },
          { participants: queryUserId }
        ]
      })
      .sort({ startTime: -1 })
      .limit(limit)
      .toArray();

    // Get chat sessions for these meetings
    const meetingIds = meetings.map(m => m.meetingId);
    const chatSessions = await chatSessionsCollection
      .find({
        meetingId: { $in: meetingIds },
        userId: queryUserId
      })
      .toArray();

    // Create a map of meetingId to chat session
    const sessionMap = new Map();
    chatSessions.forEach(session => {
      sessionMap.set(session.meetingId, session);
    });

    // Combine meetings with chat session info
    const meetingsWithChat = meetings.map(meeting => ({
      ...meeting,
      chatSession: sessionMap.get(meeting.meetingId) || null
    }));

    return NextResponse.json({
      meetings: meetingsWithChat,
      total: meetings.length
    });

  } catch (error) {
    console.error('Error fetching meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch meetings' },
      { status: 500 }
    );
  }
}

// POST /api/chat/meetings - Create or update meeting
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { meetingId, title, participants = [] } = body;

    if (!meetingId || !title) {
      return NextResponse.json(
        { error: 'Meeting ID and title are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

    // Check if meeting already exists
    const existingMeeting = await meetingsCollection.findOne({ meetingId });

    if (existingMeeting) {
      // Update existing meeting
      const updateResult = await meetingsCollection.updateOne(
        { meetingId },
        {
          $set: {
            title,
            participants: Array.from(new Set([...participants, userId])), // Ensure host is included
            updatedAt: new Date()
          }
        }
      );

      return NextResponse.json({
        success: true,
        meetingId,
        updated: updateResult.modifiedCount > 0
      });
    } else {
      // Create new meeting
      const newMeeting: Omit<Meeting, '_id'> = {
        meetingId,
        title,
        hostId: userId,
        participants: Array.from(new Set([...participants, userId])),
        startTime: new Date(),
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await meetingsCollection.insertOne(newMeeting);

      return NextResponse.json({
        success: true,
        meetingId,
        created: true,
        _id: result.insertedId
      });
    }

  } catch (error) {
    console.error('Error creating/updating meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create/update meeting' },
      { status: 500 }
    );
  }
} 
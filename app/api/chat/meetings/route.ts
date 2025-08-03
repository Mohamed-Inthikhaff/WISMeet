import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';
import { Meeting, ChatSession } from '@/lib/types/chat';

// GET /api/chat/meetings?userId=xxx&meetingId=xxx
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryUserId = searchParams.get('userId') || userId;
    const meetingId = searchParams.get('meetingId');
    const limit = parseInt(searchParams.get('limit') || '20');

    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);
    const chatSessionsCollection = db.collection(COLLECTIONS.CHAT_SESSIONS);
    const messagesCollection = db.collection(COLLECTIONS.MESSAGES);

    let meetings;

    if (meetingId) {
      // Get specific meeting
      const meeting = await meetingsCollection.findOne({ meetingId });
      if (!meeting) {
        return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
      }
      
      // Check if user has access to this meeting
      if (meeting.hostId !== queryUserId && !meeting.participants.includes(queryUserId)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
      
      // Get message count for this meeting
      const messageCount = await messagesCollection.countDocuments({ meetingId });
      
      meetings = [{
        ...meeting,
        messageCount
      }];
    } else {
      // Get meetings where user participated
      meetings = await meetingsCollection
        .find({
          $or: [
            { hostId: queryUserId },
            { participants: queryUserId }
          ]
        })
        .sort({ startTime: -1 })
        .limit(limit)
        .toArray();

      // Get message counts for all meetings
      const meetingIds = meetings.map(m => m.meetingId);
      const messageCounts = await messagesCollection.aggregate([
        { $match: { meetingId: { $in: meetingIds } } },
        { $group: { _id: '$meetingId', count: { $sum: 1 } } }
      ]).toArray();

      const countMap = new Map();
      messageCounts.forEach(item => {
        countMap.set(item._id, item.count);
      });

      // Add message counts to meetings
      meetings = meetings.map(meeting => ({
        ...meeting,
        messageCount: countMap.get(meeting.meetingId) || 0
      }));

      // Get chat sessions for all meetings
      const sessions = await chatSessionsCollection.find({
        meetingId: { $in: meetingIds }
      }).toArray();

      const sessionMap = new Map();
      sessions.forEach(session => {
        sessionMap.set(session.meetingId, session);
      });

              // Add chat session info to meetings
        meetings = meetings.map((meeting: any) => ({
          ...meeting,
          chatSession: sessionMap.get(meeting.meetingId) || null
        }));
    }

    return NextResponse.json({
      meetings: meetings,
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
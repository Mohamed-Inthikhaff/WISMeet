import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

// GET /api/meetings/scheduled
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'scheduled';
    const limit = parseInt(searchParams.get('limit') || '20');

    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

    // Build query for scheduled meetings
    const query: any = {
      $or: [
        { hostId: userId },
        { participants: userId }
      ]
    };

    // Add status filter
    if (status === 'scheduled') {
      query.startTime = { $gt: new Date().toISOString() };
    } else if (status === 'ended') {
      query.endTime = { $exists: true };
    } else if (status === 'active') {
      query.startTime = { $lte: new Date().toISOString() };
      query.endTime = { $exists: false };
    }

    // Fetch scheduled meetings
    const meetings = await meetingsCollection
      .find(query)
      .sort({ startTime: 1 })
      .limit(limit)
      .toArray();

    return NextResponse.json({
      success: true,
      meetings,
      total: meetings.length
    });

  } catch (error) {
    console.error('Error fetching scheduled meetings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scheduled meetings' },
      { status: 500 }
    );
  }
}

// POST /api/meetings/scheduled - Create a new scheduled meeting
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      meetingId, 
      title, 
      description, 
      startTime, 
      endTime, 
      participants = [] 
    } = body;

    if (!meetingId || !title || !startTime) {
      return NextResponse.json(
        { error: 'Meeting ID, title, and start time are required' },
        { status: 400 }
      );
    }

    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

    // Check if meeting already exists
    const existingMeeting = await meetingsCollection.findOne({ meetingId });

    if (existingMeeting) {
      return NextResponse.json(
        { error: 'Meeting with this ID already exists' },
        { status: 409 }
      );
    }

    // Create new scheduled meeting
    const newMeeting = {
      meetingId,
      title,
      description,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : undefined,
      hostId: userId,
      participants: Array.from(new Set([...participants, userId])),
      status: 'scheduled',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await meetingsCollection.insertOne(newMeeting);

    return NextResponse.json({
      success: true,
      meetingId,
      _id: result.insertedId
    });

  } catch (error) {
    console.error('Error creating scheduled meeting:', error);
    return NextResponse.json(
      { error: 'Failed to create scheduled meeting' },
      { status: 500 }
    );
  }
} 
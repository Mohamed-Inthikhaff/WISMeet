import { NextRequest, NextResponse } from 'next/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';
import { auth } from '@clerk/nextjs/server';

// Utility function to update meeting statuses
const updateMeetingStatuses = async (db: any) => {
  const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);
  const now = new Date();

  // Update meetings that have started but not ended
  await meetingsCollection.updateMany(
    {
      startTime: { $lte: now },
      endTime: { $exists: false },
      status: 'scheduled'
    },
    {
      $set: { status: 'active', updatedAt: now }
    }
  );

  // Update meetings that have ended
  await meetingsCollection.updateMany(
    {
      endTime: { $lte: now },
      status: { $in: ['scheduled', 'active'] }
    },
    {
      $set: { status: 'ended', updatedAt: now }
    }
  );
};

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
    
    // Update meeting statuses before fetching
    await updateMeetingStatuses(db);
    
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
      // Show only future meetings (startTime > current time)
      query.startTime = { $gt: new Date() };
      query.status = 'scheduled';
    } else if (status === 'ended') {
      query.status = 'ended';
    } else if (status === 'active') {
      // Show meetings that have started but not ended
      query.status = 'active';
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
    console.log('POST /api/meetings/scheduled - Starting...');
    
    const { userId } = await auth();
    console.log('POST /api/meetings/scheduled - User ID:', userId);
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    console.log('POST /api/meetings/scheduled - Request body:', body);
    
    const { 
      meetingId, 
      title, 
      description, 
      startTime, 
      endTime, 
      participants = [] 
    } = body;

    console.log('POST /api/meetings/scheduled - Extracted data:', {
      meetingId,
      title,
      description,
      startTime,
      endTime,
      participants
    });

    if (!meetingId || !title || !startTime) {
      console.log('POST /api/meetings/scheduled - Missing required fields');
      return NextResponse.json(
        { error: 'Meeting ID, title, and start time are required' },
        { status: 400 }
      );
    }

    console.log('POST /api/meetings/scheduled - Getting database connection...');
    const db = await getDb();
    console.log('POST /api/meetings/scheduled - Database connected');
    
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);
    console.log('POST /api/meetings/scheduled - Collection:', COLLECTIONS.MEETINGS);

    // Check if meeting already exists
    console.log('POST /api/meetings/scheduled - Checking for existing meeting...');
    const existingMeeting = await meetingsCollection.findOne({ meetingId });
    console.log('POST /api/meetings/scheduled - Existing meeting:', existingMeeting);

    if (existingMeeting) {
      console.log('POST /api/meetings/scheduled - Meeting already exists');
      return NextResponse.json(
        { error: 'Meeting with this ID already exists' },
        { status: 409 }
      );
    }

    // Create new scheduled meeting
    console.log('POST /api/meetings/scheduled - Creating new meeting object...');
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
      updatedAt: new Date(),
      recordingId: `recording-${meetingId}-${Date.now()}` // Set a unique recordingId to avoid constraint violation
    };

    console.log('POST /api/meetings/scheduled - New meeting object:', newMeeting);
    console.log('POST /api/meetings/scheduled - Inserting into database...');
    const result = await meetingsCollection.insertOne(newMeeting);
    console.log('POST /api/meetings/scheduled - Insert result:', result);

    return NextResponse.json({
      success: true,
      meetingId,
      _id: result.insertedId
    });

  } catch (error) {
    console.error('Error creating scheduled meeting:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : typeof error
    });
    return NextResponse.json(
      { error: 'Failed to create scheduled meeting' },
      { status: 500 }
    );
  }
} 
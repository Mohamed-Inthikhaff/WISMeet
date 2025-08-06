import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDb, COLLECTIONS } from '@/lib/mongodb';

/**
 * POST /api/meetings/transcript
 * Store meeting transcript in database
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { meetingId, transcript } = body;

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    if (!transcript) {
      return NextResponse.json(
        { error: 'Transcript is required' },
        { status: 400 }
      );
    }

    console.log(`📝 Storing transcript for meeting: ${meetingId}`);

    // Store transcript in database
    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

    const result = await meetingsCollection.updateOne(
      { meetingId },
      {
        $set: {
          transcript,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    console.log(`✅ Transcript stored successfully for meeting: ${meetingId}`);

    return NextResponse.json({
      success: true,
      message: 'Transcript stored successfully',
      meetingId
    });

  } catch (error) {
    console.error('Error storing transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/meetings/transcript?meetingId=xxx
 * Get meeting transcript from database
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const meetingId = searchParams.get('meetingId');

    if (!meetingId) {
      return NextResponse.json(
        { error: 'Meeting ID is required' },
        { status: 400 }
      );
    }

    console.log(`📝 Retrieving transcript for meeting: ${meetingId}`);

    // Get transcript from database
    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);

    const meeting = await meetingsCollection.findOne(
      { meetingId },
      { projection: { transcript: 1, meetingId: 1 } }
    );

    if (!meeting) {
      return NextResponse.json(
        { error: 'Meeting not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      meetingId: meeting.meetingId,
      transcript: meeting.transcript || ''
    });

  } catch (error) {
    console.error('Error retrieving transcript:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
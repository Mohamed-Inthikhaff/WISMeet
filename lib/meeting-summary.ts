/**
 * Automatic Meeting Summary System
 * Handles automatic summary generation and email sending when meetings end
 */

import { summarizeTranscript } from './gemini';
import { sendMortgageSummaryEmail } from './email';
import { getDb, COLLECTIONS } from './mongodb';
import { getUserEmail, getUserName } from './user-management';

export interface MeetingSummaryData {
  meetingId: string;
  participants: Array<{
    userId: string;
    name: string;
    email: string;
    role: 'client' | 'advisor' | 'participant';
  }>;
  transcript: string;
  meetingType: 'mortgage_consultation' | 'loan_application' | 'refinance' | 'general';
  startTime: Date;
  endTime: Date;
}

export interface SummaryResult {
  success: boolean;
  summary?: string;
  keyPoints?: string[];
  actionItems?: string[];
  nextSteps?: string[];
  emailSent?: boolean;
  error?: string;
}

/**
 * Generates and sends meeting summary automatically
 */
export const generateAndSendMeetingSummary = async (
  meetingData: MeetingSummaryData
): Promise<SummaryResult> => {
  try {
    console.log('🤖 Starting automatic meeting summary generation...');

    // Step 1: Generate AI summary
    const aiSummary = await summarizeTranscript({
      transcript: meetingData.transcript,
      meetingType: meetingData.meetingType,
      clientName: extractClientName(meetingData.participants),
      advisorName: extractAdvisorName(meetingData.participants)
    });

    if (!aiSummary.success) {
      throw new Error(`AI summarization failed: ${aiSummary.error}`);
    }

    console.log('✅ AI summary generated successfully');

    // Step 2: Extract participant emails
    const clientEmail = extractClientEmail(meetingData.participants);
    const advisorEmail = extractAdvisorEmail(meetingData.participants);

    if (!clientEmail || !advisorEmail) {
      console.warn('⚠️ Missing participant emails, skipping email send');
      return {
        success: true,
        summary: aiSummary.summary,
        keyPoints: aiSummary.keyPoints,
        actionItems: aiSummary.actionItems,
        nextSteps: aiSummary.nextSteps,
        emailSent: false
      };
    }

    // Step 3: Send summary email
    const emailResult = await sendMortgageSummaryEmail({
      clientName: extractClientName(meetingData.participants),
      advisorName: extractAdvisorName(meetingData.participants),
      meetingDate: meetingData.startTime,
      summary: aiSummary.summary || '',
      keyPoints: aiSummary.keyPoints || [],
      actionItems: aiSummary.actionItems || [],
      nextSteps: aiSummary.nextSteps || [],
      meetingType: meetingData.meetingType,
      clientEmail,
      advisorEmail
    });

    if (!emailResult.success) {
      console.error('❌ Failed to send summary email:', emailResult.error);
      return {
        success: true,
        summary: aiSummary.summary,
        keyPoints: aiSummary.keyPoints,
        actionItems: aiSummary.actionItems,
        nextSteps: aiSummary.nextSteps,
        emailSent: false,
        error: `Summary generated but email failed: ${emailResult.error}`
      };
    }

    console.log('✅ Summary email sent successfully');

    return {
      success: true,
      summary: aiSummary.summary,
      keyPoints: aiSummary.keyPoints,
      actionItems: aiSummary.actionItems,
      nextSteps: aiSummary.nextSteps,
      emailSent: true
    };

  } catch (error) {
    console.error('❌ Error in automatic meeting summary:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

/**
 * Extracts client name from participants
 */
const extractClientName = (participants: MeetingSummaryData['participants']): string => {
  const client = participants.find(p => p.role === 'client');
  return client?.name || 'Client';
};

/**
 * Extracts advisor name from participants
 */
const extractAdvisorName = (participants: MeetingSummaryData['participants']): string => {
  const advisor = participants.find(p => p.role === 'advisor');
  return advisor?.name || 'Mortgage Advisor';
};

/**
 * Extracts client email from participants
 */
const extractClientEmail = (participants: MeetingSummaryData['participants']): string | null => {
  const client = participants.find(p => p.role === 'client');
  return client?.email || null;
};

/**
 * Extracts advisor email from participants
 */
const extractAdvisorEmail = (participants: MeetingSummaryData['participants']): string | null => {
  const advisor = participants.find(p => p.role === 'advisor');
  return advisor?.email || null;
};

/**
 * Simulates transcript capture (replace with actual implementation)
 */
export const captureMeetingTranscript = async (meetingId: string): Promise<string> => {
  // TODO: Implement actual audio capture and transcription
  // For now, return a sample transcript
  return `
Advisor: Good morning, Mr. Smith. Thank you for coming in today to discuss your mortgage options.

Client: Good morning. I'm looking to buy a house for around $350,000 and I have about $70,000 for a down payment.

Advisor: That's great. With a $70,000 down payment on a $350,000 home, you'd be putting down about 20%, which is excellent. This will help you avoid PMI. What's your current credit score?

Client: My credit score is 720. I've been working on improving it over the past year.

Advisor: That's a good score. Based on your situation, I can offer you a 30-year fixed-rate mortgage at 6.5% APR. With your 20% down payment, your monthly payment would be approximately $1,770 for principal and interest.

Client: That sounds reasonable. What documents will I need to provide?

Advisor: You'll need your W-2s from the past two years, recent pay stubs, bank statements for the last three months, and any additional income documentation. We'll also need to verify your employment and run a credit check.

Client: I can provide all of those. How long does the approval process typically take?

Advisor: With all documents in order, we can typically close within 30-45 days. I'll need you to complete the loan application today, and then we can start processing everything.
  `;
};

/**
 * Gets real meeting participants with their roles and emails from database
 */
export const getMeetingParticipants = async (meetingId: string): Promise<MeetingSummaryData['participants']> => {
  try {
    console.log(`🔍 Fetching real participants for meeting: ${meetingId}`);
    
    // Get meeting data from database
    const db = await getDb();
    const meetingsCollection = db.collection(COLLECTIONS.MEETINGS);
    
    const meeting = await meetingsCollection.findOne({ meetingId });
    
    if (!meeting) {
      console.warn(`⚠️ Meeting ${meetingId} not found in database, using fallback data`);
      return getFallbackParticipants();
    }
    
    console.log(`📋 Found meeting: ${meeting.title} with ${meeting.participants?.length || 0} participants`);
    
    // Get real participant data
    const participants: MeetingSummaryData['participants'] = [];
    
    // Add host (advisor)
    if (meeting.hostId) {
      const hostUser = await getUserData(meeting.hostId);
      if (hostUser) {
        participants.push({
          userId: meeting.hostId,
          name: hostUser.name || 'Meeting Host',
          email: hostUser.email || '',
          role: 'advisor' as const
        });
      }
    }
    
    // Add other participants (clients)
    if (meeting.participants && Array.isArray(meeting.participants)) {
      for (const participant of meeting.participants) {
        // Skip if already added as host
        if (participant === meeting.hostId) continue;
        
        // Check if participant is an email address or user ID
        if (participant.includes('@')) {
          // It's an email address - use it directly
          participants.push({
            userId: `email_${participant}`,
            name: participant.split('@')[0], // Use email prefix as name
            email: participant,
            role: 'client' as const
          });
        } else {
          // It's a user ID - look up user data
          const participantUser = await getUserData(participant);
          if (participantUser) {
            participants.push({
              userId: participant,
              name: participantUser.name || 'Meeting Participant',
              email: participantUser.email || '',
              role: 'client' as const
            });
          }
        }
      }
    }
    
    console.log(`✅ Found ${participants.length} real participants with emails`);
    return participants;
    
  } catch (error) {
    console.error('❌ Error getting meeting participants:', error);
    console.log('🔄 Using fallback participant data');
    return getFallbackParticipants();
  }
};

/**
 * Gets user data from database or fallback mapping
 */
const getUserData = async (userId: string): Promise<{ name: string; email: string } | null> => {
  try {
    const [email, name] = await Promise.all([
      getUserEmail(userId),
      getUserName(userId)
    ]);
    
    if (email && name) {
      return { name, email };
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

/**
 * Fallback participant data when database lookup fails
 */
const getFallbackParticipants = (): MeetingSummaryData['participants'] => {
  console.log('🔄 Using fallback participant data');
  return [
    {
      userId: 'user_123',
      name: 'Mohamed Inthikhaff',
      email: 'mhdinthikaff@gmail.com',
      role: 'client' as const
    },
    {
      userId: 'user_456',
      name: 'WIS Mortgages',
      email: 'mohamed.inthikhaff@wismorgages.co.uk',
      role: 'advisor' as const
    }
  ];
};

/**
 * Determines meeting type based on meeting data
 */
export const determineMeetingType = (meetingData: any): MeetingSummaryData['meetingType'] => {
  // TODO: Implement logic to determine meeting type
  // For now, default to mortgage consultation
  return 'mortgage_consultation';
}; 
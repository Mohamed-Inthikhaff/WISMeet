import nodemailer from 'nodemailer';
import { format } from 'date-fns';

// Email configuration
const emailConfig = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter(emailConfig);
};

// Email templates
const createInvitationEmail = (meetingData: {
  title: string;
  hostName: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  meetingLink: string;
  guestEmail: string;
}) => {
  const formattedDate = format(meetingData.startTime, 'EEEE, MMMM d, yyyy');
  const formattedStartTime = format(meetingData.startTime, 'h:mm a');
  const formattedEndTime = format(meetingData.endTime, 'h:mm a');

  return {
    from: `"WISMeet" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to: meetingData.guestEmail,
    subject: `Meeting Invitation: ${meetingData.title}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Meeting Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .meeting-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .join-button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; font-weight: bold; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Meeting Invitation</h1>
            <p>You've been invited to join a meeting</p>
          </div>
          
          <div class="content">
            <h2>${meetingData.title}</h2>
            
            <div class="meeting-details">
              <p><strong>Host:</strong> ${meetingData.hostName}</p>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <p><strong>Time:</strong> ${formattedStartTime} - ${formattedEndTime}</p>
              ${meetingData.description ? `<p><strong>Description:</strong> ${meetingData.description}</p>` : ''}
            </div>
            
            <div style="text-align: center;">
              <a href="${meetingData.meetingLink}" class="join-button">
                Join Meeting
              </a>
            </div>
            
            <p style="margin-top: 20px; color: #666;">
              If the button doesn't work, you can copy and paste this link into your browser:<br>
              <a href="${meetingData.meetingLink}" style="color: #667eea;">${meetingData.meetingLink}</a>
            </p>
          </div>
          
          <div class="footer">
            <p>This invitation was sent from WISMeet - Professional Video Conferencing Platform</p>
            <p>If you have any questions, please contact the meeting host.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `
Meeting Invitation: ${meetingData.title}

You've been invited to join a meeting by ${meetingData.hostName}.

Meeting Details:
- Title: ${meetingData.title}
- Date: ${formattedDate}
- Time: ${formattedStartTime} - ${formattedEndTime}
${meetingData.description ? `- Description: ${meetingData.description}` : ''}

Join the meeting by clicking this link: ${meetingData.meetingLink}

If you have any questions, please contact the meeting host.

Best regards,
WISMeet Team
    `
  };
};

// Send invitation email
export const sendInvitationEmail = async (meetingData: {
  title: string;
  hostName: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  meetingLink: string;
  guestEmail: string;
}) => {
  try {
    const transporter = createTransporter();
    const emailContent = createInvitationEmail(meetingData);
    
    const result = await transporter.sendMail(emailContent);
    
    return {
      success: true,
      messageId: result.messageId,
      guestEmail: meetingData.guestEmail
    };
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      guestEmail: meetingData.guestEmail
    };
  }
};

// Send multiple invitation emails
export const sendBulkInvitationEmails = async (meetingData: {
  title: string;
  hostName: string;
  startTime: Date;
  endTime: Date;
  description?: string;
  meetingLink: string;
  guestEmails: string[];
}) => {
  const results = [];
  
  for (const guestEmail of meetingData.guestEmails) {
    const result = await sendInvitationEmail({
      ...meetingData,
      guestEmail
    });
    results.push(result);
  }
  
  return results;
};

// Verify email configuration
export const verifyEmailConfig = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    return { success: true };
  } catch (error) {
    console.error('Email configuration error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}; 
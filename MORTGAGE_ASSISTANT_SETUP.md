# Mortgage Meeting Assistant Bot - Phase 2 Setup Guide

This guide provides detailed instructions for setting up the Mortgage Meeting Assistant Bot with all Phase 2 integrations: Gemini AI, Google Calendar API, and Email services.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Gemini AI Setup](#gemini-ai-setup)
4. [Google Calendar API Setup](#google-calendar-api-setup)
5. [Email Service Setup](#email-service-setup)
6. [Testing Integrations](#testing-integrations)
7. [API Endpoints](#api-endpoints)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18+ and npm 9+
- WISMeet platform already configured
- Access to Google Cloud Console
- Gemini AI API access
- Email service (Gmail SMTP or SendGrid)

## Environment Configuration

1. Copy the environment template:
```bash
cp env.example .env.local
```

2. Configure the following variables in `.env.local`:

### Core Application Variables
```bash
# Existing WISMeet configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key
STREAM_SECRET_KEY=your_stream_secret_key
NEXT_PUBLIC_BASE_URL=http://localhost:3000
MONGODB_URI=your_mongodb_connection_string
```

### Mortgage Assistant Bot Variables
```bash
# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent

# Google Calendar API Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_SCOPES=https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
EMAIL_FROM=noreply@wismeet.com

# Alternative: SendGrid Configuration
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@wismeet.com
```

## Gemini AI Setup

### 1. Get Gemini AI API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Add it to your `.env.local` file as `GEMINI_API_KEY`

### 2. Test Gemini Integration

```bash
# Run the test script
node scripts/test-mortgage-assistant.js
```

Expected output:
```
🧠 Testing Gemini AI Integration...
✅ Gemini AI Integration Test PASSED
📝 Summary: [Generated summary]
🔑 Key Points: 4 items
✅ Action Items: 3 items
🚀 Next Steps: 2 items
```

## Google Calendar API Setup

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the Google Calendar API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Configure OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Configure the OAuth consent screen:
   - User Type: External
   - App name: "WISMeet Mortgage Assistant"
   - User support email: your email
   - Developer contact information: your email
   - Add scopes: `https://www.googleapis.com/auth/calendar`

4. Create OAuth 2.0 Client ID:
   - Application type: Web application
   - Name: "WISMeet Mortgage Assistant"
   - Authorized redirect URIs: `http://localhost:3000/api/auth/google/callback`

5. Copy the Client ID and Client Secret to your `.env.local` file

### 3. Test Google Calendar Integration

```bash
# Test OAuth URL generation
curl "http://localhost:3000/api/mortgage-assistant/calendar?action=auth"
```

Expected response:
```json
{
  "success": true,
  "authUrl": "https://accounts.google.com/oauth/authorize?...",
  "message": "Google OAuth authorization URL generated"
}
```

## Email Service Setup

### Option 1: Gmail SMTP

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate password for "Mail"
3. Use the generated password as `EMAIL_PASS` in `.env.local`

### Option 2: SendGrid

1. Create a SendGrid account
2. Generate an API key
3. Add it to `.env.local` as `SENDGRID_API_KEY`

### 3. Test Email Integration

```bash
# Test email functionality
curl "http://localhost:3000/api/mortgage-assistant/email?action=test"
```

Expected response:
```json
{
  "success": true,
  "message": "Email test completed",
  "testResult": {
    "success": true,
    "messageId": "...",
    "recipients": ["..."]
  }
}
```

## Testing Integrations

### 1. Run Complete Test Suite

```bash
# Install dependencies if not already done
npm install

# Run the comprehensive test script
node scripts/test-mortgage-assistant.js
```

### 2. Test Individual Components

#### Test Gemini AI Summarization
```bash
curl -X POST "http://localhost:3000/api/mortgage-assistant/summarize" \
  -H "Content-Type: application/json" \
  -d '{
    "transcript": "Advisor: Good morning, Mr. Johnson. Thank you for coming in today to discuss your mortgage options. Client: Good morning. I am looking to buy a house for around $350,000 and I have about $70,000 for a down payment.",
    "meetingType": "mortgage_consultation",
    "clientName": "Mr. Johnson",
    "advisorName": "Mortgage Advisor"
  }'
```

#### Test Calendar Event Creation
```bash
curl -X POST "http://localhost:3000/api/mortgage-assistant/calendar" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create-event",
    "accessToken": "your_access_token",
    "summary": {
      "summary": "Discussed mortgage options",
      "keyPoints": ["Loan amount: $350,000", "Interest rate: 6.5%"],
      "actionItems": ["Provide documentation"],
      "nextSteps": ["Follow up in 7 days"]
    },
    "clientEmail": "client@example.com",
    "advisorEmail": "advisor@example.com"
  }'
```

#### Test Email Sending
```bash
curl -X POST "http://localhost:3000/api/mortgage-assistant/email" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "send-summary",
    "summaryData": {
      "clientName": "John Smith",
      "advisorName": "Sarah Johnson",
      "meetingDate": "2024-01-15T10:00:00Z",
      "summary": "Discussed mortgage options for home purchase",
      "keyPoints": ["Loan amount: $350,000", "Interest rate: 6.5%"],
      "actionItems": ["Provide documentation", "Complete application"],
      "nextSteps": ["Follow up in 7 days", "Schedule closing"],
      "meetingType": "Mortgage Consultation",
      "clientEmail": "john.smith@example.com",
      "advisorEmail": "sarah.johnson@mortgagecompany.com"
    }
  }'
```

## API Endpoints

### Mortgage Assistant Endpoints

#### 1. Transcript Summarization
- **POST** `/api/mortgage-assistant/summarize`
- Summarizes mortgage meeting transcripts using Gemini AI

#### 2. Google Calendar Integration
- **GET** `/api/mortgage-assistant/calendar?action=auth`
- Generates OAuth authorization URL
- **POST** `/api/mortgage-assistant/calendar`
- Handles OAuth callback and creates calendar events

#### 3. Email Integration
- **POST** `/api/mortgage-assistant/email`
- Sends mortgage meeting summary emails
- **GET** `/api/mortgage-assistant/email?action=test`
- Tests email functionality

### Request/Response Examples

#### Summarize Transcript
```json
// Request
{
  "transcript": "Meeting transcript text...",
  "meetingType": "mortgage_consultation",
  "clientName": "John Smith",
  "advisorName": "Sarah Johnson"
}

// Response
{
  "success": true,
  "summary": "Discussed mortgage options for home purchase",
  "keyPoints": ["Loan amount: $350,000", "Interest rate: 6.5%"],
  "actionItems": ["Provide documentation", "Complete application"],
  "nextSteps": ["Follow up in 7 days", "Schedule closing"],
  "meetingType": "mortgage_consultation"
}
```

#### Create Calendar Event
```json
// Request
{
  "action": "create-event",
  "accessToken": "google_access_token",
  "summary": {
    "summary": "Meeting summary",
    "keyPoints": ["Key points"],
    "actionItems": ["Action items"],
    "nextSteps": ["Next steps"]
  },
  "clientEmail": "client@example.com",
  "advisorEmail": "advisor@example.com"
}

// Response
{
  "success": true,
  "message": "Calendar event created successfully",
  "eventId": "event_id",
  "eventLink": "https://calendar.google.com/event/..."
}
```

#### Send Summary Email
```json
// Request
{
  "action": "send-summary",
  "summaryData": {
    "clientName": "John Smith",
    "advisorName": "Sarah Johnson",
    "meetingDate": "2024-01-15T10:00:00Z",
    "summary": "Meeting summary",
    "keyPoints": ["Key points"],
    "actionItems": ["Action items"],
    "nextSteps": ["Next steps"],
    "meetingType": "Mortgage Consultation",
    "clientEmail": "client@example.com",
    "advisorEmail": "advisor@example.com"
  }
}

// Response
{
  "success": true,
  "message": "Mortgage summary email sent successfully",
  "messageId": "email_message_id",
  "recipients": ["client@example.com", "advisor@example.com"]
}
```

## Troubleshooting

### Common Issues

#### 1. Gemini AI Errors
- **Error**: "GEMINI_API_KEY is not configured"
  - **Solution**: Add your Gemini API key to `.env.local`
- **Error**: "Invalid response format from Gemini API"
  - **Solution**: Check API key validity and quota limits

#### 2. Google Calendar Errors
- **Error**: "Google OAuth credentials not configured"
  - **Solution**: Set up OAuth 2.0 credentials in Google Cloud Console
- **Error**: "Failed to obtain access token"
  - **Solution**: Verify redirect URI matches exactly

#### 3. Email Errors
- **Error**: "Email configuration error"
  - **Solution**: Check SMTP settings and app passwords
- **Error**: "Authentication failed"
  - **Solution**: Verify email credentials and 2FA setup

### Debug Commands

```bash
# Check environment variables
node -e "require('dotenv').config({ path: '.env.local' }); console.log('GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'Set' : 'Missing')"

# Test individual components
node scripts/test-mortgage-assistant.js

# Check API endpoints
curl http://localhost:3000/api/mortgage-assistant/summarize
```

### Logs and Monitoring

- Check server logs for detailed error messages
- Monitor API quotas and limits
- Verify email delivery in spam folders
- Test OAuth flow in incognito mode

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **OAuth Tokens**: Store tokens securely and refresh when needed
3. **Email Security**: Use app passwords, not regular passwords
4. **Data Privacy**: Ensure mortgage data is handled according to regulations

## Next Steps

1. **Production Deployment**: Configure production environment variables
2. **User Interface**: Integrate with WISMeet frontend
3. **Database Integration**: Store meeting summaries and follow-ups
4. **Advanced Features**: Add meeting scheduling, reminders, and analytics

## Support

For issues related to:
- **Gemini AI**: Check [Google AI Studio documentation](https://ai.google.dev/)
- **Google Calendar**: Check [Google Calendar API documentation](https://developers.google.com/calendar)
- **Email**: Check your email provider's SMTP documentation
- **WISMeet Platform**: Refer to the main WISMeet documentation

---

**Note**: This setup guide assumes you have the WISMeet platform already configured and running. For platform setup, refer to the main README.md file. 
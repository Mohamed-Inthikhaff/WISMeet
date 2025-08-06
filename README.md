# Meeting Assistant Platform

A comprehensive video conferencing platform built with Next.js, Stream Video SDK, and Clerk authentication, featuring an advanced Mortgage Meeting Assistant Bot with AI-powered transcript summarization, calendar integration, and automated email workflows.

## Features

### Core Platform Features
- HD video and audio conferencing
- Real-time chat during meetings
- Meeting scheduling and management
- Personal meeting rooms
- Screen sharing capabilities
- Meeting recordings
- Participant management

### Mortgage Meeting Assistant Bot (Phase 2)
- **AI-Powered Transcript Summarization**: Uses Gemini AI to analyze mortgage meeting transcripts and extract key information
- **Smart Follow-up Scheduling**: Automatically creates Google Calendar events based on meeting outcomes
- **Professional Email Summaries**: Sends formatted meeting summaries to advisors and paraplanners
- **Mortgage-Specific Analysis**: Focuses on loan details, rates, documentation requirements, and action items
- **Automated Workflows**: Streamlines the mortgage consultation process from meeting to follow-up

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your environment variables
4. Configure Mortgage Assistant Bot integrations (see [Setup Guide](MORTGAGE_ASSISTANT_SETUP.md))
5. Run the development server: `npm run dev`
6. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Core Platform Variables
```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Stream Video
NEXT_PUBLIC_STREAM_API_KEY=your_stream_api_key
STREAM_SECRET_KEY=your_stream_secret_key

# Application
NEXT_PUBLIC_BASE_URL=http://localhost:3000
NODE_ENV=development

# Database
MONGODB_URI=your_mongodb_connection_string
DATABASE_URL=your_database_url
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
```

## Mortgage Assistant Bot Setup

For detailed setup instructions for the Mortgage Meeting Assistant Bot, including:
- Gemini AI configuration
- Google Calendar API setup
- Email service configuration
- Testing procedures

See the comprehensive [Mortgage Assistant Setup Guide](MORTGAGE_ASSISTANT_SETUP.md).

## Testing

### Run Complete Test Suite
```bash
# Test all integrations
node scripts/test-mortgage-assistant.js
```

### Test Individual Components
```bash
# Test Gemini AI
curl -X POST "http://localhost:3000/api/mortgage-assistant/summarize" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Your meeting transcript here..."}'

# Test Google Calendar
curl "http://localhost:3000/api/mortgage-assistant/calendar?action=auth"

# Test Email
curl "http://localhost:3000/api/mortgage-assistant/email?action=test"
```

## API Endpoints

### Core Platform APIs
- `/api/meetings/scheduled` - Meeting management
- `/api/chat/*` - Real-time chat functionality
- `/api/health` - Health check

### Mortgage Assistant Bot APIs
- `POST /api/mortgage-assistant/summarize` - Transcript summarization
- `GET/POST /api/mortgage-assistant/calendar` - Google Calendar integration
- `GET/POST /api/mortgage-assistant/email` - Email functionality

## Deployment

### Prerequisites

- Node.js 18+ 
- npm 9+
- MongoDB database
- Stream Video account
- Clerk account
- Gemini AI API access
- Google Cloud Console project
- Email service (Gmail SMTP or SendGrid)

### Deployment Steps

1. **Environment Setup**
   - Ensure all environment variables are properly configured
   - Verify Stream Video API keys are valid
   - Check Clerk authentication keys
   - Configure Mortgage Assistant Bot integrations

2. **Build and Deploy**
   ```bash
   npm install
   npm run build
   npm start
   ```

3. **Health Check**
   - Visit `/api/health` to verify the application is running
   - Test Mortgage Assistant Bot endpoints
   - Check browser console for any errors

## Troubleshooting

### Microphone Issues

If participants cannot hear your voice:

1. **Check Browser Permissions**
   - Ensure microphone permissions are granted
   - Try refreshing the page and granting permissions again

2. **Test Microphone**
   - Use the "Test Microphone" option in meeting setup
   - Check browser console for audio debug information

3. **Debug Audio State**
   - Use the "Debug Audio" option to check:
     - Available audio devices
     - Permission states
     - Stream SDK microphone state
     - Audio track status

4. **Common Solutions**
   - Clear browser cache and cookies
   - Try a different browser
   - Check if microphone is being used by other applications
   - Verify audio drivers are up to date

### Mortgage Assistant Bot Issues

1. **Gemini AI Errors**
   - Verify `GEMINI_API_KEY` is set correctly
   - Check API quota limits
   - Ensure transcript format is valid

2. **Google Calendar Errors**
   - Verify OAuth 2.0 credentials are configured
   - Check redirect URI matches exactly
   - Ensure Calendar API is enabled

3. **Email Errors**
   - Verify SMTP settings and credentials
   - Check app password for Gmail
   - Ensure email service is properly configured

### Deployment Issues

1. **Environment Variables**
   - Ensure all required variables are set
   - Check for typos in variable names
   - Verify API keys are valid

2. **Build Errors**
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check Node.js version compatibility
   - Verify all dependencies are installed

3. **Runtime Errors**
   - Check server logs for detailed error messages
   - Verify database connectivity
   - Ensure all services are running

### Audio Debug Information

The application includes comprehensive audio debugging:

- **Device Detection**: Lists all available audio input devices
- **Permission Status**: Shows current microphone permission state
- **Stream SDK State**: Displays Stream microphone configuration
- **Audio Track Analysis**: Tests audio levels and track status

## Development

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests
- `node scripts/test-mortgage-assistant.js` - Test Mortgage Assistant Bot

### Architecture

- **Frontend**: Next.js 14 with TypeScript
- **Video**: Stream Video React SDK
- **Authentication**: Clerk
- **Database**: MongoDB
- **Real-time**: Socket.io
- **Styling**: Tailwind CSS
- **AI Integration**: Gemini AI
- **Calendar**: Google Calendar API
- **Email**: Nodemailer/SMTP

## Support

For issues related to:
- **Microphone/Audio**: Use the debug tools in the meeting setup
- **Deployment**: Check environment variables and build logs
- **Authentication**: Verify Clerk configuration
- **Video**: Ensure Stream Video API keys are correct
- **Mortgage Assistant Bot**: See [Setup Guide](MORTGAGE_ASSISTANT_SETUP.md)

## License

MIT License


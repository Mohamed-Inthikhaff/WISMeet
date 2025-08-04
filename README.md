# Meeting Assistant Platform

A comprehensive video conferencing platform built with Next.js, Stream Video SDK, and Clerk authentication.

## Features

- HD video and audio conferencing
- Real-time chat during meetings
- Meeting scheduling and management
- Personal meeting rooms
- Screen sharing capabilities
- Meeting recordings
- Participant management

## Quick Start

1. Clone the repository
2. Install dependencies: `npm install`
3. Copy `.env.example` to `.env.local` and fill in your environment variables
4. Run the development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Required environment variables:

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

## Deployment

### Prerequisites

- Node.js 18+ 
- npm 9+
- MongoDB database
- Stream Video account
- Clerk account

### Deployment Steps

1. **Environment Setup**
   - Ensure all environment variables are properly configured
   - Verify Stream Video API keys are valid
   - Check Clerk authentication keys

2. **Build and Deploy**
   ```bash
   npm install
   npm run build
   npm start
   ```

3. **Health Check**
   - Visit `/api/health` to verify the application is running
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

### Architecture

- **Frontend**: Next.js 14 with TypeScript
- **Video**: Stream Video React SDK
- **Authentication**: Clerk
- **Database**: MongoDB
- **Real-time**: Socket.io
- **Styling**: Tailwind CSS

## Support

For issues related to:
- **Microphone/Audio**: Use the debug tools in the meeting setup
- **Deployment**: Check environment variables and build logs
- **Authentication**: Verify Clerk configuration
- **Video**: Ensure Stream Video API keys are correct

## License

MIT License


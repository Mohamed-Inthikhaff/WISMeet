# WISMeet - Video Conferencing Platform

A modern, real-time video conferencing platform built with Next.js 14, TypeScript, and Stream Video SDK.

## 🚀 Features

- **Real-time Video Conferencing**: Powered by Stream Video SDK
- **Authentication**: Secure user management with Clerk
- **Meeting Management**: Create, join, and schedule meetings
- **Recording**: Automatic meeting recording and playback

- **Responsive Design**: Works on desktop and mobile devices
- **Error Handling**: Comprehensive error boundaries and graceful degradation

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Video**: Stream Video React SDK
- **Authentication**: Clerk
- **Testing**: Jest, React Testing Library
- **Deployment**: Manual deployment ready

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Stream Video account
- Clerk account

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/wismeet.git
   cd wismeet
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
   CLERK_SECRET_KEY=your_clerk_secret
   NEXT_PUBLIC_STREAM_API_KEY=your_stream_key
   STREAM_SECRET_KEY=your_stream_secret

   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## 🏗️ Building

```bash
# Build for production
npm run build

# Start production server
npm start

# Analyze bundle size
npm run analyze
```

## 🚀 Deployment

WISMeet can be deployed manually to various platforms. The application is production-ready with proper error handling and health checks.

### Manual Deployment Options

#### Vercel (Recommended)
1. **Install Vercel CLI**: `npm i -g vercel`
2. **Deploy**: `vercel --prod`
3. **Environment Variables**: Set up Clerk and Stream keys in Vercel dashboard

#### Heroku
1. **Install Heroku CLI**: Follow [Heroku CLI installation guide](https://devcenter.heroku.com/articles/heroku-cli)
2. **Create app**: `heroku create your-app-name`
3. **Set environment variables**: `heroku config:set VARIABLE_NAME=value`
4. **Deploy**: `git push heroku main`

#### Other Platforms
- **Netlify**: Connect your GitHub repository
- **Railway**: Import from GitHub
- **Render**: Connect your repository

### Health Checks

The application includes a health check endpoint at `/api/health` that returns:
- Application status
- Uptime information
- Environment details
- System checks

## 📊 Monitoring & Analytics



### Performance Metrics
- Bundle size monitoring
- Build time tracking
- Test coverage reports
- Real-time performance insights

### Health Monitoring
- Application health checks
- Deployment verification
- Error boundary protection
- Graceful degradation


## 🔧 Development Workflow

### Feature Development
1. Create feature branch from `develop`
2. Implement feature with tests
3. Run local checks: `npm run lint && npm test && npm run build`
4. Create pull request
5. Manual testing validates changes
6. Code review and approval
7. Merge to `develop`

### Release Process
1. Create release branch from `develop`
2. Update version and changelog
3. Run full test suite
4. Create pull request to `main`
5. Manual testing validates
6. Manual deployment to production
7. Deploy to staging for final testing
8. Deploy to production

## 🚨 Error Handling

### Error Boundaries
- Component-level error boundaries
- Graceful fallback UI
- Development vs production error display
- Generic error handling ready for integration

### Health Checks
- Application health endpoint
- Deployment verification
- Automatic retry mechanisms
- Comprehensive logging


## 📈 Performance Optimization

### Bundle Optimization
- Code splitting
- Tree shaking
- Dynamic imports
- Bundle analysis

### Caching Strategy
- npm cache optimization
- Build artifact caching
- CDN optimization ready

## 🔒 Security

### Security Measures
- npm audit for security
- Dependency vulnerability scanning
- Environment variable protection
- Secure manual deployment practices

### Authentication
- Clerk integration
- Secure token handling
- Role-based access control

## 📝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new features
5. Ensure all tests pass
6. Submit a pull request

### Code Standards
- ESLint configuration
- TypeScript strict mode
- Prettier formatting
- Conventional commits

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please open an issue in the GitHub repository or contact the development team.

---

**Built with ❤️ by the WISMeet Team**

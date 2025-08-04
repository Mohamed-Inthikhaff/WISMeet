// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

// Fallback to .env if .env.local doesn't exist
if (!process.env.NEXT_PUBLIC_STREAM_API_KEY) {
  require('dotenv').config({ path: '.env' });
}

// Validate required environment variables
const requiredEnvVars = [
  'NEXT_PUBLIC_STREAM_API_KEY',
  'STREAM_SECRET_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  console.error('Please check your .env.local or .env file');
  process.exit(1);
}

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Prepare the Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  // Import the socket manager dynamically
  const { chatSocketManager } = require('./lib/socket.js');
  
  const server = createServer(async (req, res) => {
    try {
      // Parse the URL
      const parsedUrl = parse(req.url, true);
      const { pathname } = parsedUrl;

      // Handle Next.js requests
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io
  chatSocketManager.init(server);

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
}); 
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Allow all origins (e.g. localhost:5173, localhost:3000)
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Endpoints for Remote Control

// Play a song by query (e.g., "Despacito")
app.post('/api/play', (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  console.log('Received play command:', query);
  io.emit('play', { query });
  res.json({ status: 'ok', message: `Playing ${query}` });
});

// Toggle Pause/Play
app.post('/api/pause', (req, res) => {
  console.log('Received pause command');
  io.emit('pause');
  res.json({ status: 'ok', message: 'Paused/Resumed' });
});

// Skip to Next Track
app.post('/api/next', (req, res) => {
  console.log('Received next command');
  io.emit('next');
  res.json({ status: 'ok', message: 'Skipped to next' });
});

// Skip to Previous Track
app.post('/api/prev', (req, res) => {
  console.log('Received prev command');
  io.emit('prev');
  res.json({ status: 'ok', message: 'Skipped to previous' });
});

// Add to Queue (optional, similar to play but appends)
app.post('/api/queue', (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }
  console.log('Received queue command:', query);
  io.emit('queue', { query });
  res.json({ status: 'ok', message: `Queued ${query}` });
});

// TikTok Live Integration
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
// tiktok-live-connector is CommonJS, so we use require
let WebcastPushConnection;
try {
  const tiktok = require('tiktok-live-connector');
  WebcastPushConnection = tiktok.WebcastPushConnection;
} catch (e) {
  console.warn('tiktok-live-connector not found or failed to load', e);
}

const tiktokUser = process.env.TIKTOK_USER || process.argv[2];

if (tiktokUser && WebcastPushConnection) {
  console.log(`Connecting to TikTok Live user: ${tiktokUser}...`);
  const tiktokLiveConnection = new WebcastPushConnection(tiktokUser);

  tiktokLiveConnection.connect().then(state => {
    console.info(`Connected to roomId ${state.roomId}`);
  }).catch(err => {
    console.error('Failed to connect to TikTok Live', err);
  });

  tiktokLiveConnection.on('chat', data => {
    const msg = data.comment;
    if (msg.startsWith('!play ')) {
      const query = msg.substring(6).trim();
      if (query) {
        console.log(`TikTok request: !play ${query}`);
        io.emit('play', { query });
      }
    } else if (msg === '!skip' || msg === '!next') {
      console.log('TikTok request: !next');
      io.emit('next');
    } else if (msg === '!pause' || msg === '!stop') {
      console.log('TikTok request: !pause');
      io.emit('pause');
    } else if (msg === '!prev') {
      console.log('TikTok request: !prev');
      io.emit('prev');
    }
  });
} else {
  console.log('No TikTok user provided (TIKTOK_USER env or arg). Skipping TikTok integration.');
  console.log('Usage: TIKTOK_USER=username npm run server');
}


const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Remote Control Server running on port ${PORT}`);
});

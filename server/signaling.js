const express = require('express');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Configuration
const CONFIG = {
  HEX_LENGTH: 6,
  TTL_HOURS: 24,
  MAX_FILE_SIZE: 25 * 1024 * 1024, // 25 MB
  MAX_SESSION_SIZE: 200 * 1024 * 1024, // 200 MB
  CHUNK_SIZE: 16 * 1024, // 16 KB
  P2P_TIMEOUT: 6000, // 6 seconds
  UPLOAD_DIR: path.join(__dirname, 'uploads'),
  PORT: process.env.PORT || 8080
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? ['https://your-domain.com'] : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const createSessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 sessions per IP per 15 minutes
  message: { error: 'Too many session creation attempts' }
});

const signalingLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 signaling messages per minute
  message: { error: 'Too many signaling messages' }
});

// In-memory storage (use Redis/Database in production)
const sessions = new Map(); // sessionCode -> { id, code, createdAt, expiresAt, status, files, uploadSize }
const rooms = new Map(); // sessionCode -> { sender: ws, receiver: ws }

// Ensure upload directory exists
fs.ensureDirSync(CONFIG.UPLOAD_DIR);

// Generate hex code
function generateHexCode() {
  return crypto.randomBytes(CONFIG.HEX_LENGTH / 2).toString('hex').toUpperCase();
}

// Sanitize filename
function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
}

// Validate file type
function isValidFileType(mimetype) {
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'text/plain', 'application/pdf', 'application/zip',
    'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav'
  ];
  return allowedTypes.includes(mimetype);
}

// Session cleanup
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [code, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      // Remove session files
      const sessionDir = path.join(CONFIG.UPLOAD_DIR, code);
      fs.remove(sessionDir).catch(console.error);
      
      // Remove from memory
      sessions.delete(code);
      rooms.delete(code);
      
      console.log(`Cleaned up expired session: ${code}`);
    }
  }
}

// Run cleanup every hour
setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// WebSocket connection handling
wss.on('connection', (ws) => {
  let currentRoom = null;
  let currentRole = null;
  
  // Rate limiting for WebSocket messages
  let messageCount = 0;
  const messageTimer = setInterval(() => { messageCount = 0; }, 60000);
  
  ws.on('message', (data) => {
    // Rate limiting
    messageCount++;
    if (messageCount > 100) {
      ws.send(JSON.stringify({ type: 'error', message: 'Rate limit exceeded' }));
      return;
    }
    
    try {
      const message = JSON.parse(data.toString());
      
      switch (message.type) {
        case 'join':
          handleJoin(ws, message);
          break;
        case 'offer':
        case 'answer':
        case 'ice':
          handleSignaling(ws, message);
          break;
        case 'control':
          handleControl(ws, message);
          break;
        default:
          ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    clearInterval(messageTimer);
    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom);
      if (room[currentRole] === ws) {
        delete room[currentRole];
        if (Object.keys(room).length === 0) {
          rooms.delete(currentRoom);
        }
      }
    }
  });
  
  function handleJoin(ws, message) {
    const { code, role } = message;
    
    if (!code || !sessions.has(code)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid session code' }));
      return;
    }
    
    if (!['sender', 'receiver'].includes(role)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid role' }));
      return;
    }
    
    if (!rooms.has(code)) {
      rooms.set(code, {});
    }
    
    const room = rooms.get(code);
    
    // Check if role already taken
    if (room[role]) {
      ws.send(JSON.stringify({ type: 'error', message: 'Role already taken' }));
      return;
    }
    
    room[role] = ws;
    currentRoom = code;
    currentRole = role;
    
    ws.send(JSON.stringify({ type: 'joined', code, role }));
    
    // Notify other peer if present
    const otherRole = role === 'sender' ? 'receiver' : 'sender';
    if (room[otherRole]) {
      room[otherRole].send(JSON.stringify({ type: 'peer-joined', role }));
    }
  }
  
  function handleSignaling(ws, message) {
    if (!currentRoom || !rooms.has(currentRoom)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
      return;
    }
    
    const room = rooms.get(currentRoom);
    const otherRole = currentRole === 'sender' ? 'receiver' : 'sender';
    const targetWs = room[otherRole];
    
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(JSON.stringify(message));
    }
  }
  
  function handleControl(ws, message) {
    if (!currentRoom || !rooms.has(currentRoom)) {
      ws.send(JSON.stringify({ type: 'error', message: 'Not in a room' }));
      return;
    }
    
    const room = rooms.get(currentRoom);
    const otherRole = currentRole === 'sender' ? 'receiver' : 'sender';
    const targetWs = room[otherRole];
    
    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
      targetWs.send(JSON.stringify(message));
    }
  }
});

console.log(`Signaling server initialized with config:`, CONFIG);

module.exports = app;
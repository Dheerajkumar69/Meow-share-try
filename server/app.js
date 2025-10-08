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
  TTL_HOURS: parseInt(process.env.SESSION_TTL_HOURS) || 24,
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 25 * 1024 * 1024, // 25 MB
  MAX_SESSION_SIZE: parseInt(process.env.MAX_SESSION_SIZE) || 200 * 1024 * 1024, // 200 MB
  CHUNK_SIZE: 16 * 1024, // 16 KB
  P2P_TIMEOUT: 6000, // 6 seconds
  UPLOAD_DIR: path.join(__dirname, 'uploads'),
  PORT: process.env.PORT || 8080,
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000'
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [CONFIG.FRONTEND_URL] 
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const createSessionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 sessions per IP per 15 minutes
  message: { error: 'Too many session creation attempts' }
});

// In-memory storage (use Redis/Database in production)
const sessions = new Map(); // sessionCode -> { id, code, createdAt, expiresAt, status, files, uploadSize }
const rooms = new Map(); // sessionCode -> { sender: ws, receiver: ws }

// Ensure upload directory exists
fs.ensureDirSync(CONFIG.UPLOAD_DIR);

// Generate hex code
function generateHexCode() {
  let code;
  let attempts = 0;
  do {
    code = crypto.randomBytes(CONFIG.HEX_LENGTH / 2).toString('hex').toUpperCase();
    attempts++;
  } while (sessions.has(code) && attempts < 10);
  
  if (attempts >= 10) {
    throw new Error('Unable to generate unique session code');
  }
  
  return code;
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const sessionCode = req.params.code;
    const uploadPath = path.join(CONFIG.UPLOAD_DIR, sessionCode);
    fs.ensureDirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const sanitized = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 255);
    cb(null, sanitized);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: CONFIG.MAX_FILE_SIZE,
    files: 10
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'text/plain', 'application/pdf', 'application/zip',
      'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// Session cleanup
function cleanupExpiredSessions() {
  const now = Date.now();
  for (const [code, session] of sessions.entries()) {
    if (now > session.expiresAt) {
      const sessionDir = path.join(CONFIG.UPLOAD_DIR, code);
      fs.remove(sessionDir).catch(console.error);
      sessions.delete(code);
      rooms.delete(code);
      console.log(`Cleaned up expired session: ${code}`);
    }
  }
}

setInterval(cleanupExpiredSessions, 60 * 60 * 1000);

// WebSocket connection handling
wss.on('connection', (ws) => {
  let currentRoom = null;
  let currentRole = null;
  let messageCount = 0;
  
  const messageTimer = setInterval(() => { messageCount = 0; }, 60000);
  
  ws.on('message', (data) => {
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
    
    if (room[role]) {
      ws.send(JSON.stringify({ type: 'error', message: 'Role already taken' }));
      return;
    }
    
    room[role] = ws;
    currentRoom = code;
    currentRole = role;
    
    ws.send(JSON.stringify({ type: 'joined', code, role }));
    
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

// API Routes

// Create new session
app.post('/api/session/create', createSessionLimiter, (req, res) => {
  try {
    const code = generateHexCode();
    const now = Date.now();
    const expiresAt = now + (CONFIG.TTL_HOURS * 60 * 60 * 1000);
    
    const session = {
      id: code,
      code: code,
      createdAt: now,
      expiresAt: expiresAt,
      status: 'waiting',
      files: [],
      uploadSize: 0
    };
    
    sessions.set(code, session);
    
    const uploadPath = path.join(CONFIG.UPLOAD_DIR, code);
    fs.ensureDirSync(uploadPath);
    
    console.log(`Created session: ${code} (expires: ${new Date(expiresAt).toISOString()})`);
    
    res.json({
      success: true,
      session: {
        code: code,
        expiresAt: expiresAt,
        ttlHours: CONFIG.TTL_HOURS
      }
    });
  } catch (error) {
    console.error('Session creation error:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Get session info
app.get('/api/session/:code', (req, res) => {
  const { code } = req.params;
  
  if (!sessions.has(code)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const session = sessions.get(code);
  
  if (Date.now() > session.expiresAt) {
    sessions.delete(code);
    return res.status(404).json({ error: 'Session expired' });
  }
  
  res.json({
    success: true,
    session: {
      code: session.code,
      status: session.status,
      files: session.files,
      createdAt: session.createdAt,
      expiresAt: session.expiresAt,
      uploadSize: session.uploadSize
    }
  });
});

// Upload files (fallback)
app.post('/api/session/:code/upload', upload.array('files'), (req, res) => {
  const { code } = req.params;
  
  if (!sessions.has(code)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const session = sessions.get(code);
  
  if (Date.now() > session.expiresAt) {
    sessions.delete(code);
    return res.status(404).json({ error: 'Session expired' });
  }
  
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }
  
  const uploadedSize = req.files.reduce((total, file) => total + file.size, 0);
  
  if (session.uploadSize + uploadedSize > CONFIG.MAX_SESSION_SIZE) {
    req.files.forEach(file => fs.removeSync(file.path));
    return res.status(413).json({ error: 'Session size limit exceeded' });
  }
  
  const newFiles = req.files.map(file => ({
    id: crypto.randomUUID(),
    filename: file.originalname,
    sanitizedName: file.filename,
    size: file.size,
    mimetype: file.mimetype,
    uploadedAt: Date.now(),
    path: file.path
  }));
  
  session.files.push(...newFiles);
  session.uploadSize += uploadedSize;
  session.status = 'hosted';
  
  console.log(`Uploaded ${req.files.length} files to session ${code}`);
  
  res.json({
    success: true,
    files: newFiles.map(f => ({
      id: f.id,
      filename: f.filename,
      size: f.size,
      mimetype: f.mimetype
    }))
  });
});

// Download file
app.get('/api/session/:code/download/:fileId', (req, res) => {
  const { code, fileId } = req.params;
  
  if (!sessions.has(code)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const session = sessions.get(code);
  
  if (Date.now() > session.expiresAt) {
    sessions.delete(code);
    return res.status(404).json({ error: 'Session expired' });
  }
  
  const file = session.files.find(f => f.id === fileId);
  if (!file || !fs.existsSync(file.path)) {
    return res.status(404).json({ error: 'File not found' });
  }
  
  res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
  res.setHeader('Content-Type', file.mimetype);
  res.setHeader('Content-Length', file.size);
  
  const fileStream = fs.createReadStream(file.path);
  fileStream.pipe(res);
});

// List files
app.get('/api/session/:code/files', (req, res) => {
  const { code } = req.params;
  
  if (!sessions.has(code)) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  const session = sessions.get(code);
  
  if (Date.now() > session.expiresAt) {
    sessions.delete(code);
    return res.status(404).json({ error: 'Session expired' });
  }
  
  res.json({
    success: true,
    files: session.files.map(f => ({
      id: f.id,
      filename: f.filename,
      size: f.size,
      mimetype: f.mimetype,
      uploadedAt: f.uploadedAt
    }))
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    activeSessions: sessions.size,
    config: {
      hexLength: CONFIG.HEX_LENGTH,
      ttlHours: CONFIG.TTL_HOURS,
      maxFileSize: CONFIG.MAX_FILE_SIZE,
      maxSessionSize: CONFIG.MAX_SESSION_SIZE
    }
  });
});

// Start server
server.listen(CONFIG.PORT, () => {
  console.log(`Meow Share server running on port ${CONFIG.PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Upload directory: ${CONFIG.UPLOAD_DIR}`);
});

module.exports = app;
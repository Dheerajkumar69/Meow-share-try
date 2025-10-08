import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { nanoid } from 'nanoid';

// STUN servers for WebRTC
const STUN_SERVERS = [
  'stun:stun.l.google.com:19302',
  'stun:stun1.l.google.com:19302',
  'stun:stun2.l.google.com:19302'
];

// Room management
const rooms = new Map(); // code -> { clients: Set, createdAt: number, expiresAt: number }
const clientRooms = new Map(); // clientId -> roomCode

// Configuration
const ROOM_TTL = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CLIENTS_PER_ROOM = 2;
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute

class SignalingServer {
  constructor(port = 3001) {
    this.port = port;
    this.server = createServer();
    this.wss = new WebSocketServer({ server: this.server });
    this.setupWebSocket();
    this.startCleanup();
  }

  setupWebSocket() {
    this.wss.on('connection', (ws, req) => {
      const clientId = nanoid(8);
      console.log(`[SIGNALING] New client connected: ${clientId}`);
      
      // Store client info
      ws.clientId = clientId;
      ws.isAlive = true;
      
      // Handle pong for keepalive
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle messages
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          console.error(`[SIGNALING] Invalid message from ${clientId}:`, error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        console.log(`[SIGNALING] Client disconnected: ${clientId}`);
        this.handleDisconnect(ws);
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error(`[SIGNALING] WebSocket error for ${clientId}:`, error);
        this.handleDisconnect(ws);
      });

      // Send welcome message
      this.sendMessage(ws, {
        type: 'connected',
        clientId,
        stunServers: STUN_SERVERS
      });
    });
  }

  handleMessage(ws, message) {
    const { type, code, role } = message;
    
    switch (type) {
      case 'join':
        this.handleJoin(ws, code, role);
        break;
      case 'offer':
      case 'answer':
      case 'ice':
        this.handleRelay(ws, message);
        break;
      case 'control':
        this.handleControl(ws, message);
        break;
      case 'metadata':
        this.handleMetadata(ws, message);
        break;
      case 'ack':
        this.handleAck(ws, message);
        break;
      case 'fallback-ready':
        this.handleFallbackReady(ws, message);
        break;
      default:
        console.warn(`[SIGNALING] Unknown message type: ${type}`);
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  handleJoin(ws, code, role) {
    if (!code || code.length !== 6) {
      this.sendError(ws, 'Invalid room code');
      return;
    }

    const room = rooms.get(code);
    
    if (!room) {
      // Create new room
      const newRoom = {
        clients: new Set([ws]),
        createdAt: Date.now(),
        expiresAt: Date.now() + ROOM_TTL
      };
      rooms.set(code, newRoom);
      clientRooms.set(ws.clientId, code);
      
      console.log(`[SIGNALING] Created room ${code} with client ${ws.clientId} as ${role}`);
      this.sendMessage(ws, {
        type: 'joined',
        code,
        role,
        status: 'waiting'
      });
    } else {
      // Join existing room
      if (room.clients.size >= MAX_CLIENTS_PER_ROOM) {
        this.sendError(ws, 'Room is full');
        return;
      }

      room.clients.add(ws);
      clientRooms.set(ws.clientId, code);
      
      console.log(`[SIGNALING] Client ${ws.clientId} joined room ${code} as ${role}`);
      
      // Notify all clients in room
      room.clients.forEach(client => {
        this.sendMessage(client, {
          type: 'joined',
          code,
          role,
          status: room.clients.size === 2 ? 'ready' : 'waiting'
        });
      });
    }
  }

  handleRelay(ws, message) {
    const roomCode = clientRooms.get(ws.clientId);
    if (!roomCode) {
      this.sendError(ws, 'Not in a room');
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      this.sendError(ws, 'Room not found');
      return;
    }

    // Relay message to other clients in room
    room.clients.forEach(client => {
      if (client !== ws && client.readyState === 1) { // WebSocket.OPEN
        this.sendMessage(client, {
          ...message,
          from: ws.clientId
        });
      }
    });
  }

  handleControl(ws, message) {
    const roomCode = clientRooms.get(ws.clientId);
    if (!roomCode) return;

    const room = rooms.get(roomCode);
    if (!room) return;

    // Relay control message to other clients
    room.clients.forEach(client => {
      if (client !== ws && client.readyState === 1) {
        this.sendMessage(client, {
          ...message,
          from: ws.clientId
        });
      }
    });
  }

  handleMetadata(ws, message) {
    // Relay file metadata to other clients
    this.handleRelay(ws, message);
  }

  handleAck(ws, message) {
    // Relay acknowledgment to sender
    this.handleRelay(ws, message);
  }

  handleFallbackReady(ws, message) {
    // Relay fallback notification to other clients
    this.handleRelay(ws, message);
  }

  handleDisconnect(ws) {
    const roomCode = clientRooms.get(ws.clientId);
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        room.clients.delete(ws);
        
        // Notify remaining clients
        room.clients.forEach(client => {
          this.sendMessage(client, {
            type: 'peer-disconnected',
            clientId: ws.clientId
          });
        });

        // Clean up empty rooms
        if (room.clients.size === 0) {
          rooms.delete(roomCode);
          console.log(`[SIGNALING] Cleaned up empty room: ${roomCode}`);
        }
      }
      clientRooms.delete(ws.clientId);
    }
  }

  sendMessage(ws, message) {
    if (ws.readyState === 1) { // WebSocket.OPEN
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, error) {
    this.sendMessage(ws, {
      type: 'error',
      error
    });
  }

  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [code, room] of rooms.entries()) {
        if (now > room.expiresAt) {
          console.log(`[SIGNALING] Cleaning up expired room: ${code}`);
          room.clients.forEach(client => {
            this.sendMessage(client, {
              type: 'room-expired',
              code
            });
            client.close();
          });
          rooms.delete(code);
        }
      }
    }, CLEANUP_INTERVAL);
  }

  start() {
    this.server.listen(this.port, () => {
      console.log(`[SIGNALING] WebSocket server running on port ${this.port}`);
    });
  }
}

// Export signaling server class for use in main server
export default SignalingServer;

# Meow Share - P2P File Sharing

A secure P2P file sharing application using WebRTC with automatic server fallback.

## Features
- Direct P2P file transfer using WebRTC DataChannel
- Automatic fallback to server upload/download if P2P fails
- 6-character hex room codes for easy sharing
- Chunked transfer with progress tracking and integrity verification
- 24-hour session TTL with automatic cleanup
- Memory-safe transfers with backpressure handling
- File type validation and size limits

## Configuration
- Hex length: 6 characters
- Session TTL: 24 hours  
- Max file size: 25 MB per file, 200 MB per session
- Chunk size: 16 KB
- P2P timeout: 6 seconds
- STUN server: stun:stun.l.google.com:19302

## Development

```bash
# Install dependencies
npm install
cd server && npm install
cd ../client && npm install

# Run development servers
npm run dev
```

## Architecture

```
Client (Sender/Receiver) 
    ↕ HTTPS/WSS
Signaling Server (WebSocket) 
    ↕ STUN/TURN  
WebRTC P2P DataChannel
    ↕ (fallback)
File Storage + Session Metadata
    ↕
Background Cleanup
```
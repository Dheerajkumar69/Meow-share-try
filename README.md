# Meow Share 🐱📸

A simple, secure photo-sharing web application. Upload photos, get a hex code, share the code, and let others download your photos.

## Features (MVP)

- 📤 Upload multiple images with a single session
- 🔑 6-character hex code for easy sharing
- 📥 Download images using the code
- ⏰ Auto-expiry after 24 hours
- 🔒 Secure, temporary file storage

## Architecture

```
Client (Web UI)
    ↕ HTTPS
Backend API (Express/Node.js)
    ↕
Storage (Filesystem → Object Storage)
    ↕
Cleanup Worker (Expired sessions)
```

## Project Structure

```
meow-share/
├── backend/          # Express API server
├── frontend/         # React + Vite UI
├── shared/           # Shared types/constants
└── README.md
```

## Key Parameters

- **Hex code length**: 6 characters (16,777,216 possibilities)
- **Session TTL**: 24 hours
- **Max file size**: 20 MB per file
- **Max session size**: 200 MB total
- **Allowed types**: JPEG, PNG, WebP

## Future Enhancements

- WebRTC P2P direct transfers
- Client-side encryption (E2EE)
- QR code generation
- Resumable uploads
- ZIP download for multiple files

## Quick Start

### Development Mode (Separate - Hot Reload)
```bash
# Install dependencies
npm run install:all

# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### Production Mode (Combined)
```bash
# Build and run as one app
npm run build
cd backend
npm start

# Visit http://localhost:3000
```

## Deployment

**Frontend and backend are now COMBINED!** Deploy as one app:

### Railway (Recommended)
1. Go to [railway.app](https://railway.app)
2. Deploy from GitHub repo
3. Done! Auto-detects configuration

### Render
1. Go to [render.com](https://render.com)  
2. Create Web Service from repo
3. Auto-detects `render.yaml`

### Vercel
1. Go to [vercel.com/new](https://vercel.com/new)
2. Import repository
3. Deploy

**See `START_HERE.md` for complete deployment guide.**

## Documentation

- **START_HERE.md** - Quick deployment guide
- **UNIFIED_DEPLOYMENT.md** - Detailed deployment instructions
- **backend/README.md** - Backend API documentation
- **frontend/README.md** - Frontend development guide

## License

MIT

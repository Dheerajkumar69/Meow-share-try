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

## Development

See individual README files in `/backend` and `/frontend` directories.

## License

MIT

# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**Meow Share** is a secure photo-sharing web application where users upload images, receive a 6-character hex code, and share that code for others to download the photos. Sessions auto-expire after 24 hours.

**Tech Stack:**
- **Backend:** Node.js + Express (ES Modules)
- **Frontend:** React + Vite
- **Storage:** Filesystem-based (files + thumbnails)
- **Image Processing:** Sharp (thumbnail generation)

## Common Development Commands

### Initial Setup
```bash
# Install all dependencies (root, backend, and frontend)
npm run install:all

# Or install individually:
cd backend && npm install
cd frontend && npm install
```

### Running the Application Locally

**Backend (Terminal 1):**
```bash
cd backend
npm run dev
# Server runs on http://localhost:3000
```

**Frontend (Terminal 2):**
```bash
cd frontend
npm run dev
# UI runs on http://localhost:5173
```

**Both together (from root):**
```bash
npm run dev
# Runs both backend and frontend concurrently
```

### Testing

**Backend API Tests:**
```bash
cd backend
node test-api.js
node test-complete.js
```

**Manual API Testing:**
```bash
# Create session
curl -X POST http://localhost:3000/api/sessions

# Upload files
curl -X POST http://localhost:3000/api/sessions/{CODE}/upload -F "files=@path/to/image.jpg"

# List files
curl http://localhost:3000/api/sessions/{CODE}/files

# Download file
curl http://localhost:3000/api/sessions/{CODE}/files/{FILENAME} -o downloaded.jpg
```

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
# Output in frontend/dist/
```

**Backend:**
```bash
cd backend
npm start
# Production mode (no hot-reload)
```

### Linting
```bash
cd frontend
npm run lint
```

## Architecture Overview

### High-Level Flow
```
User (Sender) → Frontend → Backend API → Storage (Filesystem)
                                ↓
                         Cleanup Worker (auto-deletes expired sessions)
                                ↓
User (Receiver) ← Frontend ← Backend API ← Storage
```

### Backend Architecture

**Key Services (backend/src/services/):**
- **sessionService.js** - Session lifecycle: creation, validation, expiry checking
- **fileService.js** - File uploads, metadata tracking, session size limits
- **thumbnailService.js** - Auto-generates 200x200 JPEG thumbnails using Sharp
- **cleanupService.js** - Background worker that deletes expired sessions every hour

**Storage Structure (backend/storage/):**
```
storage/
└── sessions/
    └── {hex-code}/          # e.g., "3f9a7b"
        ├── metadata.json    # Session info, file list, expiry
        ├── files/           # Original uploaded images
        │   └── {timestamp}_{filename}
        └── thumbnails/      # Auto-generated thumbnails
            └── {timestamp}_{filename}
```

**Key Middleware (backend/src/middleware/):**
- **upload.js** - Multer configuration, file validation (MIME + extension), size limits
- **rateLimiter.js** - Rate limiting for session creation (100 req/15min) and uploads
- **validation.js** - Validates hex code format

**Request Flow Example (Upload):**
1. Frontend sends multipart/form-data to `/api/sessions/{code}/upload`
2. `rateLimiter` checks upload rate limits
3. `upload` middleware (Multer) validates and stores files temporarily
4. `sessionService.getSession()` verifies session exists and not expired
5. `fileService.addFilesToSession()` checks size limits, moves files
6. `thumbnailService.generateThumbnails()` creates thumbnails
7. Metadata updated with file info
8. Response sent with file details

### Frontend Architecture

**Component Structure (frontend/src/components/):**
- **App.jsx** - Main container, mode switcher (Sender/Receiver)
- **Sender.jsx** - Session creation, file selection (drag-drop + picker), upload with progress
- **Receiver.jsx** - Code input, file listing with thumbnails, individual/bulk downloads

**State Management:**
- Local React state (useState) for session info, file lists, loading states
- Axios for HTTP requests to backend API

**Key Features:**
- Drag-and-drop file upload (desktop)
- File type/size validation before upload
- Real-time upload progress tracking
- Thumbnail previews in receiver view
- Client-side hex code validation

### Session Lifecycle

1. **Creation:** User clicks "Create Session" → Backend generates unique 6-char hex code → Directories created
2. **Upload:** Files validated → Stored in `sessions/{code}/files/` → Thumbnails generated → Metadata updated
3. **Retrieval:** Receiver enters code → Backend validates + checks expiry → Returns file list + thumbnails
4. **Download:** File streamed from storage to client
5. **Expiry:** Cleanup worker runs hourly → Deletes sessions older than 24 hours → Removes all files + metadata

### Configuration

**Shared Config (shared/config.js):**
- All constants in one place: file size limits, TTL, allowed MIME types
- Used by both frontend and backend

**Environment Variables (backend/.env):**
```env
PORT=3000
NODE_ENV=development
STORAGE_PATH=./storage
SESSION_TTL_HOURS=24
CLEANUP_INTERVAL_MS=3600000
CORS_ORIGIN=http://localhost:5173
```

## Development Conventions

### Code Style
- **ES Modules:** All backend code uses `import/export` (not `require`)
- **Async/Await:** Used throughout for asynchronous operations
- **Error Handling:** Try-catch blocks with next(error) in Express routes

### File Naming
- Backend: `camelCase.js` for services/middleware
- Frontend: `PascalCase.jsx` for React components
- Uploaded files: `{timestamp}_{sanitized-original-name}.{ext}`

### API Response Format

**Success:**
```json
{
  "code": "3f9a7b",
  "expiresAt": "2024-10-07T07:24:00.000Z"
}
```

**Error:**
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

### Security Measures
- MIME type + file extension validation (double-check)
- File size limits: 20 MB per file, 200 MB per session
- Filename sanitization (timestamp prefix prevents collisions)
- Rate limiting on session creation and uploads
- Helmet security headers
- CORS configured for specific origins
- Auto-expiry prevents indefinite storage

## Common Development Tasks

### Adding a New API Endpoint
1. Add route handler in `backend/src/routes/sessions.js`
2. Add service logic if needed in `backend/src/services/`
3. Update frontend to call new endpoint via Axios

### Modifying File Size Limits
1. Update `shared/config.js` constants
2. Ensure Multer limits in `backend/src/middleware/upload.js` match
3. Update frontend validation in `Sender.jsx`

### Changing Session TTL
1. Update `SESSION_TTL_HOURS` in `backend/.env`
2. Or modify `shared/config.js` for default value
3. Restart backend for changes to take effect

### Adding New File Types
1. Add MIME types to `ALLOWED_MIME_TYPES` in `shared/config.js`
2. Add extensions to `ALLOWED_EXTENSIONS` in `shared/config.js`
3. Update validation in `backend/src/middleware/upload.js`
4. Update frontend validation in `Sender.jsx`

### Debugging Session Issues
```bash
# Check storage structure
cd backend/storage/sessions
ls -la

# View session metadata
cat sessions/{CODE}/metadata.json

# Check backend logs for cleanup events
# Look for: "🧹 Running cleanup job..." and "✓ Deleted expired session: {CODE}"
```

## Troubleshooting

### Backend won't start
- Check `backend/.env` exists (copy from `.env.example`)
- Verify Node.js version >= 16
- Delete `node_modules` and reinstall: `cd backend && rm -rf node_modules && npm install`

### Files won't upload
- Verify file type (JPEG, PNG, WebP only)
- Check file size (< 20 MB per file)
- Ensure session hasn't expired
- Check backend logs for detailed error

### CORS errors
- Verify `CORS_ORIGIN` in `backend/.env` matches frontend URL
- Default: `http://localhost:5173`
- For multiple origins, use comma-separated: `http://localhost:5173,http://localhost:3001`

### Session not found after creation
- Check storage directory exists and is writable
- Verify `metadata.json` was created in `backend/storage/sessions/{CODE}/`
- Check backend logs for errors during session creation

### Thumbnails not appearing
- Sharp dependency installed correctly: `cd backend && npm install sharp`
- Check `thumbnails/` directory exists in session folder
- Backend logs will show thumbnail generation errors

## Testing Checklist

Before committing changes, verify:
- [ ] Backend starts without errors
- [ ] Frontend builds without errors (`npm run lint`, `npm run build`)
- [ ] Can create session and get hex code
- [ ] Can upload images successfully
- [ ] Thumbnails appear in receiver view
- [ ] Files download correctly
- [ ] Invalid codes show proper error messages
- [ ] File validation works (type, size limits)
- [ ] Rate limiting prevents abuse
- [ ] Cleanup worker logs expired session deletions

## Deployment Notes

### Quick Deployment Summary

**Frontend (Vercel):**
1. Deploy from `frontend/` directory
2. Set environment variable: `VITE_API_BASE_URL=https://your-backend.com`
3. Vercel auto-detects Vite settings from `vercel.json`
4. **Must redeploy after changing environment variables**

**Backend (Railway/Render):**
1. Deploy from `backend/` directory
2. Set `NODE_ENV=production`
3. Set `CORS_ORIGIN=https://your-vercel-app.vercel.app`
4. Ensure persistent storage or migrate to S3

### Detailed Deployment Guides

For comprehensive deployment instructions, see:
- **Vercel Frontend:** See `VERCEL_DEPLOYMENT.md` for complete guide
- **Backend:** See `DEPLOYMENT.md` for Railway/Render instructions

### Common Vercel Issues

**Blank Screen After Deploy:**
1. Check browser console (F12) for errors
2. Verify `VITE_API_BASE_URL` is set in Vercel environment variables
3. Ensure backend CORS includes Vercel domain
4. Redeploy after adding environment variables
5. Hard refresh browser (Ctrl+Shift+R)

**Environment Variables Not Working:**
- Must start with `VITE_` prefix for Vite
- Must redeploy after adding/changing
- No trailing slash in URLs

**Build Failures:**
- Check Vercel build logs
- Test locally: `cd frontend && npm run build`
- Ensure Node.js version compatibility

### Key Configuration Files

- `frontend/vercel.json` - Vercel deployment config (framework, rewrites, headers)
- `frontend/vite.config.js` - Vite build settings
- `frontend/src/config.js` - API URL configuration
- `backend/.env` - Backend environment variables (CORS, storage, etc.)
- `backend/package.json` - Start script and dependencies
- `backend/railway.json` - Railway configuration
- `backend/render.yaml` - Render configuration

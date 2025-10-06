# Meow Share Backend

Express.js API server for handling photo uploads, session management, and downloads.

## ✅ Implemented Features

- ✅ Session creation with 6-character hex codes
- ✅ Secure file upload with validation
- ✅ Automatic thumbnail generation
- ✅ File download with streaming
- ✅ Session expiry and auto-cleanup
- ✅ MIME type and file size validation

## Setup

```bash
cd backend
npm install

# Copy environment template
copy .env.example .env

# Start development server
npm run dev
```

Server runs on `http://localhost:3000`

## API Endpoints

### Session Management

#### Create Session
```http
POST /api/sessions
```

**Response:**
```json
{
  "code": "3f9a7b",
  "expiresAt": "2024-10-07T07:24:00.000Z"
}
```

#### Get Session Info
```http
GET /api/sessions/:code
```

**Response:**
```json
{
  "code": "3f9a7b",
  "createdAt": "2024-10-06T07:24:00.000Z",
  "expiresAt": "2024-10-07T07:24:00.000Z",
  "files": [],
  "totalSize": 0
}
```

### File Operations

#### Upload Files
```http
POST /api/sessions/:code/upload
Content-Type: multipart/form-data
```

**Form Data:**
- `files`: Multiple image files (JPEG, PNG, WebP)

**Response:**
```json
{
  "message": "Files uploaded successfully",
  "filesCount": 3,
  "totalSize": 1234567,
  "files": [
    {
      "filename": "1696581840000_photo.jpg",
      "originalName": "photo.jpg",
      "mimetype": "image/jpeg",
      "size": 512000,
      "uploadedAt": "2024-10-06T07:24:00.000Z",
      "hasThumbnail": true
    }
  ]
}
```

**Limits:**
- Max file size: 20 MB per file
- Max files per upload: 50
- Max session size: 200 MB total
- Allowed types: JPEG, PNG, WebP

#### List Files in Session
```http
GET /api/sessions/:code/files
```

**Response:**
```json
{
  "code": "3f9a7b",
  "filesCount": 3,
  "totalSize": 1234567,
  "files": [...]
}
```

#### Download File
```http
GET /api/sessions/:code/files/:filename
```

Returns the file with appropriate `Content-Type` and `Content-Disposition` headers.

#### Get Thumbnail
```http
GET /api/sessions/:code/thumbnails/:filename
```

Returns a 200x200 JPEG thumbnail of the image.

**Cache:** Thumbnails are cached for 24 hours (client-side).

### Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-10-06T07:24:00.000Z"
}
```

## Error Responses

All errors follow this format:
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

**Common Status Codes:**
- `400` - Bad request (invalid input, no files, etc.)
- `404` - Not found (session expired or doesn't exist)
- `413` - Payload too large (file size limit exceeded)
- `500` - Internal server error

## Testing

### Basic Test
```bash
node test-api.js
```

### Complete Test (with file uploads)
```bash
# Create test images directory
mkdir test-images

# Add some test images (.jpg, .png, .webp)
# Then run:
node test-complete.js
```

### Manual Testing with curl

```bash
# Create session
curl -X POST http://localhost:3000/api/sessions

# Get session (replace CODE with actual code)
curl http://localhost:3000/api/sessions/CODE

# Upload file
curl -X POST http://localhost:3000/api/sessions/CODE/upload \
  -F "files=@path/to/image.jpg"

# List files
curl http://localhost:3000/api/sessions/CODE/files

# Download file (replace FILENAME)
curl http://localhost:3000/api/sessions/CODE/files/FILENAME -o downloaded.jpg

# Get thumbnail
curl http://localhost:3000/api/sessions/CODE/thumbnails/FILENAME -o thumb.jpg
```

## Storage Structure

```
storage/
└── sessions/
    └── 3f9a7b/           # Session code
        ├── metadata.json # Session metadata
        ├── files/        # Uploaded files
        │   ├── 1696581840000_photo1.jpg
        │   └── 1696581840000_photo2.png
        └── thumbnails/   # Generated thumbnails
            ├── 1696581840000_photo1.jpg
            └── 1696581840000_photo2.png
```

## Environment Variables

Create a `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Storage
STORAGE_PATH=./storage

# Session Configuration
SESSION_TTL_HOURS=24
CLEANUP_INTERVAL_MS=3600000

# Security
CORS_ORIGIN=http://localhost:5173
```

## File Validation

**MIME Types:**
- `image/jpeg`
- `image/png`
- `image/webp`

**Extensions:**
- `.jpg`, `.jpeg`
- `.png`
- `.webp`

Files are validated both by MIME type and extension for security.

## Thumbnail Generation

- Thumbnails are automatically generated on upload
- Max dimensions: 200x200 pixels
- Format: JPEG with 80% quality
- Maintains aspect ratio (fit inside bounds)
- Does not enlarge smaller images

## Cleanup Worker

- Runs every hour (configurable)
- Deletes expired sessions automatically
- Removes all files and metadata
- Logs cleanup operations

## Security Features

- ✅ File type validation (MIME + extension)
- ✅ File size limits (per-file and per-session)
- ✅ Filename sanitization
- ✅ Session code validation
- ✅ Automatic session expiry
- ✅ CORS configuration
- ✅ Helmet security headers

## Performance Notes

- File streaming for downloads (memory efficient)
- Thumbnails cached on client side
- Async operations throughout
- Efficient metadata updates

## Dependencies

- **express** - Web framework
- **multer** - File upload handling
- **sharp** - Image processing and thumbnails
- **cors** - CORS middleware
- **helmet** - Security headers
- **dotenv** - Environment variables

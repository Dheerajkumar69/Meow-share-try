# Meow Share

Photo sharing with temporary hex codes - A unified full-stack application.

## 📁 Project Structure

This project combines both frontend (React + Vite) and backend (Express.js API) in a single directory optimized for Vercel deployment.

```
frontend/
├── api/              # Backend API (Express.js serverless functions)
│   ├── index.js      # Main Express app
│   ├── middleware/   # Express middleware
│   ├── routes/       # API routes
│   ├── services/     # Business logic
│   └── utils/        # Utility functions
├── src/              # Frontend source (React)
├── public/           # Static assets
├── .env.local        # Local environment variables
├── .env.example      # Environment variables template
└── vercel.json       # Vercel deployment configuration
```

## 🚀 Local Development

### Prerequisites
- Node.js (v18 or higher recommended)
- npm

### Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Create environment file:**
```bash
cp .env.example .env.local
```

3. **Start development server:**
```bash
npm run dev
```

This will start both:
- 🔧 Backend API server on `http://localhost:3000`
- ⚡ Frontend dev server on `http://localhost:5173`

### Available Scripts

- `npm run dev` - Run both frontend and backend concurrently
- `npm run dev:server` - Run only the backend API server
- `npm run dev:vite` - Run only the frontend dev server
- `npm run build` - Build the frontend for production
- `npm run preview` - Preview the production build locally

## 🌐 Deploy to Vercel

### Quick Deploy

1. **Push to GitHub/GitLab/Bitbucket**

2. **Import to Vercel**
   - Go to https://vercel.com/new
   - Import your repository
   - Set **Root Directory** to: `frontend`
   - Framework Preset: Vite (auto-detected)

3. **Configure Environment Variables** in Vercel Dashboard:
   ```
   NODE_ENV=production
   SESSION_TTL_HOURS=24
   CLEANUP_INTERVAL_MS=3600000
   HEX_CODE_LENGTH=6
   ```

4. **Deploy!** 🎉

### Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd frontend

# Deploy
vercel
```

### ⚠️ Important Notes for Vercel Deployment

1. **File Storage Limitation**
   - Vercel serverless functions use ephemeral `/tmp` storage
   - Files are cleared between function invocations
   - For production, consider external storage (AWS S3, Cloudinary, etc.)

2. **Payload Limits**
   - Vercel has a 4.5MB request/response limit for serverless functions
   - Current config: 20MB max file size (works for development)
   - May need to adjust for production deployment

3. **CORS Configuration**
   - Update `CORS_ORIGIN` environment variable with your Vercel domain
   - Example: `https://your-app.vercel.app`

## 📝 Environment Variables

### Development (.env.local)
```env
PORT=3000
NODE_ENV=development
STORAGE_PATH=./storage
SESSION_TTL_HOURS=24
CLEANUP_INTERVAL_MS=3600000
CORS_ORIGIN=http://localhost:5173
JSON_BODY_LIMIT=200kb
HEX_CODE_LENGTH=6
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CREATE_SESSION_WINDOW_MS=60000
CREATE_SESSION_MAX=10
UPLOAD_WINDOW_MS=60000
UPLOAD_MAX_REQUESTS=30
```

### Production (Vercel)
Set these in your Vercel project settings:
- `NODE_ENV=production`
- `SESSION_TTL_HOURS=24`
- `CORS_ORIGIN=https://your-domain.vercel.app`
- `HEX_CODE_LENGTH=6`

## 🎨 Features

- 📸 **Photo Sharing** with temporary hex codes
- 🔒 **Secure Uploads** (JPEG, PNG, WebP only)
- ⏱️ **Auto Cleanup** of expired sessions
- 🖼️ **Thumbnail Generation** with Sharp
- 🚀 **Vercel Ready** serverless deployment
- ⚡ **Fast Development** with Vite HMR
- 🛡️ **Security** with Helmet, CORS, rate limiting

## 🛠️ Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool with HMR
- **Axios** - HTTP client

### Backend
- **Express.js** - Web framework
- **Multer** - File upload handling
- **Sharp** - Image processing
- **Helmet** - Security headers
- **Express Rate Limit** - API rate limiting

### Deployment
- **Vercel** - Serverless platform
- **Node.js** - Runtime environment

## 📦 API Endpoints

### Sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/:code` - Get session details
- `DELETE /api/sessions/:code` - Delete session

### Files
- `POST /api/sessions/:code/files` - Upload files
- `GET /api/sessions/:code/files/:filename` - Download file
- `GET /api/sessions/:code/thumbnails/:filename` - Get thumbnail

### Health
- `GET /health` - Health check endpoint

## 🤝 Contributing

Feel free to submit issues and pull requests!

## 📄 License

MIT

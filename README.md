# 🐱 Meow Share - Photo Sharing Made Simple

A modern, secure photo-sharing web application. Upload photos, get a hex code, share it, and let others download your photos. Built with React and Express, optimized for Vercel deployment.

![Meow Share](https://img.shields.io/badge/version-2.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 📤 **Easy Upload** - Upload multiple images with drag & drop
- 🔑 **Simple Sharing** - 6-character hex code for easy sharing
- 📥 **Quick Download** - Download images individually or all at once
- ⏰ **Auto-Expiry** - Sessions expire after 24 hours
- 🔒 **Secure** - Temporary file storage with rate limiting
- 📱 **Responsive** - Works on all devices
- 🚀 **Serverless** - Optimized for Vercel deployment

## 🎯 Tech Stack

**Frontend:**
- React 18
- Vite (for fast builds)
- Axios (for API calls)
- Modern CSS with gradients

**Backend:**
- Express.js
- Multer (file uploads)
- Helmet (security)
- Express Rate Limit (DDoS protection)

## 📋 Requirements

- Node.js 18 or higher
- npm or yarn

## 🚀 Quick Start

### 1. Clone & Install

```bash
# Navigate to the project
cd meow-share-v2

# Install dependencies
npm install
```

### 2. Development Mode

```bash
# Start both frontend and backend together
npm run dev
```

This starts:
- Backend on http://localhost:3000
- Frontend on http://localhost:5173 (with proxy to backend)

Then open http://localhost:5173 in your browser.

**Alternative (Manual):**
```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

### 3. Production Build

```bash
# Build the frontend
npm run build

# Preview the build
npm run preview
```

## 🌐 Deploy to Vercel

### Option 1: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Option 2: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click **"Add New Project"**
3. Import your Git repository
4. Vercel will auto-detect the configuration
5. Click **"Deploy"**

That's it! Your app is live! 🎉

### Vercel Configuration

The `vercel.json` file is already configured for you:
- Frontend is built and served as static files
- API routes are handled as serverless functions
- All `/api/*` routes are proxied to the backend

## 📁 Project Structure

```
meow-share-v2/
├── api/                      # Backend (Express API)
│   ├── routes/              # API routes
│   │   └── sessions.js      # Session management routes
│   ├── services/            # Business logic
│   │   ├── sessionService.js
│   │   └── cleanupService.js
│   ├── middleware/          # Express middleware
│   │   ├── upload.js        # File upload handling
│   │   ├── rateLimiter.js   # Rate limiting
│   │   └── validation.js    # Request validation
│   ├── utils/               # Utility functions
│   │   ├── codeGenerator.js # Hex code generation
│   │   └── storage.js       # File storage utilities
│   └── index.js             # API entry point
├── src/                     # Frontend (React)
│   ├── components/
│   │   ├── Sender.jsx       # Upload interface
│   │   ├── Sender.css
│   │   ├── Receiver.jsx     # Download interface
│   │   └── Receiver.css
│   ├── App.jsx              # Main app component
│   ├── App.css
│   ├── main.jsx             # React entry point
│   └── index.css
├── public/                  # Static assets
├── index.html               # HTML template
├── vite.config.js           # Vite configuration
├── vercel.json              # Vercel deployment config
├── package.json             # Dependencies
└── README.md                # You are here!
```

## 🔧 How It Works

### Sending Photos

1. User clicks **"Create Session"**
2. Backend generates a unique 6-character hex code
3. User uploads photos
4. Photos are stored on the server with session metadata
5. User shares the hex code with recipient

### Receiving Photos

1. Recipient enters the hex code
2. Frontend fetches session info from API
3. Displays list of available photos
4. User downloads individual photos or all at once

### Session Management

- Each session is identified by a unique 6-character hex code (16+ million possibilities)
- Sessions expire after 24 hours
- A cleanup worker runs hourly to remove expired sessions
- Maximum session size: 200 MB
- Maximum file size: 20 MB per file
- Allowed formats: JPEG, PNG, WebP

## 🔐 Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **Helmet**: Adds security headers
- **CORS**: Configured for same-origin policy
- **File Validation**: Only images allowed
- **Size Limits**: Prevents storage abuse
- **Auto Cleanup**: Old files are automatically deleted

## 📊 API Endpoints

### Create Session
```
POST /api/sessions
Response: { code: "abc123", expiresAt: "2024-..." }
```

### Get Session Info
```
GET /api/sessions/:code
Response: { code, fileCount, totalSize, expiresAt, files: [...] }
```

### Upload Files
```
POST /api/sessions/:code/files
Body: FormData with files
Response: { message, fileCount, files: [...] }
```

### Download File
```
GET /api/sessions/:code/files/:fileId
Response: File stream (download)
```

### Health Check
```
GET /api/health
Response: { status: "ok", timestamp: "..." }
```

## 🎨 Customization

### Change Session TTL

Edit `api/services/sessionService.js`:
```javascript
const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours
```

### Change File Size Limits

Edit `api/middleware/upload.js`:
```javascript
limits: {
  fileSize: 20 * 1024 * 1024, // 20 MB per file
  files: 20 // Maximum 20 files per upload
}
```

### Change Rate Limits

Edit `api/middleware/rateLimiter.js`:
```javascript
max: 100, // Requests per window
windowMs: 15 * 60 * 1000 // 15 minutes
```

## 🐛 Troubleshooting

### Build Errors

```bash
# Clear cache and reinstall
rm -rf node_modules dist .vercel
npm install
npm run build
```

### API Not Working on Vercel

- Check Vercel function logs in dashboard
- Ensure `vercel.json` is in root directory
- Verify all dependencies are in `package.json`
- Make sure Node version is 18+

### Files Not Uploading

- Check file size (max 20 MB per file)
- Check total session size (max 200 MB)
- Verify file type (JPEG, PNG, WebP only)
- Check browser console for errors

## 📝 Environment Variables

For local development, create a `.env` file:

```env
PORT=3000
NODE_ENV=development
```

No environment variables are required for Vercel deployment!

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT License - feel free to use this project for personal or commercial purposes.

## 🌟 Future Enhancements

- [ ] WebRTC P2P transfers
- [ ] End-to-end encryption
- [ ] QR code generation
- [ ] ZIP download for multiple files
- [ ] Image preview/thumbnails
- [ ] Progress indicators
- [ ] Custom expiry times
- [ ] Password protection

## 💬 Support

If you encounter any issues or have questions:
1. Check the [Troubleshooting](#-troubleshooting) section
2. Review Vercel deployment logs
3. Check browser console (F12) for errors
4. Open an issue on GitHub

---

**Made with 💜 by the Meow Share team** 🐱

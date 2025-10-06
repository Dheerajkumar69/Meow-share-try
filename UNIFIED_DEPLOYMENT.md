# 🚀 Unified Deployment Guide

## ✨ What Changed?

**Frontend and backend are now combined!** The backend serves the frontend as static files, so:
- ✅ **Deploy only ONE app** (not two separate ones)
- ✅ **No CORS issues** (same origin)
- ✅ **No environment variables needed** (API calls are relative)
- ✅ **Simpler deployment**

## 🎯 Quick Deploy Options

### Option 1: Railway (Recommended - Easiest)

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your repository
4. Railway will auto-detect `railway.toml` and build everything
5. Done! Your app will be live at `https://your-app.up.railway.app`

**No environment variables needed!** It just works.

### Option 2: Render

1. Go to [render.com](https://render.com)
2. Click "New +" → "Web Service"
3. Connect your repository
4. Render will auto-detect `render.yaml`
5. Click "Create Web Service"
6. Done! Live at `https://your-app.onrender.com`

### Option 3: Vercel (With Backend)

**Note:** Vercel free tier has limitations for backends. Use Railway or Render for better experience.

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository
3. Deploy
4. Done! Live at `https://your-app.vercel.app`

### Option 4: Manual Server

```bash
# On your server (Ubuntu/Debian)
git clone your-repo
cd your-repo

# Install dependencies and build
npm run install:all
npm run build

# Start the app
cd backend
npm start

# Or use PM2 for production
npm install -g pm2
pm2 start src/index.js --name meow-share
pm2 save
pm2 startup
```

## 🧪 Test Locally First

### Build and Run Combined App

```bash
# From project root
npm run build        # Builds frontend
cd backend
npm start            # Starts backend (serves frontend too)
```

Open http://localhost:3000 - you'll see the full app!

### Development Mode (Separate)

If you want hot-reload during development:

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Frontend dev: http://localhost:5173 (with hot reload)
Backend API: http://localhost:3000

## 📁 How It Works

### Build Process
1. Frontend builds to `frontend/dist/`
2. Backend serves files from `frontend/dist/` as static assets
3. API calls go to `/api/*` routes
4. All other routes serve `index.html` (SPA)

### Request Routing
```
https://your-app.com/              → Frontend (index.html)
https://your-app.com/send          → Frontend (SPA route)
https://your-app.com/api/sessions  → Backend API
https://your-app.com/health        → Backend health check
```

## 🔧 Configuration

### Backend (.env - Optional)

```env
PORT=3000
NODE_ENV=production
SESSION_TTL_HOURS=24
CLEANUP_INTERVAL_MS=3600000
STORAGE_PATH=./storage
```

**No CORS_ORIGIN needed!** Same origin now.

### Frontend - No Config Needed!

The frontend automatically uses relative URLs in production:
- Development: `http://localhost:3000/api/...`
- Production: `/api/...` (relative to current domain)

## 🚢 Deployment Commands

### Railway
```bash
# Railway CLI (optional)
npm i -g @railway/cli
railway login
railway init
railway up
```

### Render
```bash
# Just push to GitHub
git push origin main
# Render auto-deploys
```

### Heroku
```bash
# Create Procfile first
echo "web: npm run build && cd backend && npm start" > Procfile

heroku create your-app-name
git push heroku main
```

## ✅ Deployment Checklist

Before deploying:
- [ ] Code pushed to GitHub/GitLab
- [ ] Test local build: `npm run build && cd backend && npm start`
- [ ] Test at http://localhost:3000
- [ ] Verify all features work

After deploying:
- [ ] Visit your deployed URL
- [ ] Check health: `https://your-app.com/health`
- [ ] Test creating a session
- [ ] Test uploading files
- [ ] Test downloading with code
- [ ] Check browser console (F12) for errors

## 🐛 Troubleshooting

### Blank Screen After Deploy

**Check 1: Build succeeded?**
- Look at deployment logs
- Should see "Frontend built successfully"

**Check 2: Files exist?**
```bash
# On your server or in Railway/Render shell
ls -la frontend/dist
# Should see index.html and assets/
```

**Check 3: Backend serving frontend?**
- Check server logs for: "✓ Serving frontend from: ..."
- If not, run: `npm run build` before starting

### API Calls Fail

**Check browser console (F12):**
- API calls should be to `/api/sessions` (relative)
- If going to `localhost`, frontend wasn't built properly

**Solution:**
```bash
# Rebuild frontend
cd frontend
rm -rf dist
npm run build

# Restart backend
cd ../backend
npm start
```

### Files Upload But Can't Download

**Storage not persistent:**
- Railway/Render free tiers don't persist files on restart
- For production, use S3 or persistent volume
- Or upgrade to paid plan with persistent storage

### Port Already in Use

```bash
# Find and kill process
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

## 📊 Platform Comparison

| Platform | Pros | Cons | Best For |
|----------|------|------|----------|
| **Railway** | Easy, fast, persistent storage | Paid after free tier | Production |
| **Render** | Free, auto-deploy from Git | Slower cold starts | Small projects |
| **Vercel** | Fast CDN, good for frontend | Backend limitations on free | Static sites |
| **Heroku** | Mature, well-documented | No free tier anymore | Paid production |
| **VPS** | Full control, cheap | Manual setup required | Advanced users |

## 🎉 Success!

Your app is successfully deployed when:
- ✅ Homepage loads at your deployed URL
- ✅ Can create session and get hex code
- ✅ Can upload images
- ✅ Can download with code
- ✅ No console errors
- ✅ Health check responds: `https://your-app.com/health`

## 📚 Additional Resources

- **Railway Docs:** https://docs.railway.app
- **Render Docs:** https://render.com/docs
- **Vercel Docs:** https://vercel.com/docs
- **Project README:** See `README.md` for project overview

---

## 🔄 Updating Deployment

### Auto-Deploy (Railway/Render)
Just push to GitHub:
```bash
git add .
git commit -m "Update"
git push origin main
```

### Manual Deploy
```bash
# SSH to your server
cd your-repo
git pull
npm run build
cd backend
pm2 restart meow-share
```

---

**Need help?** The deployment logs will tell you exactly what went wrong!

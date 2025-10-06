# 🚀 Meow Share - Deployment Guide

Complete guide to deploy Meow Share to production.

---

## 📋 Pre-Deployment Checklist

### Backend
- ✅ Rate limiting configured
- ✅ Request validation middleware
- ✅ Compression enabled
- ✅ Logging configured
- ✅ Security headers (Helmet)
- ✅ CORS configured
- ✅ Error handling

### Frontend
- ✅ API URL configurable via env
- ✅ Build process tested
- ✅ Production optimizations
- ✅ Error boundaries
- ✅ Loading states

---

## 🎯 Deployment Options

### Option 1: Vercel (Frontend) + Railway (Backend) [RECOMMENDED]
**Cost**: Free tier available for both
**Difficulty**: Easy
**Setup Time**: ~15 minutes

### Option 2: Vercel (Frontend) + Render (Backend)
**Cost**: Free tier available for both  
**Difficulty**: Easy
**Setup Time**: ~15 minutes

### Option 3: Netlify (Frontend) + Railway (Backend)
**Cost**: Free tier available
**Difficulty**: Easy
**Setup Time**: ~15 minutes

---

## 🔧 Deployment Steps

## Option 1: Vercel + Railway (Recommended)

### Part A: Deploy Backend to Railway

#### 1. Sign Up
- Go to [railway.app](https://railway.app)
- Sign up with GitHub

#### 2. Create New Project
```bash
# From Railway dashboard:
1. Click "New Project"
2. Select "Deploy from GitHub repo"
3. Connect your GitHub account
4. Select your Meow Share repository
5. Select the backend folder
```

#### 3. Configure Environment Variables
In Railway dashboard, add these environment variables:

```env
NODE_ENV=production
PORT=3000
SESSION_TTL_HOURS=24
CLEANUP_INTERVAL_MS=3600000
STORAGE_PATH=./storage
CORS_ORIGIN=https://your-frontend-domain.vercel.app
HEX_CODE_LENGTH=6
JSON_BODY_LIMIT=200kb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
CREATE_SESSION_WINDOW_MS=60000
CREATE_SESSION_MAX=10
UPLOAD_WINDOW_MS=60000
UPLOAD_MAX_REQUESTS=30
```

**Important**: Update `CORS_ORIGIN` with your actual Vercel frontend URL (you'll get this after frontend deployment)

#### 4. Deploy
- Railway will automatically deploy
- Note your backend URL: `https://your-app.railway.app`

---

### Part B: Deploy Frontend to Vercel

#### 1. Sign Up
- Go to [vercel.com](https://vercel.com)
- Sign up with GitHub

#### 2. Import Project
```bash
# From Vercel dashboard:
1. Click "Add New" → "Project"
2. Import your GitHub repository
3. Select "frontend" as root directory
4. Framework Preset: Vite
5. Click "Deploy"
```

#### 3. Configure Environment Variable
After first deployment:
```bash
# In Vercel dashboard:
1. Go to Project Settings → Environment Variables
2. Add: VITE_API_BASE_URL = https://your-backend.railway.app
3. Redeploy
```

#### 4. Update Backend CORS
Go back to Railway and update `CORS_ORIGIN` to your Vercel URL:
```env
CORS_ORIGIN=https://your-app.vercel.app
```

---

## Option 2: Vercel + Render

### Part A: Deploy Backend to Render

#### 1. Sign Up
- Go to [render.com](https://render.com)
- Sign up with GitHub

#### 2. Create Web Service
```bash
1. Click "New" → "Web Service"
2. Connect GitHub repository
3. Configure:
   - Name: meow-share-backend
   - Region: Select closest to your users
   - Branch: main
   - Root Directory: backend
   - Environment: Node
   - Build Command: npm install
   - Start Command: npm start
   - Plan: Free
```

#### 3. Add Environment Variables
Use the Render dashboard to add all variables from the `render.yaml` file or manually add:

```env
NODE_ENV=production
CORS_ORIGIN=https://your-frontend.vercel.app
# ... (add all other variables from render.yaml)
```

#### 4. Deploy
- Render will build and deploy automatically
- Note your backend URL: `https://your-app.onrender.com`

**Note**: Free tier on Render spins down after inactivity. First request may take 30-60 seconds.

---

### Part B: Deploy Frontend to Vercel
(Same as Option 1, Part B above)

---

## 🔐 Security Checklist for Production

### Backend
- [ ] Update `CORS_ORIGIN` to actual frontend URL
- [ ] Ensure `NODE_ENV=production`
- [ ] Rate limiting is enabled
- [ ] Request validation active
- [ ] Logging configured (review logs regularly)
- [ ] File size limits enforced
- [ ] Session TTL configured appropriately

### Frontend
- [ ] API URL points to production backend
- [ ] No hardcoded localhost URLs
- [ ] Error messages user-friendly (no stack traces)
- [ ] HTTPS enabled (automatic on Vercel/Render)

---

## 📊 Post-Deployment Testing

### 1. Test Backend API
```bash
# Health check
curl https://your-backend.railway.app/health

# Create session
curl -X POST https://your-backend.railway.app/api/sessions
```

### 2. Test Frontend
```bash
# Open in browser
https://your-app.vercel.app

# Test workflow:
1. Create session
2. Upload files
3. Copy code
4. Switch to receiver mode
5. Enter code
6. View and download files
```

### 3. Test Rate Limiting
```bash
# Try creating >10 sessions in 1 minute
# Should get rate limit error
```

### 4. Test CORS
```bash
# Access from different domain
# Should be blocked (unless in CORS_ORIGIN)
```

---

## 🔍 Monitoring & Maintenance

### Logs
**Railway**: Dashboard → Deployments → Logs  
**Render**: Dashboard → Service → Logs  
**Vercel**: Dashboard → Deployment → Function Logs

### Monitoring Checklist
- [ ] Check error logs daily
- [ ] Monitor storage usage
- [ ] Review rate limit hits
- [ ] Check session cleanup runs

### Storage Management
Free tiers have limited storage. Monitor:
- Railway: Check disk usage in dashboard
- Render: Ephemeral storage (resets on deploy)

**Tip**: For production, migrate to cloud storage (AWS S3, Cloudflare R2, etc.)

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check logs for:
- Missing environment variables
- Port conflicts
- Module import errors

# Solution: Verify all env vars are set correctly
```

### CORS errors
```bash
# Error: "Access-Control-Allow-Origin" header missing

# Solution:
1. Check CORS_ORIGIN matches frontend URL exactly
2. Include protocol (https://)
3. No trailing slash
4. Redeploy backend after changing
```

### Rate limit too strict
```bash
# Users getting rate limited frequently

# Solution: Adjust in backend env vars:
RATE_LIMIT_MAX_REQUESTS=200  # Increase limit
CREATE_SESSION_MAX=20        # Increase session limit
```

### Uploads failing
```bash
# Check:
1. File size limits (20 MB per file)
2. Session size limits (200 MB total)
3. Upload rate limiting
4. Backend logs for errors

# Solution: Adjust limits in env if needed
```

### Frontend can't reach backend
```bash
# Check:
1. VITE_API_BASE_URL is set correctly
2. Backend is running (health check)
3. CORS is configured
4. HTTPS (not HTTP)

# Solution: Verify env var and redeploy
```

---

## 📈 Scaling Considerations

### When to Upgrade from Free Tier

**Signs you need to upgrade**:
- Rate limits frequently hit
- Storage running out
- Backend downtime (Render free tier)
- Need faster performance

**Upgrade Options**:
1. **Railway Pro**: $5/month, better resources
2. **Render Starter**: $7/month, no spin-down
3. **Cloud Storage**: AWS S3, Cloudflare R2 (low cost)

### Migrating to Cloud Storage

When storage becomes an issue:
1. Set up S3 or R2 bucket
2. Update backend to use cloud storage SDK
3. Update file upload/download logic
4. Migrate existing files
5. Update cleanup worker

---

## 🎯 Production Best Practices

### 1. Regular Backups
- Export session data periodically
- Backup environment variables

### 2. Monitoring
- Set up uptime monitoring (UptimeRobot, Pingdom)
- Configure error alerts

### 3. Security
- Rotate secrets periodically
- Review logs for suspicious activity
- Keep dependencies updated

### 4. Performance
- Monitor response times
- Optimize thumbnail generation
- Consider CDN for static assets

### 5. User Experience
- Add status page
- Provide support contact
- Document any known issues

---

## 📚 Additional Resources

### Deployment Platforms
- [Railway Docs](https://docs.railway.app)
- [Render Docs](https://render.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Netlify Docs](https://docs.netlify.com)

### Cloud Storage Migration
- [AWS S3 Setup](https://docs.aws.amazon.com/s3/)
- [Cloudflare R2 Guide](https://developers.cloudflare.com/r2/)

### Monitoring Tools
- [UptimeRobot](https://uptimerobot.com) (Free)
- [Sentry](https://sentry.io) (Error tracking)
- [LogRocket](https://logrocket.com) (Session replay)

---

## ✅ Deployment Complete Checklist

- [ ] Backend deployed and accessible
- [ ] Frontend deployed and accessible
- [ ] Environment variables configured
- [ ] CORS configured correctly
- [ ] SSL/HTTPS working
- [ ] File upload tested
- [ ] File download tested
- [ ] Rate limiting tested
- [ ] Session expiry working
- [ ] Cleanup worker running
- [ ] Monitoring set up
- [ ] Logs reviewed
- [ ] Documentation updated

---

## 🎉 You're Live!

Once all checks pass, your Meow Share application is live and ready for users!

**Share your deployment URL and let people start sharing photos!** 🐱📸

---

## 💡 Quick Deploy Commands

### Backend (Railway CLI)
```bash
npm install -g @railway/cli
railway login
railway init
railway up
```

### Frontend (Vercel CLI)
```bash
npm install -g vercel
cd frontend
vercel
```

---

*Last Updated: Phase 9 Complete*
*Questions? Check logs or open an issue in your repository*

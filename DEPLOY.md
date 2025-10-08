# 🚀 Quick Deploy Guide for Vercel

This is the **fastest** way to get Meow Share running on Vercel.

## Prerequisites

- A [Vercel account](https://vercel.com/signup) (free)
- Your code pushed to GitHub, GitLab, or Bitbucket

## Method 1: Deploy via Vercel Dashboard (Easiest)

### Step 1: Push to Git

```bash
cd meow-share-v2
git init
git add .
git commit -m "Initial commit"
git remote add origin YOUR_REPO_URL
git push -u origin main
```

### Step 2: Deploy to Vercel

1. Go to [vercel.com/new](https://vercel.com/new)
2. Click **"Import Project"**
3. Select your Git repository
4. Vercel will auto-detect the configuration ✅
5. Click **"Deploy"**
6. Wait ~2 minutes ⏳
7. **Done!** Your app is live! 🎉

## Method 2: Deploy via CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to project
cd meow-share-v2

# Deploy
vercel

# Follow the prompts:
# - Link to existing project? No
# - Project name? meow-share (or whatever you want)
# - Directory? ./ (current directory)
# - Deploy? Yes

# Done!
```

## What Happens During Deployment?

1. **Build**: Vercel runs `npm run vercel-build` (builds React frontend)
2. **Deploy**: Frontend is deployed as static files
3. **Serverless**: API routes in `/api` become serverless functions
4. **Live**: Your app is accessible at `https://your-project.vercel.app`

## Important Notes

### ✅ What Works Automatically

- Frontend (React + Vite) ✅
- API routes ✅
- File uploads ✅
- Rate limiting ✅
- CORS ✅
- Security headers ✅

### ⚠️ Limitations on Vercel

- **File storage is ephemeral**: Uploaded files are stored in `/tmp` and may be deleted when serverless functions scale down
- **For production**: Consider using external storage (AWS S3, Cloudinary, etc.)
- **For testing**: Works perfectly! Files persist for the session duration

### 💡 Recommended for Production

If you need persistent file storage, consider:
- **AWS S3** + **Vercel** (best combination)
- **Railway** or **Render** (persistent file systems)
- **Cloudinary** for image storage

## Verify Deployment

After deployment, test these:

1. **Frontend loads**: Visit your Vercel URL
2. **Create session**: Click "Create Session" button
3. **Upload file**: Select and upload an image
4. **Download**: Enter the code and download the file
5. **API health**: Visit `https://your-app.vercel.app/api/health`

## Troubleshooting

### Build Failed

```bash
# Locally test the build
npm install
npm run build

# If successful, push and redeploy
git add .
git commit -m "Fix build"
git push
```

### API Not Working

1. Check Vercel function logs (Dashboard → Your Project → Functions)
2. Ensure all dependencies are in `package.json`
3. Verify `vercel.json` is in root directory

### Files Not Uploading

1. Check file size (max 20 MB)
2. Check file type (JPEG, PNG, WebP only)
3. Check browser console (F12) for errors
4. Verify Vercel function timeout (default 10s)

## Environment Variables (Optional)

No environment variables are required! But if you want to customize:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add variables:
   - `NODE_ENV=production`
   - Any other custom vars

## Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Follow DNS setup instructions
4. Done! Your app is at `yourdomain.com`

## Next Steps

- ✅ Test all features
- ✅ Share the link with friends
- ✅ Star the repo ⭐
- ✅ Customize colors in `src/App.css`
- ✅ Add your branding

## Need Help?

- 📖 Read the full [README.md](./README.md)
- 🐛 Check [Troubleshooting](#troubleshooting) above
- 💬 Open an issue on GitHub

---

**That's it! Enjoy your new photo sharing app!** 🐱📸

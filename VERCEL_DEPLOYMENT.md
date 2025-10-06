# 🚀 Vercel Deployment Guide for Meow Share

This guide will help you deploy the Meow Share frontend to Vercel successfully.

## 📋 Prerequisites

1. A Vercel account (sign up at [vercel.com](https://vercel.com))
2. Your backend deployed and running (Railway, Render, etc.)
3. The backend URL (e.g., `https://your-backend.railway.app`)

## 🎯 Step-by-Step Deployment

### Step 1: Prepare Your Repository

Make sure your repository is pushed to GitHub, GitLab, or Bitbucket.

### Step 2: Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your repository
3. Configure the project:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `dist` (auto-detected)
   - **Install Command:** `npm install` (auto-detected)

4. **IMPORTANT:** Add Environment Variable:
   - Click "Environment Variables"
   - Add: `VITE_API_BASE_URL`
   - Value: Your backend URL (e.g., `https://meow-share-backend.railway.app`)
   - Make sure there's **NO trailing slash**

5. Click "Deploy"

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to frontend directory
cd frontend

# Deploy
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? meow-share (or your choice)
# - Directory? ./ (current directory)
# - Override settings? No

# Add environment variable
vercel env add VITE_API_BASE_URL
# Enter your backend URL when prompted

# Deploy to production
vercel --prod
```

### Step 3: Verify Deployment

1. Open your Vercel deployment URL
2. Check browser console (F12) for errors
3. Try creating a session - it should connect to your backend
4. If you see a blank screen, check the console for errors

## 🐛 Troubleshooting Blank Screen Issues

### Issue 1: CORS Errors

**Symptom:** Console shows CORS policy errors

**Solution:** Update your backend's CORS configuration:

```javascript
// backend/src/index.js or backend/.env
CORS_ORIGIN=https://your-vercel-app.vercel.app
```

If you have multiple origins:
```
CORS_ORIGIN=http://localhost:5173,https://your-vercel-app.vercel.app
```

### Issue 2: API Connection Failed

**Symptom:** Console shows "Network Error" or "Failed to fetch"

**Solution:** 
1. Verify the environment variable is set correctly in Vercel
2. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
3. Ensure `VITE_API_BASE_URL` is set to your backend URL
4. **Redeploy** after adding/changing environment variables (Vercel → Deployments → ... → Redeploy)

### Issue 3: 404 on Page Refresh

**Symptom:** App works on homepage but 404 on refresh or direct URL

**Solution:** Already fixed in `vercel.json` with rewrites configuration

### Issue 4: Environment Variable Not Working

**Symptom:** App still trying to connect to localhost

**Solution:**
1. Environment variables must start with `VITE_` for Vite
2. After adding/changing env vars, you **MUST redeploy**
3. Clear browser cache and hard refresh (Ctrl+Shift+R)

## 🔍 Debugging Steps

### Check Environment Variables

```bash
# In your frontend code, add temporarily to config.js:
console.log('API URL:', import.meta.env.VITE_API_BASE_URL);
console.log('All env:', import.meta.env);
```

### Check Build Logs

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click on the latest deployment
3. Check "Build Logs" for errors
4. Check "Functions" tab for runtime errors

### Check Browser Console

Open browser console (F12) and look for:
- API request URLs (should point to your backend, not localhost)
- CORS errors
- JavaScript errors
- Network tab showing request details

## ✅ Deployment Checklist

Before deploying, ensure:

- [ ] Backend is deployed and accessible
- [ ] Backend CORS includes your Vercel domain
- [ ] `VITE_API_BASE_URL` environment variable is set in Vercel
- [ ] No trailing slash in API URL
- [ ] `vercel.json` is configured correctly (already done)
- [ ] `vite.config.js` has correct build settings (already done)

After deploying:

- [ ] Site loads without blank screen
- [ ] Can create a session
- [ ] Can upload files
- [ ] Can receive files with a code
- [ ] No console errors

## 🔄 Updating Your Deployment

### Auto-Deploy on Git Push

Vercel automatically deploys when you push to your main branch.

### Manual Redeploy

1. Go to Vercel Dashboard → Your Project → Deployments
2. Click "..." on latest deployment → Redeploy

### Update Environment Variables

1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Edit or add variables
3. **Important:** Redeploy after changing env vars

## 📝 Common Configuration Issues

### Wrong Root Directory

If Vercel tries to build from the project root instead of `frontend/`:

1. Go to Project Settings → General
2. Set "Root Directory" to `frontend`
3. Check "Include source files outside of the Root Directory in the Build Step" if needed

### Build Command Issues

If build fails, ensure in Vercel settings:
- Build Command: `npm run build`
- Output Directory: `dist`
- Install Command: `npm install`

## 🌐 Custom Domain (Optional)

1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update backend CORS to include your custom domain

## 🔐 Environment Variables Reference

| Variable | Value | Required |
|----------|-------|----------|
| `VITE_API_BASE_URL` | Your backend URL (e.g., `https://backend.railway.app`) | Yes |

**Important Notes:**
- Must start with `VITE_` for Vite to expose it
- No trailing slash
- Must redeploy after adding/changing
- Can be different for Preview vs Production

## 🆘 Still Not Working?

1. **Check backend is running:** Visit your backend URL in browser, you should see health check
2. **Check backend logs:** See if requests are reaching your backend
3. **Clear everything:**
   ```bash
   # Locally, test the build
   cd frontend
   rm -rf node_modules dist .vercel
   npm install
   VITE_API_BASE_URL=https://your-backend.com npm run build
   npm run preview  # Test the production build
   ```
4. **Hard refresh:** Ctrl+Shift+R (or Cmd+Shift+R on Mac)
5. **Check Vercel deployment logs:** Look for build or runtime errors

## 📚 Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)

## ✨ Success Indicators

Your deployment is successful when:
- ✅ No blank screen on load
- ✅ No console errors
- ✅ Can create session and see hex code
- ✅ Can upload files
- ✅ Can download files with code
- ✅ All API calls go to your backend (not localhost)

---

**Need help?** Check the browser console first - it will tell you exactly what's wrong!

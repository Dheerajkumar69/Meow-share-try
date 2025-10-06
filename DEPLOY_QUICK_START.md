# ⚡ Quick Deploy Reference Card

## 🎯 Deploy Frontend to Vercel (5 minutes)

### Step 1: Import Project
1. Go to https://vercel.com/new
2. Import your GitHub/GitLab/Bitbucket repo
3. Set **Root Directory** to: `frontend`

### Step 2: Configure Environment
**Add ONE environment variable:**
```
Name: VITE_API_BASE_URL
Value: https://your-backend-url.com
```
⚠️ **NO trailing slash!**

### Step 3: Deploy
Click "Deploy" - that's it!

---

## 🔧 If You Get a Blank Screen

### Check 1: Open Browser Console (F12)
Look for errors. Most common:

**"Failed to fetch" or "Network Error"**
→ Environment variable not set or wrong

**CORS policy error**
→ Backend needs to allow your Vercel domain

### Check 2: Environment Variable
1. Vercel → Your Project → Settings → Environment Variables
2. Confirm `VITE_API_BASE_URL` is there
3. **REDEPLOY** (Deployments tab → ... → Redeploy)

### Check 3: Backend CORS
Update your backend `.env`:
```
CORS_ORIGIN=http://localhost:5173,https://your-app.vercel.app
```
Restart backend after this change.

---

## 🧪 Test Before Deploy

```powershell
# Test build locally first
cd frontend
npm install
npm run build
npm run preview

# Open http://localhost:4173 and test
```

---

## 📱 Vercel CLI (Alternative)

```bash
npm i -g vercel
cd frontend
vercel
# Follow prompts, then:
vercel env add VITE_API_BASE_URL
# Enter your backend URL
vercel --prod
```

---

## ✅ Success Checklist

After deploy, verify:
- [ ] Site loads (no blank screen)
- [ ] No console errors (F12)
- [ ] Can create session
- [ ] Can upload files
- [ ] Backend receives requests

---

## 🆘 Emergency Fixes

**Still blank?**
1. Hard refresh: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Check Vercel build logs for errors
3. Verify backend is running: visit `https://your-backend.com/health`

**Environment variable not working?**
- Must start with `VITE_`
- Must redeploy after changing
- Check spelling and URL

---

## 📚 Full Guide

For detailed troubleshooting, see: `VERCEL_DEPLOYMENT.md`

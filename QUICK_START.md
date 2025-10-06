# 🚀 Meow Share - Quick Start Guide

Welcome to Meow Share! This guide will help you run and test the application locally before deploying to production.

---

## 📋 Prerequisites Checklist

- ✅ Node.js (v16 or higher) installed
- ✅ npm or yarn package manager
- ✅ Dependencies installed for both backend and frontend
- ✅ Backend `.env` file configured
- ✅ Two terminal windows (one for backend, one for frontend)

---

## 🏃‍♂️ Running Locally

### Step 1: Start the Backend

Open your first terminal and navigate to the backend directory:

```bash
cd "D:\projects\Meow share\backend"
npm run dev
```

✅ **Expected Output:**
```
[Backend] Server running on http://localhost:3000
[Backend] Environment: development
[Backend] CORS enabled for: http://localhost:5173
[Backend] Session cleanup job scheduled (runs every 1 hour)
```

The backend API will be available at: **http://localhost:3000**

---

### Step 2: Start the Frontend

Open your second terminal and navigate to the frontend directory:

```bash
cd "D:\projects\Meow share\frontend"
npm run dev
```

✅ **Expected Output:**
```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:5173/
➜  Network: use --host to expose
➜  press h + enter to show help
```

The frontend will be available at: **http://localhost:5173**

---

## 🧪 Testing the Application

### Test Flow #1: Complete Upload & Download Cycle

#### As Sender:
1. Open **http://localhost:5173** in your browser
2. Ensure **"Sender Mode"** is selected
3. Click **"Create New Session"** button
4. Copy the generated hex code (e.g., `a3f9e2`)
5. Drag & drop 2-3 image files (JPEG, PNG, or WebP)
6. Click **"Upload Files"** and wait for completion
7. ✅ Verify success message appears

#### As Receiver:
8. Switch to **"Receiver Mode"** (use toggle at top)
9. Paste the hex code from step 4
10. Click **"Fetch Files"**
11. ✅ Verify all uploaded files appear with thumbnails
12. Click **"Download"** on individual files
13. Click **"Download All Files"** to get a ZIP
14. ✅ Verify all files download successfully

---

### Test Flow #2: Error Handling

#### Invalid File Types:
1. Create a new session
2. Try to upload a `.txt` or `.pdf` file
3. ✅ Verify error message: "Only JPEG, PNG, and WebP images are allowed"

#### File Size Limit:
1. Try to upload a file larger than 10 MB
2. ✅ Verify error message about file size limit

#### Invalid Hex Code:
1. Switch to Receiver Mode
2. Enter random code like `999999`
3. Click "Fetch Files"
4. ✅ Verify error message: "Session not found or expired"

#### Expired Session:
1. Check backend terminal for session expiry (default 24h)
2. For quick testing, you can modify `SESSION_EXPIRY_HOURS` in backend `.env` to 1 minute
3. Wait for expiry and try to fetch files
4. ✅ Verify error message about expired session

---

### Test Flow #3: Multi-Device Testing

#### Same Network Test:
1. Find your local IP address (Windows: `ipconfig`, Mac/Linux: `ifconfig`)
2. Start both backend and frontend
3. From another device on the same network, visit:
   - `http://YOUR_LOCAL_IP:5173` (frontend)
4. Upload files from one device
5. Download files from another device using the hex code
6. ✅ Verify cross-device functionality works

---

### Test Flow #4: Rate Limiting

#### Test Upload Rate Limit:
1. Create a session
2. Try uploading files 10 times in rapid succession
3. ✅ Verify rate limit kicks in after max attempts

#### Test Session Creation Rate Limit:
1. Click "Create New Session" repeatedly (100+ times)
2. ✅ Verify rate limit message appears after threshold

---

## 🔍 Monitoring & Debugging

### Check Backend Logs
The backend terminal will show detailed logs for:
- Session creation
- File uploads
- File downloads
- Session expiry and cleanup
- Rate limit triggers
- Errors

### Check Storage
Navigate to backend storage directory:
```bash
cd "D:\projects\Meow share\backend\storage"
Get-ChildItem -Recurse
```

You'll see:
- `sessions/` - Individual session folders with uploaded files
- `thumbnails/` - Generated thumbnail images
- `metadata.json` - Session metadata (in-memory for dev)

---

## 🐛 Common Issues & Solutions

### Issue: Backend won't start
**Solution:**
```bash
cd "D:\projects\Meow share\backend"
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Issue: Frontend shows "Network Error"
**Solutions:**
1. Ensure backend is running on port 3000
2. Check CORS settings in backend `.env`:
   ```
   CORS_ORIGIN=http://localhost:5173
   ```
3. Clear browser cache and reload

### Issue: Files won't upload
**Solutions:**
1. Check file size (must be < 10 MB)
2. Verify file type (only JPEG, PNG, WebP)
3. Check browser console for detailed errors
4. Verify backend storage directory exists and is writable

### Issue: Session not found immediately after creation
**Solution:**
1. Check backend terminal for errors
2. Verify metadata.json is being created/updated
3. Restart backend server

---

## 🎨 Testing Different Scenarios

### Scenario 1: Single Large Image
- Upload a single 9 MB image
- ✅ Verify thumbnail generation
- ✅ Verify download works

### Scenario 2: Multiple Small Images
- Upload 5-10 small images (< 1 MB each)
- ✅ Verify all thumbnails render
- ✅ Verify "Download All" creates proper ZIP

### Scenario 3: Mobile Upload
- Open frontend on mobile device
- ✅ Verify drag-drop is disabled
- ✅ Verify file picker works
- ✅ Verify responsive layout

### Scenario 4: Session Cleanup
1. Create multiple test sessions
2. Wait for cleanup job to run (default: every 1 hour)
3. Check backend logs for: `[Cleanup] Deleted expired session: <code>`
4. ✅ Verify old sessions are removed from storage

---

## 📊 Performance Metrics to Check

### Upload Speed
- Small files (< 1 MB): Should complete in < 2 seconds
- Large files (5-10 MB): Should complete in < 10 seconds

### Download Speed
- Individual files: Near-instant
- ZIP download: Depends on total size, should start within 2 seconds

### Thumbnail Generation
- Should happen within 1 second of upload completion

### Session Cleanup
- Should remove all expired sessions within 5 minutes of expiry

---

## ✅ Ready for Deployment?

Before deploying to production, ensure you've tested:

- [ ] Complete upload and download cycle
- [ ] File type validation
- [ ] File size limits
- [ ] Invalid hex code handling
- [ ] Rate limiting
- [ ] Cross-device functionality
- [ ] Session expiry and cleanup
- [ ] Multiple concurrent sessions
- [ ] Download all as ZIP
- [ ] Mobile responsiveness

Once all tests pass, proceed to `DEPLOYMENT_GUIDE.md` for production deployment instructions.

---

## 🆘 Need Help?

If you encounter any issues:

1. Check the backend terminal for detailed error logs
2. Check the browser console (F12) for frontend errors
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed
5. Try restarting both backend and frontend servers

---

## 🎉 Success Indicators

You'll know everything is working when:

✅ Backend starts without errors on port 3000  
✅ Frontend starts without errors on port 5173  
✅ You can create a session and get a hex code  
✅ You can upload images successfully  
✅ Thumbnails appear in the receiver view  
✅ Files download correctly  
✅ "Download All" creates a valid ZIP file  
✅ Invalid codes show proper error messages  
✅ Rate limiting prevents abuse  
✅ Sessions expire and cleanup runs automatically  

**Congratulations! Your Meow Share application is ready for production! 🚀**

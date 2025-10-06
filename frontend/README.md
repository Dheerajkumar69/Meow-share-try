# Meow Share Frontend

React + Vite frontend for Meow Share photo sharing application.

## 🚀 Quick Start

### Development
```bash
npm install
npm run dev
# Opens on http://localhost:5173
```

### Build
```bash
npm run build
# Output in dist/
```

### Preview Production Build
```bash
npm run preview
# Test the built app locally
```

## 🌐 Deploy to Vercel

### Quick Deploy (3 steps)

1. **Import to Vercel**
   - Go to https://vercel.com/new
   - Import your repo
   - Set **Root Directory**: `frontend`

2. **Add Environment Variable**
   ```
   VITE_API_BASE_URL=https://your-backend-url.com
   ```
   ⚠️ No trailing slash!

3. **Deploy**
   - Click Deploy
   - Done!

### Troubleshooting Blank Screen

If you see a blank screen after deploying:

1. **Check browser console (F12)** for errors
2. **Verify environment variable** is set in Vercel
3. **Redeploy** after adding environment variables
4. **Update backend CORS** to include your Vercel domain:
   ```
   CORS_ORIGIN=http://localhost:5173,https://your-app.vercel.app
   ```

See `../VERCEL_DEPLOYMENT.md` for detailed troubleshooting.

## 📝 Configuration

### Environment Variables

Create `.env` file (optional for local dev):
```env
VITE_API_BASE_URL=http://localhost:3000
```

For production, set in Vercel dashboard:
- Must start with `VITE_` prefix
- Must redeploy after changing

### Files

- `vercel.json` - Vercel deployment config
- `vite.config.js` - Vite build settings
- `src/config.js` - API URL configuration

## 🔧 Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Axios** - HTTP client
- **ESLint** - Code linting

## 📦 Build Output

Production build creates:
- `dist/index.html` - Entry point
- `dist/assets/` - JS and CSS bundles (hashed filenames)

Optimized with:
- Code splitting
- Tree shaking
- Minification
- Asset optimization

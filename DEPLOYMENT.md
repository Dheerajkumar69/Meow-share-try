# Production Deployment Guide

## 🌐 Quick Deploy Options

### Option 1: Railway + Vercel (Recommended)
**Backend**: Railway | **Frontend**: Vercel | **Cost**: Free tier available

### Option 2: Render + Netlify  
**Backend**: Render | **Frontend**: Netlify | **Cost**: Free tier available

### Option 3: Fly.io + GitHub Pages
**Backend**: Fly.io | **Frontend**: GitHub Pages | **Cost**: Free tier available

---

## 🚀 **Method 1: Railway + Vercel (Easiest)**

### **Deploy Backend to Railway**

1. **Push to GitHub**:
```bash
git add .
git commit -m "Prepare for production deployment"
git push origin main
```

2. **Deploy on Railway**:
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway will auto-detect Node.js and deploy

3. **Configure Environment Variables**:
   - In Railway dashboard, go to your project
   - Click "Variables" tab
   - Add these variables:
   ```
   NODE_ENV=production
   FRONTEND_URL=https://your-app-name.vercel.app
   ```

4. **Get your Railway URL**: 
   - Copy the generated URL (e.g., `https://your-app-name.railway.app`)

### **Deploy Frontend to Vercel**

1. **Update client configuration**:
   - Replace `your-backend` in main.js with your Railway domain

2. **Deploy on Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub  
   - Click "New Project"
   - Select your repository
   - Set build settings:
     - **Framework Preset**: Other
     - **Root Directory**: `client`
     - **Build Command**: `npm run build`
     - **Output Directory**: `dist`

3. **Environment Variables** (if needed):
   ```
   VITE_API_URL=https://your-railway-app.railway.app/api
   ```

---

## 🛠 **Method 2: Manual VPS Deployment**

### **Requirements**:
- VPS with Ubuntu/CentOS
- Domain name (optional)
- SSL certificate (Let's Encrypt)

### **Server Setup**:

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Clone your repository
git clone https://github.com/yourusername/meow-share.git
cd meow-share

# Install dependencies
cd server && npm install
cd ../client && npm install && npm run build

# Start server with PM2
cd ../server
pm2 start app.js --name "meow-share"
pm2 startup
pm2 save
```

### **Nginx Configuration**:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/meow-share/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 🔧 **Production Optimizations**

### **Add to package.json** (server):
```json
{
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js",
    "postinstall": "mkdir -p uploads"
  },
  "engines": {
    "node": ">=16.0.0"
  }
}
```

### **Add Dockerfile** (optional):
```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN mkdir -p uploads

EXPOSE 8080
CMD ["npm", "start"]
```

---

## 🔒 **Security Checklist**

- [ ] Environment variables configured
- [ ] CORS properly set for production URLs  
- [ ] HTTPS/WSS enabled
- [ ] File upload limits enforced
- [ ] Rate limiting active
- [ ] Error logging implemented

---

## 📊 **Cost Estimates**

| **Platform** | **Free Tier** | **Paid Plans** |
|--------------|---------------|----------------|
| **Railway** | 500 hours/month | $5/month unlimited |
| **Vercel** | 100GB bandwidth | $20/month pro |
| **Render** | 750 hours/month | $7/month |
| **Netlify** | 100GB bandwidth | $19/month |

---

## 🆘 **Quick Start Commands**

### For Railway + Vercel:
```bash
# 1. Push to GitHub
git add . && git commit -m "Deploy ready" && git push

# 2. Go to railway.app → New Project → Deploy from GitHub
# 3. Go to vercel.com → New Project → Import Git Repository
# 4. Update environment variables on both platforms
```

### Test your deployment:
1. Visit your Vercel URL
2. Create a session 
3. Test P2P transfer between two browser tabs
4. Verify server fallback works

**Your app will be live and accessible worldwide!** 🌍
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import sessionRoutes from './routes/sessions.js';
import { startCleanupWorker } from './services/cleanupService.js';
import { ensureStorageDirectories } from './utils/storage.js';
import { apiLimiter } from './middleware/rateLimiter.js';

const app = express();

// Trust proxy for accurate client IPs
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
      },
    },
  })
);

// Compression
app.use(compression());

// Logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// CORS - Allow all origins for Vercel deployment
app.use(cors({
  origin: true,
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '200kb' }));

// Rate limiting
app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/sessions', sessionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ 
      error: 'File too large',
      message: 'One or more files exceed the maximum size limit'
    });
  }
  
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ 
      error: 'Invalid request',
      message: 'Unexpected file field'
    });
  }
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Initialize storage and start server
async function startServer() {
  try {
    // Ensure storage directories exist
    await ensureStorageDirectories();
    console.log('✓ Storage directories initialized');
    
    // Start cleanup worker
    if (!global.cleanupWorkerStarted) {
      startCleanupWorker();
      global.cleanupWorkerStarted = true;
      console.log('✓ Cleanup worker started');
    }
    
    // Start server in development mode
    if (!process.env.VERCEL) {
      const PORT = process.env.PORT || 3000;
      app.listen(PORT, () => {
        console.log(`\n🐱 Meow Share Backend`);
        console.log(`✓ Server running on http://localhost:${PORT}`);
        console.log(`✓ API available at http://localhost:${PORT}/api`);
        console.log(`✓ Health check: http://localhost:${PORT}/api/health\n`);
      });
    }
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start server or export for Vercel
if (process.env.VERCEL) {
  // Vercel serverless mode
  ensureStorageDirectories().catch(console.error);
  if (!global.cleanupWorkerStarted) {
    startCleanupWorker();
    global.cleanupWorkerStarted = true;
  }
} else {
  // Local development mode
  startServer();
}

// Export for Vercel serverless
export default app;

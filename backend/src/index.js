import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import compression from 'compression';
import morgan from 'morgan';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import sessionRoutes from './routes/sessions.js';
import { startCleanupWorker } from './services/cleanupService.js';
import { ensureStorageDirectories } from './utils/storage.js';
import { apiLimiter } from './middleware/rateLimiter.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Trust proxy (needed for accurate IPs behind proxies/load balancers)
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(compression());

// Logging
const LOG_FORMAT = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(LOG_FORMAT));

app.use(cors({
  origin: CORS_ORIGIN.split(',').map(o => o.trim()), // support multiple origins via comma-separated
  credentials: true
}));

// Body parsing with limits
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '200kb' }));

// Global API rate limiter
app.use('/api', apiLimiter);

// Health check
app.get('/health', (req, res) => {
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

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Initialize storage and start server
async function startServer() {
  try {
    // Ensure storage directories exist
    await ensureStorageDirectories();
    console.log('✓ Storage directories initialized');
    
    // Start cleanup worker
    startCleanupWorker();
    console.log('✓ Cleanup worker started');
    
    // Start server
    app.listen(PORT, () => {
      console.log(`\n🐱 Meow Share Backend`);
      console.log(`✓ Server running on http://localhost:${PORT}`);
      console.log(`✓ CORS enabled for ${CORS_ORIGIN}`);
      console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}\n`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

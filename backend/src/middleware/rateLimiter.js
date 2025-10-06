import rateLimit from 'express-rate-limit';

// General API limiter (per IP)
export const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  standardHeaders: true,
  legacyHeaders: false,
});

// Create-session specific limiter (stricter)
export const createSessionLimiter = rateLimit({
  windowMs: parseInt(process.env.CREATE_SESSION_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.CREATE_SESSION_MAX || '10'), // 10 create attempts per minute
  message: {
    error: 'Too many sessions created',
    message: 'Please wait a moment before creating more sessions.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Upload limiter (per IP)
export const uploadLimiter = rateLimit({
  windowMs: parseInt(process.env.UPLOAD_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.UPLOAD_MAX_REQUESTS || '30'), // 30 upload requests per minute
  message: {
    error: 'Too many uploads',
    message: 'Upload rate limit exceeded. Please retry later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
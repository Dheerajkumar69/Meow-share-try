/**
 * Shared configuration constants for Meow Share
 * Used by both frontend and backend
 */

export const CONFIG = {
  // Session configuration
  HEX_CODE_LENGTH: 6,
  SESSION_TTL_HOURS: 24,
  SESSION_TTL_MS: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  
  // File size limits
  MAX_FILE_SIZE_MB: 20,
  MAX_FILE_SIZE_BYTES: 20 * 1024 * 1024, // 20 MB
  MAX_SESSION_SIZE_MB: 200,
  MAX_SESSION_SIZE_BYTES: 200 * 1024 * 1024, // 200 MB
  MAX_FILES_PER_SESSION: 50,
  
  // Allowed MIME types
  ALLOWED_MIME_TYPES: [
    'image/jpeg',
    'image/png',
    'image/webp'
  ],
  
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp'],
  
  // Thumbnail configuration
  THUMBNAIL_MAX_WIDTH: 200,
  THUMBNAIL_MAX_HEIGHT: 200,
  THUMBNAIL_QUALITY: 80,
  
  // API endpoints
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  
  // Rate limiting (requests per window)
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
  
  // Cleanup job interval
  CLEANUP_INTERVAL_MS: 60 * 60 * 1000, // Run every hour
};

export default CONFIG;

import multer from 'multer';
import path from 'path';
import { getFilesPath } from '../utils/storage.js';

// Configuration
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Configure multer storage
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Get session code from route params
    const code = req.params.code;
    const filesPath = getFilesPath(code);
    cb(null, filesPath);
  },
  filename: function (req, file, cb) {
    // Sanitize filename and add timestamp to prevent collisions
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const basename = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .substring(0, 50); // Limit basename length
    
    const filename = `${timestamp}_${basename}${ext}`;
    cb(null, filename);
  }
});

/**
 * File filter for validation
 */
const fileFilter = (req, file, cb) => {
  // Check MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, and WebP images are allowed.`), false);
  }
  
  // Check extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return cb(new Error(`Invalid file extension: ${ext}. Only .jpg, .jpeg, .png, and .webp are allowed.`), false);
  }
  
  cb(null, true);
};

/**
 * Configure multer instance
 */
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 50 // Max 50 files per upload
  },
  fileFilter: fileFilter
});

/**
 * Error handler for multer errors
 */
export function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: `File size exceeds the maximum limit of ${MAX_FILE_SIZE / 1024 / 1024} MB`
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        message: 'Maximum 50 files per upload'
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected field',
        message: 'Unexpected file field in request'
      });
    }
  }
  
  // Pass other errors to the general error handler
  next(err);
}

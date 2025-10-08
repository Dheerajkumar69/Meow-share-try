import multer from 'multer';
import { nanoid } from 'nanoid';
import { join, extname } from 'path';
import { getStoragePath } from '../utils/storage.js';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const sessionCode = req.params.code;
      if (!sessionCode) {
        return cb(new Error('Session code is required'));
      }
      const sessionPath = getStoragePath(sessionCode);
      cb(null, sessionPath);
    } catch (error) {
      console.error('Error setting upload destination:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    try {
      // Generate unique filename
      const uniqueSuffix = nanoid(10);
      const ext = extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    } catch (error) {
      console.error('Error generating filename:', error);
      cb(error);
    }
  }
});

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

// Upload configuration
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 MB per file
    files: 20 // Maximum 20 files per upload
  }
});

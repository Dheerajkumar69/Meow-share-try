import express from 'express';
import { createSession, getSession } from '../services/sessionService.js';
import { addFilesToSession, listSessionFiles } from '../services/fileService.js';
import { upload, handleUploadError } from '../middleware/upload.js';
import { getFilesPath, getThumbnailsPath } from '../utils/storage.js';
import { createSessionLimiter, uploadLimiter } from '../middleware/rateLimiter.js';
import { validateCodeParam } from '../middleware/validation.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

/**
 * POST /api/sessions
 * Create a new session
 */
router.post('/', createSessionLimiter, async (req, res, next) => {
  try {
    const session = await createSession();
    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/:code
 * Get session information
 */
router.get('/:code', validateCodeParam, async (req, res, next) => {
  try {
    const { code } = req.params;
    const session = await getSession(code);
    
    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found',
        message: 'This session does not exist or has expired'
      });
    }
    
    res.json(session);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/sessions/:code/upload
 * Upload files to a session
 */
router.post('/:code/upload', 
  validateCodeParam,
  uploadLimiter,
  upload.array('files', 50),
  handleUploadError,
  async (req, res, next) => {
    try {
      const { code } = req.params;
      
      // Verify session exists
      const session = await getSession(code);
      if (!session) {
        return res.status(404).json({ 
          error: 'Session not found',
          message: 'This session does not exist or has expired'
        });
      }
      
      // Check if files were uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          error: 'No files provided',
          message: 'Please select at least one file to upload'
        });
      }
      
      // Add files to session
      const updatedMetadata = await addFilesToSession(code, req.files);
      
      res.status(200).json({
        message: 'Files uploaded successfully',
        filesCount: req.files.length,
        totalSize: updatedMetadata.totalSize,
        files: updatedMetadata.files
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/sessions/:code/files
 * List all files in a session
 */
router.get('/:code/files', validateCodeParam, async (req, res, next) => {
  try {
    const { code } = req.params;
    
    // Verify session exists
    const session = await getSession(code);
    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found',
        message: 'This session does not exist or has expired'
      });
    }
    
    const files = await listSessionFiles(code);
    
    res.json({
      code,
      filesCount: files.length,
      totalSize: session.totalSize,
      files
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/:code/files/:filename
 * Download a specific file
 */
router.get('/:code/files/:filename', validateCodeParam, async (req, res, next) => {
  try {
    const { code, filename } = req.params;
    
    // Verify session exists
    const session = await getSession(code);
    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found',
        message: 'This session does not exist or has expired'
      });
    }
    
    // Verify file exists in session
    const fileMetadata = session.files.find(f => f.filename === filename);
    if (!fileMetadata) {
      return res.status(404).json({
        error: 'File not found',
        message: 'This file does not exist in the session'
      });
    }
    
    // Build file path
    const filesPath = getFilesPath(code);
    const filePath = path.join(filesPath, filename);
    
    // Check if file exists on disk
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'File not found on disk',
        message: 'File metadata exists but file is missing'
      });
    }
    
    // Set headers for download
    res.setHeader('Content-Type', fileMetadata.mimetype);
    res.setHeader('Content-Disposition', `attachment; filename="${fileMetadata.originalName}"`);
    res.setHeader('Content-Length', fileMetadata.size);
    
    // Stream file to response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
    
    fileStream.on('error', (error) => {
      console.error(`Error streaming file ${filename}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading file' });
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/sessions/:code/thumbnails/:filename
 * Get thumbnail for a file
 */
router.get('/:code/thumbnails/:filename', validateCodeParam, async (req, res, next) => {
  try {
    const { code, filename } = req.params;
    
    // Verify session exists
    const session = await getSession(code);
    if (!session) {
      return res.status(404).json({ 
        error: 'Session not found',
        message: 'This session does not exist or has expired'
      });
    }
    
    // Verify file exists in session
    const fileMetadata = session.files.find(f => f.filename === filename);
    if (!fileMetadata) {
      return res.status(404).json({
        error: 'File not found',
        message: 'This file does not exist in the session'
      });
    }
    
    // Check if thumbnail exists
    if (!fileMetadata.hasThumbnail) {
      return res.status(404).json({
        error: 'Thumbnail not available',
        message: 'No thumbnail was generated for this file'
      });
    }
    
    // Build thumbnail path
    const thumbnailsPath = getThumbnailsPath(code);
    const thumbnailPath = path.join(thumbnailsPath, filename);
    
    // Check if thumbnail exists on disk
    if (!fs.existsSync(thumbnailPath)) {
      return res.status(404).json({
        error: 'Thumbnail not found on disk',
        message: 'Thumbnail metadata exists but file is missing'
      });
    }
    
    // Set headers
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    
    // Stream thumbnail to response
    const thumbnailStream = fs.createReadStream(thumbnailPath);
    thumbnailStream.pipe(res);
    
    thumbnailStream.on('error', (error) => {
      console.error(`Error streaming thumbnail ${filename}:`, error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error loading thumbnail' });
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;

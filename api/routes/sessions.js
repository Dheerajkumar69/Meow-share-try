import express from 'express';
import { upload } from '../middleware/upload.js';
import { validateSessionCode } from '../middleware/validation.js';
import { createSession, getSession, addFilesToSession } from '../services/sessionService.js';
import { getFilePath } from '../utils/storage.js';
import { existsSync } from 'fs';
import { join } from 'path';

const router = express.Router();

// Create a new session
router.post('/', async (req, res, next) => {
  try {
    const session = await createSession();
    res.status(201).json({
      code: session.code,
      expiresAt: session.expiresAt
    });
  } catch (error) {
    next(error);
  }
});

// Get session info
router.get('/:code', validateSessionCode, async (req, res, next) => {
  try {
    const session = await getSession(req.params.code);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    
    // Return session info without file data
    res.json({
      code: session.code,
      fileCount: session.files.length,
      totalSize: session.files.reduce((sum, f) => sum + f.size, 0),
      expiresAt: session.expiresAt,
      files: session.files.map(f => ({
        id: f.id,
        name: f.originalName,
        size: f.size,
        mimeType: f.mimeType
      }))
    });
  } catch (error) {
    next(error);
  }
});

// Upload files to session
router.post('/:code/files', validateSessionCode, upload.array('files', 20), async (req, res, next) => {
  try {
    console.log(`[UPLOAD] Attempting to upload files for session: ${req.params.code}`);
    
    const session = await getSession(req.params.code);
    
    if (!session) {
      console.log(`[UPLOAD] Session not found: ${req.params.code}`);
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    
    console.log(`[UPLOAD] Session found. Files received: ${req.files?.length || 0}`);
    
    if (!req.files || req.files.length === 0) {
      console.log('[UPLOAD] No files in request');
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    console.log('[UPLOAD] Adding files to session...');
    // Add files to session
    const updatedSession = await addFilesToSession(req.params.code, req.files);
    
    console.log(`[UPLOAD] Success! ${updatedSession.files.length} files uploaded`);
    res.json({
      message: 'Files uploaded successfully',
      fileCount: updatedSession.files.length,
      files: req.files.map(f => ({
        id: f.filename,
        name: f.originalname,
        size: f.size
      }))
    });
  } catch (error) {
    console.error('[UPLOAD] Error uploading files:', error);
    next(error);
  }
});

// Download a specific file
router.get('/:code/files/:fileId', validateSessionCode, async (req, res, next) => {
  try {
    const session = await getSession(req.params.code);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    
    const file = session.files.find(f => f.id === req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const filePath = getFilePath(req.params.code, file.storedName);
    
    if (!existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }
    
    // Set headers for download
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    res.setHeader('Content-Length', file.size);
    
    // Stream the file
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// Download all files as zip (optional enhancement)
router.get('/:code/download-all', validateSessionCode, async (req, res, next) => {
  try {
    const session = await getSession(req.params.code);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found or expired' });
    }
    
    if (session.files.length === 0) {
      return res.status(404).json({ error: 'No files in session' });
    }
    
    // For now, return file list - ZIP functionality can be added later
    res.json({
      message: 'Use individual file download endpoints',
      files: session.files.map(f => ({
        id: f.id,
        name: f.originalName,
        downloadUrl: `/api/sessions/${req.params.code}/files/${f.id}`
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;

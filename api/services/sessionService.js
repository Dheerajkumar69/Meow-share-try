import { generateHexCode } from '../utils/codeGenerator.js';
import { ensureStorageDirectories, getStoragePath, saveSessionMetadata, loadSessionMetadata } from '../utils/storage.js';
import { addFilesToSession as addFilesWithThumbnails } from './fileService.js';
import { nanoid } from 'nanoid';

const SESSION_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// Create a new session
export async function createSession() {
  const code = generateHexCode();
  const now = Date.now();
  
  const session = {
    code,
    createdAt: now,
    expiresAt: now + SESSION_TTL,
    files: []
  };
  
  // Ensure storage directories exist
  await ensureStorageDirectories();
  
  // Create session-specific directory
  getStoragePath(code);
  
  // Save session metadata
  await saveSessionMetadata(code, session);
  
  return session;
}

// Get session by code
export async function getSession(code) {
  try {
    const session = await loadSessionMetadata(code);
    
    if (!session) {
      return null;
    }
    
    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error loading session:', error);
    return null;
  }
}

// Add files to existing session (with thumbnail generation)
export async function addFilesToSession(code, files) {
  return await addFilesWithThumbnails(code, files);
}

// Delete session
export async function deleteSession(code) {
  // This will be called by cleanup service
  // Implementation in cleanup service
}

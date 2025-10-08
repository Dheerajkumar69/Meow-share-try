import { generateHexCode } from '../utils/codeGenerator.js';
import { ensureStorageDirectories, getStoragePath, saveSessionMetadata, loadSessionMetadata } from '../utils/storage.js';
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

// Add files to existing session
export async function addFilesToSession(code, files) {
  const session = await getSession(code);
  
  if (!session) {
    throw new Error('Session not found or expired');
  }
  
  // Add file metadata to session
  const newFiles = files.map(file => ({
    id: file.filename, // Use the stored filename as ID
    originalName: file.originalname,
    storedName: file.filename,
    size: file.size,
    mimeType: file.mimetype,
    uploadedAt: Date.now()
  }));
  
  session.files.push(...newFiles);
  
  // Check total session size
  const totalSize = session.files.reduce((sum, f) => sum + f.size, 0);
  const maxSessionSize = 200 * 1024 * 1024; // 200 MB
  
  if (totalSize > maxSessionSize) {
    throw new Error('Session size limit exceeded (200 MB maximum)');
  }
  
  // Save updated session
  await saveSessionMetadata(code, session);
  
  return session;
}

// Delete session
export async function deleteSession(code) {
  // This will be called by cleanup service
  // Implementation in cleanup service
}

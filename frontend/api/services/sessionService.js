import { generateHexCode, isValidHexCode } from '../utils/codeGenerator.js';
import {
  sessionExists,
  createSessionDirectories,
  readMetadata,
  writeMetadata,
  deleteSession
} from '../utils/storage.js';

const SESSION_TTL_MS = parseInt(process.env.SESSION_TTL_HOURS || '24') * 60 * 60 * 1000;
const HEX_CODE_LENGTH = 6;

/**
 * Create a new session
 * @returns {Object} - Session object with code and expiresAt
 */
export async function createSession() {
  let code;
  let attempts = 0;
  const maxAttempts = 10;
  
  // Generate unique code (handle collision)
  do {
    code = generateHexCode(HEX_CODE_LENGTH);
    attempts++;
    
    if (attempts > maxAttempts) {
      throw new Error('Failed to generate unique session code');
    }
  } while (sessionExists(code));
  
  // Create session directories
  await createSessionDirectories(code);
  
  // Create metadata
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  
  const metadata = {
    code,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    files: [],
    totalSize: 0
  };
  
  await writeMetadata(code, metadata);
  
  console.log(`✓ Session created: ${code} (expires: ${expiresAt.toISOString()})`);
  
  return {
    code,
    expiresAt: expiresAt.toISOString()
  };
}

/**
 * Get session information
 * @param {string} code - Session code
 * @returns {Object|null} - Session metadata or null if not found/expired
 */
export async function getSession(code) {
  // Validate code format
  if (!isValidHexCode(code, HEX_CODE_LENGTH)) {
    return null;
  }
  
  // Check if session exists
  if (!sessionExists(code)) {
    return null;
  }
  
  // Read metadata
  const metadata = await readMetadata(code);
  if (!metadata) {
    return null;
  }
  
  // Check if expired
  const now = new Date();
  const expiresAt = new Date(metadata.expiresAt);
  
  if (now > expiresAt) {
    // Session expired - delete it
    await deleteSession(code);
    return null;
  }
  
  return metadata;
}

/**
 * Check if session is valid (exists and not expired)
 * @param {string} code - Session code
 * @returns {boolean} - True if session is valid
 */
export async function isSessionValid(code) {
  const session = await getSession(code);
  return session !== null;
}

/**
 * Delete a session
 * @param {string} code - Session code
 */
export async function removeSession(code) {
  await deleteSession(code);
  console.log(`✓ Session deleted: ${code}`);
}

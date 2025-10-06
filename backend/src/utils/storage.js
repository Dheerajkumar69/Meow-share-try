import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get storage path from env or use default
const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '../../storage');
const SESSIONS_PATH = path.join(STORAGE_PATH, 'sessions');

/**
 * Ensure all required storage directories exist
 */
export async function ensureStorageDirectories() {
  await fs.mkdir(STORAGE_PATH, { recursive: true });
  await fs.mkdir(SESSIONS_PATH, { recursive: true });
}

/**
 * Get the path for a session directory
 * @param {string} code - Session code
 * @returns {string} - Absolute path to session directory
 */
export function getSessionPath(code) {
  return path.join(SESSIONS_PATH, code);
}

/**
 * Get the path for session metadata file
 * @param {string} code - Session code
 * @returns {string} - Absolute path to metadata.json
 */
export function getMetadataPath(code) {
  return path.join(getSessionPath(code), 'metadata.json');
}

/**
 * Get the path for session files directory
 * @param {string} code - Session code
 * @returns {string} - Absolute path to files directory
 */
export function getFilesPath(code) {
  return path.join(getSessionPath(code), 'files');
}

/**
 * Get the path for session thumbnails directory
 * @param {string} code - Session code
 * @returns {string} - Absolute path to thumbnails directory
 */
export function getThumbnailsPath(code) {
  return path.join(getSessionPath(code), 'thumbnails');
}

/**
 * Check if a session exists
 * @param {string} code - Session code
 * @returns {boolean} - True if session exists
 */
export function sessionExists(code) {
  return existsSync(getSessionPath(code));
}

/**
 * Create session directories
 * @param {string} code - Session code
 */
export async function createSessionDirectories(code) {
  const sessionPath = getSessionPath(code);
  await fs.mkdir(sessionPath, { recursive: true });
  await fs.mkdir(getFilesPath(code), { recursive: true });
  await fs.mkdir(getThumbnailsPath(code), { recursive: true });
}

/**
 * Delete a session and all its files
 * @param {string} code - Session code
 */
export async function deleteSession(code) {
  const sessionPath = getSessionPath(code);
  if (existsSync(sessionPath)) {
    await fs.rm(sessionPath, { recursive: true, force: true });
  }
}

/**
 * Read session metadata
 * @param {string} code - Session code
 * @returns {Object|null} - Metadata object or null if not found
 */
export async function readMetadata(code) {
  try {
    const metadataPath = getMetadataPath(code);
    const data = await fs.readFile(metadataPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Write session metadata
 * @param {string} code - Session code
 * @param {Object} metadata - Metadata object
 */
export async function writeMetadata(code, metadata) {
  const metadataPath = getMetadataPath(code);
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2), 'utf-8');
}

/**
 * List all session codes
 * @returns {string[]} - Array of session codes
 */
export async function listAllSessions() {
  try {
    const entries = await fs.readdir(SESSIONS_PATH);
    return entries.filter(entry => {
      const sessionPath = path.join(SESSIONS_PATH, entry);
      try {
        return existsSync(sessionPath) && require('fs').statSync(sessionPath).isDirectory();
      } catch {
        return false;
      }
    });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

export { STORAGE_PATH, SESSIONS_PATH };

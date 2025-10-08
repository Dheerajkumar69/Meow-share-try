import { mkdirSync, existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Base storage path (in /tmp for Vercel, local for development)
const BASE_STORAGE_PATH = process.env.VERCEL 
  ? '/tmp/meow-share-storage'
  : join(__dirname, '../../storage');

// Get base storage path
export function getBaseStoragePath() {
  return BASE_STORAGE_PATH;
}

// Get session storage path
export function getStoragePath(sessionCode) {
  const path = join(BASE_STORAGE_PATH, sessionCode);
  
  // Create directory if it doesn't exist
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
  
  return path;
}

// Get file path
export function getFilePath(sessionCode, filename) {
  return join(getStoragePath(sessionCode), filename);
}

// Get thumbnails path
export function getThumbnailsPath(sessionCode) {
  const path = join(BASE_STORAGE_PATH, sessionCode, 'thumbnails');
  
  // Create directory if it doesn't exist
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true });
  }
  
  return path;
}

// Get thumbnail file path
export function getThumbnailPath(sessionCode, filename) {
  return join(getThumbnailsPath(sessionCode), filename);
}

// Get metadata file path
function getMetadataPath(sessionCode) {
  return join(getStoragePath(sessionCode), 'metadata.json');
}

// Ensure storage directories exist
export async function ensureStorageDirectories() {
  if (!existsSync(BASE_STORAGE_PATH)) {
    mkdirSync(BASE_STORAGE_PATH, { recursive: true });
  }
}

// Save session metadata
export async function saveSessionMetadata(sessionCode, metadata) {
  const metadataPath = getMetadataPath(sessionCode);
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), 'utf8');
}

// Load session metadata
export async function loadSessionMetadata(sessionCode) {
  const metadataPath = getMetadataPath(sessionCode);
  
  if (!existsSync(metadataPath)) {
    return null;
  }
  
  try {
    const data = readFileSync(metadataPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading metadata:', error);
    return null;
  }
}

// Alias functions for compatibility
export const readMetadata = loadSessionMetadata;
export const writeMetadata = saveSessionMetadata;

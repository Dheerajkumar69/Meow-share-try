import { readMetadata, writeMetadata } from '../utils/storage.js';
import { generateThumbnails } from './thumbnailService.js';
import path from 'path';

const MAX_SESSION_SIZE = 200 * 1024 * 1024; // 200 MB

/**
 * Add files to a session
 * @param {string} code - Session code
 * @param {Array} files - Array of uploaded file objects from multer
 * @returns {Promise<Object>} - Updated session metadata
 */
export async function addFilesToSession(code, files) {
  // Read current metadata
  const metadata = await readMetadata(code);
  if (!metadata) {
    throw new Error('Session not found');
  }
  
  // Calculate total size of new files
  const newFilesSize = files.reduce((sum, file) => sum + file.size, 0);
  const newTotalSize = metadata.totalSize + newFilesSize;
  
  // Check session size limit
  if (newTotalSize > MAX_SESSION_SIZE) {
    throw new Error(
      `Session size limit exceeded. Current: ${(metadata.totalSize / 1024 / 1024).toFixed(2)} MB, ` +
      `Adding: ${(newFilesSize / 1024 / 1024).toFixed(2)} MB, ` +
      `Limit: ${MAX_SESSION_SIZE / 1024 / 1024} MB`
    );
  }
  
  // Generate thumbnails
  console.log(`Generating thumbnails for ${files.length} file(s)...`);
  const thumbnails = await generateThumbnails(code, files);
  
  // Create file metadata entries
  const newFileEntries = files.map((file, index) => ({
    filename: file.filename,
    originalName: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    hasThumbnail: thumbnails[index]?.thumbnailPath !== null
  }));
  
  // Update metadata
  metadata.files = [...metadata.files, ...newFileEntries];
  metadata.totalSize = newTotalSize;
  metadata.lastUploadAt = new Date().toISOString();
  
  // Write updated metadata
  await writeMetadata(code, metadata);
  
  console.log(`✓ Added ${files.length} file(s) to session ${code} (total size: ${(newTotalSize / 1024 / 1024).toFixed(2)} MB)`);
  
  return metadata;
}

/**
 * Get file metadata from session
 * @param {string} code - Session code
 * @param {string} filename - Filename to retrieve
 * @returns {Promise<Object|null>} - File metadata or null
 */
export async function getFileMetadata(code, filename) {
  const metadata = await readMetadata(code);
  if (!metadata) return null;
  
  return metadata.files.find(f => f.filename === filename) || null;
}

/**
 * List all files in a session
 * @param {string} code - Session code
 * @returns {Promise<Array>} - Array of file metadata
 */
export async function listSessionFiles(code) {
  const metadata = await readMetadata(code);
  if (!metadata) return [];
  
  return metadata.files;
}

import sharp from 'sharp';
import path from 'path';
import { getThumbnailsPath } from '../utils/storage.js';

const THUMBNAIL_MAX_WIDTH = 200;
const THUMBNAIL_MAX_HEIGHT = 200;
const THUMBNAIL_QUALITY = 80;

/**
 * Generate a thumbnail for an image
 * @param {string} code - Session code
 * @param {string} filename - Original filename
 * @param {string} sourcePath - Path to original image
 * @returns {Promise<string>} - Path to generated thumbnail
 */
export async function generateThumbnail(code, filename, sourcePath) {
  try {
    const thumbnailsPath = getThumbnailsPath(code);
    const thumbnailFilename = filename;
    const thumbnailPath = path.join(thumbnailsPath, thumbnailFilename);
    
    // Generate thumbnail with Sharp
    await sharp(sourcePath)
      .resize(THUMBNAIL_MAX_WIDTH, THUMBNAIL_MAX_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: THUMBNAIL_QUALITY })
      .toFile(thumbnailPath);
    
    return thumbnailPath;
  } catch (error) {
    console.error(`Error generating thumbnail for ${filename}:`, error.message);
    throw error;
  }
}

/**
 * Generate thumbnails for multiple files
 * @param {string} code - Session code
 * @param {Array} files - Array of file objects from multer
 * @returns {Promise<Array>} - Array of thumbnail paths
 */
export async function generateThumbnails(code, files) {
  const thumbnails = [];
  
  for (const file of files) {
    try {
      const thumbnailPath = await generateThumbnail(code, file.filename, file.path);
      thumbnails.push({
        filename: file.filename,
        thumbnailPath
      });
    } catch (error) {
      // Log error but continue with other thumbnails
      console.error(`Failed to generate thumbnail for ${file.filename}:`, error.message);
      thumbnails.push({
        filename: file.filename,
        thumbnailPath: null,
        error: error.message
      });
    }
  }
  
  return thumbnails;
}

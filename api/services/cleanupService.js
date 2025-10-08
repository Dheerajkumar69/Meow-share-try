import { readdirSync, rmSync, statSync } from 'fs';
import { join } from 'path';
import { getBaseStoragePath, loadSessionMetadata } from '../utils/storage.js';

const CLEANUP_INTERVAL = 60 * 60 * 1000; // Run every hour

// Start cleanup worker
export function startCleanupWorker() {
  console.log('✓ Cleanup worker started');
  
  // Run immediately on start
  performCleanup();
  
  // Then run periodically
  setInterval(performCleanup, CLEANUP_INTERVAL);
}

// Perform cleanup of expired sessions
async function performCleanup() {
  try {
    const basePath = getBaseStoragePath();
    const sessions = readdirSync(basePath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    let cleanedCount = 0;
    
    for (const sessionCode of sessions) {
      try {
        const session = await loadSessionMetadata(sessionCode);
        
        // If no metadata or session expired, delete it
        if (!session || Date.now() > session.expiresAt) {
          const sessionPath = join(basePath, sessionCode);
          rmSync(sessionPath, { recursive: true, force: true });
          cleanedCount++;
          console.log(`Cleaned up expired session: ${sessionCode}`);
        }
      } catch (error) {
        console.error(`Error checking session ${sessionCode}:`, error);
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`Cleanup completed: ${cleanedCount} session(s) removed`);
    }
  } catch (error) {
    console.error('Cleanup error:', error);
  }
}

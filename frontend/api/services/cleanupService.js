import { listAllSessions, readMetadata, deleteSession } from '../utils/storage.js';

const CLEANUP_INTERVAL_MS = parseInt(process.env.CLEANUP_INTERVAL_MS || '3600000'); // Default: 1 hour

/**
 * Clean up expired sessions
 */
async function cleanupExpiredSessions() {
  try {
    console.log('🧹 Running cleanup job...');
    
    const sessions = await listAllSessions();
    const now = new Date();
    let deletedCount = 0;
    
    for (const code of sessions) {
      try {
        const metadata = await readMetadata(code);
        
        if (!metadata) {
          // Metadata missing - delete the session
          await deleteSession(code);
          deletedCount++;
          continue;
        }
        
        const expiresAt = new Date(metadata.expiresAt);
        
        if (now > expiresAt) {
          // Session expired
          await deleteSession(code);
          deletedCount++;
          console.log(`  ✓ Deleted expired session: ${code}`);
        }
      } catch (error) {
        console.error(`  ✗ Error cleaning session ${code}:`, error.message);
      }
    }
    
    console.log(`✓ Cleanup complete: ${deletedCount} session(s) deleted, ${sessions.length - deletedCount} active`);
  } catch (error) {
    console.error('Cleanup job failed:', error);
  }
}

/**
 * Start the cleanup worker
 */
export function startCleanupWorker() {
  // Run immediately on startup
  cleanupExpiredSessions();
  
  // Schedule periodic cleanup
  setInterval(cleanupExpiredSessions, CLEANUP_INTERVAL_MS);
  
  console.log(`✓ Cleanup worker scheduled (interval: ${CLEANUP_INTERVAL_MS / 1000}s)`);
}

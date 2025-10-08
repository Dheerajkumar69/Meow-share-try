import { randomBytes } from 'crypto';

// Generate a 6-character hex code
export function generateHexCode() {
  // Generate 3 random bytes (which gives us 6 hex characters)
  const bytes = randomBytes(3);
  return bytes.toString('hex').toLowerCase();
}

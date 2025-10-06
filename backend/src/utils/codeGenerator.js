import crypto from 'crypto';

/**
 * Generate a cryptographically secure random hex code
 * @param {number} length - Length of the hex code (default: 6)
 * @returns {string} - Random hex string
 */
export function generateHexCode(length = 6) {
  // Generate enough random bytes (1 byte = 2 hex chars)
  const bytes = Math.ceil(length / 2);
  const buffer = crypto.randomBytes(bytes);
  
  // Convert to hex and trim to exact length
  return buffer.toString('hex').substring(0, length);
}

/**
 * Validate hex code format
 * @param {string} code - Code to validate
 * @param {number} expectedLength - Expected length (default: 6)
 * @returns {boolean} - True if valid
 */
export function isValidHexCode(code, expectedLength = 6) {
  if (typeof code !== 'string') return false;
  if (code.length !== expectedLength) return false;
  return /^[0-9a-f]+$/i.test(code);
}

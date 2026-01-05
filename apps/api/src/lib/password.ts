import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;

/**
 * Hash a password using bcrypt.
 * 
 * @param password - Plain text password to hash
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash.
 * 
 * @param password - Plain text password to verify
 * @param hash - Hashed password to compare against
 * @returns True if password matches hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
}

/**
 * Validate password format and complexity.
 * 
 * @param password - Password to validate
 * @returns Object with isValid flag and optional error message
 */
export function validatePassword(password: string): { isValid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { isValid: false, error: 'Password is required' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { isValid: false, error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` };
  }

  return { isValid: true };
}


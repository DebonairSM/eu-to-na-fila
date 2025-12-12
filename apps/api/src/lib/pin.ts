import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 12;

/**
 * Hash a PIN using bcrypt.
 * 
 * @param pin - Plain text PIN to hash
 * @returns Hashed PIN
 */
export async function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, SALT_ROUNDS);
}

/**
 * Verify a PIN against a hash.
 * 
 * @param pin - Plain text PIN to verify
 * @param hash - Hashed PIN to compare against
 * @returns True if PIN matches hash
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  if (!hash) {
    return false;
  }
  return bcrypt.compare(pin, hash);
}

/**
 * Validate PIN format and complexity.
 * 
 * @param pin - PIN to validate
 * @returns Object with isValid flag and optional error message
 */
export function validatePin(pin: string): { isValid: boolean; error?: string } {
  if (!pin || typeof pin !== 'string') {
    return { isValid: false, error: 'PIN is required' };
  }

  if (pin.length < MIN_PIN_LENGTH) {
    return { isValid: false, error: `PIN must be at least ${MIN_PIN_LENGTH} characters` };
  }

  if (pin.length > MAX_PIN_LENGTH) {
    return { isValid: false, error: `PIN must be at most ${MAX_PIN_LENGTH} characters` };
  }

  // PIN should only contain digits
  if (!/^\d+$/.test(pin)) {
    return { isValid: false, error: 'PIN must contain only digits' };
  }

  return { isValid: true };
}


import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import type { AuthUser } from '../middleware/auth.js';

/**
 * JWT payload structure.
 */
export interface JWTPayload {
  userId: number;
  shopId: number;
  role: 'owner' | 'staff';
  iat?: number;
  exp?: number;
}

/**
 * Sign a JWT token for a user.
 * 
 * @param user - User information to encode in token
 * @returns Signed JWT token
 */
export function signToken(user: Omit<AuthUser, 'id'> & { userId: number }): string {
  const payload: JWTPayload = {
    userId: user.userId,
    shopId: user.shopId,
    role: user.role,
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '24h', // Tokens expire after 24 hours
    issuer: 'eutonafila-api',
    audience: 'eutonafila-client',
  });
}

/**
 * Verify and decode a JWT token.
 * 
 * @param token - JWT token to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'eutonafila-api',
      audience: 'eutonafila-client',
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}






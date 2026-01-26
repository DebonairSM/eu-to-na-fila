import jwt from 'jsonwebtoken';
import { env } from '../env.js';
import type { AuthUser } from '../middleware/auth.js';

/**
 * JWT payload structure.
 */
export interface JWTPayload {
  userId: number;
  shopId?: number;
  companyId?: number;
  role: 'owner' | 'staff' | 'company_admin';
  iat?: number;
  exp?: number;
}

/**
 * Sign a JWT token for a user.
 * 
 * @param user - User information to encode in token
 * @returns Signed JWT token
 */
export function signToken(user: { userId: number; shopId?: number; companyId?: number; role: 'owner' | 'staff' | 'company_admin' }): string {
  const payload: JWTPayload = {
    userId: user.userId,
    shopId: user.shopId,
    companyId: user.companyId,
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
    // #region agent log (debug-session)
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'apps/api/src/lib/jwt.ts:verifyToken:entry',message:'Verifying token',data:{tokenLength:token.length,tokenPrefix:token.substring(0,20),hasJwtSecret:!!env.JWT_SECRET,serverTime:new Date().toISOString()},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log (debug-session)
    const decoded = jwt.verify(token, env.JWT_SECRET, {
      issuer: 'eutonafila-api',
      audience: 'eutonafila-client',
    }) as JWTPayload;
    // #region agent log (debug-session)
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'apps/api/src/lib/jwt.ts:verifyToken:success',message:'Token verified',data:{userId:decoded.userId,role:decoded.role,iat:decoded.iat,exp:decoded.exp,expiresAt:decoded.exp?new Date(decoded.exp*1000).toISOString():null,currentTime:new Date().toISOString(),timeUntilExpiry:decoded.exp?decoded.exp*1000-Date.now():null},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log (debug-session)
    return decoded;
  } catch (error) {
    // #region agent log (debug-session)
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'apps/api/src/lib/jwt.ts:verifyToken:error',message:'JWT verification error',data:{errorType:error instanceof Error?error.constructor.name:'unknown',errorName:error instanceof jwt.TokenExpiredError?'TokenExpiredError':error instanceof jwt.JsonWebTokenError?'JsonWebTokenError':'other',errorMessage:error instanceof Error?error.message:String(error),expiredAt:error instanceof jwt.TokenExpiredError?error.expiredAt?.toISOString():null,serverTime:new Date().toISOString()},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log (debug-session)
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}
















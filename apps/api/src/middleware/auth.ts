import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import { verifyToken } from '../lib/jwt.js';

/**
 * User information extracted from JWT token.
 */
export interface AuthUser {
  id: number;
  shopId?: number;
  companyId?: number;
  role: 'owner' | 'staff' | 'company_admin';
}

/**
 * Extend Fastify request type to include user.
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

/**
 * Authentication middleware.
 * Validates JWT token and attaches user to request.
 * 
 * @returns Fastify pre-handler hook
 * 
 * @example
 * ```typescript
 * fastify.patch('/tickets/:id', {
 *   preHandler: requireAuth()
 * }, async (request, reply) => {
 *   // request.user is available
 *   console.log(request.user.id);
 * });
 * ```
 */
export function requireAuth(): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // #region agent log (debug-session)
    fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'apps/api/src/middleware/auth.ts:requireAuth:entry',message:'Auth middleware called',data:{path:request.url,method:request.method,hasAuthHeader:!!request.headers.authorization,authHeaderPrefix:request.headers.authorization?.substring(0,30)||'none'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion agent log (debug-session)
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      // #region agent log (debug-session)
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H6',location:'apps/api/src/middleware/auth.ts:requireAuth:no-header',message:'Missing authorization header',data:{path:request.url},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log (debug-session)
      throw new UnauthorizedError('Missing authorization header');
    }

    if (!authHeader.startsWith('Bearer ')) {
      // #region agent log (debug-session)
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'apps/api/src/middleware/auth.ts:requireAuth:invalid-format',message:'Invalid authorization format',data:{authHeaderPrefix:authHeader.substring(0,30)},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log (debug-session)
      throw new UnauthorizedError('Invalid authorization format');
    }

    const token = authHeader.substring(7);

    if (!token) {
      // #region agent log (debug-session)
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3',location:'apps/api/src/middleware/auth.ts:requireAuth:empty-token',message:'Empty token after Bearer prefix',data:{},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log (debug-session)
      throw new UnauthorizedError('Missing token');
    }

    // Verify JWT token
    try {
      // #region agent log (debug-session)
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'apps/api/src/middleware/auth.ts:requireAuth:before-verify',message:'About to verify token',data:{tokenLength:token.length,tokenPrefix:token.substring(0,20),serverTime:new Date().toISOString()},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log (debug-session)
      const decoded = verifyToken(token);
      // #region agent log (debug-session)
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'apps/api/src/middleware/auth.ts:requireAuth:verify-success',message:'Token verified successfully',data:{userId:decoded.userId,role:decoded.role,companyId:decoded.companyId,shopId:decoded.shopId,iat:decoded.iat,exp:decoded.exp,expiresAt:decoded.exp?new Date(decoded.exp*1000).toISOString():null,currentTime:new Date().toISOString()},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log (debug-session)
      request.user = {
        id: decoded.userId,
        shopId: decoded.shopId,
        companyId: decoded.companyId,
        role: decoded.role,
      };
    } catch (error) {
      // #region agent log (debug-session)
      fetch('http://127.0.0.1:7242/ingest/205e19f8-df1a-492f-93e9-a1c96fc43d6d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1',location:'apps/api/src/middleware/auth.ts:requireAuth:verify-error',message:'Token verification failed',data:{errorType:error instanceof Error?error.constructor.name:'unknown',errorMessage:error instanceof Error?error.message:String(error),tokenLength:token.length,tokenPrefix:token.substring(0,20),serverTime:new Date().toISOString()},timestamp:Date.now()})}).catch(()=>{});
      // #endregion agent log (debug-session)
      const message = error instanceof Error ? error.message : 'Invalid or expired token';
      throw new UnauthorizedError(message);
    }
  };
}

/**
 * Authorization middleware to check user role.
 * Must be used after requireAuth().
 * 
 * @param allowedRoles - Roles allowed to access this endpoint
 * @returns Fastify pre-handler hook
 * 
 * @example
 * ```typescript
 * fastify.delete('/tickets/:id', {
 *   preHandler: [
 *     requireAuth(),
 *     requireRole(['admin'])
 *   ]
 * }, async (request, reply) => {
 *   // Only admins can access
 * });
 * ```
 */
export function requireRole(
  allowedRoles: Array<'owner' | 'staff' | 'company_admin'>
): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new ForbiddenError(
        `Requires one of: ${allowedRoles.join(', ')}`
      );
    }
  };
}

/**
 * Require company admin role.
 * Must be used after requireAuth().
 * 
 * @returns Fastify pre-handler hook
 */
export function requireCompanyAdmin(): preHandlerHookHandler {
  return requireRole(['company_admin']);
}

/**
 * Check if user has access to a specific shop.
 * Ensures user can only access resources from their shop.
 * 
 * @param shopIdGetter - Function to get shop ID from request
 * @returns Fastify pre-handler hook
 * 
 * @example
 * ```typescript
 * fastify.get('/shops/:shopId/tickets', {
 *   preHandler: [
 *     requireAuth(),
 *     requireShopAccess((req) => Number(req.params.shopId))
 *   ]
 * }, async (request, reply) => {
 *   // User can only access their own shop's tickets
 * });
 * ```
 */
export function requireShopAccess(
  shopIdGetter: (request: FastifyRequest) => number
): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (!request.user) {
      throw new UnauthorizedError('User not authenticated');
    }

    const requestedShopId = shopIdGetter(request);

    // Owners can access any shop (for multi-shop support in future)
    if (request.user.role === 'owner') {
      return;
    }

    // Staff can only access their own shop
    if (request.user.shopId !== requestedShopId) {
      throw new ForbiddenError('Access denied to this shop');
    }
  };
}

/**
 * Optional authentication middleware.
 * Attaches user to request if token is valid, but doesn't fail if missing.
 * 
 * @returns Fastify pre-handler hook
 * 
 * @example
 * ```typescript
 * fastify.get('/public-with-optional-auth', {
 *   preHandler: optionalAuth()
 * }, async (request, reply) => {
 *   if (request.user) {
 *     // User is authenticated
 *   } else {
 *     // User is anonymous
 *   }
 * });
 * ```
 */
export function optionalAuth(): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No auth provided, continue without user
      return;
    }

    const token = authHeader.substring(7);

    if (!token) {
      return;
    }

    // Verify JWT token, but don't fail if invalid (optional auth)
    try {
      const decoded = verifyToken(token);
      request.user = {
        id: decoded.userId,
        shopId: decoded.shopId,
        companyId: decoded.companyId,
        role: decoded.role,
      };
    } catch (error) {
      // Invalid token, but that's okay for optional auth
      return;
    }
  };
}


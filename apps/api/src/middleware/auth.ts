import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';
import { verifyToken } from '../lib/jwt.js';

/**
 * User information extracted from JWT token.
 */
export interface AuthUser {
  id: number;
  shopId: number;
  role: 'owner' | 'staff';
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
    // #region agent log
    const fs = await import('fs/promises');
    await fs.appendFile('/Users/ronbandeira/Documents/Repos/eu-to-na-fila/.cursor/debug.log', JSON.stringify({location:'auth.ts:40',message:'requireAuth middleware called',data:{url:request.url,method:request.method,hasAuthHeader:!!request.headers.authorization},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n').catch(()=>{});
    // #endregion
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      // #region agent log
      await fs.appendFile('/Users/ronbandeira/Documents/Repos/eu-to-na-fila/.cursor/debug.log', JSON.stringify({location:'auth.ts:46',message:'Missing authorization header',data:{url:request.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n').catch(()=>{});
      // #endregion
      throw new UnauthorizedError('Missing authorization header');
    }

    if (!authHeader.startsWith('Bearer ')) {
      // #region agent log
      await fs.appendFile('/Users/ronbandeira/Documents/Repos/eu-to-na-fila/.cursor/debug.log', JSON.stringify({location:'auth.ts:52',message:'Invalid authorization format',data:{url:request.url,authHeaderPrefix:authHeader.substring(0,20)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n').catch(()=>{});
      // #endregion
      throw new UnauthorizedError('Invalid authorization format');
    }

    const token = authHeader.substring(7);

    if (!token) {
      // #region agent log
      await fs.appendFile('/Users/ronbandeira/Documents/Repos/eu-to-na-fila/.cursor/debug.log', JSON.stringify({location:'auth.ts:60',message:'Missing token',data:{url:request.url},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n').catch(()=>{});
      // #endregion
      throw new UnauthorizedError('Missing token');
    }

    // Verify JWT token
    try {
      const decoded = verifyToken(token);
      request.user = {
        id: decoded.userId,
        shopId: decoded.shopId,
        role: decoded.role,
      };
      // #region agent log
      await fs.appendFile('/Users/ronbandeira/Documents/Repos/eu-to-na-fila/.cursor/debug.log', JSON.stringify({location:'auth.ts:72',message:'Token verified successfully',data:{url:request.url,userId:decoded.userId,role:decoded.role},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n').catch(()=>{});
      // #endregion
    } catch (error) {
      // #region agent log
      await fs.appendFile('/Users/ronbandeira/Documents/Repos/eu-to-na-fila/.cursor/debug.log', JSON.stringify({location:'auth.ts:77',message:'Token verification failed',data:{url:request.url,errorMessage:error instanceof Error ? error.message : String(error)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})+'\n').catch(()=>{});
      // #endregion
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
  allowedRoles: Array<'owner' | 'staff'>
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
        role: decoded.role,
      };
    } catch (error) {
      // Invalid token, but that's okay for optional auth
      return;
    }
  };
}


import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify';
import { UnauthorizedError, ForbiddenError } from '../lib/errors.js';

/**
 * User information extracted from JWT token.
 * This interface should be extended when implementing authentication.
 */
export interface AuthUser {
  id: number;
  shopId: number;
  role: 'admin' | 'barber' | 'staff';
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
 * Authentication middleware (placeholder).
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
 * 
 * @note This is a placeholder implementation.
 * Implement actual JWT validation when adding authentication.
 */
export function requireAuth(): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    // Extract token from Authorization header
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Missing authorization header');
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid authorization format');
    }

    const token = authHeader.substring(7);

    if (!token) {
      throw new UnauthorizedError('Missing token');
    }

    // TODO: Implement JWT verification
    // For now, this is a placeholder that always fails
    throw new UnauthorizedError('Authentication not yet implemented');

    // Future implementation:
    // try {
    //   const decoded = await verifyJWT(token);
    //   request.user = {
    //     id: decoded.userId,
    //     shopId: decoded.shopId,
    //     role: decoded.role
    //   };
    // } catch (error) {
    //   throw new UnauthorizedError('Invalid or expired token');
    // }
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
  allowedRoles: Array<'admin' | 'barber' | 'staff'>
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

    // Admins can access any shop
    if (request.user.role === 'admin') {
      return;
    }

    // Other users can only access their own shop
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

    // TODO: Implement JWT verification
    // For now, skip authentication
    // Future implementation:
    // try {
    //   const decoded = await verifyJWT(token);
    //   request.user = {
    //     id: decoded.userId,
    //     shopId: decoded.shopId,
    //     role: decoded.role
    //   };
    // } catch (error) {
    //   // Invalid token, but that's okay for optional auth
    //   return;
    // }
  };
}


import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { validateRequest } from '../lib/validation.js';
import { NotFoundError, ValidationError } from '../lib/errors.js';
import { signToken } from '../lib/jwt.js';
import { verifyPassword, validatePassword } from '../lib/password.js';
import { createRateLimit } from '../middleware/rateLimit.js';
import { logAuthFailure, logAuthSuccess, getClientIp } from '../middleware/security.js';

/**
 * Company admin authentication routes.
 * Username/password-based authentication that issues JWT tokens.
 */
export const companyAuthRoutes: FastifyPluginAsync = async (fastify) => {
  // Brute force protection
  const isDevelopment = process.env.NODE_ENV === 'development';
  const maxAttempts = isDevelopment ? 100 : 30;
  
  const authRateLimit = createRateLimit({
    max: maxAttempts,
    timeWindow: '15 minutes',
    keyGenerator: (request) => {
      const ip = getClientIp(request);
      return `company-auth:${ip}`;
    },
  });

  /**
   * Verify company admin credentials and issue JWT token.
   * 
   * @route POST /api/company/auth
   * @body username - Company admin username
   * @body password - Company admin password
   * @returns { valid: boolean, role: string, token?: string, companyId?: number }
   */
  fastify.post('/company/auth', {
    preHandler: [authRateLimit],
  }, async (request, reply) => {
    const bodySchema = z.object({
      username: z.string().min(1).max(100),
      password: z.string().min(1).max(200),
    });

    const { username, password } = validateRequest(bodySchema, request.body);

    // Validate password format
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
      logAuthFailure(request, 'invalid_password_format', 'company');
      throw new ValidationError(passwordValidation.error || 'Invalid password format');
    }

    // Find company admin by username
    const admin = await db.query.companyAdmins.findFirst({
      where: eq(schema.companyAdmins.username, username),
      with: {
        company: true,
      },
    });

    if (!admin) {
      // Don't reveal that admin doesn't exist - same response as wrong password
      logAuthFailure(request, 'admin_not_found', 'company');
      return { valid: false, role: null };
    }

    // Check if admin is active
    if (!admin.isActive) {
      logAuthFailure(request, 'admin_inactive', 'company');
      return { valid: false, role: null };
    }

    // Verify password
    const passwordMatches = await verifyPassword(password, admin.passwordHash);

    if (!passwordMatches) {
      logAuthFailure(request, 'invalid_password', 'company');
      return { valid: false, role: null };
    }

    // Log successful authentication
    logAuthSuccess(request, admin.id, 'company_admin');

    // Issue JWT token
    const token = signToken({
      userId: admin.id,
      companyId: admin.companyId,
      role: 'company_admin',
    });

    return {
      valid: true,
      role: 'company_admin',
      token,
      companyId: admin.companyId,
    };
  });
};


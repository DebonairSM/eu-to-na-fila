import type { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Get client IP address from request.
 */
export function getClientIp(request: FastifyRequest): string {
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }

  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return request.ip || 'unknown';
}

/**
 * Log security event.
 */
export function logSecurityEvent(
  request: FastifyRequest,
  eventType: 'auth_failure' | 'rate_limit' | 'suspicious_activity' | 'auth_success',
  details?: Record<string, unknown>
): void {
  const ip = getClientIp(request);
  const userAgent = request.headers['user-agent'] || 'unknown';
  const timestamp = new Date().toISOString();
  const method = request.method;
  const url = request.url;

  const logData = {
    timestamp,
    eventType,
    ip,
    method,
    url,
    userAgent,
    ...details,
  };

  // In production, this should go to a proper logging service
  // For now, we'll use console with structured logging
  if (eventType === 'auth_failure' || eventType === 'suspicious_activity') {
    console.warn('[SECURITY]', JSON.stringify(logData));
  } else {
    console.info('[SECURITY]', JSON.stringify(logData));
  }
}

/**
 * Log authentication failure.
 */
export function logAuthFailure(
  request: FastifyRequest,
  reason: string,
  shopSlug?: string
): void {
  logSecurityEvent(request, 'auth_failure', {
    reason,
    shopSlug,
  });
}

/**
 * Log authentication success.
 */
export function logAuthSuccess(
  request: FastifyRequest,
  shopId: number,
  role: string
): void {
  logSecurityEvent(request, 'auth_success', {
    shopId,
    role,
  });
}

/**
 * Log rate limit hit.
 */
export function logRateLimit(
  request: FastifyRequest,
  limit: number,
  timeWindow: string
): void {
  logSecurityEvent(request, 'rate_limit', {
    limit,
    timeWindow,
  });
}

/**
 * Log suspicious activity.
 */
export function logSuspiciousActivity(
  request: FastifyRequest,
  activity: string,
  details?: Record<string, unknown>
): void {
  logSecurityEvent(request, 'suspicious_activity', {
    activity,
    ...details,
  });
}


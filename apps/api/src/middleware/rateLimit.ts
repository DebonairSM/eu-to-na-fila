import type { FastifyRequest, FastifyReply } from 'fastify';
import type { preHandlerHookHandler } from 'fastify';

interface RateLimitConfig {
  max: number;
  timeWindow: string; // e.g., '1 minute', '15 minutes'
  keyGenerator?: (request: FastifyRequest) => string;
}

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting
const stores: Map<string, RateLimitStore> = new Map();

/**
 * Get or create a rate limit store for a specific configuration.
 */
function getStore(configKey: string): RateLimitStore {
  if (!stores.has(configKey)) {
    stores.set(configKey, {});
  }
  return stores.get(configKey)!;
}

/**
 * Parse time window string to milliseconds.
 */
function parseTimeWindow(timeWindow: string): number {
  const match = timeWindow.match(/^(\d+)\s*(second|minute|hour|day)s?$/i);
  if (!match) {
    throw new Error(`Invalid time window format: ${timeWindow}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  const multipliers: Record<string, number> = {
    second: 1000,
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
  };

  return value * multipliers[unit];
}

/**
 * Get client identifier for rate limiting.
 */
function getClientId(request: FastifyRequest): string {
  // Try to get IP from various headers (for proxies/load balancers)
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
 * Create a rate limiting middleware.
 * 
 * @param config - Rate limit configuration
 * @returns Fastify pre-handler hook
 */
export function createRateLimit(config: RateLimitConfig): preHandlerHookHandler {
  const timeWindowMs = parseTimeWindow(config.timeWindow);
  const configKey = `${config.max}-${timeWindowMs}`;

  return async (request: FastifyRequest, reply: FastifyReply) => {
    const store = getStore(configKey);
    const clientId = config.keyGenerator ? config.keyGenerator(request) : getClientId(request);
    const now = Date.now();

    // Get or initialize client record
    let clientRecord = store[clientId];
    if (!clientRecord || now >= clientRecord.resetTime) {
      clientRecord = {
        count: 0,
        resetTime: now + timeWindowMs,
      };
      store[clientId] = clientRecord;
    }

    // Increment count
    clientRecord.count++;

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', config.max.toString());
    reply.header('X-RateLimit-Remaining', Math.max(0, config.max - clientRecord.count).toString());
    reply.header('X-RateLimit-Reset', new Date(clientRecord.resetTime).toISOString());

    // Check if limit exceeded
    if (clientRecord.count > config.max) {
      reply.code(429);
      return {
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        message: `Rate limit exceeded. Maximum ${config.max} requests per ${config.timeWindow}.`,
      };
    }
  };
}

/**
 * Clean up expired entries periodically.
 */
setInterval(() => {
  const now = Date.now();
  stores.forEach((store, configKey) => {
    Object.keys(store).forEach((key) => {
      if (now >= store[key].resetTime) {
        delete store[key];
      }
    });
  });
}, 60000); // Clean up every minute


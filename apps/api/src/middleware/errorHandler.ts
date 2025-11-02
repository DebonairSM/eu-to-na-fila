import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../lib/errors.js';
import { ZodError } from 'zod';

/**
 * Global error handler middleware for Fastify.
 * Converts all errors to a standard JSON format.
 * 
 * @param error - The error that occurred
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 * 
 * @example
 * Register in server.ts:
 * ```typescript
 * fastify.setErrorHandler(errorHandler);
 * ```
 */
export async function errorHandler(
  error: Error | FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Log the error with context
  request.log.error(
    {
      err: error,
      url: request.url,
      method: request.method,
      params: request.params,
      query: request.query,
    },
    'Request error'
  );

  // Handle custom application errors
  if (error instanceof AppError) {
    reply.status(error.statusCode).send(error.toJSON());
    return;
  }

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    reply.status(400).send({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      errors: validationErrors,
    });
    return;
  }

  // Handle Fastify validation errors
  if ('validation' in error && error.validation) {
    reply.status(400).send({
      error: error.message || 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      errors: error.validation,
    });
    return;
  }

  // Handle Fastify errors with status code
  if ('statusCode' in error && error.statusCode) {
    reply.status(error.statusCode).send({
      error: error.message,
      code: getErrorCode(error.statusCode),
      statusCode: error.statusCode,
    });
    return;
  }

  // Handle generic errors (500)
  // Don't expose internal error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  reply.status(500).send({
    error: isDevelopment ? error.message : 'Internal server error',
    code: 'INTERNAL_ERROR',
    statusCode: 500,
    ...(isDevelopment && error.stack && { stack: error.stack }),
  });
}

/**
 * Get error code from HTTP status code.
 * 
 * @param statusCode - HTTP status code
 * @returns Error code string
 */
function getErrorCode(statusCode: number): string {
  const codes: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'RATE_LIMIT_EXCEEDED',
    500: 'INTERNAL_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
  };

  return codes[statusCode] || 'UNKNOWN_ERROR';
}

/**
 * Not found handler for unmatched routes.
 * 
 * @param request - Fastify request object
 * @param reply - Fastify reply object
 * 
 * @example
 * Register in server.ts:
 * ```typescript
 * fastify.setNotFoundHandler(notFoundHandler);
 * ```
 */
export async function notFoundHandler(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  reply.status(404).send({
    error: `Route ${request.method} ${request.url} not found`,
    code: 'NOT_FOUND',
    statusCode: 404,
  });
}


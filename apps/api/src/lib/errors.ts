/**
 * Base application error class.
 * All custom errors should extend from this.
 */
export class AppError extends Error {
  /**
   * HTTP status code for this error.
   */
  public readonly statusCode: number;

  /**
   * Error code for client identification.
   */
  public readonly code: string;

  /**
   * Additional error metadata.
   */
  public readonly meta?: Record<string, any>;

  /**
   * Create a new application error.
   * 
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code (default: 500)
   * @param code - Error code identifier (default: 'INTERNAL_ERROR')
   * @param meta - Additional error metadata
   * 
   * @example
   * ```typescript
   * throw new AppError('Something went wrong', 500, 'INTERNAL_ERROR');
   * ```
   */
  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    meta?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.meta = meta;

    // Maintains proper stack trace for where error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON response format.
   * 
   * @returns Error object for API response
   */
  toJSON(): {
    error: string;
    code: string;
    statusCode: number;
    meta?: Record<string, any>;
  } {
    return {
      error: this.message,
      code: this.code,
      statusCode: this.statusCode,
      ...(this.meta && { meta: this.meta }),
    };
  }
}

/**
 * Validation error (400 Bad Request).
 * Thrown when request input fails validation.
 */
export class ValidationError extends AppError {
  /**
   * Detailed validation errors.
   */
  public readonly errors?: Array<{
    field: string;
    message: string;
  }>;

  /**
   * Create a validation error.
   * 
   * @param message - Error message (default: 'Validation failed')
   * @param errors - Array of field-specific errors
   * 
   * @example
   * ```typescript
   * throw new ValidationError('Validation failed', [
   *   { field: 'email', message: 'Invalid email format' },
   *   { field: 'age', message: 'Must be a positive number' }
   * ]);
   * ```
   */
  constructor(
    message: string = 'Validation failed',
    errors?: Array<{ field: string; message: string }>
  ) {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }

  /**
   * Convert error to JSON with validation details.
   */
  toJSON() {
    return {
      ...super.toJSON(),
      ...(this.errors && { errors: this.errors }),
    };
  }
}

/**
 * Not found error (404 Not Found).
 * Thrown when a requested resource doesn't exist.
 */
export class NotFoundError extends AppError {
  /**
   * Create a not found error.
   * 
   * @param message - Error message (default: 'Resource not found')
   * 
   * @example
   * ```typescript
   * throw new NotFoundError('Ticket not found');
   * throw new NotFoundError('Shop with slug "invalid" not found');
   * ```
   */
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

/**
 * Conflict error (409 Conflict).
 * Thrown when an operation conflicts with current state.
 */
export class ConflictError extends AppError {
  /**
   * Create a conflict error.
   * 
   * @param message - Error message
   * 
   * @example
   * ```typescript
   * throw new ConflictError('Queue is full');
   * throw new ConflictError('Cannot transition from completed to waiting');
   * ```
   */
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

/**
 * Unauthorized error (401 Unauthorized).
 * Thrown when authentication is required but not provided.
 */
export class UnauthorizedError extends AppError {
  /**
   * Create an unauthorized error.
   * 
   * @param message - Error message (default: 'Unauthorized')
   * 
   * @example
   * ```typescript
   * throw new UnauthorizedError('Invalid or missing token');
   * ```
   */
  constructor(message: string = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

/**
 * Forbidden error (403 Forbidden).
 * Thrown when user lacks permission for an operation.
 */
export class ForbiddenError extends AppError {
  /**
   * Create a forbidden error.
   * 
   * @param message - Error message (default: 'Forbidden')
   * 
   * @example
   * ```typescript
   * throw new ForbiddenError('You do not have permission to update this ticket');
   * ```
   */
  constructor(message: string = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

/**
 * Bad request error (400 Bad Request).
 * Thrown for general client errors that don't fit other categories.
 */
export class BadRequestError extends AppError {
  /**
   * Create a bad request error.
   * 
   * @param message - Error message
   * 
   * @example
   * ```typescript
   * throw new BadRequestError('Invalid operation');
   * ```
   */
  constructor(message: string) {
    super(message, 400, 'BAD_REQUEST');
  }
}

/**
 * Internal server error (500 Internal Server Error).
 * Thrown for unexpected server errors.
 */
export class InternalError extends AppError {
  /**
   * Create an internal error.
   * 
   * @param message - Error message (default: 'Internal server error')
   * 
   * @example
   * ```typescript
   * throw new InternalError('Database connection failed');
   * ```
   */
  constructor(message: string = 'Internal server error') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}

/**
 * Rate limit error (429 Too Many Requests).
 * Thrown when rate limit is exceeded.
 */
export class RateLimitError extends AppError {
  /**
   * Create a rate limit error.
   * 
   * @param message - Error message (default: 'Rate limit exceeded')
   * @param retryAfter - Seconds until retry is allowed
   * 
   * @example
   * ```typescript
   * throw new RateLimitError('Too many requests', 60);
   * ```
   */
  constructor(
    message: string = 'Rate limit exceeded',
    retryAfter?: number
  ) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', {
      retryAfter,
    });
  }
}


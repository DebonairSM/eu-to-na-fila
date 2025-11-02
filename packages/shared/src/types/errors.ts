/**
 * Standard error codes used across the application.
 */
export enum ErrorCode {
  // General errors (400-499)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Resource-specific errors
  SHOP_NOT_FOUND = 'SHOP_NOT_FOUND',
  TICKET_NOT_FOUND = 'TICKET_NOT_FOUND',
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  BARBER_NOT_FOUND = 'BARBER_NOT_FOUND',

  // Business logic errors
  INVALID_STATUS_TRANSITION = 'INVALID_STATUS_TRANSITION',
  QUEUE_FULL = 'QUEUE_FULL',
  SERVICE_INACTIVE = 'SERVICE_INACTIVE',
  BARBER_INACTIVE = 'BARBER_INACTIVE',
  BARBER_UNAVAILABLE = 'BARBER_UNAVAILABLE',

  // Server errors (500-599)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',
}

/**
 * Base error response structure.
 */
export interface ErrorResponse {
  error: string;
  code: ErrorCode | string;
  statusCode: number;
  meta?: Record<string, any>;
}

/**
 * Validation error field detail.
 */
export interface ValidationErrorField {
  field: string;
  message: string;
  value?: any;
}

/**
 * Validation error response.
 */
export interface ValidationErrorResponse extends ErrorResponse {
  code: ErrorCode.VALIDATION_ERROR;
  statusCode: 400;
  errors: ValidationErrorField[];
}

/**
 * Not found error response.
 */
export interface NotFoundErrorResponse extends ErrorResponse {
  code: ErrorCode.NOT_FOUND | ErrorCode.SHOP_NOT_FOUND | ErrorCode.TICKET_NOT_FOUND | ErrorCode.SERVICE_NOT_FOUND | ErrorCode.BARBER_NOT_FOUND;
  statusCode: 404;
  resource?: string;
  resourceId?: string | number;
}

/**
 * Conflict error response.
 */
export interface ConflictErrorResponse extends ErrorResponse {
  code: ErrorCode.CONFLICT | ErrorCode.INVALID_STATUS_TRANSITION | ErrorCode.QUEUE_FULL;
  statusCode: 409;
  details?: Record<string, any>;
}

/**
 * Rate limit error response.
 */
export interface RateLimitErrorResponse extends ErrorResponse {
  code: ErrorCode.RATE_LIMIT_EXCEEDED;
  statusCode: 429;
  meta: {
    retryAfter: number; // seconds
  };
}

/**
 * Type guard to check if response is an error.
 */
export function isErrorResponse(response: any): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'error' in response &&
    'code' in response &&
    'statusCode' in response
  );
}

/**
 * Type guard to check if error is a validation error.
 */
export function isValidationError(
  error: ErrorResponse
): error is ValidationErrorResponse {
  return error.code === ErrorCode.VALIDATION_ERROR;
}

/**
 * Type guard to check if error is a not found error.
 */
export function isNotFoundError(
  error: ErrorResponse
): error is NotFoundErrorResponse {
  return error.statusCode === 404;
}

/**
 * Type guard to check if error is a conflict error.
 */
export function isConflictError(
  error: ErrorResponse
): error is ConflictErrorResponse {
  return error.statusCode === 409;
}


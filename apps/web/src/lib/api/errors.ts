/**
 * API client error.
 * Wraps server error responses with additional context.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string,
    public errors?: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ApiError';
  }

  isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR';
  }

  isNotFoundError(): boolean {
    return this.statusCode === 404;
  }

  isAuthError(): boolean {
    return this.statusCode === 401 || this.code === 'UNAUTHORIZED';
  }

  isConflictError(): boolean {
    return this.statusCode === 409 || this.code === 'CONFLICT';
  }

  getFieldErrors(): Record<string, string> {
    if (!this.errors) return {};
    return this.errors.reduce((acc, err) => {
      acc[err.field] = err.message;
      return acc;
    }, {} as Record<string, string>);
  }
}

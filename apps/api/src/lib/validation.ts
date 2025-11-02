import { z } from 'zod';
import { ValidationError } from './errors.js';

/**
 * Validate data against a Zod schema.
 * Throws a ValidationError if validation fails.
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validated and typed data
 * @throws {ValidationError} If validation fails
 * 
 * @example
 * ```typescript
 * const schema = z.object({
 *   name: z.string().min(1),
 *   age: z.number().positive()
 * });
 * 
 * const data = validateRequest(schema, request.body);
 * // data is now typed as { name: string; age: number }
 * ```
 */
export function validateRequest<T extends z.ZodType>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    throw new ValidationError('Validation failed', errors);
  }

  return result.data;
}

/**
 * Type guard to check if data matches a Zod schema.
 * Does not throw, returns boolean instead.
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to check
 * @returns True if data matches schema
 * 
 * @example
 * ```typescript
 * if (isValidData(ticketSchema, data)) {
 *   // data is now typed as Ticket
 *   console.log(data.id);
 * }
 * ```
 */
export function isValidData<T extends z.ZodType>(
  schema: T,
  data: unknown
): data is z.infer<T> {
  return schema.safeParse(data).success;
}

/**
 * Validate data and return result with error details.
 * Useful when you want to handle validation errors manually.
 * 
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result
 * 
 * @example
 * ```typescript
 * const result = validate(schema, data);
 * if (result.success) {
 *   console.log('Valid:', result.data);
 * } else {
 *   console.log('Errors:', result.errors);
 * }
 * ```
 */
export function validate<T extends z.ZodType>(
  schema: T,
  data: unknown
): 
  | { success: true; data: z.infer<T> }
  | { success: false; errors: Array<{ field: string; message: string }> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));

  return { success: false, errors };
}

/**
 * Common validation schemas for use across the application.
 */
export const commonSchemas = {
  /**
   * Validate a positive integer ID.
   */
  id: z.coerce.number().int().positive(),

  /**
   * Validate a slug (lowercase alphanumeric with hyphens).
   */
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),

  /**
   * Validate pagination parameters.
   */
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  }),

  /**
   * Validate a phone number (Brazilian format).
   */
  phone: z.string().regex(
    /^\d{10,11}$/,
    'Phone must be 10 or 11 digits'
  ).optional(),

  /**
   * Validate a date string.
   */
  dateString: z.string().datetime(),

  /**
   * Validate a boolean from query string.
   */
  boolean: z.enum(['true', 'false']).transform(val => val === 'true'),
};

/**
 * Create a schema for path parameters.
 * 
 * @param fields - Schema fields
 * @returns Zod object schema
 * 
 * @example
 * ```typescript
 * const paramsSchema = createParamsSchema({
 *   id: z.coerce.number(),
 *   slug: z.string()
 * });
 * ```
 */
export function createParamsSchema<T extends z.ZodRawShape>(
  fields: T
): z.ZodObject<T> {
  return z.object(fields);
}

/**
 * Create a schema for query parameters with defaults.
 * 
 * @param fields - Schema fields
 * @returns Zod object schema
 * 
 * @example
 * ```typescript
 * const querySchema = createQuerySchema({
 *   search: z.string().optional(),
 *   status: z.enum(['active', 'inactive']).optional()
 * });
 * ```
 */
export function createQuerySchema<T extends z.ZodRawShape>(
  fields: T
): z.ZodObject<T> {
  return z.object(fields);
}

/**
 * Merge multiple Zod schemas.
 * Useful for combining base schemas with extensions.
 * 
 * @param schemas - Schemas to merge
 * @returns Merged schema
 * 
 * @example
 * ```typescript
 * const baseSchema = z.object({ id: z.number() });
 * const extendedSchema = z.object({ name: z.string() });
 * const merged = mergeSchemas(baseSchema, extendedSchema);
 * // Result: { id: number, name: string }
 * ```
 */
export function mergeSchemas<
  T extends z.ZodObject<any>,
  U extends z.ZodObject<any>
>(
  schema1: T,
  schema2: U
): z.ZodObject<T['shape'] & U['shape']> {
  return schema1.merge(schema2);
}


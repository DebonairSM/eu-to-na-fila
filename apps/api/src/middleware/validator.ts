import type { FastifyRequest, FastifyReply, onRequestAsyncHookHandler } from 'fastify';

// Type for async pre-handler hooks
type AsyncPreHandler = (
  request: FastifyRequest,
  reply: FastifyReply
) => Promise<void>;
import { z } from 'zod';
import { validateRequest } from '../lib/validation.js';

/**
 * Create a Fastify pre-handler hook for validating request body.
 * 
 * @param schema - Zod schema for validation
 * @returns Fastify pre-handler hook
 * 
 * @example
 * ```typescript
 * fastify.post('/tickets', {
 *   preHandler: validateBody(createTicketSchema)
 * }, async (request, reply) => {
 *   // request.body is now validated and typed
 *   const ticket = await ticketService.create(request.body);
 *   return ticket;
 * });
 * ```
 */
export function validateBody<T extends z.ZodType>(
  schema: T
): AsyncPreHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    request.body = validateRequest(schema, request.body);
  };
}

/**
 * Create a Fastify pre-handler hook for validating query parameters.
 * 
 * @param schema - Zod schema for validation
 * @returns Fastify pre-handler hook
 * 
 * @example
 * ```typescript
 * const querySchema = z.object({
 *   page: z.coerce.number().default(1),
 *   limit: z.coerce.number().default(20)
 * });
 * 
 * fastify.get('/tickets', {
 *   preHandler: validateQuery(querySchema)
 * }, async (request, reply) => {
 *   // request.query is now validated and typed
 *   const { page, limit } = request.query;
 * });
 * ```
 */
export function validateQuery<T extends z.ZodType>(
  schema: T
): AsyncPreHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    request.query = validateRequest(schema, request.query);
  };
}

/**
 * Create a Fastify pre-handler hook for validating path parameters.
 * 
 * @param schema - Zod schema for validation
 * @returns Fastify pre-handler hook
 * 
 * @example
 * ```typescript
 * const paramsSchema = z.object({
 *   id: z.coerce.number()
 * });
 * 
 * fastify.get('/tickets/:id', {
 *   preHandler: validateParams(paramsSchema)
 * }, async (request, reply) => {
 *   // request.params is now validated and typed
 *   const { id } = request.params;
 * });
 * ```
 */
export function validateParams<T extends z.ZodType>(
  schema: T
): AsyncPreHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    request.params = validateRequest(schema, request.params);
  };
}

/**
 * Create a Fastify pre-handler hook for validating headers.
 * 
 * @param schema - Zod schema for validation
 * @returns Fastify pre-handler hook
 * 
 * @example
 * ```typescript
 * const headersSchema = z.object({
 *   'x-api-key': z.string()
 * });
 * 
 * fastify.get('/admin', {
 *   preHandler: validateHeaders(headersSchema)
 * }, async (request, reply) => {
 *   // request.headers is now validated
 * });
 * ```
 */
export function validateHeaders<T extends z.ZodType>(
  schema: T
): AsyncPreHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    request.headers = validateRequest(schema, request.headers);
  };
}

/**
 * Combine multiple validators into a single pre-handler.
 * 
 * @param validators - Array of validator functions
 * @returns Combined pre-handler hook
 * 
 * @example
 * ```typescript
 * fastify.post('/tickets/:id/update', {
 *   preHandler: combineValidators([
 *     validateParams(paramsSchema),
 *     validateBody(bodySchema),
 *     validateQuery(querySchema)
 *   ])
 * }, async (request, reply) => {
 *   // All validations passed
 * });
 * ```
 */
export function combineValidators(
  validators: AsyncPreHandler[]
): AsyncPreHandler {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    for (const validator of validators) {
      await validator(request, reply);
    }
  };
}


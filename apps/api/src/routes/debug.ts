import type { FastifyPluginAsync } from 'fastify';
import { appendFile } from 'fs/promises';
import { env } from '../env.js';

type DebugIngestPayload = {
  sessionId?: string;
  runId?: string;
  hypothesisId?: string;
  location?: string;
  message?: string;
  data?: unknown;
  timestamp?: number;
};

/**
 * Debug-only ingest endpoint to capture browser logs server-side.
 * This is needed because browser -> local ingest server can be blocked by CORS.
 */
export const debugRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.post('/debug/ingest', async (request, reply) => {
    if (env.NODE_ENV !== 'development') {
      return reply.status(404).send({ error: 'Not found' });
    }

    const body = (request.body ?? {}) as DebugIngestPayload;

    // Minimal validation + avoid accidentally logging huge payloads.
    const entry = {
      sessionId: typeof body.sessionId === 'string' ? body.sessionId : undefined,
      runId: typeof body.runId === 'string' ? body.runId : undefined,
      hypothesisId: typeof body.hypothesisId === 'string' ? body.hypothesisId : undefined,
      location: typeof body.location === 'string' ? body.location : 'web:unknown',
      message: typeof body.message === 'string' ? body.message : 'web-log',
      data: body.data,
      timestamp: typeof body.timestamp === 'number' ? body.timestamp : Date.now(),
    };

    try {
      await appendFile(
        '/Users/ronbandeira/Documents/Repos/eu-to-na-fila/.cursor/debug.log',
        JSON.stringify(entry) + '\n'
      );
    } catch (err) {
      // Don't throw internal details; just signal failure.
      return reply.status(500).send({ error: 'Failed to write debug log' });
    }

    return reply.status(204).send();
  });
};



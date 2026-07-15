import fastifyCors from '@fastify/cors';
import type { FastifyInstance } from 'fastify';

const KNOWN_ORIGINS = [
  'http://localhost:4040',
  'http://localhost:3000',
  'https://eu-to-na-fila.onrender.com',
];

function getAllowedOrigins(configuredOrigins: string): Set<string> {
  return new Set([
    ...KNOWN_ORIGINS,
    ...configuredOrigins.split(',').map((origin) => origin.trim()).filter(Boolean),
  ]);
}

export function registerCors(fastify: FastifyInstance, configuredOrigins: string): void {
  const allowedOrigins = getAllowedOrigins(configuredOrigins);

  fastify.register(fastifyCors, {
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: true,
  });
}

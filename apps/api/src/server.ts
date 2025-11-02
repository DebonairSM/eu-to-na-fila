import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';
import { queueRoutes } from './routes/queue.js';
import { ticketRoutes } from './routes/tickets.js';
import { statusRoutes } from './routes/status.js';
import { websocketHandler } from './websocket/handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

// Security plugins
await fastify.register(fastifyHelmet, {
  contentSecurityPolicy: env.NODE_ENV === 'production',
});

await fastify.register(fastifyCors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
});

await fastify.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// WebSocket support
await fastify.register(fastifyWebsocket);

// Static file serving
const publicPath = join(__dirname, '..', 'public');
await fastify.register(fastifyStatic, {
  root: publicPath,
  prefix: '/',
});

// API routes under /api prefix
await fastify.register(
  async (instance) => {
    await instance.register(queueRoutes);
    await instance.register(ticketRoutes);
    await instance.register(statusRoutes);
  },
  { prefix: '/api' }
);

// WebSocket endpoint
await fastify.register(websocketHandler);

// SPA history fallback - serve /mineiro/index.html for /mineiro/* routes
fastify.get('/mineiro/*', async (request, reply) => {
  return reply.sendFile('mineiro/index.html');
});

// Health check
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    console.log(`Server running at http://localhost:${env.PORT}`);
    console.log(`SPA available at http://localhost:${env.PORT}/mineiro`);
    console.log(`API available at http://localhost:${env.PORT}/api`);
    console.log(`WebSocket available at ws://localhost:${env.PORT}/ws`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();


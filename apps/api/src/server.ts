import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';
import { websocketHandler } from './websocket/handler.js';
import { queueRoutes } from './routes/queue.js';
import { ticketRoutes } from './routes/tickets.js';
import { statusRoutes } from './routes/status.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

// Security plugins
fastify.register(fastifyHelmet, {
  contentSecurityPolicy: env.NODE_ENV === 'production',
});

fastify.register(fastifyCors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
});

fastify.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// WebSocket support
fastify.register(fastifyWebsocket, {
  options: { maxPayload: 1048576 }
});

// Static file serving
const publicPath = join(__dirname, '..', 'public');
fastify.register(fastifyStatic, {
  root: publicPath,
  prefix: '/',
});

// Health check - register first to test basic routing
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Test route
fastify.get('/test', async () => {
  return { message: 'Routes are working!' };
});

// API routes under /api prefix
fastify.register(
  async (instance) => {
    // Register route modules
    instance.register(queueRoutes);
    instance.register(ticketRoutes);
    instance.register(statusRoutes);
  },
  { prefix: '/api' }
);

// WebSocket endpoint
fastify.register(websocketHandler);

// Redirect root to /mineiro/
fastify.get('/', async (request, reply) => {
  return reply.redirect('/mineiro/');
});

// SPA history fallback
fastify.get('/mineiro/*', async (request, reply) => {
  return reply.sendFile('mineiro/index.html');
});

// Register error handlers
fastify.setErrorHandler(errorHandler);
fastify.setNotFoundHandler(notFoundHandler);

// Start server
fastify.listen({ port: env.PORT, host: '0.0.0.0' }).then(() => {
  console.log(`✅ Server running at http://localhost:${env.PORT}`);
  console.log(`📱 SPA available at http://localhost:${env.PORT}/mineiro`);
  console.log(`🔌 API available at http://localhost:${env.PORT}/api`);
  console.log(`🌐 WebSocket available at ws://localhost:${env.PORT}/ws`);
  console.log('\n📋 Registered routes:');
  fastify.printRoutes();
}).catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});


import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';
import { env } from './env.js';
import { db } from './db/index.js';
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
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Needed for Vite
      styleSrc: ["'self'", "'unsafe-inline'"], // Needed for inline styles
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "data:"],
    },
  },
});

fastify.register(fastifyCors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
});

fastify.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Static file serving - register BEFORE routes to ensure assets are served first
const publicPath = join(__dirname, '..', 'public');
const mineiroPath = join(publicPath, 'mineiro');

// Register static file serving for /mineiro/ assets
fastify.register(fastifyStatic, {
  root: mineiroPath,
  prefix: '/mineiro/',
  decorateReply: false, // Don't add sendFile to reply
});

// Health check with database and WebSocket status
fastify.get('/health', async () => {
  const health: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {},
  };

  // Check database connectivity
  try {
    await db.query.shops.findFirst();
    health.checks.database = 'ok';
  } catch (error) {
    health.checks.database = 'error';
    health.status = 'degraded';
    fastify.log.error({ err: error }, 'Health check: database error');
  }

  // Check memory usage
  const memoryUsage = process.memoryUsage();
  health.memory = {
    rss: Math.round(memoryUsage.rss / 1024 / 1024),
    heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
    heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
  };

  return health;
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

// Redirect root to /mineiro/
fastify.get('/', async (request, reply) => {
  return reply.redirect('/mineiro/');
});

// Redirect /mineiro to /mineiro/ for proper base path
fastify.get('/mineiro', async (request, reply) => {
  return reply.redirect('/mineiro/');
});

// Serve SPA index.html for /mineiro/ (exact match)
// This route is needed because fastify-static serves /mineiro/index.html, not /mineiro/
fastify.get('/mineiro/', async (request, reply) => {
  const indexPath = join(mineiroPath, 'index.html');
  if (!existsSync(indexPath)) {
    fastify.log.error(`SPA index.html not found at: ${indexPath}`);
    return reply.code(404).send({ 
      error: 'SPA not found. Make sure web app is built and integrated.',
      path: indexPath
    });
  }
  return reply.sendFile('index.html', mineiroPath);
});

// Register error handler
fastify.setErrorHandler(errorHandler);

// SPA history fallback - register as 404 handler AFTER static files and API routes
// This will only catch routes that don't match static files
fastify.setNotFoundHandler(async (request, reply) => {
  // Only handle SPA fallback for /mineiro/* routes (but not /mineiro/ itself, handled above)
  if (request.url.startsWith('/mineiro/') && request.url !== '/mineiro/') {
    const indexPath = join(mineiroPath, 'index.html');
    if (existsSync(indexPath)) {
      return reply.sendFile('index.html', mineiroPath);
    }
  }
  // For other 404s, use default handler
  return notFoundHandler(request, reply);
});

// Start server
fastify.listen({ port: env.PORT, host: '0.0.0.0' }).then(() => {
  console.log(`✅ Server running at http://localhost:${env.PORT}`);
  console.log(`📱 SPA available at http://localhost:${env.PORT}/mineiro`);
  console.log(`🔌 API available at http://localhost:${env.PORT}/api`);
  console.log('\n📋 Registered routes:');
  fastify.printRoutes();
}).catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});


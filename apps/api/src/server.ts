import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { env } from './env.js';
import { db } from './db/index.js';
import { queueRoutes } from './routes/queue.js';
import { ticketRoutes } from './routes/tickets.js';
import { statusRoutes } from './routes/status.js';
import { barberRoutes } from './routes/barbers.js';
import { serviceRoutes } from './routes/services.js';
import { authRoutes } from './routes/auth.js';
import { analyticsRoutes } from './routes/analytics.js';
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
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Allow Google Fonts
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.qrserver.com"], // Allow QR code API
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"], // Allow Google Fonts
      frameSrc: ["'self'", "https://www.google.com"], // Allow Google Maps iframe
    },
  },
});

// CORS: Allow multiple origins (localhost for dev, Render domains for prod)
const allowedOrigins = [
  'http://localhost:4040',
  'http://localhost:3000',
  'https://eu-to-na-fila.onrender.com', // Render deployment URL
  env.CORS_ORIGIN
].filter(Boolean);

fastify.register(fastifyCors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (same-origin requests, mobile apps, curl, etc.)
    if (!origin) return cb(null, true);
    
    if (allowedOrigins.includes(origin)) {
      return cb(null, true);
    }
    
    // In development, allow all origins
    if (env.NODE_ENV === 'development') {
      return cb(null, true);
    }
    
    // For same-site requests (SPA loading its own assets), allow if origin matches our domain
    if (origin.includes('eu-to-na-fila.onrender.com') || origin.includes('eutonafila')) {
      return cb(null, true);
    }
    
    cb(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
});

fastify.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Static file serving - register BEFORE routes to ensure assets are served first
const publicPath = join(__dirname, '..', 'public');
const mineiroPath = join(publicPath, 'mineiro');

// Log static file directory status
if (!existsSync(mineiroPath)) {
  fastify.log.warn(`Static files directory not found: ${mineiroPath}. Static assets will not be served.`);
} else {
  try {
    const files = readdirSync(mineiroPath);
    fastify.log.info(`Static files directory found: ${mineiroPath} (${files.length} items)`);
    // Log assets directory if it exists
    const assetsPath = join(mineiroPath, 'assets');
    if (existsSync(assetsPath)) {
      const assetFiles = readdirSync(assetsPath);
      fastify.log.info(`Assets directory found with ${assetFiles.length} files: ${assetFiles.slice(0, 5).join(', ')}${assetFiles.length > 5 ? '...' : ''}`);
    }
  } catch (error) {
    fastify.log.warn({ err: error }, 'Error reading static files directory');
  }
}

// Register static file serving for /mineiro/ assets
// Let fastifyStatic handle ALL routes under /mineiro/ including serving index.html
// Do NOT register manual routes for /mineiro/ - it will cause duplicate route errors
fastify.register(fastifyStatic, {
  root: mineiroPath,
  prefix: '/mineiro/',
  decorateReply: false,
  wildcard: true,
  index: ['index.html'], // Serve index.html when /mineiro/ is requested
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
    instance.register(barberRoutes);
    instance.register(serviceRoutes);
    instance.register(authRoutes);
    instance.register(analyticsRoutes);
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

// Register error handler
fastify.setErrorHandler(errorHandler);

// SPA history fallback - register as 404 handler AFTER static files and API routes
// This catches client-side routes that don't match static files
fastify.setNotFoundHandler(async (request, reply) => {
  const url = request.url;
  
  // Don't handle asset files - let them 404 properly
  const assetExtensions = ['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json', '.map'];
  const urlPath = url.split('?')[0];
  const hasAssetExtension = assetExtensions.some(ext => urlPath.endsWith(ext));
  
  // If it's an asset file that 404s, return proper 404
  if (hasAssetExtension) {
    if (url.startsWith('/mineiro/')) {
      fastify.log.warn({ url }, 'Static asset not found');
    }
    return notFoundHandler(request, reply);
  }
  
  // SPA fallback: serve index.html for any /mineiro/* route that's not a static file
  if (url.startsWith('/mineiro/') || url === '/mineiro') {
    const indexPath = join(mineiroPath, 'index.html');
    if (existsSync(indexPath)) {
      try {
        const fileContent = readFileSync(indexPath, 'utf-8');
        return reply.type('text/html').send(fileContent);
      } catch (error) {
        fastify.log.error({ err: error, path: indexPath }, 'Error reading index.html for SPA fallback');
      }
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


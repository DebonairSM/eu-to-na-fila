import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyWebsocket from '@fastify/websocket';
import fastifyHelmet from '@fastify/helmet';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { env } from './env.js';
import { db, schema } from './db/index.js';
import { eq } from 'drizzle-orm';
import { websocketHandler } from './websocket/handler.js';
import { ticketRoutes } from './routes/tickets.js';
import { statusRoutes } from './routes/status.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

// Store WebSocket clients for broadcasting
const wsClients = new Set<any>();

// Decorate fastify with broadcast function
fastify.decorate('broadcast', (message: any) => {
  const messageStr = JSON.stringify(message);
  wsClients.forEach(client => {
    try {
      if (client.readyState === 1) { // OPEN
        client.send(messageStr);
      }
    } catch (err) {
      console.error('Error broadcasting to client:', err);
    }
  });
});

fastify.decorate('addWsClient', (client: any) => wsClients.add(client));
fastify.decorate('removeWsClient', (client: any) => wsClients.delete(client));

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
    instance.get('/shops/:slug/queue', async (request, reply) => {
      const { slug } = request.params as { slug: string };
      
      const shop = await db.query.shops.findFirst({
        where: eq(schema.shops.slug, slug),
      });

      if (!shop) {
        return reply.status(404).send({ error: 'Shop not found' });
      }

      const tickets = await db.query.tickets.findMany({
        where: eq(schema.tickets.shopId, shop.id),
      });

      return { shop, tickets };
    });

    // Register ticket and status routes
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


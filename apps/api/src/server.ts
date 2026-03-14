import './dns-config.js';
import Fastify, { type FastifyRequest, type FastifyPluginCallback } from 'fastify';
import fastifyStatic from '@fastify/static';
import fastifyHelmet from '@fastify/helmet';
import fastifyCompress from '@fastify/compress';
import fastifyCors from '@fastify/cors';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyWebSocketModule from '@fastify/websocket';
import fastifyMultipart from '@fastify/multipart';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, readFileSync, readdirSync, mkdirSync } from 'fs';
import { env } from './env.js';
import { db } from './db/index.js';
import { queueRoutes } from './routes/queue.js';
import { ticketRoutes } from './routes/tickets.js';
import { statusRoutes } from './routes/status.js';
import { barberRoutes } from './routes/barbers.js';
import { serviceRoutes } from './routes/services.js';
import { authRoutes } from './routes/auth.js';
import { companyAuthRoutes } from './routes/company-auth.js';
import { companiesRoutes } from './routes/companies.js';
import { companyShopsRoutes } from './routes/company-shops.js';
import { analyticsRoutes } from './routes/analytics.js';
import { shopsRoutes } from './routes/shops.js';
import { adsRoutes } from './routes/ads.js';
import { propagandasPublicRoutes } from './routes/propagandas-public.js';
import { stripeWebhookRoutes } from './routes/stripe-webhook.js';
import { clientsRoutes } from './routes/clients.js';
import { projectsRoutes } from './routes/projects.js';
import { isEmailConfigured } from './services/EmailService.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { toLoggableError } from './lib/errors.js';
import { registerWebSocket } from './websocket/handler.js';
import { getPublicPath } from './lib/paths.js';
import { getProjectByPathname, getProjectBySlug, getShopByProjectSlug } from './lib/shop.js';
import { startQueueCountdown } from './jobs/queueCountdown.js';
import { startBarberPresenceJob } from './jobs/barberPresenceJob.js';
import { startUsageAnomalyJob } from './jobs/usageAnomalyJob.js';
import { getUsageService, UsageService } from './services/UsageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
  bodyLimit: 50 * 1024 * 1024, // 50MB request body size limit (for large video uploads)
  disableRequestLogging: false,
  requestIdLogLabel: 'reqId',
  requestIdHeader: 'x-request-id',
});

// Security plugins - hardened CSP to reduce firewall/AV false positives
fastify.register(fastifyHelmet, {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // unsafe-eval removed; production build does not use eval
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"], // Allow Google Fonts
      imgSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://api.qrserver.com", // QR codes in kiosk mode
        "https://ui-avatars.com",
        "https://images.unsplash.com",
        "https://www.google.com",
        "https://*.r2.dev", // Cloudflare R2 ad storage
        "https://*.supabase.co", // Supabase storage for ads
      ],
      mediaSrc: [
        "'self'",
        "data:",
        "blob:",
        "https://*.r2.dev",
        "https://*.supabase.co",
      ],
      connectSrc: [
        "'self'",
        "https://api.qrserver.com",
        "https://api.stripe.com",
        "https://ui-avatars.com",
        "https://*.supabase.co",
        "wss:",
        "ws:",
      ],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
      frameSrc: ["'self'", "https://www.google.com", "https://js.stripe.com"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  xContentTypeOptions: true,
  xFrameOptions: { action: 'deny' },
  xXssProtection: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hidePoweredBy: true, // Hide X-Powered-By header
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

await fastify.register(fastifyCompress, { global: true });

// Normalize websocket plugin import for ESM/TypeScript interop
// Handles both default export and direct module export scenarios
const fastifyWebSocket = (
  typeof fastifyWebSocketModule === 'object' && fastifyWebSocketModule !== null && 'default' in fastifyWebSocketModule
    ? (fastifyWebSocketModule as { default: FastifyPluginCallback }).default
    : fastifyWebSocketModule
) as FastifyPluginCallback;

// Register WebSocket support and routes together
await fastify.register(async (instance) => {
  await instance.register(fastifyWebSocket);
  await registerWebSocket(instance);
});

// Register multipart support for file uploads
fastify.register(fastifyMultipart, {
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
  },
  attachFieldsToBody: false, // Disabled to allow proper file handling in routes
});

// Global rate limiting for public endpoints
// Exclude auth routes - they have their own stricter rate limiting
// Threshold set high for controlled environment (DDoS unlikely)
fastify.register(fastifyRateLimit, {
  max: 5000,
  timeWindow: '1 minute',
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true,
  },
  skip: (request: FastifyRequest, key: string) => {
    // Skip global rate limit for auth routes - they have their own rate limiting
    if (request.url.startsWith('/api/shops/') && request.url.includes('/auth')) {
      return true;
    }
    // Skip global rate limit for public manifest endpoint - needed for kiosk display
    // and can be called frequently during WebSocket reconnections
    if (request.url.startsWith('/api/ads/public/manifest')) {
      return true;
    }
    // Skip global rate limit for GET active ticket by device - join page polls this; keep it isolated
    if (request.url.startsWith('/api/shops/') && request.url.includes('/tickets/active')) {
      return true;
    }
    // Skip global rate limit for GET wait-times - join page critical path; avoid delay from limit
    if (request.url.startsWith('/api/shops/') && request.url.includes('/wait-times')) {
      return true;
    }
    // Skip global rate limit for static files (SPA assets, PWA manifest, service worker)
    // These are served as static files and shouldn't be rate limited
    if (request.url.startsWith('/projects/mineiro/') || request.url.startsWith('/companies/') || /^\/[^/]+\//.test(request.url?.split('?')[0] ?? '')) {
      return true;
    }
    // Skip global rate limit for authenticated requests (staff/owner operations)
    // These are already protected by authentication and don't need strict rate limiting
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return true;
    }
    return false;
  },
} as any);

// Static file serving - register BEFORE routes to ensure assets are served first
const publicPath = getPublicPath();
// Barbershop SPA build (single build used for all shops; folder name is legacy)
const projectsMineiroPath = join(publicPath, 'projects', 'mineiro');
const rootPath = join(publicPath, 'root');

// Log static file directory status
if (!existsSync(projectsMineiroPath)) {
  fastify.log.warn(`Static files directory not found: ${projectsMineiroPath}. Static assets will not be served.`);
} else {
  try {
    const files = readdirSync(projectsMineiroPath);
    fastify.log.info(`Static files directory found: ${projectsMineiroPath} (${files.length} items)`);
    // Log assets directory if it exists
    const assetsPath = join(projectsMineiroPath, 'assets');
    if (existsSync(assetsPath)) {
      const assetFiles = readdirSync(assetsPath);
      fastify.log.info(`Assets directory found with ${assetFiles.length} files: ${assetFiles.slice(0, 5).join(', ')}${assetFiles.length > 5 ? '...' : ''}`);
    }
  } catch (error) {
    fastify.log.warn({ err: toLoggableError(error) }, 'Error reading static files directory');
  }
}

// Register static file serving for /projects/mineiro/ assets
// fastifyStatic serves actual files, but we need to handle SPA routes separately
fastify.register(fastifyStatic, {
  root: projectsMineiroPath,
  prefix: '/projects/mineiro/',
  decorateReply: false,
  wildcard: false, // Don't use wildcard - we'll handle SPA routes in 404 handler
  index: false, // Don't auto-serve index.html - handle in 404 handler
  setHeaders: (res, path) => {
    // Cache hashed assets (JS/CSS with hash in filename) for 1 year
    if (path.includes('/assets/') && /\.[a-f0-9]{8,}\.(js|css)$/i.test(path)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
    // Cache other static assets (fonts, images) for 1 week
    else if (/\.(woff2?|ttf|eot|png|jpg|jpeg|gif|svg|webp|ico)$/i.test(path)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
    // Don't cache HTML, SW, or manifest - always revalidate
    else if (/\.(html|js|json)$/i.test(path) && !path.includes('/assets/')) {
      res.setHeader('Cache-Control', 'no-cache, must-revalidate');
    }
  },
});

// Serve static assets for all /projects/:slug/ paths (sw.js, favicon, manifest, etc.)
// Same SPA build is used for all project slugs; assets live in projects/mineiro
const STATIC_ASSET_FILES = ['sw.js', 'favicon.svg', 'favicon.png', 'manifest.json', 'icon-192.png', 'icon-512.png'];
for (const filename of STATIC_ASSET_FILES) {
  fastify.get(`/projects/:slug/${filename}`, async (request, reply) => {
    const filePath = join(projectsMineiroPath, filename);
    if (!existsSync(filePath)) return reply.code(404).send({ error: 'Not found' });
    const content = readFileSync(filePath);
    const mime: Record<string, string> = {
      'sw.js': 'application/javascript',
      'favicon.svg': 'image/svg+xml',
      'favicon.png': 'image/png',
      'manifest.json': 'application/json',
      'icon-192.png': 'image/png',
      'icon-512.png': 'image/png',
    };
    return reply.type(mime[filename] ?? 'application/octet-stream').send(content);
  });
}

// Serve fonts under /projects/:slug/fonts/:filename so SW precache and app work for any slug
fastify.get('/projects/:slug/fonts/:filename', async (request, reply) => {
  const { filename } = request.params as { slug: string; filename: string };
  const filePath = join(projectsMineiroPath, 'fonts', filename);
  if (!existsSync(filePath)) return reply.code(404).send({ error: 'Not found' });
  const mime = filename.endsWith('.ttf') ? 'font/ttf' : filename.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream';
  return reply.type(mime).send(readFileSync(filePath));
});

// Company ad files are now served through API endpoint /api/ads/:id/media
// No need for static file serving - this simplifies the architecture and eliminates CORS issues
// Create companies directory if it doesn't exist (for file storage, not serving)
const companiesPath = join(publicPath, 'companies');
if (!existsSync(companiesPath)) {
  try {
    mkdirSync(companiesPath, { recursive: true });
    fastify.log.info(`Created companies directory: ${companiesPath}`);
  } catch (error) {
    fastify.log.warn({ err: toLoggableError(error) }, 'Could not create companies directory');
  }
}

// Root static is registered later (after short-path routes) so /:slug is handled first

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
    fastify.log.error({ err: toLoggableError(error) }, 'Health check: database error');
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

// security.txt - RFC 9116 vulnerability disclosure
const securityContact = process.env.SECURITY_CONTACT ?? 'mailto:security@eutonafila.com';
const securityTxtExpires = new Date();
securityTxtExpires.setFullYear(securityTxtExpires.getFullYear() + 1);
fastify.get('/.well-known/security.txt', async (_request, reply) => {
  return reply
    .type('text/plain; charset=utf-8')
    .send(
      `Contact: ${securityContact}\nExpires: ${securityTxtExpires.toISOString()}\n`
    );
});

// robots.txt - trust signal for crawlers and scanners
fastify.get('/robots.txt', async (_request, reply) => {
  return reply
    .type('text/plain; charset=utf-8')
    .send('User-agent: *\nAllow: /\n');
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
    instance.register(companyAuthRoutes);
    instance.register(companiesRoutes);
    instance.register(companyShopsRoutes);
    instance.register(analyticsRoutes);
    instance.register(shopsRoutes);
    instance.register(adsRoutes);
    instance.register(propagandasPublicRoutes);
    instance.register(stripeWebhookRoutes);
    instance.register(clientsRoutes);
    instance.register(projectsRoutes);
  },
  { prefix: '/api' }
);

// Serve root homepage (company homepage)
fastify.get('/', async (request, reply) => {
  const rootIndexPath = join(rootPath, 'root.html');
  if (existsSync(rootIndexPath)) {
    const fileContent = readFileSync(rootIndexPath, 'utf-8');
    return reply.type('text/html').send(fileContent);
  }
  return reply.redirect(302, '/projects');
});

// Redirect /projects/:slug to the project's canonical path when path differs (e.g. /projects/shop -> /shops, /projects/mineiro -> /mineiro)
fastify.get('/projects/:slug', async (request, reply) => {
  const { slug } = request.params as { slug: string };
  const project = await getProjectBySlug(slug);
  if (!project) return reply.code(404).send({ error: 'Not found' });
  const canonicalPath = project.path.replace(/\/+$/, '') || '/';
  const expectedLegacyPath = `/projects/${slug}`;
  if (canonicalPath !== expectedLegacyPath) {
    return reply.redirect(302, canonicalPath + '/');
  }
  return reply.redirect(302, canonicalPath + '/');
});

// Serve index.html for /projects/:slug/ only when project still uses legacy path (redirect to short path otherwise)
fastify.get('/projects/:slug/', async (request, reply) => {
  const { slug } = request.params as { slug: string };
  const project = await getProjectBySlug(slug);
  if (!project) return reply.code(404).send({ error: 'Not found' });
  const canonicalPath = project.path.replace(/\/+$/, '') || '/';
  if (canonicalPath !== `/projects/${slug}`) {
    return reply.redirect(302, canonicalPath + '/');
  }
  const indexPath = join(projectsMineiroPath, 'index.html');
  if (existsSync(indexPath)) {
    const fileContent = readFileSync(indexPath, 'utf-8');
    return reply.type('text/html').send(fileContent);
  }
  return reply.code(404).send({ error: 'Not found' });
});

// Short-path routes: barbershop at path from settings (e.g. /minha-barbearia) or /:slug. Must run before root static.
const SHORT_PATH_RESERVED = ['api', 'company', 'companies', 'projects', 'about', 'contact', 'health', 'test', 'ws'];

async function resolveProjectForShortPath(pathname: string): Promise<{ project: Awaited<ReturnType<typeof getProjectBySlug>>; path: string } | null> {
  const normalized = pathname.replace(/\?.*$/, '').replace(/\/+$/, '') || '/';
  const byPath = await getProjectByPathname(normalized === '/' ? '' : normalized);
  if (byPath) return byPath;
  const segment = normalized.slice(1).split('/')[0];
  if (!segment || SHORT_PATH_RESERVED.includes(segment)) return null;
  const project = await getProjectBySlug(segment);
  if (!project) return null;
  return { project, path: '/' + segment };
}

fastify.get<{ Params: { segment: string } }>('/:segment', async (request, reply) => {
  const { segment } = request.params;
  if (!segment || SHORT_PATH_RESERVED.includes(segment)) return reply.callNotFound();
  const pathname = (request.url?.split('?')[0] ?? '').replace(/\/+$/, '') || `/${segment}`;
  const resolution = await resolveProjectForShortPath(pathname);
  if (!resolution) return reply.callNotFound();
  const { path: projectPath } = resolution;
  return reply.redirect(302, projectPath + '/');
});
fastify.get<{ Params: { segment: string; '*': string } }>('/:segment/*', async (request, reply) => {
  const { segment } = request.params;
  const rest = request.params['*'] ?? '';
  const pathSuffix = rest.replace(/^\//, '');
  if (!segment || SHORT_PATH_RESERVED.includes(segment)) return reply.callNotFound();
  const pathname = (request.url?.split('?')[0] ?? '').replace(/\?.*$/, '');
  const resolution = await resolveProjectForShortPath(pathname);
  if (!resolution?.project) return reply.callNotFound();
  const { project, path: projectPath } = resolution;

  if (pathSuffix === '' && !request.url.split('?')[0].endsWith('/')) {
    return reply.redirect(302, projectPath + '/');
  }
  const isKnownAsset =
    STATIC_ASSET_FILES.includes(pathSuffix) ||
    pathSuffix.startsWith('assets/') ||
    pathSuffix.startsWith('fonts/');
  if (isKnownAsset) {
    const filePath = join(projectsMineiroPath, pathSuffix);
    if (existsSync(filePath)) {
      const mime: Record<string, string> = {
        'sw.js': 'application/javascript',
        'favicon.svg': 'image/svg+xml',
        'favicon.png': 'image/png',
        'manifest.json': 'application/json',
        'icon-192.png': 'image/png',
        'icon-512.png': 'image/png',
      };
      const ext = pathSuffix.split('/').pop()?.split('.').pop() ?? '';
      const contentType =
        mime[pathSuffix] ??
        (ext === 'js' ? 'application/javascript' : ext === 'css' ? 'text/css' : ext === 'json' ? 'application/json' : 'application/octet-stream');
      return reply.type(contentType).send(readFileSync(filePath));
    }
  }
  const indexPath = join(projectsMineiroPath, 'index.html');
  if (existsSync(indexPath)) {
    let fileContent = readFileSync(indexPath, 'utf-8');
    const buildBase = '/projects/mineiro/';
    if (projectPath !== '/projects/mineiro' && projectPath + '/' !== buildBase) {
      fileContent = fileContent.split(buildBase).join(projectPath + '/');
    }
    const shop = project ? await getShopByProjectSlug(project.slug) : null;
    const shopSlug = (shop?.slug ?? project?.slug ?? '').replace(/"/g, '\\"');
    const inject = `<script>window.__SHOP_SLUG__="${shopSlug}";window.__SHOP_PATH__="${projectPath.replace(/"/g, '\\"')}";</script>`;
    fileContent = fileContent.replace('</body>', `${inject}\n</body>`);
    return reply.type('text/html').send(fileContent);
  }
  return reply.callNotFound();
});

// Register static file serving for root assets (after short-path so /:slug is handled first)
if (existsSync(rootPath)) {
  fastify.register(fastifyStatic, {
    root: rootPath,
    prefix: '/',
    decorateReply: false,
    wildcard: false,
    index: false,
    setHeaders: (res, path) => {
      if (path.includes('/assets/') && /\.[a-f0-9]{8,}\.(js|css)$/i.test(path)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else if (/\.(woff2?|ttf|eot|png|jpg|jpeg|gif|svg|webp|ico)$/i.test(path)) {
        res.setHeader('Cache-Control', 'public, max-age=604800');
      } else if (/\.(html|js|json)$/i.test(path) && !path.includes('/assets/')) {
        res.setHeader('Cache-Control', 'no-cache, must-revalidate');
      }
    },
  });
}

// Register error handler
fastify.setErrorHandler(errorHandler);

// SPA history fallback - register as 404 handler AFTER static files and API routes
// This catches client-side routes that don't match static files
fastify.setNotFoundHandler(async (request, reply) => {
  const url = request.url;
  const urlPath = url.split('?')[0];

  // Resolve project by pathname so we serve at project path (e.g. /mineiro, /shops) not only /projects/:slug
  const pathname = urlPath.replace(/\?.*$/, '');
  let pathResolution = await getProjectByPathname(pathname);
  // Fallback: path like /mineiro or /mineiro/... may be slug; resolve so /mineiro works before migration
  const reservedSegments = ['api', 'company', 'companies', 'projects', 'about', 'contact', 'health', 'test', 'ws'];
  if (!pathResolution && /^\/[^/]+(\/|$)/.test(pathname)) {
    const segment = pathname.slice(1).split('/')[0];
    if (segment && !reservedSegments.includes(segment)) {
      const project = await getProjectBySlug(segment);
      if (project) pathResolution = { project, path: '/' + segment };
    }
  }

  if (pathResolution) {
    const { project, path: projectPath } = pathResolution;
    const pathSuffix = pathname.slice(projectPath.length).replace(/^\//, '') || '';

    // Redirect /shops to /shops/ so relative assets in index.html resolve correctly
    if (pathSuffix === '' && !pathname.endsWith('/')) {
      return reply.redirect(302, projectPath + '/');
    }

    // Serve static assets under project path (e.g. /shops/assets/xxx.js, /shops/sw.js)
    const isKnownAsset =
      STATIC_ASSET_FILES.includes(pathSuffix) ||
      pathSuffix.startsWith('assets/') ||
      pathSuffix.startsWith('fonts/');
    if (isKnownAsset) {
      const filePath =
        pathSuffix.startsWith('assets/') || pathSuffix.startsWith('fonts/')
          ? join(projectsMineiroPath, pathSuffix)
          : join(projectsMineiroPath, pathSuffix);
      if (existsSync(filePath)) {
        const mime: Record<string, string> = {
          'sw.js': 'application/javascript',
          'favicon.svg': 'image/svg+xml',
          'favicon.png': 'image/png',
          'manifest.json': 'application/json',
          'icon-192.png': 'image/png',
          'icon-512.png': 'image/png',
        };
        const ext = pathSuffix.split('/').pop()?.split('.').pop() ?? '';
        const contentType =
          mime[pathSuffix] ??
          (ext === 'js' ? 'application/javascript' : ext === 'css' ? 'text/css' : ext === 'json' ? 'application/json' : 'application/octet-stream');
        return reply.type(contentType).send(readFileSync(filePath));
      }
    }

    // Serve index.html for SPA routes under this project path, with injected slug/path for client
    const indexPath = join(projectsMineiroPath, 'index.html');
    if (existsSync(indexPath)) {
      try {
        let fileContent = readFileSync(indexPath, 'utf-8');
        // Rewrite build base /projects/mineiro/ to actual path so assets load (e.g. /mineiro/assets/xxx)
        const buildBase = '/projects/mineiro/';
        if (projectPath !== '/projects/mineiro' && projectPath + '/' !== buildBase) {
          fileContent = fileContent.split(buildBase).join(projectPath + '/');
        }
        const shop = await getShopByProjectSlug(project.slug);
        const slugForInject = (shop?.slug ?? project.slug).replace(/"/g, '\\"');
        const inject = `<script>window.__SHOP_SLUG__="${slugForInject}";window.__SHOP_PATH__="${projectPath.replace(/"/g, '\\"')}";</script>`;
        fileContent = fileContent.replace('</body>', `${inject}\n</body>`);
        return reply.type('text/html').send(fileContent);
      } catch (error) {
        fastify.log.error({ err: toLoggableError(error), path: indexPath }, 'Error reading index.html for SPA fallback');
      }
    }
  }

  // Don't handle asset files - let them 404 properly (when not under a project path)
  const assetExtensions = ['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.json', '.map'];
  const hasAssetExtension = assetExtensions.some(ext => urlPath.endsWith(ext));
  if (hasAssetExtension) {
    if (urlPath.startsWith('/projects/mineiro/')) {
      fastify.log.warn({ url }, 'Static asset not found');
    }
    return notFoundHandler(request, reply);
  }

  // SPA fallback: any /projects/:slug/ path is the barbershop SPA (same build for all shops)
  const isBarbershopSpaRoute = /^\/projects\/[^/]+(\/|$)/.test(urlPath);
  if (isBarbershopSpaRoute) {
    const indexPath = join(projectsMineiroPath, 'index.html');
    if (existsSync(indexPath)) {
      try {
        const fileContent = readFileSync(indexPath, 'utf-8');
        return reply.type('text/html').send(fileContent);
      } catch (error) {
        fastify.log.error({ err: toLoggableError(error), path: indexPath }, 'Error reading index.html for SPA fallback');
      }
    }
  }

  // Handle root SPA routes (company homepage: /, /projects, /about, /contact, /company/*)
  if (!urlPath.startsWith('/api')) {
    const rootIndexPath = join(rootPath, 'root.html');
    if (existsSync(rootIndexPath)) {
      try {
        const fileContent = readFileSync(rootIndexPath, 'utf-8');
        return reply.type('text/html').send(fileContent);
      } catch (error) {
        fastify.log.error({ err: toLoggableError(error), path: rootIndexPath }, 'Error reading root.html for SPA fallback');
      }
    }
  }

  return notFoundHandler(request, reply);
});

// Add hook to catch all request errors before they reach error handler
fastify.addHook('onRequest', async (request, reply) => {
  // Hook can be used for future request logging/monitoring if needed
});

// Usage tracking: record API requests for company admin insights (non-blocking)
fastify.addHook('onResponse', (request, reply, done) => {
  const path = (request.url ?? '').split('?')[0] ?? '';
  if (!path.startsWith('/api/')) return done();
  const slug = UsageService.getShopSlugFromPath(path);
  const companyIdFromPath = UsageService.getCompanyIdFromPath(path);
  getUsageService().recordRequest(slug, request.method, path, companyIdFromPath);
  done();
});

fastify.addHook('onError', async (request, reply, error) => {
});

// Test database connection on startup
fastify.addHook('onReady', async () => {
  try {
    await db.query.shops.findFirst();
  } catch (error) {
    fastify.log.error({ err: toLoggableError(error) }, 'Database connection test failed on startup');
  }

  if (!isEmailConfigured()) {
    fastify.log.warn('Email not configured; appointment, password-reset, and ad-order reminder emails will not be sent.');
  }

  // Log path resolution for debugging
  fastify.log.info(`[Paths] publicPath resolved to: ${publicPath}`);
  fastify.log.info(`[Paths] companiesPath resolved to: ${companiesPath}`);
  fastify.log.info(`[Paths] publicPath exists: ${existsSync(publicPath)}`);
  fastify.log.info(`[Paths] companiesPath exists: ${existsSync(companiesPath)}`);
  
  // Log companies directory structure for debugging
  try {
    if (existsSync(companiesPath)) {
      const companies = readdirSync(companiesPath);
      fastify.log.info(`[Ads] Companies directory contains: ${companies.join(', ')}`);
      for (const companyId of companies) {
        const companyPath = join(companiesPath, companyId);
        if (existsSync(companyPath)) {
          const adsPath = join(companyPath, 'ads');
          if (existsSync(adsPath)) {
            const adFiles = readdirSync(adsPath);
            fastify.log.info(`[Ads] Company ${companyId} ads directory: ${adFiles.length} files (${adFiles.slice(0, 10).join(', ')}${adFiles.length > 10 ? '...' : ''})`);
          } else {
            fastify.log.warn(`[Ads] Company ${companyId} ads directory does not exist: ${adsPath}`);
          }
        }
      }
    } else {
      fastify.log.warn(`[Ads] Companies directory does not exist: ${companiesPath}`);
    }
  } catch (error) {
    fastify.log.warn({ err: toLoggableError(error) }, 'Error checking companies directory structure');
  }
});

// Start server
fastify.listen({ port: env.PORT, host: '0.0.0.0' }).then(() => {
  console.log(`✅ Server running at http://localhost:${env.PORT}`);
  console.log(`📱 Barbershop SPA at http://localhost:${env.PORT}/:slug (e.g. /shop)`);
  console.log(`🔌 API available at http://localhost:${env.PORT}/api`);
  console.log('\n📋 Registered routes:');
  fastify.printRoutes();

  // Start periodic queue recalculation (every 60s) so wait times tick down
  startQueueCountdown();
  // Auto-set barbers absent 1h after closing (every 15min); barbers are never auto-set present
  startBarberPresenceJob();
  // Flush usage counters to DB every 5 min for company admin insights
  getUsageService().startFlushJob();
  startUsageAnomalyJob();
}).catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});


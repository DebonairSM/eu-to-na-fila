# EuToNaFila

Queue management system for barbershops. Single-tenant template with hosted backend (Render/Railway), React SPA, and Android tablet app.

## Tech Stack

**Backend (apps/api)**
- Node.js 20+ + TypeScript
- Fastify web framework
- Drizzle ORM + libSQL (pure JavaScript SQLite, no build tools needed)
- REST API with automatic queue updates
- Security: helmet, CORS, rate limiting
- Upgradeable to Postgres without code changes

**Frontend (apps/web)**
- React + Vite + TypeScript
- TailwindCSS + shadcn/ui components
- React Router with basename support
- HTTP polling for live updates (3-second refresh)

**Tablet Support (PWA)**
- Progressive Web App (installable)
- Works offline with service worker
- Fullscreen app-like experience
- Auto-updates on deployment
- No app store required

**Shared (packages/shared)**
- Zod schemas for validation
- Shared TypeScript types
- API response definitions

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env
# Edit .env with your configuration
```

### Development

```bash
# Run both API and Web in dev mode
pnpm dev

# Or run separately:
pnpm --filter api dev
pnpm --filter web dev
```

Access:
- Web SPA: http://localhost:5173/mineiro
- API: http://localhost:3000/api

### Database

```bash
# Generate migrations from schema
pnpm --filter api db:generate

# Run migrations
pnpm db:migrate

# Seed with test data
pnpm db:seed

# Optional: Open Drizzle Studio to view database
pnpm --filter api db:studio
```

This creates the "mineiro" shop with 2 barbers and 3 services.

### Production Build

```bash
# Build everything
pnpm build

# Or step by step:
pnpm build:web
pnpm integrate:web
pnpm build:api

# Start production server
pnpm start
```

The API serves the SPA at http://localhost:3000/mineiro

## Repository Structure

```
├── apps/
│   ├── api/           Fastify backend (API + SPA hosting)
│   └── web/           React SPA (builds to /mineiro path, installable as PWA)
├── packages/
│   └── shared/        Zod schemas + shared types
├── templates/
│   └── shop.config.json   Shop configuration template
├── scripts/
│   └── integrate-web.js   Copy web build to API public folder
└── .github/
    └── workflows/     CI/CD configuration
```

## Deployment

### Render

1. Create a new **Web Service**
2. Connect your repository
3. Configure:
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm build:web && pnpm integrate:web && pnpm build:api`
   - **Start Command**: `node apps/api/dist/server.js`
   - **Environment Variables**:
     ```
     NODE_ENV=production
     PORT=3000
     DATA_PATH=/var/data/eutonafila.sqlite
     JWT_SECRET=<generate-a-secure-secret>
     CORS_ORIGIN=https://eutonafila.com
     SHOP_SLUG=mineiro
     ```
4. Add a **Persistent Disk**:
   - Mount Path: `/var/data`
   - Size: 1GB (for SQLite database)
5. Set custom domain to `eutonafila.com`
6. Deploy

Access your app at:
- SPA: https://eutonafila.com/mineiro
- API: https://eutonafila.com/api

### Railway

1. Create a new **Project**
2. Add a **Node.js service** from GitHub
3. Configure:
   - **Build Command**: `pnpm install --frozen-lockfile && pnpm build:web && pnpm integrate:web && pnpm build:api`
   - **Start Command**: `node apps/api/dist/server.js`
   - **Environment Variables**: Same as Render
4. Add a **Volume**:
   - Mount Path: `/app/data`
   - Update `DATA_PATH=/app/data/eutonafila.sqlite`
5. Add custom domain `eutonafila.com`
6. Deploy

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment | `development` | No |
| `PORT` | Server port | `3000` | No |
| `DATA_PATH` | SQLite file path | `./data/eutonafila.sqlite` | Yes |
| `JWT_SECRET` | Secret for JWT tokens | - | Yes |
| `CORS_ORIGIN` | Allowed CORS origin | `http://localhost:5173` | Yes |
| `SHOP_SLUG` | Shop identifier | `mineiro` | No |

## Using on Tablets (Barber Interface)

The web app works perfectly on tablets via Progressive Web App (PWA) technology:

### Installation on Android Tablets

1. Open Chrome on the tablet
2. Navigate to your shop URL (e.g., `https://eutonafila.com/mineiro`)
3. Tap the menu (⋮) and select **"Add to Home screen"** or **"Install app"**
4. An icon will appear on the home screen
5. Tap to launch - opens fullscreen like a native app

### Benefits of PWA

- **No app store** - Install directly from browser
- **Auto-updates** - Always latest version when we deploy
- **Works offline** - Caches data for viewing without internet
- **Fullscreen mode** - Looks and feels like native app
- **One codebase** - Same app for desktop, mobile, and tablets

### Offline Support

The PWA caches:
- App interface (HTML, CSS, JavaScript)
- Queue data (for viewing when offline)
- Shop configuration

Polling resumes automatically when back online.

## Migration to Postgres

When ready to scale, switch from libSQL to Postgres:

1. Update `apps/api/package.json`:
   ```json
   {
     "dependencies": {
       "drizzle-orm": "^0.29.2",
       "postgres": "^3.4.3"  // Replace @libsql/client
     }
   }
   ```

2. Update `apps/api/drizzle.config.ts`:
   ```ts
   export default {
     schema: './src/db/schema.ts',
     out: './drizzle',
     driver: 'pg',
     dbCredentials: {
       connectionString: process.env.DATABASE_URL,
     },
   };
   ```

3. Update `apps/api/src/db/index.ts`:
   ```ts
   import { drizzle } from 'drizzle-orm/postgres-js';
   import postgres from 'postgres';
   
   const client = postgres(env.DATABASE_URL);
   export const db = drizzle(client, { schema });
   ```

4. Update `apps/api/src/migrate.ts` similarly

5. Migrate data (one-time script to copy SQLite to Postgres)

No other code changes required.

## API Endpoints

### Public Endpoints

- `GET /api/shops/:slug/queue` - Get current queue
- `POST /api/shops/:slug/tickets` - Join queue
- `GET /health` - Health check

### Staff Endpoints (requires JWT)

- `PATCH /api/tickets/:id/status` - Update ticket status
- `GET /api/barbers` - List barbers
- `GET /api/services` - List services

### Real-Time Updates

The frontend uses HTTP polling (every 3 seconds) to fetch queue updates. This is simple, works everywhere, and is appropriate for the expected scale (~30 concurrent users).

## Documentation

### Getting Started
- [Quick Start](#quick-start) - Get up and running in minutes
- [Development](#development) - Local development setup
- [Database](#database) - Migrations and seeding

### Architecture & Design
- [Architecture Overview](./docs/ARCHITECTURE.md) - System design and components
- [Scale Decisions](./docs/SCALE_DECISIONS.md) - Why we skip TanStack Query, OpenTelemetry, and native Android
- [Code Conventions](./docs/CONVENTIONS.md) - Naming, structure, and patterns
- [API Reference](./docs/API.md) - Complete API documentation

### Production Deployment
- [Deployment Guide](./docs/DEPLOYMENT.md) - Deploy to Render/Railway
- [Environment Variables](./docs/ENVIRONMENT_VARIABLES.md) - Configuration reference
- [Backup & Restore](./docs/BACKUP_RESTORE.md) - Database backup procedures
- [Sentry Setup](./docs/SENTRY_SETUP.md) - Error monitoring configuration
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues and solutions

### Development
- [Contributing Guide](./CONTRIBUTING.md) - How to contribute
- [Common Patterns](./docs/PATTERNS.md) - Code patterns and examples
- [Examples](./examples/) - Complete code examples

### Tablet Setup
- [PWA Installation](#using-on-tablets-barber-interface) - Install on Android tablets
- [Offline Support](#offline-support) - How offline mode works

## Production Readiness

This application is production-ready for single barbershop deployment with:

✅ **PWA Support** - Installable on tablets, works offline
✅ **Error Monitoring** - Sentry integration for tracking issues
✅ **Automated Backups** - Daily database backups to cloud storage
✅ **Health Monitoring** - Uptime checks and status endpoint
✅ **Security** - Helmet, CORS, rate limiting, JWT auth
✅ **Documentation** - Comprehensive guides for deployment and troubleshooting

### Right-Sized for Single Shop

This system is deliberately kept simple for its target scale:
- **5 barbers** working simultaneously
- **~30 concurrent users** (barbers + customers)
- **100-200 tickets per day**

See [Scale Decisions](./docs/SCALE_DECISIONS.md) for why we don't use enterprise patterns like TanStack Query, OpenTelemetry, or native mobile apps.

## License

MIT


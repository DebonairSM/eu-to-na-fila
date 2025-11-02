# EuToNaFila

Queue management system for barbershops. Single-tenant template with hosted backend (Render/Railway), React SPA, and Android tablet app.

## Tech Stack

**Backend (apps/api)**
- Node.js 20+ + TypeScript
- Fastify web framework
- Drizzle ORM + libSQL (pure JavaScript SQLite, no build tools needed)
- WebSocket support for real-time updates
- Security: helmet, CORS, rate limiting
- Upgradeable to Postgres without code changes

**Frontend (apps/web)**
- React + Vite + TypeScript
- TailwindCSS + shadcn/ui components
- React Router with basename support
- WebSocket client for live updates

**Mobile (apps/android)**
- Kotlin + Jetpack Compose
- Retrofit for REST API
- OkHttp WebSocket with auto-reconnect
- Sideloadable APK for tablets

**Shared (packages/shared)**
- Zod schemas for validation
- Shared TypeScript types
- WebSocket event definitions

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- (Optional) Android Studio for mobile app

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
- WebSocket: ws://localhost:3000/ws

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
│   ├── api/           Fastify backend (API + SPA hosting + WebSocket)
│   ├── web/           React SPA (builds to /mineiro path)
│   └── android/       Kotlin tablet app
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
- WebSocket: wss://eutonafila.com/ws

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

### WebSocket

Connect to `/ws?shopId=<slug>` for real-time updates.

Events:
- `ticket.created` - New ticket added
- `ticket.status.changed` - Ticket status updated
- `metrics.updated` - Queue metrics changed

## License

MIT


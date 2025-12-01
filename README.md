# EuToNaFila

Queue management system for barbershops. Single-tenant deployment with hosted backend, React SPA, and PWA tablet support.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js 20+, Fastify, Drizzle ORM, PostgreSQL |
| Frontend | React, Vite, TypeScript, TailwindCSS, shadcn/ui |
| Shared | Zod schemas, TypeScript types |
| Tablet | PWA (Progressive Web App) |

## Local Development Setup

### Prerequisites

- Node.js 20+ ([download](https://nodejs.org/))
- pnpm 8+ (`npm install -g pnpm`)
- PostgreSQL 12+ ([download](https://www.postgresql.org/download/))

### Step 1: Install Dependencies

```bash
pnpm install
```

### Step 2: Set Up PostgreSQL Database

Create a PostgreSQL database for local development:

```bash
# Using psql
createdb eutonafila

# Or using PostgreSQL CLI
psql -U postgres
CREATE DATABASE eutonafila;
\q
```

### Step 3: Configure Environment Variables

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` with your local configuration:

```env
NODE_ENV=development
PORT=4041
DATABASE_URL=postgresql://localhost:5432/eutonafila
JWT_SECRET=your-local-development-secret-at-least-32-characters-long
CORS_ORIGIN=http://localhost:4040
SHOP_SLUG=mineiro
```

**Note:** Replace `DATABASE_URL` with your PostgreSQL connection string if using different credentials:
- Format: `postgresql://username:password@localhost:5432/eutonafila`
- Default: `postgresql://localhost:5432/eutonafila` (assumes local PostgreSQL with default user)

### Step 4: Run Database Migrations

```bash
pnpm db:migrate
```

This creates all necessary tables in your database.

### Step 5: Seed Test Data (Optional)

```bash
pnpm db:seed
```

This creates:
- Shop: "Barbearia Mineiro" (slug: `mineiro`)
- Default PINs: Owner `1234`, Staff `0000`
- Sample services and barbers

### Step 6: Start Development Servers

```bash
# Run both API and Web concurrently
pnpm dev

# Or run separately in different terminals
pnpm --filter api dev    # API server
pnpm --filter web dev    # Web frontend
```

**Access the application:**
- Web UI: http://localhost:4040/mineiro
- API: http://localhost:4041/api
- Health Check: http://localhost:4041/health

### Testing

Currently, there are no automated tests configured. To test manually:

1. **Test Queue Flow:**
   - Visit http://localhost:4040/mineiro
   - Join the queue as a customer
   - Check ticket status

2. **Test Staff Features:**
   - Login with staff PIN: `0000`
   - Manage queue and tickets

3. **Test API Endpoints:**
   ```bash
   # Health check
   curl http://localhost:4041/health
   
   # Get queue
   curl http://localhost:4041/api/shops/mineiro/queue
   ```

### Troubleshooting

**Database connection errors:**
- Ensure PostgreSQL is running: `pg_isready` or `psql -U postgres -c "SELECT 1"`
- Verify `DATABASE_URL` in `.env` matches your PostgreSQL setup
- Check PostgreSQL is listening on port 5432

**Port already in use:**
- Change `PORT` in `.env` for API
- Update Vite port in `apps/web/vite.config.ts` for frontend

**Migration errors:**
- Ensure database exists: `psql -l | grep eutonafila`
- Drop and recreate if needed: `dropdb eutonafila && createdb eutonafila`

### Production Build

```bash
pnpm build:web
pnpm integrate:web
pnpm build:api
pnpm start
```

## Project Structure

```
eu-to-na-fila/
├── apps/
│   ├── api/                 # Fastify backend
│   │   ├── src/
│   │   │   ├── db/          # Drizzle ORM schema
│   │   │   ├── routes/      # API endpoints
│   │   │   ├── services/    # Business logic
│   │   │   └── server.ts    # Entry point
│   │   └── drizzle/         # Migrations
│   └── web/                 # React SPA
│       ├── src/
│       │   ├── pages/       # Route components
│       │   ├── hooks/       # Custom hooks
│       │   ├── lib/         # API client, utils
│       │   └── components/  # UI components
│       └── public/          # Static assets, PWA
├── packages/
│   └── shared/              # Zod schemas, types
├── docs/                    # Documentation
├── mockups/                 # HTML mockups
└── scripts/                 # Build scripts
```

## Deployment

### Render / Railway

1. Create Web Service from repository
2. Build command: `pnpm install --frozen-lockfile && pnpm build:web && pnpm integrate:web && pnpm build:api`
3. Start command: `node apps/api/dist/server.js`
4. Add persistent disk at `/var/data` (1GB)
5. Set environment variables:

```
NODE_ENV=production
DATA_PATH=/var/data/eutonafila.sqlite
JWT_SECRET=<secure-random-string>
CORS_ORIGIN=https://yourdomain.com
SHOP_SLUG=mineiro
```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment (development/production/test) | `development` | No |
| `PORT` | Server port | `4041` | No |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost:5432/eutonafila` | Yes* |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | `change_me_in_production...` | Yes* |
| `CORS_ORIGIN` | Allowed origin for CORS | `http://localhost:4040` | Yes* |
| `SHOP_SLUG` | Shop identifier | `mineiro` | No |

*Required in production, has defaults for development

## Tablet Installation (PWA)

1. Open Chrome on Android tablet
2. Navigate to shop URL (e.g., `https://yourdomain.com/mineiro`)
3. Tap menu (⋮) → "Add to Home screen"
4. App launches fullscreen like a native app

PWA provides:
- Offline viewing of cached queue data
- Auto-updates on deployment
- No app store required

## API Overview

### Public Endpoints

- `GET /api/shops/:slug/queue` - Current queue with tickets
- `POST /api/shops/:slug/tickets` - Join queue
- `GET /health` - Health check

### Staff Endpoints

- `PATCH /api/tickets/:id/status` - Update ticket status
- `GET /api/barbers` - List barbers
- `GET /api/services` - List services

## Documentation

| Document | Description |
|----------|-------------|
| [Backend Reference](./docs/BACKEND_FULL.md) | API, database, services, conventions |
| [Frontend Reference](./docs/WEB_FULL.md) | React components, hooks, styling |
| [User Stories](./docs/USER_STORIES.md) | All user interactions |
| [Design System](./docs/DESIGN.md) | Colors, typography, components |

## Target Scale

Designed for single barbershop deployment:
- 5 barbers working simultaneously
- ~30 concurrent users
- 100-200 tickets per day

## License

MIT

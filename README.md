# EuToNaFila

Queue management system for barbershops. Single-tenant deployment with hosted backend, React SPA, and PWA tablet support.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js 20+, Fastify, Drizzle ORM, libSQL (SQLite) |
| Frontend | React, Vite, TypeScript, TailwindCSS, shadcn/ui |
| Shared | Zod schemas, TypeScript types |
| Tablet | PWA (Progressive Web App) |

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+

### Installation

```bash
pnpm install
cp .env.example .env
```

### Development

```bash
# Run API and Web concurrently
pnpm dev

# Or separately
pnpm --filter api dev
pnpm --filter web dev
```

- Web: http://localhost:4040/mineiro
- API: http://localhost:4041/api

### Database

```bash
pnpm db:migrate    # Run migrations
pnpm db:seed       # Seed test data
```

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

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Environment (production/development) | No |
| `PORT` | Server port (default: 4041) | No |
| `DATA_PATH` | SQLite database path | Yes |
| `JWT_SECRET` | JWT signing secret | Yes |
| `CORS_ORIGIN` | Allowed origin | Yes |
| `SHOP_SLUG` | Shop identifier | No |

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

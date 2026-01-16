# EuToNaFila

Queue management system for barbershops. Single-tenant deployment with React SPA and PWA tablet support.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js 20+, Fastify, Drizzle ORM, PostgreSQL 16 |
| Frontend | React 18, Vite, TypeScript, TailwindCSS |
| Shared | Zod schemas, TypeScript types |
| Tablet | PWA (Progressive Web App) |

## Quick Start

### Prerequisites

- Node.js 20+ ([download](https://nodejs.org/))
- pnpm 8+ (`npm install -g pnpm`)
- PostgreSQL 12+ ([download](https://www.postgresql.org/download/))

### Setup

```bash
# 1. Install dependencies
pnpm install

# 2. Create database
createdb eutonafila

# 3. Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL

# 4. Run migrations
pnpm db:migrate

# 5. Seed test data (optional)
pnpm db:seed

# 6. Start dev servers
pnpm dev
```

**Access:**
- Web: http://localhost:4040/mineiro
- API: http://localhost:4041/api
- Health: http://localhost:4041/health

### Environment Variables

Create `.env` file:

```env
NODE_ENV=development
PORT=4041
DATABASE_URL=postgresql://localhost:5432/eutonafila
JWT_SECRET=your-secret-at-least-32-characters-long
CORS_ORIGIN=http://localhost:4040
SHOP_SLUG=mineiro
```

## Project Structure

```
eu-to-na-fila/
├── apps/
│   ├── api/                # Fastify backend
│   │   ├── src/
│   │   │   ├── db/         # Drizzle schema
│   │   │   ├── routes/     # API endpoints
│   │   │   ├── services/   # Business logic
│   │   │   └── server.ts   # Entry point
│   │   └── drizzle/        # Migrations
│   └── web/                # React SPA
│       ├── src/
│       │   ├── pages/      # Route components
│       │   ├── hooks/      # Custom hooks
│       │   ├── lib/        # API client
│       │   └── components/ # UI components
│       └── public/         # Static assets, PWA
├── packages/shared/        # Zod schemas, types
├── docs/                   # Documentation
└── scripts/                # Build scripts
```

## Features

### Customer Flow ✅
- Join queue via web or QR code
- Duplicate detection (returns existing ticket)
- Real-time status updates (3s polling)
- Estimated wait time
- Leave queue option

### Staff Management ✅
- View and manage queue
- Assign customers to barbers
- Mark services as complete
- Toggle barber presence
- Kiosk mode for display

### Owner Dashboard ✅
- Analytics and statistics
- Manage barbers (full CRUD)
- Manage services (API only - UI not implemented)
- View performance metrics

### Kiosk Mode ✅
- Fullscreen queue display
- Ad rotation (15s queue, 10s ads)
- QR code for self-registration
- Touch interactions with idle timer

## API Overview

### Public Endpoints
- `GET /api/shops/:slug/queue` - Current queue
- `POST /api/shops/:slug/tickets` - Join queue
- `GET /api/tickets/:id` - Ticket status
- `GET /health` - Health check

### Staff Endpoints (Auth Required)
- `PATCH /api/tickets/:id` - Update ticket
- `PATCH /api/tickets/:id/status` - Update status
- `DELETE /api/tickets/:id` - Cancel ticket
- `PATCH /api/barbers/:id/presence` - Toggle presence

### Owner Endpoints (Owner Role Required)
- `GET /api/shops/:slug/analytics` - Analytics
- `POST /api/shops/:slug/barbers` - Create barber
- `PATCH /api/barbers/:id` - Update barber
- `DELETE /api/barbers/:id` - Delete barber
- `POST /api/shops/:slug/services` - Create service
- `PATCH /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

## Authentication

PIN-based JWT authentication:

```bash
POST /api/shops/:slug/auth
{ "pin": "1234" }

# Returns:
{ "valid": true, "role": "owner", "token": "eyJ..." }
```

**Roles:**
- `owner` - Full access (default PIN: 1234)
- `staff` - Queue management only (default PIN: 0000)

Tokens expire after 24 hours.

## Database Commands

```bash
# Generate migration from schema
pnpm --filter api db:generate

# Run migrations
pnpm db:migrate

# Seed test data
pnpm db:seed

# Open Drizzle Studio
pnpm --filter api db:studio
```

## Build & Deploy

### Production Build

```bash
pnpm build:web
pnpm integrate:web
pnpm build:api
pnpm start
```

### Deploy to Render/Railway

1. Create Web Service from repo
2. Build command:
   ```bash
   pnpm install --frozen-lockfile && pnpm build:web && pnpm integrate:web && pnpm build:api
   ```
3. Start command:
   ```bash
   node apps/api/dist/server.js
   ```
4. Environment variables:
   ```
   NODE_ENV=production
   DATABASE_URL=<postgres-connection-string>
   JWT_SECRET=<secure-random-string>
   CORS_ORIGIN=https://yourdomain.com
   SHOP_SLUG=mineiro
   ```

### Tablet Installation (PWA)

1. Open Chrome on Android tablet
2. Navigate to shop URL (e.g., `https://yourdomain.com/mineiro`)
3. Tap menu (⋮) → "Add to Home screen"
4. App launches fullscreen

## Documentation

| Document | Description |
|----------|-------------|
| [Backend Reference](./docs/BACKEND_FULL.md) | API, database, services |
| [Frontend Reference](./docs/WEB_FULL.md) | React components, hooks |
| [User Stories](./docs/USER_STORIES.md) | Feature implementation status |
| [Design System](./docs/DESIGN.md) | Colors, typography, components |

## Testing

### E2E Testing with Playwright

The project includes comprehensive Playwright end-to-end tests for the kiosk mode ads system and API endpoints.

**Prerequisites:**
```bash
# Install Playwright browsers (first time only)
pnpm exec playwright install
```

**Run Tests:**
```bash
# Run all E2E tests (all browsers)
pnpm test:e2e

# Run only Chromium (faster for local development)
PLAYWRIGHT_BROWSERS=chromium pnpm test:e2e

# Run with UI mode (interactive, recommended for debugging)
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e:headed

# Debug mode
pnpm test:e2e:debug
```

**Test Coverage:**

**API Tests (`tests/api/`):**
- Ad upload endpoints (multipart file uploads, validation)
- Ad management (CRUD operations, status updates)
- Ad manifest generation (public endpoint, filtering, ordering)
- Authentication and authorization (company admin access)
- File validation (MIME types, size limits, formats)

**Kiosk Tests (`tests/kiosk/`):**
- Ad display from manifest (images, video, loading states)
- Ad rotation (queue → ad → queue sequence, timing)
- User interactions (click to skip, idle timer, rotation pause/resume)
- WebSocket live updates (real-time ad changes)
- Full upload-to-display flow (end-to-end validation)

**Test Structure:**
```
tests/
├── helpers/                  # Test utilities
│   ├── auth.ts              # Authentication helpers
│   ├── kiosk.ts             # Kiosk mode helpers
│   └── api.ts               # API client helpers
├── api/                      # API endpoint tests
│   ├── ads-upload.spec.ts   # Upload functionality
│   ├── ads-management.spec.ts # CRUD operations
│   ├── ads-manifest.spec.ts # Manifest endpoint
│   └── ads-endpoints.spec.ts # General endpoints
└── kiosk/                    # Kiosk mode tests
    ├── ads-display.spec.ts  # Display logic
    ├── ads-rotation.spec.ts # Rotation sequence
    ├── ads-interaction.spec.ts # User interactions
    ├── ads-live-update.spec.ts # WebSocket updates
    └── ads-upload-flow.spec.ts # Full flow
```

**Common Issues and Solutions:**

1. **Browser Installation:**
   - If you see "Executable doesn't exist" errors, run: `pnpm exec playwright install`
   - Browsers are installed automatically on first run, but may need manual installation

2. **Authentication Failures (403):**
   - Some tests require company admin credentials
   - Tests will skip gracefully if credentials aren't configured
   - To fix: Ensure company admin account exists with username 'admin' and password 'admin123'

3. **API Server Connection:**
   - Ensure dev server is running: `pnpm dev`
   - Check that API is accessible at `http://localhost:4041`
   - Playwright should start servers automatically, but verify they're working

4. **Test Timeouts:**
   - Some tests may timeout due to large file uploads (51MB) - this is acceptable
   - Network conditions can affect upload speed
   - Dev server startup time may cause initial timeouts

**Running Specific Tests:**
```bash
# Run a specific test file
pnpm test:e2e tests/api/ads-upload.spec.ts

# Run tests matching a pattern
pnpm test:e2e --grep "should upload image"
```

**Best Practices:**
- Use `PLAYWRIGHT_BROWSERS=chromium` for faster local development
- Use `pnpm test:e2e:ui` for interactive debugging
- See `tests/TEST_FAILURES_NOTES.md` for detailed troubleshooting
- See `tests/MANUAL_TESTING_CHECKLIST.md` for manual testing procedures

**Note:** Tests require the dev server to be running. The Playwright config will automatically start it if not already running. For more details, see `tests/README.md`.

### Manual Testing

**Customer Flow:**
```bash
# 1. Visit landing page
open http://localhost:4040/mineiro

# 2. Join queue
# 3. Check status page
# 4. Leave queue
```

**Staff Flow:**
```bash
# 1. Login with staff PIN: 0000
# 2. View queue
# 3. Assign customer to barber
# 4. Complete service
```

**API Testing:**
```bash
# Health check
curl http://localhost:4041/health

# Get queue
curl http://localhost:4041/api/shops/mineiro/queue

# Join queue
curl -X POST http://localhost:4041/api/shops/mineiro/tickets \
  -H "Content-Type: application/json" \
  -d '{"customerName":"João Silva","serviceId":1}'
```

## Troubleshooting

### Database Connection Errors
```bash
# Check PostgreSQL is running
pg_isready

# Verify database exists
psql -l | grep eutonafila

# Recreate if needed
dropdb eutonafila && createdb eutonafila
```

### Port Already in Use
Edit `.env` to change `PORT` or update `apps/web/vite.config.ts` for frontend port.

### Migration Errors
```bash
# Reset database
dropdb eutonafila
createdb eutonafila
pnpm db:migrate
pnpm db:seed
```

## Target Scale

Designed for single barbershop deployment:
- 5 barbers simultaneously
- ~30 concurrent users
- 100-200 tickets/day
- PostgreSQL database
- Single tenant per instance

## Known Limitations

1. **Service Management UI:** Backend complete, frontend UI not implemented
2. **Single Tenant:** One shop per deployment (multi-tenancy not supported)
3. **Polling Updates:** 3-5s intervals (no WebSocket real-time)
4. **Portuguese Only:** No multi-language support
5. **No Appointments:** Walk-in queue system only

See `docs/USER_STORIES.md` for detailed implementation status.

## Browser Support

**Desktop:** Chrome, Safari, Firefox, Edge (latest)  
**Mobile:** Chrome for Android, Safari for iOS  
**Optimal Devices:** Desktop (management), tablets (kiosk), mobile (customers)

## Contributing

See `CONTRIBUTING.md` for development guidelines and code conventions.

## License

MIT

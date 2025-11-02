# Sentry Error Monitoring Setup

## Overview

Sentry provides error tracking and monitoring for both backend and frontend. The free tier is sufficient for a single barbershop deployment.

## Sign Up for Sentry

1. Go to https://sentry.io/signup/
2. Create free account
3. Create organization (e.g., "EuTôNaFila")

## Create Projects

### Backend Project

1. In Sentry dashboard → Projects → Create Project
2. Select platform: **Node.js**
3. Name: `eutonafila-api`
4. Copy DSN (looks like: `https://abc123@o123.ingest.sentry.io/456`)

### Frontend Project

1. Create another project
2. Select platform: **React**
3. Name: `eutonafila-web`
4. Copy DSN

## Install Dependencies

### Backend

```bash
cd apps/api
pnpm add @sentry/node @sentry/profiling-node
```

### Frontend

```bash
cd apps/web
pnpm add @sentry/react
```

## Configure Backend

Create `apps/api/src/lib/sentry.ts`:

```typescript
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { env } from '../env.js';

/**
 * Initialize Sentry error tracking.
 * Call this before setting up Fastify server.
 */
export function initSentry() {
  if (!env.SENTRY_DSN) {
    console.log('Sentry DSN not configured, skipping error tracking');
    return;
  }

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    
    // Release tracking (optional, for source maps)
    release: process.env.RENDER_GIT_COMMIT || undefined,
    
    // Performance monitoring
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Profiling (optional)
    profilesSampleRate: 0.1,
    integrations: [nodeProfilingIntegration()],
    
    // Before send hook (filter sensitive data)
    beforeSend(event, hint) {
      // Remove sensitive data
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
        }
      }
      
      return event;
    },
  });

  console.log('✅ Sentry initialized');
}

/**
 * Capture exception to Sentry.
 */
export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * Add breadcrumb for debugging context.
 */
export function addBreadcrumb(message: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    level: 'info',
    data,
  });
}

/**
 * Set user context (after authentication).
 */
export function setUser(userId: number, shopId: string) {
  Sentry.setUser({
    id: userId.toString(),
    shopId,
  });
}
```

Update `apps/api/src/server.ts`:

```typescript
import { initSentry } from './lib/sentry.js';

// Initialize Sentry BEFORE creating Fastify instance
initSentry();

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

// ... rest of server setup
```

Update `apps/api/src/middleware/errorHandler.ts`:

```typescript
import * as Sentry from '@sentry/node';

export async function errorHandler(
  error: Error | FastifyError | AppError,
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Log error
  request.log.error({ err: error }, 'Request error');
  
  // Send to Sentry (except for expected errors)
  if (!(error instanceof AppError) || error.statusCode >= 500) {
    Sentry.captureException(error, {
      extra: {
        url: request.url,
        method: request.method,
        params: request.params,
        query: request.query,
      },
    });
  }
  
  // ... rest of error handling
}
```

## Configure Frontend

Create `apps/web/src/lib/sentry.ts`:

```typescript
import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.log('Sentry DSN not configured');
    return;
  }

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    
    // Performance monitoring
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    
    // Sampling rates
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Ignore known errors
    ignoreErrors: [
      'ResizeObserver loop limit exceeded',
      'Non-Error promise rejection captured',
    ],
    
    // Before send hook
    beforeSend(event, hint) {
      // Don't send if in development
      if (import.meta.env.DEV) {
        console.error('Sentry error:', hint.originalException);
        return null;
      }
      
      return event;
    },
  });
}
```

Update `apps/web/src/main.tsx`:

```typescript
import { initSentry } from './lib/sentry';

// Initialize Sentry first
initSentry();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Wrap your app with Sentry Error Boundary:

```typescript
import * as Sentry from '@sentry/react';

function App() {
  return (
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <Router basename="/mineiro">
        {/* Your routes */}
      </Router>
    </Sentry.ErrorBoundary>
  );
}

function ErrorFallback() {
  return (
    <div>
      <h1>Something went wrong</h1>
      <button onClick={() => window.location.reload()}>
        Reload page
      </button>
    </div>
  );
}
```

## Environment Variables

### Backend (.env)

```bash
# Sentry DSN from backend project
SENTRY_DSN=https://xxx@o123.ingest.sentry.io/456
```

### Frontend (.env)

```bash
# Sentry DSN from frontend project
VITE_SENTRY_DSN=https://yyy@o123.ingest.sentry.io/789
```

## Add to env.ts

Update `apps/api/src/env.ts`:

```typescript
const envSchema = z.object({
  // ... existing vars
  SENTRY_DSN: z.string().url().optional(),
});
```

## Configure Alerts

In Sentry dashboard:

### 1. Alert Rules

Settings → Projects → eutonafila-api → Alerts → New Alert

**High Error Rate:**
```
When: errors
Occur: more than 10 times in 5 minutes
Then: send notification to admins
```

**New Error Type:**
```
When: new issue is created
Then: send notification to admins
```

### 2. Notification Settings

Settings → Account → Notifications:
- Email on new issues: ✅
- Email on regressions: ✅
- Digest frequency: Daily

### 3. Integrations (Optional)

Settings → Integrations:
- Slack: Get alerts in Slack channel
- Email: Forward to specific addresses

## Verify Setup

### Backend Test

Add temporary error in code:

```typescript
fastify.get('/test-error', async () => {
  throw new Error('Test Sentry error');
});
```

Visit `/test-error` and check Sentry dashboard.

### Frontend Test

Add to a component:

```typescript
function TestError() {
  return (
    <button onClick={() => {
      throw new Error('Test React error');
    }}>
      Test Error
    </button>
  );
}
```

Click button and check Sentry dashboard.

## Add Breadcrumbs for Context

### Backend

```typescript
import { addBreadcrumb } from './lib/sentry.js';

async function createTicket(shopId: number, data: CreateTicket) {
  addBreadcrumb('Creating ticket', { shopId, serviceId: data.serviceId });
  
  // ... ticket creation logic
  
  addBreadcrumb('Ticket created', { ticketId: ticket.id });
  return ticket;
}
```

### Frontend

```typescript
import * as Sentry from '@sentry/react';

function JoinQueue() {
  const handleSubmit = async (data) => {
    Sentry.addBreadcrumb({
      message: 'Joining queue',
      data: { serviceId: data.serviceId },
    });
    
    try {
      await api.createTicket('mineiro', data);
      Sentry.addBreadcrumb({ message: 'Successfully joined queue' });
    } catch (error) {
      // Error automatically sent to Sentry
    }
  };
}
```

## Source Maps (Optional)

For better stack traces in production:

### Backend

```bash
# Install plugin
pnpm add -D @sentry/cli

# Add to package.json
{
  "scripts": {
    "build": "tsc && sentry-cli sourcemaps upload --org your-org --project eutonafila-api ./dist"
  }
}
```

### Frontend

Install Vite plugin:

```bash
pnpm add -D @sentry/vite-plugin
```

Update `apps/web/vite.config.ts`:

```typescript
import { sentryVitePlugin } from '@sentry/vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    sentryVitePlugin({
      org: 'your-org',
      project: 'eutonafila-web',
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ],
  build: {
    sourcemap: true,
  },
});
```

## Performance Monitoring

Sentry can track:
- API response times
- Database query performance
- WebSocket connection issues
- Frontend render times

Already configured with `tracesSampleRate`.

View in Sentry → Performance tab.

## Session Replay (Optional)

See user sessions when errors occur:

Already configured in frontend with:
```typescript
Sentry.replayIntegration({
  maskAllText: false,
  blockAllMedia: false,
});
```

View in Sentry → Replays tab.

## Best Practices

1. **Don't send sensitive data**
   - Use `beforeSend` hook to filter
   - Remove passwords, tokens, personal info

2. **Set appropriate sample rates**
   - Production: 10% traces, 10% session replays
   - Development: 100% for testing

3. **Add context with breadcrumbs**
   - Track user actions before error
   - Include relevant IDs and states

4. **Ignore noise**
   - Filter out expected errors
   - Ignore browser extension errors

5. **Set up alerts**
   - Email on new error types
   - Slack for critical issues

6. **Review errors weekly**
   - Check for patterns
   - Fix most common issues first

## Costs

Free tier includes:
- 5,000 errors/month
- 10,000 performance units
- 50 session replays

For single barbershop, this is more than enough.

## Troubleshooting

**No errors appearing:**
- Check DSN is correct
- Verify `initSentry()` is called early
- Test with intentional error

**Too many errors:**
- Adjust `beforeSend` filter
- Increase `ignoreErrors` list
- Check for error loops

**Missing stack traces:**
- Enable source maps
- Upload source maps to Sentry
- Check build configuration

---

*Last updated: 2024*


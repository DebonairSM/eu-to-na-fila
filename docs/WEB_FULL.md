# Frontend Reference

React SPA documentation for EuToNaFila queue management system.

## Status: ✅ Complete (with noted limitations)

All core frontend functionality is implemented. Service management UI is pending.

## Tech Stack

- Framework: React 18
- Language: TypeScript
- Build: Vite
- Styling: Tailwind CSS
- Routing: React Router v6
- Icons: Material Symbols
- State: React Hooks + Context API
- Forms: Controlled components

## Project Structure

```
apps/web/
├── src/
│   ├── pages/              # Page components (9 pages)
│   │   ├── LandingPage.tsx
│   │   ├── JoinPage.tsx
│   │   ├── StatusPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── OwnerDashboard.tsx
│   │   ├── StaffPage.tsx
│   │   ├── BarberQueueManager.tsx
│   │   ├── AnalyticsPage.tsx
│   │   └── BarberManagementPage.tsx
│   ├── components/         # Reusable UI (14 components)
│   │   ├── Navigation.tsx
│   │   ├── QueueCard.tsx
│   │   ├── BarberCard.tsx
│   │   ├── BarberSelector.tsx
│   │   ├── Modal.tsx
│   │   ├── ConfirmationDialog.tsx
│   │   ├── QRCode.tsx
│   │   ├── WaitTimeDisplay.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── ErrorDisplay.tsx
│   │   ├── DailyChart.tsx
│   │   ├── HourlyChart.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── ui/             # shadcn/ui components
│   ├── hooks/              # Custom hooks (8 hooks)
│   │   ├── useQueue.ts
│   │   ├── useBarbers.ts
│   │   ├── useServices.ts
│   │   ├── useTicketStatus.ts
│   │   ├── useKiosk.ts
│   │   ├── useModal.ts
│   │   ├── usePolling.ts
│   │   ├── useProfanityFilter.ts
│   │   └── useAuth.ts
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx
│   ├── lib/                # Utilities
│   │   ├── api.ts          # API client
│   │   ├── config.ts       # App config
│   │   └── utils.ts        # Helpers
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Entry point
└── public/                 # Static assets, PWA
    ├── favicon.svg
    ├── manifest.json
    └── sw.js              # Service worker
```

## Routing

Base path: `/mineiro` (configured in Vite)

### Public Routes
| Route | Component | Description |
|-------|-----------|-------------|
| `/` | LandingPage | Marketing homepage |
| `/join` | JoinPage | Customer registration |
| `/status/:id` | StatusPage | Ticket status with polling |
| `/login` | LoginPage | PIN authentication |

### Protected Routes
| Route | Component | Access | Description |
|-------|-----------|--------|-------------|
| `/staff` | StaffPage | Auth required | Staff dashboard |
| `/owner` | OwnerDashboard | Owner only | Owner dashboard |
| `/manage` | BarberQueueManager | Auth required | Queue management + kiosk |
| `/analytics` | AnalyticsPage | Owner only | Analytics dashboard |
| `/barbers` | BarberManagementPage | Owner only | Barber CRUD |

**Missing:** Service management page (backend ready, frontend not implemented)

## Pages

### LandingPage
Marketing homepage with hero, services, about, location sections.

### JoinPage
Customer self-registration form with duplicate detection.

**Features:**
- First name (required, 2+ chars), last name (optional)
- Real-time profanity filter validation
- Shows current wait time before joining
- Combines names → `customerName` field
- Redirects to `/status/:id` on success
- Returns existing ticket if customer already in queue

**Hooks:** `useQueue`, `useProfanityFilter`  
**API:** `POST /api/shops/:slug/tickets`

### StatusPage
Live ticket status display with 3-second polling.

**States:**
- **Waiting:** Large wait time, position badge, leave button
- **In Progress:** "Você está sendo atendido!" message
- **Completed:** Success message, return home button

**Hooks:** `useTicketStatus`, `useQueue`  
**API:** `GET /api/tickets/:id`, `DELETE /api/tickets/:id` (leave)

### LoginPage
PIN-based authentication with role-based redirect.

**Features:**
- Username field (display only, not validated)
- Password field (PIN input) with visibility toggle
- Role redirect: owner → `/owner`, staff → `/manage`
- Demo credentials: `admin/admin123`, `barber/barber123`

**Hook:** `useAuth`  
**API:** `POST /api/shops/:slug/auth`

### OwnerDashboard
Navigation hub for owners with 3 cards:
- "Gerenciar Fila" → `/manage`
- "Analytics" → `/analytics`
- "Gerenciar Barbeiros" → `/barbers`

**Note:** No link to manage services (UI not implemented)

### StaffPage
Navigation hub for staff with cards:
- "Gerenciar Fila" → `/manage`
- "Modo Kiosk" → `/manage?kiosk=true`
- Conditionally shows owner cards if user is owner

### BarberQueueManager
Dual-mode interface: Management + Kiosk.

**Management Mode:**
- Header stats: waiting count, serving count
- "Adicionar Cliente" button → check-in modal
- Queue list with customer cards
- Click card → barber selector modal
- Badge actions: X (remove), ✓ (complete)
- Barber presence section (toggle present/absent)
- TV icon → enter kiosk

**Kiosk Mode:**
- Fullscreen dark display (#0A0A0A background)
- Large queue list (responsive grid)
- QR code (bottom-right corner)
- Ad rotation: Queue (15s) → Ad (10s) → repeat
- Touch ad → skip to queue
- Idle timer: 10s → return to rotation
- Gear icon (top-left) → exit kiosk
- All management actions still available

**Hooks:** `useQueue`, `useBarbers`, `useModal`, `useKiosk`, `useProfanityFilter`

### AnalyticsPage
Owner-only statistics dashboard.

**Features:**
- Period selector: 7, 30, 90 days
- Summary: total, completed, cancelled, completion rate, avg/day
- Daily chart (last 7 days)
- Hourly chart (24 hours) with peak hour highlight
- Barber performance table

**Components:** `DailyChart`, `HourlyChart`  
**API:** `GET /api/shops/:slug/analytics?days=30`

### BarberManagementPage
Owner-only barber CRUD interface.

**Features:**
- Barber list with avatars
- Add button → create modal (name, avatarUrl)
- Click avatar → edit modal
- Remove button → confirmation dialog
- Shows presence status (Presente/Ausente)

**API:**
- `GET /api/shops/:slug/barbers`
- `POST /api/shops/:slug/barbers`
- `PATCH /api/barbers/:id`
- `DELETE /api/barbers/:id`

## Custom Hooks

### useQueue(intervalMs?: number)
Polls queue data at specified interval (default: no polling).

```typescript
const { data, isLoading, error, refetch } = useQueue(5000);
// data: { shop, tickets }
```

### useTicketStatus(ticketId: string)
Polls ticket status every 3 seconds.

```typescript
const { ticket, isLoading, error } = useTicketStatus(ticketId);
```

### useBarbers()
Fetches and manages barber data.

```typescript
const { barbers, togglePresence, refetch } = useBarbers();
```

### useServices()
Fetches service list (active services filtered).

```typescript
const { services, activeServices, isLoading, error, refetch, getServiceById } = useServices();
```

**Note:** Missing CRUD methods (create, update, delete) - backend ready, frontend not implemented.

### useKiosk()
Manages kiosk mode state and ad rotation.

```typescript
const { 
  isKioskMode, 
  enterKioskMode, 
  exitKioskMode,
  currentView, // 'queue' | 'ad1' | 'ad2' | 'ad3'
  progress // 0-100 for progress bar
} = useKiosk();
```

### useModal()
Simple modal state management.

```typescript
const modal = useModal();
// modal.isOpen, modal.open(), modal.close()
```

### useProfanityFilter()
Client-side name validation (profanity check).

```typescript
const { validate } = useProfanityFilter();
const result = validate(name); // { isValid: boolean, error?: string }
```

### useAuth()
Authentication context access.

```typescript
const { user, isAuthenticated, isOwner, login, logout } = useAuthContext();
```

## API Client

Centralized client in `lib/api.ts`:

### Queue Endpoints
```typescript
await api.getQueue(slug)           // GetQueueResponse
await api.getMetrics(slug)         // GetMetricsResponse
await api.getStatistics(slug, since?) // GetStatisticsResponse
```

### Ticket Endpoints
```typescript
await api.createTicket(slug, { customerName, serviceId, customerPhone? })
await api.getTicket(id)
await api.updateTicketStatus(id, { status, barberId? })
await api.updateTicket(id, { barberId?, status? })
await api.cancelTicket(id)            // Public - customer self-cancel
await api.cancelTicketAsStaff(id)     // Requires auth
```

### Barber Endpoints
```typescript
await api.getBarbers(slug)
await api.createBarber(slug, { name, avatarUrl? })
await api.updateBarber(id, { name?, avatarUrl? })
await api.deleteBarber(id)
await api.toggleBarberPresence(id, isPresent)
```

### Service Endpoints
```typescript
await api.getServices(slug)  // ⚠️ Returns Service[] directly

// ❌ NOT IMPLEMENTED IN FRONTEND:
// await api.createService(slug, { name, duration, price?, description?, isActive? })
// await api.updateService(id, { ...fields })
// await api.deleteService(id)
```

**Issue:** `getServices()` wraps response in `{ services: [] }` but backend returns array directly. Should be:
```typescript
// Current (incorrect):
const response = await this.get<{ services: Service[] }>(`/shops/${shopSlug}/services`);
return response.services;

// Should be:
return this.get<Service[]>(`/shops/${shopSlug}/services`);
```

### Auth Endpoints
```typescript
await api.authenticate(slug, pin)  // { valid, role, token }
// Automatically stores token in sessionStorage
```

### Analytics Endpoints
```typescript
await api.getAnalytics(slug, days?)
```

## CSS Architecture

### Tailwind CSS
Utility-first framework with custom theme.

**Custom Colors:**
- Primary: `#D4AF37` (gold)
- Success: `#22c55e` (green)
- Error: `#ef4444` (red)
- Background (dark): `#0a0a0a`, `#1a1a1a`
- Background (light): `#ffffff`, `#f8f9fa`

**Breakpoints:**
- `sm:` 640px+
- `md:` 768px+
- `lg:` 1024px+
- `xl:` 1280px+
- `2xl:` 1536px+

**Example:**
```tsx
<div className="p-4 sm:p-6 lg:p-8 bg-[#1a1a1a] text-white rounded-lg">
  Content
</div>
```

### Global Styles
`styles/globals.css` defines CSS variables:
```css
:root {
  --primary: #D4AF37;
  --background: #0a0a0a;
  --foreground: #ffffff;
}
```

## React Patterns

### State Management
```typescript
// Local state
const [firstName, setFirstName] = useState('');

// Global auth state
const { user, isAuthenticated } = useAuthContext();
```

### Polling Pattern
```typescript
useEffect(() => {
  const interval = setInterval(() => {
    refetch();
  }, intervalMs);
  
  return () => clearInterval(interval);
}, [intervalMs, refetch]);
```

### Error Handling
```typescript
try {
  const ticket = await api.createTicket(slug, data);
  navigate(`/status/${ticket.id}`);
} catch (error) {
  if (error instanceof ApiError) {
    setError(error.message);
    if (error.isValidationError()) {
      console.log(error.getFieldErrors());
    }
  } else {
    setError('Erro inesperado');
  }
}
```

### Loading States
```tsx
{isLoading ? (
  <LoadingSpinner size="lg" text="Carregando..." />
) : error ? (
  <ErrorDisplay error={error} onRetry={refetch} />
) : (
  <Content data={data} />
)}
```

## External Dependencies

### Google Fonts
Loaded in `index.html`:
- Roboto (300, 400, 500, 700)
- Inter (300, 400, 500, 600)
- Playfair Display (400, 600, 700, 900)

### Material Symbols
Outlined icons, loaded in `index.html`:
```tsx
<span className="material-symbols-outlined">content_cut</span>
```

**Icon Sizes:**
- Small: 16px - Inline text
- Medium: 20px - Buttons
- Large: 24px - Headers
- XLarge: 32px - Emphasis
- XXLarge: 48px - Kiosk mode

### QR Code Generation
QR Server API:
```typescript
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}`;
```

Implemented in `QRCode` component.

## Build & Deploy

### Development
```bash
pnpm dev  # Starts Vite dev server on port 4040
```

Access: http://localhost:4040/mineiro

### Production Build
```bash
pnpm build:web      # Builds to dist/
pnpm integrate:web  # Copies to apps/api/public/
```

Output: `apps/api/public/` (served by API server)

### Vite Config
- Base path: `/mineiro/`
- Output directory: `dist/`
- SPA fallback: `index.html`

## PWA Support

Progressive Web App features:
- Service worker: `public/sw.js`
- Manifest: `public/manifest.json`
- Offline caching (queue data)
- Install prompt support
- Auto-updates on deployment

**Installation (Android):**
1. Open Chrome
2. Navigate to app URL
3. Menu (⋮) → "Add to Home screen"
4. Launches fullscreen like native app

See `public/PWA_SETUP.md` for details.

## Browser Support

**Desktop:**
- Chrome (latest)
- Safari (latest)
- Firefox (latest)
- Edge (latest)

**Mobile:**
- Chrome for Android
- Safari for iOS

**Optimal Devices:**
- Desktop: Management, analytics
- Tablet (768px+): Queue management, kiosk
- Mobile: Customer pages (join, status)

## Configuration

`lib/config.ts`:
```typescript
export const config = {
  slug: 'mineiro',
  name: 'Barbearia Mineiro',
  apiBase: '/api', // Relative to same origin
  theme: {
    primary: '#3E2723',
    accent: '#FFD54F',
  },
};
```

## Known Limitations

1. **Service Management UI Missing:**
   - Backend CRUD endpoints complete
   - Frontend missing: ServiceManagementPage, API methods, Owner Dashboard link
   - Workaround: Manage via API directly or database

2. **API Client Issue:**
   - `getServices()` incorrectly wraps response in `{ services: [] }`
   - Backend returns `Service[]` directly
   - Fix: Remove wrapper in api.ts line 383-386

3. **Single Language:**
   - Portuguese only (no i18n)

4. **No Real-time Updates:**
   - Uses polling (3s, 5s intervals)
   - Consider WebSocket for production

5. **No Offline Ticket Creation:**
   - PWA caches read-only data
   - Cannot create tickets offline

# Frontend Reference

Complete frontend documentation for EuToNaFila queue management system.

> **Note:** The HTML mockups in the `mockups/` directory are deprecated. The production application uses a React app built with Vite and TypeScript.

## Implementation Status

**Status:** ✅ Fully Implemented

All core frontend functionality is complete and operational. The frontend provides:

- ✅ Complete customer flow (join, status, leave)
- ✅ Staff queue management interface
- ✅ Kiosk mode with ad rotation
- ✅ Authentication and role-based access
- ✅ Analytics dashboard
- ✅ Barber management
- ✅ Responsive design for all devices
- ✅ Real-time polling and updates

### Pages Status

| Page | Status | Notes |
|------|--------|-------|
| Landing Page | ✅ Complete | Marketing homepage |
| Join Page | ✅ Complete | Customer registration |
| Status Page | ✅ Complete | Ticket status with polling |
| Login Page | ✅ Complete | PIN-based authentication |
| Owner Dashboard | ✅ Complete | Navigation hub |
| Staff Dashboard | ✅ Complete | Navigation hub |
| Queue Manager | ✅ Complete | Management + Kiosk modes |
| Analytics Page | ✅ Complete | Statistics dashboard |
| Barber Management | ✅ Complete | CRUD operations |

---

## Technology Stack

| Component | Technology |
|-----------|------------|
| Framework | React 18 |
| Language | TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Routing | React Router v6 |
| Icons | Material Symbols |
| Fonts | Google Fonts (Roboto, Inter, Playfair Display) |
| QR Codes | QR Server API |
| State Management | React Hooks + Context API |

Build step required: `pnpm build` (production) or `pnpm dev` (development).

---

## Project Structure

```
apps/web/
├── src/
│   ├── pages/              # Page components
│   │   ├── LandingPage.tsx
│   │   ├── JoinPage.tsx
│   │   ├── StatusPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── OwnerDashboard.tsx
│   │   ├── StaffPage.tsx
│   │   ├── BarberQueueManager.tsx
│   │   ├── AnalyticsPage.tsx
│   │   └── BarberManagementPage.tsx
│   ├── components/         # Reusable components
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
│   │   └── ui/             # shadcn/ui components
│   ├── hooks/              # Custom React hooks
│   │   ├── useQueue.ts
│   │   ├── useBarbers.ts
│   │   ├── useTicketStatus.ts
│   │   ├── useKiosk.ts
│   │   ├── useModal.ts
│   │   ├── usePolling.ts
│   │   └── useProfanityFilter.ts
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx
│   ├── lib/                # Utilities
│   │   ├── api.ts
│   │   ├── config.ts
│   │   └── utils.ts
│   ├── styles/
│   │   └── globals.css
│   ├── App.tsx             # Main app component
│   └── main.tsx            # Entry point
├── public/                 # Static assets
│   ├── favicon.svg
│   ├── manifest.json
│   └── sw.js              # Service worker
├── index.html
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

## Routing

The app uses React Router with a base path of `/mineiro`. All routes are relative to this base.

### Public Routes

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `LandingPage` | Marketing landing page |
| `/join` | `JoinPage` | Customer registration form |
| `/status/:id` | `StatusPage` | Customer ticket status |
| `/login` | `LoginPage` | Staff authentication |

### Protected Routes

| Route | Component | Access | Description |
|-------|-----------|--------|-------------|
| `/staff` | `StaffPage` | Authenticated | Staff dashboard |
| `/owner` | `OwnerDashboard` | Owner only | Owner dashboard |
| `/manage` | `BarberQueueManager` | Authenticated | Queue management + kiosk |
| `/analytics` | `AnalyticsPage` | Owner only | Analytics and statistics |
| `/barbers` | `BarberManagementPage` | Owner only | Barber management |

---

## Pages

### LandingPage - Landing Page

Full marketing website with multiple sections.

**URL:** `/mineiro/` (base path `/`)

**Features:**
- Hero section with call-to-action
- Services section (Corte, Barba, Corte + Barba)
- About section
- Location section with Google Maps embed
- CTA sections
- Navigation component

**Components:**
- `Navigation` - Site navigation
- `Button` - CTA buttons
- `Card` - Service cards

---

### JoinPage - Join Queue

Customer self-registration form.

**URL:** `/mineiro/join`

**Features:**
- First name input (required, min 2 chars)
- Last name input (optional)
- Current wait time display (calculated from queue)
- Real-time validation
- Profanity filter
- Redirects to `/mineiro/status/:id` on success

**Hooks Used:**
- `useQueue` - Polls queue data every 30s
- `useProfanityFilter` - Validates customer names

**API Integration:**
```typescript
// On form submit - firstName and lastName are combined into customerName
POST /api/shops/:slug/tickets
{
  "customerName": "João Silva",  // Combined from firstName + lastName
  "serviceId": 1  // Required, default service
}
```

**State:**
- `firstName` - First name input
- `lastName` - Last name input
- `validationError` - Validation error message
- `isSubmitting` - Loading state
- `submitError` - API error message

**Note:** The frontend collects first name and last name separately for better UX, but combines them into a single `customerName` field before sending to the API. The API expects a single `customerName` field (1-200 characters).

---

### StatusPage - Ticket Status

Individual customer status display with auto-updates.

**URL:** `/mineiro/status/:id`

**Features:**
- Large wait time display (minutes, calculated)
- Position in queue display
- Status badge (Aguardando, Em Atendimento, Concluído)
- Leave queue button with confirmation dialog
- Auto-polling for updates (3 second interval)
- State transitions with visual feedback

**States:**
1. **Waiting** - Shows wait time, position, leave button
2. **In Progress** - "Você está sendo atendido!" message
3. **Completed** - Success message, return to home button

**Hooks Used:**
- `useTicketStatus` - Polls ticket status every 3s
- `useQueue` - Gets queue data for wait time calculation

**API Integration:**
```typescript
// Poll for updates
GET /api/tickets/:id

// Leave queue
DELETE /api/tickets/:id
```

---

### LoginPage - Staff Login

Authentication page for staff access.

**URL:** `/mineiro/login`

**Features:**
- Username/email field (for display purposes)
- Password field (used as PIN input) with visibility toggle
- Loading state during authentication
- Error message display
- Role-based redirect after login
- "Forgot password" placeholder link
- Demo credentials display

**Redirects:**
- Owner → `/mineiro/owner` (OwnerDashboard)
- Barber → `/mineiro/manage` (BarberQueueManager)

**API Integration:**
```typescript
// Authentication (PIN-based)
POST /api/shops/:slug/auth
{
  "pin": "1234"  // PIN from password field
}

// Returns:
{
  "valid": true,
  "role": "owner" | "staff"
}
```

**Note:** Authentication is PIN-based. The password field is used to enter the PIN. The implementation includes demo credential mapping for backward compatibility (username/password → PIN conversion): `admin/admin123` maps to owner PIN `1234`, `barber/barber123` maps to staff PIN `0000`. In production, users should enter the PIN directly.

---

### OwnerDashboard - Owner Dashboard

Navigation hub for shop owners.

**URL:** `/mineiro/owner`

**Features:**
- Welcome message with user name
- Three navigation cards:
  - "Gerenciar Fila" → `/mineiro/manage`
  - "Analytics" → `/mineiro/analytics`
  - "Gerenciar Barbeiros" → `/mineiro/barbers`
- Logout button

**Access Control:**
- Protected route requiring owner role
- Redirects to `/mineiro/staff` if not owner

---

### StaffPage - Staff Dashboard

Navigation hub for staff members.

**URL:** `/mineiro/staff`

**Features:**
- Welcome message with user name
- Navigation cards:
  - "Gerenciar Fila" → `/mineiro/manage`
  - "Modo Kiosk" → `/mineiro/manage?kiosk=true`
  - Conditionally shows owner-only options if user is owner:
    - "Analytics" → `/mineiro/analytics`
    - "Gerenciar Barbeiros" → `/mineiro/barbers`
- Logout button

**Access Control:**
- Protected route requiring authentication
- Shows owner features if user has owner role

---

### BarberQueueManager - Queue Management

Main staff interface with dual modes: Management and Kiosk.

**URL:** `/mineiro/manage`

**Query Parameters:**
- `?kiosk=true` - Automatically enters kiosk mode

#### Management Mode

Default view for queue operations.

**Features:**
- Header with statistics (waiting count, serving count)
- "Adicionar Cliente" button → check-in modal
- Queue list with customer cards
- Click customer card → barber selection modal
- Position badge actions → remove (waiting) or complete (serving)
- Barber avatars show assignment
- Barber presence section (toggle present/absent)
- TV icon → enter kiosk mode
- Back arrow → owner/staff dashboard

**Components:**
- `QueueCard` - Customer queue card
- `BarberCard` - Barber presence card
- `BarberSelector` - Barber selection modal
- `Modal` - Check-in modal
- `ConfirmationDialog` - Remove/complete confirmations

**Hooks Used:**
- `useQueue` - Polls queue every 5s
- `useBarbers` - Manages barber data
- `useModal` - Modal state management
- `useKiosk` - Kiosk mode state
- `useProfanityFilter` - Name validation

#### Kiosk Mode

Fullscreen display for shop TV/tablet.

**Features:**
- Dark background for visibility
- Large queue list with customer names
- Position numbers (checkmark for serving)
- Barber name shown inline
- QR code in corner for self-registration
- "Barbearia Mineiro" button → check-in modal
- Barber presence selector at bottom
- Ad rotation between queue views
- Touch ad to return to queue view
- Idle timer returns to ad rotation
- Settings icon → exit kiosk mode

**Ad Rotation Timing:**
```
Queue (15s) → Ad 1 (10s) → Queue (15s) → Ad 2 (10s) → Queue (15s) → Ad 3 (10s) → ...
```

**Hooks Used:**
- `useKiosk` - Manages kiosk state and rotation

**API Integration:**
```typescript
// Get queue
GET /api/shops/:slug/queue

// Get barbers
GET /api/shops/:slug/barbers

// Add customer
POST /api/shops/:slug/tickets
{ "customerName": "João Silva", "serviceId": 1 }  // serviceId is required

// Start service (assign barber)
PATCH /api/tickets/:id
{ "barberId": 3, "status": "in_progress" }

// Or use status endpoint
PATCH /api/tickets/:id/status
{ "status": "in_progress", "barberId": 3 }

// Complete service
PATCH /api/tickets/:id
{ "status": "completed" }

// Remove customer
DELETE /api/tickets/:id

// Toggle barber presence
PATCH /api/barbers/:id/presence
{ "isPresent": false }
```

---

### AnalyticsPage - Analytics Dashboard

Statistics and metrics dashboard for owners.

**URL:** `/mineiro/analytics`

**Features:**
- Period selector (7, 30, 90 days)
- Summary statistics:
  - Total tickets
  - Completed tickets
  - Cancelled tickets
  - Completion rate
  - Average per day
  - Average service time
- Daily chart (tickets by day)
- Hourly chart (tickets by hour)
- Peak hour display
- Barber performance stats

**Access Control:**
- Owner only
- Redirects to `/mineiro/staff` if not owner

**Components:**
- `DailyChart` - Daily ticket distribution
- `HourlyChart` - Hourly ticket distribution

**API Integration:**
```typescript
// Get analytics
GET /api/shops/:slug/analytics?days=30
```

---

### BarberManagementPage - Barber Management

Manage barbers (add, edit, remove).

**URL:** `/mineiro/barbers`

**Features:**
- List of all barbers
- Add barber button → add modal
- Edit barber (click avatar) → edit modal
- Remove barber → confirmation dialog
- Barber presence status display
- Barber stats (placeholder)

**Access Control:**
- Owner only
- Redirects to `/mineiro/staff` if not owner

**API Integration:**
```typescript
// Get barbers
GET /api/shops/:slug/barbers

// Create barber
POST /api/shops/:slug/barbers
{ "name": "João", "avatarUrl": "https://..." }

// Update barber
PATCH /api/barbers/:id
{ "name": "João Silva", "avatarUrl": "https://..." }

// Delete barber
DELETE /api/barbers/:id
```

---

## Components

### ErrorDisplay

Error display component with retry functionality.

**Props:**
- `error: Error | string` - Error to display
- `onRetry?: () => void` - Optional retry callback
- `className?: string` - Optional CSS classes

**Usage:**
```tsx
<ErrorDisplay
  error={error}
  onRetry={() => refetch()}
/>
```

**Features:**
- Displays error icon and message
- Shows retry button if `onRetry` provided
- Accessible with `role="alert"`

---

### LoadingSpinner

Loading state component with customizable size and text.

**Props:**
- `size?: 'sm' | 'md' | 'lg'` - Spinner size (default: 'md')
- `text?: string` - Optional loading text
- `className?: string` - Optional CSS classes

**Usage:**
```tsx
<LoadingSpinner size="lg" text="Carregando..." />
```

**Features:**
- Animated spinner
- Optional loading text
- Accessible with `role="status"` and `aria-label`

---

### DailyChart

Chart component for displaying daily ticket distribution.

**Props:**
- `data: Record<string, number>` - Daily ticket counts keyed by date (YYYY-MM-DD)

**Usage:**
```tsx
<DailyChart data={data.ticketsByDay} />
```

**Features:**
- Bar chart showing last 7 days
- Hover tooltips with values
- Responsive design
- Gradient bars (gold theme)

---

### HourlyChart

Chart component for displaying hourly ticket distribution.

**Props:**
- `data: Record<number, number>` - Hourly ticket counts keyed by hour (0-23)
- `peakHour: { hour: number; count: number } | null` - Peak hour highlight

**Usage:**
```tsx
<HourlyChart 
  data={data.hourlyDistribution} 
  peakHour={data.peakHour} 
/>
```

**Features:**
- Bar chart showing 24 hours
- Highlights peak hour with gold ring
- Hover tooltips with values
- Responsive grid layout

---

## External Dependencies

### Google Fonts

Loaded in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&display=swap" rel="stylesheet">
```

### Material Symbols

Loaded in `index.html`:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
```

Usage in React:
```tsx
<span className="material-symbols-outlined">content_cut</span>
```

### QR Code Generation

Using QR Server API:
```typescript
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}`;
```

Implemented in `QRCode` component.

---

## CSS Architecture

### Tailwind CSS

The application uses Tailwind CSS for styling. Configuration in `tailwind.config.js`.

**Key Features:**
- Utility-first CSS framework
- Responsive design with breakpoint prefixes (`sm:`, `md:`, `lg:`, etc.)
- Dark theme by default
- Custom color palette:
  - Primary: `#D4AF37` (gold)
  - Success: `#22c55e` (green)
  - Error: `#ef4444` (red)

**Responsive Breakpoints:**
- `sm:` - 640px and up
- `md:` - 768px and up
- `lg:` - 1024px and up
- `xl:` - 1280px and up
- `2xl:` - 1536px and up

**Example:**
```tsx
<div className="p-4 sm:p-6 lg:p-8 bg-[#1a1a1a] text-white">
  Content
</div>
```

### Custom CSS Variables

Some custom properties in `globals.css`:
```css
:root {
  --primary: #D4AF37;
  --background: #0a0a0a;
  --foreground: #ffffff;
}
```

---

## React Patterns

### State Management

React hooks for component state:

```typescript
// Component state
const [firstName, setFirstName] = useState('');
const [isLoading, setIsLoading] = useState(false);

// Context for global state
const { user, isAuthenticated, login } = useAuthContext();
```

### Custom Hooks

Reusable logic in custom hooks:

```typescript
// Queue data with polling
const { data, isLoading, error, refetch } = useQueue(5000);

// Ticket status with polling
const { ticket, isLoading, error } = useTicketStatus(ticketId);

// Barber management
const { barbers, togglePresence, refetch } = useBarbers();

// Modal state
const modal = useModal();
// modal.isOpen, modal.open(), modal.close()

// Kiosk mode
const { isKioskMode, enterKioskMode, exitKioskMode } = useKiosk();
```

### Component Rendering

React component-based rendering:

```tsx
function QueueList({ tickets }: { tickets: Ticket[] }) {
  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <QueueCard key={ticket.id} ticket={ticket} />
      ))}
    </div>
  );
}
```

### Event Handling

React event handlers:

```tsx
<button
  onClick={async () => {
    setIsLoading(true);
    try {
      await api.createTicket(slug, { customerName });
      navigate(`/status/${ticket.id}`);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }}
>
  Submit
</button>
```

### Polling

Custom hook for polling:

```typescript
// usePolling hook
const { data, isLoading } = useQueue(3000); // Poll every 3s

// Implementation uses useEffect + setInterval
useEffect(() => {
  const interval = setInterval(() => {
    refetch();
  }, intervalMs);
  return () => clearInterval(interval);
}, []);
```

### Modal Pattern

Modal component with hook:

```tsx
const modal = useModal();

<Modal
  isOpen={modal.isOpen}
  onClose={modal.close}
  title="Add Customer"
>
  {/* Modal content */}
</Modal>
```

---

## API Integration

### API Client

Centralized API client in `lib/api.ts`:

```typescript
import { api } from '@/lib/api';
import { config } from '@/lib/config';

// Create ticket
const ticket = await api.createTicket(config.slug, {
  customerName: 'João Silva',
  serviceId: 1,
});

// Get queue
const queue = await api.getQueue(config.slug);

// Update ticket
await api.updateTicket(ticketId, {
  status: 'in_progress',
  barberId: 3,
});

// Cancel ticket
await api.cancelTicket(ticketId);
```

### Error Handling

Error handling with React error boundaries and try/catch:

```typescript
try {
  const ticket = await api.createTicket(slug, data);
  navigate(`/status/${ticket.id}`);
} catch (error) {
  if (error instanceof Error) {
    setError(error.message);
  } else if (error?.error) {
    setError(error.error);
  } else {
    setError('Erro ao criar ticket. Tente novamente.');
  }
}
```

### Loading States

Loading states with custom component:

```tsx
{isLoading ? (
  <LoadingSpinner size="lg" text="Carregando..." />
) : error ? (
  <ErrorDisplay error={error} onRetry={refetch} />
) : (
  <QueueList tickets={data.tickets} />
)}
```

---

## Authentication

### Auth Context

Global authentication state via React Context:

```typescript
const { user, isAuthenticated, isOwner, login, logout } = useAuthContext();
```

### Protected Routes

Route protection with `ProtectedRoute` component:

```tsx
<Route
  path="/owner"
  element={
    <ProtectedRoute requireOwner>
      <OwnerDashboard />
    </ProtectedRoute>
  }
/>
```

### Authentication Flow

1. User enters PIN on `/login`
2. API validates PIN: `POST /api/shops/:slug/auth`
3. Context stores user data and role
4. Redirect based on role:
   - Owner → `/owner`
   - Barber → `/manage`

---

## Deployment

### Build Process

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Production build
pnpm build
```

### Static File Serving

The built app is served from `/mineiro/` path by the API server.

**Vite Configuration:**
- Base path: `/mineiro/`
- Output directory: `dist/`
- SPA fallback: `index.html`

### Production Checklist

- [x] API base URL configured (`/api`)
- [x] All API calls integrated
- [x] CORS configured on backend
- [x] Error handling implemented
- [x] Loading states for all async operations
- [x] Responsive design tested
- [x] QR code URLs point to production
- [x] Service worker configured (PWA)
- [x] Authentication flow working
- [x] Protected routes working

### Environment Configuration

Configuration in `lib/config.ts`:

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

---

## Browser Support

Tested and supported:
- Chrome (latest)
- Safari (latest)
- Firefox (latest)
- Edge (latest)

Mobile browsers:
- Chrome for Android
- Safari for iOS

Target devices:
- Desktop browsers (management)
- Android tablets (kiosk mode)
- Mobile phones (customer pages)

---

## PWA Support

The application includes Progressive Web App (PWA) support:

- Service worker (`public/sw.js`)
- Web app manifest (`public/manifest.json`)
- Offline caching
- Install prompt support

See `public/PWA_SETUP.md` for details.

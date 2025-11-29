# Frontend Reference

Complete frontend documentation for EuToNaFila queue management system.

## Technology Stack

| Component | Technology |
|-----------|------------|
| Markup | HTML5 |
| Styling | CSS3 (no preprocessor) |
| Scripts | Vanilla JavaScript |
| Icons | Material Symbols |
| Fonts | Google Fonts (Roboto, Inter, Playfair Display) |
| QR Codes | QR Server API |

No build step required. Files are served statically.

---

## Project Structure

```
mockups/
├── index.html              # Landing page / navigation hub
├── queue-join.html         # Customer registration form
├── customer-status.html    # Customer ticket status
├── login-modal.html        # Staff authentication
├── owner-dashboard.html    # Owner navigation
├── barber-queue-manager.html # Queue management + kiosk mode
└── favicon.svg             # App icon
```

---

## Pages

### index.html - Landing Page

Navigation hub with links to main features.

**Features:**
- "Entrar na Fila" card → queue-join.html
- "Entrar (Staff)" card → login-modal.html
- "Gerenciar Fila" card → barber-queue-manager.html (direct access for development)

**URL:** `/` or `/index.html`

---

### queue-join.html - Join Queue

Customer self-registration form.

**Features:**
- First name input (required, min 2 chars)
- Last name input (optional)
- Current wait time display
- Real-time validation
- Profanity filter
- Redirects to customer-status.html on success

**URL:** `/queue-join.html` or via QR code scan

**API Integration:**
```javascript
// On form submit
POST /api/shops/:slug/tickets
{
  "customerName": "João Silva"
}
```

---

### customer-status.html - Ticket Status

Individual customer status display.

**Features:**
- Large wait time display (minutes)
- Status badge (Aguardando, Em Atendimento, Concluído)
- Leave queue button with confirmation
- Auto-polling for updates (3 second interval)
- State transitions with visual feedback

**URL:** `/customer-status.html?id=:ticketId`

**States:**
1. **Waiting** - Shows wait time, leave button available
2. **In Progress** - "Você está sendo atendido!" message
3. **Completed** - Success message, return to home button

**API Integration:**
```javascript
// Poll for updates
GET /api/tickets/:id

// Leave queue
DELETE /api/tickets/:id
```

---

### login-modal.html - Staff Login

Authentication modal for staff access.

**Features:**
- Username/email field
- Password field with visibility toggle
- Loading state during authentication
- Error message display
- Role-based redirect after login
- "Forgot password" placeholder link

**URL:** `/login-modal.html`

**Redirects:**
- Owner (`admin`) → owner-dashboard.html
- Barber (`barber`) → barber-queue-manager.html

**API Integration:**
```javascript
// Login
POST /api/auth/login
{
  "username": "admin",
  "password": "admin123"
}
```

---

### owner-dashboard.html - Owner Dashboard

Navigation hub for shop owners.

**Features:**
- Welcome message with user name
- "Gerenciar Fila" card → barber-queue-manager.html
- Logout button → index.html

**URL:** `/owner-dashboard.html`

---

### barber-queue-manager.html - Queue Management

Main staff interface with dual modes.

**URL:** `/barber-queue-manager.html`

#### Management Mode

Default view for queue operations.

**Features:**
- Header with statistics (waiting count, serving count)
- "Adicionar Cliente" button → check-in modal
- Queue list with customer cards
- Click customer card → barber selection overlay
- Position badge click → remove (waiting) or complete (serving)
- Barber avatars show assignment
- Barber presence section (toggle present/absent)
- TV icon → enter kiosk mode
- Back arrow → owner dashboard

**Components:**
- Queue cards with customer name, position badge, barber avatar
- Barber selection overlay (grid of present barbers)
- Check-in modal (name input form)
- Confirmation modals (remove, complete)

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
- Gear icon → exit kiosk mode
- Escape key → exit kiosk mode

**Ad Rotation Timing:**
```
Ad 1 (10s) → Queue (15s) → Ad 2 (10s) → Queue (15s) → ...
```

**API Integration:**
```javascript
// Get queue
GET /api/shops/:slug/queue

// Get barbers
GET /api/shops/:slug/barbers

// Add customer
POST /api/shops/:slug/tickets
{ "customerName": "João Silva" }

// Start service (assign barber)
PATCH /api/tickets/:id/status
{ "status": "in_progress", "barberId": 3 }

// Complete service
PATCH /api/tickets/:id/status
{ "status": "completed" }

// Remove customer
DELETE /api/tickets/:id

// Toggle barber presence
PATCH /api/barbers/:id/presence
{ "isPresent": false }
```

---

## External Dependencies

### Google Fonts

```html
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&display=swap" rel="stylesheet">
```

### Material Symbols

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0" />
```

Usage:
```html
<span class="material-symbols-outlined">content_cut</span>
```

### QR Code Generation

Using QR Server API:
```javascript
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(url)}`;
```

---

## CSS Architecture

### CSS Variables

All pages use CSS custom properties for theming:

```css
:root {
  /* Primary Colors */
  --md-sys-color-primary: #D4AF37;
  --md-sys-color-on-primary: #FFFFFF;
  
  /* Surface Colors */
  --md-sys-color-surface: #FFFFFF;
  --md-sys-color-on-surface: #1D1B20;
  
  /* Status Colors */
  --md-sys-color-success: #10B981;
  --md-sys-color-error: #EF4444;
  
  /* Spacing */
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  
  /* Border Radius */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
}
```

### Responsive Breakpoints

```css
/* Mobile */
@media (max-width: 480px) { }

/* Small mobile */
@media (max-width: 375px) { }

/* Tablet */
@media (max-width: 768px) { }

/* Desktop */
@media (max-width: 1024px) { }

/* Large screens */
@media (min-width: 1400px) { }
@media (min-width: 1600px) { }
@media (min-width: 1920px) { }

/* Orientation */
@media (orientation: portrait) { }
@media (orientation: landscape) { }
```

---

## JavaScript Patterns

### State Management

Each page manages its own state with plain objects:

```javascript
// Queue data
let queueData = [
  { id: 1, name: 'Carlos Silva', status: 'serving', barberId: 1 },
  { id: 2, name: 'João Santos', status: 'waiting', barberId: null }
];

// Barber data
const barbers = [
  { id: 1, name: 'João', avatar: 'url', isPresent: true }
];
```

### Rendering

DOM updates via innerHTML replacement:

```javascript
function renderQueue() {
  const list = document.getElementById('queueList');
  list.innerHTML = '';
  
  queueData.forEach(customer => {
    const item = document.createElement('div');
    item.className = 'queue-item';
    item.innerHTML = `...`;
    list.appendChild(item);
  });
}
```

### Event Handling

Event delegation for dynamic content:

```javascript
document.addEventListener('click', function(e) {
  const card = e.target.closest('.queue-item');
  if (card) {
    const customerId = parseInt(card.dataset.customerId);
    showBarberSelection(customerId);
  }
});
```

### Polling

Simple setInterval for updates:

```javascript
setInterval(() => {
  fetchTicketStatus();
}, 3000);
```

### Modal Pattern

```javascript
function showModal(modalId) {
  document.getElementById(modalId).classList.add('show');
}

function hideModal(modalId) {
  document.getElementById(modalId).classList.remove('show');
}

// Close on backdrop click
modal.addEventListener('click', (e) => {
  if (e.target === modal) hideModal(modalId);
});

// Close on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') hideModal(modalId);
});
```

---

## API Integration

### Converting Mock Data to Real API

Current mockups use hardcoded data. To connect to real backend:

1. **Replace mock data initialization:**
```javascript
// Before (mock)
let queueData = [{ id: 1, name: 'Carlos', ... }];

// After (API)
let queueData = [];
async function loadQueue() {
  const response = await fetch('/api/shops/mineiro/queue');
  const data = await response.json();
  queueData = data.tickets;
  renderQueue();
}
```

2. **Replace mock actions with API calls:**
```javascript
// Before (mock)
function removeCustomer(id) {
  queueData = queueData.filter(c => c.id !== id);
  renderAll();
}

// After (API)
async function removeCustomer(id) {
  await fetch(`/api/tickets/${id}`, { method: 'DELETE' });
  await loadQueue();
}
```

3. **Add error handling:**
```javascript
async function apiCall(url, options = {}) {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message);
    }
    return response.json();
  } catch (error) {
    showError(error.message);
    throw error;
  }
}
```

---

## Deployment

### Static File Serving

Files can be served by any static file server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (serve package)
npx serve mockups

# Using nginx, Apache, Caddy, etc.
```

### Production Checklist

- [ ] Update API base URL in each file
- [ ] Replace mock data with API calls
- [ ] Configure CORS on backend
- [ ] Set up proper error handling
- [ ] Test on target devices (tablets, phones)
- [ ] Verify QR code URLs point to production

### Environment-Specific URLs

```javascript
// Development
const API_BASE = 'http://localhost:4041';

// Production
const API_BASE = 'https://api.eutonafila.com';

// Or detect automatically
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:4041' 
  : '';
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

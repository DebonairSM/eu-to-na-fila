# User Stories

User interactions and implementation status for EuToNaFila queue management system.

## Status Summary

| Category | Status |
|----------|--------|
| Customer Flow | ✅ Complete (4/4) |
| Staff Management | ✅ Complete (7/7) |
| Kiosk Mode | ✅ Complete (5/5) |
| Authentication | ✅ Complete (2/2) |
| Admin Features | 🟡 Partial (2/3) |
| Future Features | ⏳ Planned (4/4) |
| **Total** | **✅ 20/21 Core + 4 Future** |

---

## Customer Stories

### US-001: Join Queue ✅

**As a** customer  
**I want to** join the queue via web or QR code  
**So that** I can wait for my turn

**Implementation:**
- Form: first name (required, 2+ chars), last name (optional)
- Profanity filter validation
- Real-time wait time display
- Duplicate check: returns existing ticket if already in queue
- Redirect to status page after join

**Endpoint:** `POST /api/shops/:slug/tickets`

---

### US-002: Check Queue Status ✅

**As a** customer  
**I want to** see my position and wait time  
**So that** I know when I'll be served

**Implementation:**
- Large wait time display (minutes)
- Status badge: Aguardando / Em Atendimento / Concluído
- Auto-refresh every 3 seconds
- Shows position in queue

**Endpoint:** `GET /api/tickets/:id`

---

### US-003: Leave Queue ✅

**As a** customer  
**I want to** remove myself from queue  
**So that** I can leave if needed

**Implementation:**
- "Sair da Fila" button (waiting status only)
- Confirmation modal
- Status changes to cancelled
- Redirect to home

**Endpoint:** `DELETE /api/tickets/:id`

---

### US-004: Prevent Duplicate Entry ✅

**As a** customer  
**I want to** be notified if I'm already in queue  
**So that** I don't create duplicates

**Implementation:**
- Backend checks for active tickets with same name
- Returns existing ticket (200) instead of creating new one (201)
- Shows current position and wait time
- Duplicate check by customerName + shopId

**Technical:** Implemented in `POST /api/shops/:slug/tickets` (lines 54-60 of tickets.ts)

---

## Staff Stories

### US-005: View Queue ✅

**As a** staff member  
**I want to** see the current queue  
**So that** I know who to serve next

**Implementation:**
- Queue list with customer cards
- Header stats: waiting count, serving count
- Position badges, barber avatars
- Sorted: serving first, then by order
- Polling: 5 seconds

---

### US-006: Start Service ✅

**As a** staff member  
**I want to** assign customer to barber  
**So that** they know their turn has come

**Implementation:**
- Click customer card → barber selector modal
- Shows present barbers only
- Sets status to in_progress
- Recalculates queue positions

**Endpoint:** `PATCH /api/tickets/:id`

---

### US-007: Complete Service ✅

**As a** staff member  
**I want to** mark service as complete  
**So that** customer knows they're done

**Implementation:**
- Click checkmark badge on serving customer
- Confirmation modal
- Status changes to completed
- Removes from queue display

**Endpoint:** `PATCH /api/tickets/:id/status`

---

### US-008: Remove Customer ✅

**As a** staff member  
**I want to** remove absent customers  
**So that** queue keeps moving

**Implementation:**
- Click X badge on waiting customer
- Confirmation modal
- Status changes to cancelled
- Queue recalculates

**Endpoint:** `DELETE /api/tickets/:id`

---

### US-009: Add Customer (Check-in) ✅

**As a** staff member  
**I want to** add customers without phones  
**So that** everyone can join

**Implementation:**
- "Adicionar Cliente" button → modal
- First/last name inputs
- Same validation as customer self-join
- Duplicate check applies here too
- Added to end of queue

---

### US-010: Change Barber Assignment ✅

**As a** staff member  
**I want to** reassign customers  
**So that** I can balance workload

**Implementation:**
- Click customer card → barber selector
- Shows current barber as "Atual"
- Can unassign (return to waiting)
- Can reassign to different barber

---

### US-011: Toggle Barber Presence ✅

**As a** staff member  
**I want to** mark barbers as present/absent  
**So that** wait times are accurate

**Implementation:**
- "Barbeiros Presentes" section in queue manager
- Click to toggle presence
- Absent barbers: unassign all in_progress customers, return to waiting
- Present barbers: available for assignment

**Endpoint:** `PATCH /api/barbers/:id/presence`  
**Side effect:** Sets barberId=null, status=waiting for all in_progress tickets

---

## Kiosk Stories

### US-012: Display Queue ✅

**As a** display screen  
**I want to** show current queue  
**So that** customers see their position

**Implementation:**
- Large format, dark background (#0A0A0A)
- Position number or checkmark (in_progress)
- Customer name + barber name
- Responsive grid: 3 cols (large), 2 cols (medium), 1 col (small)

---

### US-013: Kiosk Mode Toggle ✅

**As a** staff member  
**I want to** toggle kiosk mode  
**So that** I can use device for both purposes

**Implementation:**
- TV icon button to enter kiosk
- Fullscreen display
- Gear icon (top-left) to exit
- ESC key to exit

---

### US-014: Ad Rotation ✅

**As an** owner  
**I want to** display ads between queue views  
**So that** I can promote services

**Implementation:**
- Rotation: Queue (15s) → Ad (10s) → Queue (15s) → Ad (10s) → repeat
- 3 ad slots (hardcoded content)
- Progress bar shows duration
- Touch ad to skip to queue

---

### US-15: Kiosk Touch Interaction ✅

**As a** staff member  
**I want to** interact from kiosk mode  
**So that** I don't switch modes frequently

**Implementation:**
- Touch ad → show queue immediately
- Idle timer: 10s of inactivity returns to rotation
- Queue items clickable for barber assignment
- Barber presence toggleable from bottom bar
- Check-in and complete actions available

---

### US-016: QR Code Display ✅

**As a** customer  
**I want to** scan QR code to join  
**So that** I can register from phone

**Implementation:**
- QR code in corner of kiosk (bottom-right)
- Links to join page URL
- Visible on both queue and ad views
- Generated via QR Server API

---

## Authentication Stories

### US-017: Staff Login ✅

**As a** staff member  
**I want to** log in with PIN  
**So that** I can manage queue

**Implementation:**
- PIN-based authentication
- JWT token issued (24h expiry, HS256)
- Token stored in sessionStorage
- Role-based redirect: owner → /owner, staff → /manage
- Demo credentials for backward compatibility (admin/admin123, barber/barber123)

**Endpoint:** `POST /api/shops/:slug/auth`

---

### US-018: Owner Dashboard ✅

**As an** owner  
**I want to** access admin functions  
**So that** I can manage my shop

**Implementation:**
- Navigation hub with 3 cards:
  - "Gerenciar Fila" → `/manage`
  - "Analytics" → `/analytics`
  - "Gerenciar Barbeiros" → `/barbers`
- Logout button
- Responsive grid layout

**Note:** Service management UI not yet implemented (see US-021)

---

## Admin Stories

### US-019: View Analytics ✅

**As an** owner  
**I want to** view queue statistics  
**So that** I can optimize staffing

**Implementation:**
- Period selector: 7, 30, 90 days
- Summary stats: total, completed, cancelled, avg per day, completion rate
- Daily chart (last 7 days), hourly chart (24 hours)
- Peak hour display
- Barber performance metrics

**Endpoint:** `GET /api/shops/:slug/analytics?days=30`

---

### US-020: Manage Barbers ✅

**As an** owner  
**I want to** add/edit/remove barbers  
**So that** I can maintain staff list

**Implementation:**
- Barber list with avatars and status
- Add button → create modal (name, avatarUrl)
- Click avatar → edit modal
- Remove button → confirmation dialog
- Shows presence status (Presente/Ausente)
- New barbers default to isPresent=false

**Endpoints:**
- `GET /api/shops/:slug/barbers` - List barbers
- `POST /api/shops/:slug/barbers` - Create barber (owner only)
- `PATCH /api/barbers/:id` - Update details (owner only)
- `DELETE /api/barbers/:id` - Delete barber (owner only)

**Side effect on delete:** Unassigns all tickets (barberId=null, status=waiting)

---

### US-021: Manage Services 🟡

**As an** owner  
**I want to** create/edit/remove services  
**So that** I can update offerings

**Status:** Backend ✅ Complete | Frontend ❌ Not Implemented

**Backend Implementation:**
- Service CRUD endpoints fully functional
- Name, description, duration (required), price (optional), isActive
- Cannot delete if in use by active tickets (waiting/in_progress)
- Validation: name 1-200 chars, description max 500 chars

**Endpoints:**
- `GET /api/shops/:slug/services` - List services ✅
- `POST /api/shops/:slug/services` - Create service (owner only) ✅
- `PATCH /api/services/:id` - Update service (owner only) ✅
- `DELETE /api/services/:id` - Delete service (owner only) ✅

**Missing Frontend:**
- Service management page
- API client methods (createService, updateService, deleteService)
- Link from Owner Dashboard
- UI for CRUD operations

**Workaround:** Services currently managed directly via API or database.

---

## Future Stories

### US-F01: Service Selection at Join ⏳

**As a** customer  
**I want to** select service when joining  
**So that** shop knows what I need

*Currently: Default service (ID=1) assigned, service discussed in person with barber*

---

### US-F02: Barber assignment

**As a** customer  
**I want to** be assigned to any available barber  
**So that** I am served in order

*Barbers are assigned by staff based on availability. Queue entry does not allow choosing a preferred barber; the join page shows which barbers are active for information only.*

---

### US-F03: Notifications ⏳

**As a** customer  
**I want to** receive notifications  
**So that** I know when I'm next

*Potential: SMS, push notifications, or browser notifications*  
*Requires: Notification service integration*

---

### US-F04: Appointments ⏳

**As a** customer  
**I want to** book specific time  
**So that** I don't wait in line

*Would require: Calendar system, time slot management, booking conflicts*

---

## Technical Requirements

### Polling Intervals
- Customer status page: 3s
- Staff queue view: 5s  
- Kiosk display: Updates on action (not polling)

### Confirmation Dialogs
- Leave queue (customer)
- Remove customer (staff)
- Complete service (staff)
- Delete barber (owner)
- Delete service (owner) - backend only

### Access Control

**Public (no auth):**
- Join queue, view queue, view status, list services, list barbers, book appointments

**Customer (logged in):**
- Self check-in for own appointments (status page), manage account

**Staff + Owner:**
- Manage queue, update tickets, toggle presence, create appointments (no customer check-in)

**Owner only:**
- View analytics, manage barbers, manage services (API only)

### Mobile Support
- Customer pages: Mobile-first responsive
- Staff pages: Tablet-optimized (minimum 768px width recommended)
- Kiosk: Large screen (tablet/TV, 1024px+)

### Error Handling
- Network failures: Retry with exponential backoff
- Validation errors: Inline feedback with field highlighting
- Server errors: User-friendly messages, technical details logged

---

## Performance Targets

| Metric | Target |
|--------|--------|
| API response | < 200ms |
| Status page polling | 3s interval |
| Queue page polling | 5s interval |
| Kiosk queue view | 15s display |
| Kiosk ad view | 10s display |
| Max concurrent users | ~30 |
| Max queue size | 50 tickets |
| Database queries | < 50ms |

---

## Known Limitations

1. **Service Management UI:** Backend complete, frontend UI not implemented
2. **Single Tenant:** Currently supports one shop per deployment
3. **No Multi-language:** Portuguese only (localization keys exist for pt-BR and en)
4. **Email:** Appointment reminders supported (Gmail API or SMTP)
5. **Appointments:** Supported - booking, slots, customer self check-in (logged-in customers only)

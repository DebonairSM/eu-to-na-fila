# User Stories

All user interactions supported by the queue management system.

## Actors

| Actor | Description |
|-------|-------------|
| Customer | Person joining and monitoring their queue position |
| Staff | Barber managing the queue and serving customers |
| Owner | Shop owner with administrative access |
| Display | Read-only kiosk showing queue status |

---

## Customer Stories

### US-001: Join Queue

**As a** customer  
**I want to** join the barbershop queue  
**So that** I can wait for my turn to be served

**Acceptance Criteria:**
- Customer navigates to shop URL or scans QR code
- System displays current estimated wait time before registration
- Customer enters their first name (required, minimum 2 characters)
- Customer enters last name (optional)
- System validates name is not empty and not too short
- System filters inappropriate/profane names
- Frontend combines first name and last name into single `customerName` field
- System creates ticket with status `waiting` and required `serviceId`
- System calculates queue position and estimated wait time
- Customer is redirected to status page with their ticket

**Validation Rules:**
- First name: required, minimum 2 characters
- Last name: optional
- Combined customerName: 1-200 characters (validated before API call)
- Profanity filter applied to full name
- Real-time validation feedback as user types

**Technical Notes:**
- POST /api/shops/:slug/tickets
- API receives single `customerName` field (frontend combines first/last name)
- `serviceId` is required (default service ID used if not selected)

---

### US-002: Check Queue Status

**As a** customer  
**I want to** see my position in the queue  
**So that** I know how long until I'm served

**Acceptance Criteria:**
- Customer views their status page (`/status/:ticketId`)
- Page displays prominently:
  - Estimated wait time in minutes (large, central display)
  - Customer name
  - Status badge showing current state
- Status states:
  - `waiting` - "Aguardando" with clock icon
  - `in_progress` - "Em Atendimento" with scissors icon
  - `completed` - "Concluído" with checkmark icon
- Page polls for updates every 3 seconds
- Wait time updates when queue changes
- Transitions between states shown with visual feedback

**Status Display States:**
1. **Waiting State:**
   - Large wait time display with minutes unit
   - "Leave Queue" button available
   
2. **In Progress State:**
   - "Você está sendo atendido!" message
   - No action buttons
   
3. **Completed State:**
   - "Atendimento concluído!" message
   - "Voltar ao Início" button to return home

**Calculation:**
```
Estimated wait = (average service time × people ahead) / active barbers
```

---

### US-003: Leave Queue

**As a** customer  
**I want to** remove myself from the queue  
**So that** I can leave if I no longer want to wait

**Acceptance Criteria:**
- Customer views their status page
- Customer clicks "Sair da Fila" (Leave Queue) button
- System shows confirmation modal:
  - Icon indicating action
  - "Sair da Fila?" title
  - Confirm/Cancel buttons
- On confirmation:
  - Ticket status changes to `cancelled`
  - Success message displayed
  - Customer redirected to home page
- Other customers' positions are updated
- Customer can rejoin later if needed

**Restrictions:**
- Cannot leave if already being served (status `in_progress`)
- Leave button hidden when not in `waiting` status

---

## Staff Stories

### US-004: View Queue

**As a** staff member  
**I want to** see the current queue  
**So that** I know who to serve next

**Acceptance Criteria:**
- Staff views queue management page
- Header displays:
  - Shop name and icon
  - Waiting count statistic
  - Serving count statistic
  - Kiosk mode toggle button
  - Back to dashboard link
- Queue list shows:
  - Customer cards with name
  - Position badge (serving customers show checkmark)
  - Assigned barber avatar (if assigned)
- Cards sorted: serving customers first, then waiting by order
- List updates when changes occur

---

### US-005: Start Service

**As a** staff member  
**I want to** start serving a customer  
**So that** they know their turn has come

**Acceptance Criteria:**
- Staff clicks on a waiting customer's card
- Barber selection overlay appears showing:
  - Customer name
  - Grid of present barbers with avatars
  - Only present barbers are selectable
- Staff selects a barber
- System assigns barber and changes status to `in_progress`
- Customer's status page shows "Em Atendimento"
- Queue positions recalculated for remaining waiting customers

**State Change:**
```
waiting → in_progress (with barber assignment)
```

---

### US-006: Complete Service

**As a** staff member  
**I want to** mark a service as complete  
**So that** the customer knows they're done

**Acceptance Criteria:**
- Staff views in-progress customer (shown with green checkmark badge)
- Staff clicks the checkmark badge
- System shows confirmation modal:
  - "Finalizar Atendimento" title
  - Customer name displayed
  - Confirm/Cancel buttons
- On confirmation:
  - Ticket status changes to `completed`
  - Completion timestamp recorded
  - Customer removed from queue display
  - Customer's status page shows "Concluído"
  - Barber becomes available

**State Change:**
```
in_progress → completed
```

---

### US-007: Remove Customer

**As a** staff member  
**I want to** remove a customer from the queue  
**So that** absent customers don't hold up the line

**Acceptance Criteria:**
- Staff identifies customer to remove (waiting status)
- Staff clicks remove button (X icon on position badge)
- System shows confirmation modal:
  - "Remover da Fila" title
  - Customer name displayed
  - Confirm/Cancel buttons
- On confirmation:
  - Ticket status changes to `cancelled`
  - Customer removed from queue display
  - Queue positions recalculated

**Use Cases:**
- Customer not present when called
- Customer requests to leave
- Duplicate ticket removal

---

### US-008: Add Customer (Staff Check-in)

**As a** staff member  
**I want to** add a customer to the queue directly  
**So that** customers without phones can join

**Acceptance Criteria:**
- Staff clicks "Adicionar Cliente" button
- Check-in modal appears with:
  - "Entrar na Fila" title
  - First name input (required)
  - Last name input (optional)
  - Cancel and Submit buttons
- Staff enters customer name
- On submit:
  - Frontend combines first name and last name into `customerName`
  - Customer added to end of queue with required `serviceId`
  - Status set to `waiting`
  - Modal closes
  - Queue display updates

**Validation:**
- First name required, minimum 2 characters
- Last name optional
- Combined customerName: 1-200 characters
- Same validation as customer self-registration

---

### US-009: Change Barber Assignment

**As a** staff member  
**I want to** change which barber is serving a customer  
**So that** I can reassign when needed

**Acceptance Criteria:**
- Staff clicks on a customer card (waiting or serving)
- Barber selection overlay appears
- If customer already has assigned barber:
  - Current barber marked as "Atual"
  - Clicking current barber unassigns them (returns customer to waiting)
- Selecting different barber reassigns and sets to serving
- Only present barbers shown in selection

**State Changes:**
```
serving (barber A) → serving (barber B)  // Reassign
serving (barber A) → waiting (no barber)  // Unassign
waiting → serving (barber)  // Assign
```

---

### US-010: Toggle Barber Presence

**As a** staff member  
**I want to** mark barbers as present or absent  
**So that** wait times are calculated correctly

**Acceptance Criteria:**
- Staff views "Barbeiros Presentes" section
- Each barber shown with:
  - Avatar photo
  - Name
  - Presence status (Presente/Ausente)
  - Visual indicator (checkmark for present, grayed out for absent)
- Staff clicks barber to toggle presence
- When barber marked as absent:
  - All customers assigned to that barber are unassigned
  - Those serving customers return to `waiting` status
  - Wait time calculations update
- When barber marked as present:
  - Barber becomes available for assignment

---

## Kiosk Stories

### US-011: Display Queue

**As a** display screen  
**I want to** show the current queue  
**So that** customers in the shop can see their position

**Acceptance Criteria:**
- Display shows queue in large, readable format
- Each entry shows:
  - Position number (or checkmark for serving)
  - Customer name
  - Assigned barber name (if any)
- Serving customers shown at bottom with different styling
- Waiting customers listed in order
- Large text readable from distance
- Dark background for better visibility
- Auto-refreshes to show current state

---

### US-012: Kiosk Mode Toggle

**As a** staff member  
**I want to** toggle kiosk mode  
**So that** I can use the same device for management and display

**Acceptance Criteria:**
- Staff clicks TV icon to enter kiosk mode
- Display switches to fullscreen
- Back button (gear icon) visible in corner to exit
- Queue view shows with large format
- Barber presence selector visible at bottom
- QR code displayed in corner for customer self-registration
- Press Escape key or click back button to exit

---

### US-013: Kiosk Ad Rotation

**As a** shop owner  
**I want to** display advertisements between queue views  
**So that** I can promote services while customers wait

**Acceptance Criteria:**
- Kiosk mode rotates between views automatically
- Rotation pattern: Ad1 → Queue → Ad2 → Queue → Ad3 → Queue → repeat
- Progress bar shows current view duration
- Queue view duration: 15 seconds
- Ad view duration: 10 seconds each
- Ads display:
  - Service promotions
  - Business hours
  - Products available
  - QR code in corner

**Timing:**
```
Queue View (15s) → Ad 1 (10s) → Queue View (15s) → Ad 2 (10s) → Queue View (15s) → Ad 3 (10s) → [repeat]
```

---

### US-014: Kiosk Touch Interaction

**As a** staff member viewing kiosk  
**I want to** interact with the queue from kiosk mode  
**So that** I don't need to switch modes frequently

**Acceptance Criteria:**
- Touching/clicking on ad view immediately shows queue view
- When manually viewing queue, idle timer starts (10 seconds)
- If no interaction for 10 seconds, returns to ad rotation
- Queue items clickable to show barber selection
- Barber presence toggleable from bottom selector
- Check-in button allows adding customers directly
- Remove/Complete buttons on customer cards work

---

### US-015: Kiosk QR Code

**As a** customer  
**I want to** scan a QR code to join the queue  
**So that** I can register without talking to staff

**Acceptance Criteria:**
- QR code displayed in corner of kiosk queue view
- QR code links to queue-join page
- Scanning with phone opens registration form
- Customer can join queue from their device
- Also displayed on ad views for visibility

---

## Authentication Stories

### US-016: Staff Login

**As a** staff member  
**I want to** log in to the system  
**So that** I can manage the queue

**Acceptance Criteria:**
- Staff navigates to login page
- Form displays:
  - Username/email field (for display/demo purposes)
  - Password field (used to enter PIN) with visibility toggle
  - Cancel and Login buttons
  - "Forgot password" link (placeholder)
- Staff enters PIN (via password field)
- Loading state shown during authentication
- Successful login:
  - Success message shown briefly
  - Redirect based on role
- Failed login:
  - Error message displayed
  - Form remains for retry
- Close button returns to previous page

**Role-Based Redirect:**
- Owner role → Owner Dashboard (`/owner`)
- Staff role → Queue Management (`/manage`)

**Authentication:**
- PIN-based authentication via `POST /api/shops/:slug/auth`
- Owner PIN grants `owner` role (full access)
- Staff PIN grants `staff` role (queue management only)

**Demo Credentials (for backward compatibility):**
- `admin` / `admin123` → Maps to owner PIN `1234`
- `barber` / `barber123` → Maps to staff PIN `0000`
- In production, users should enter PIN directly

---

### US-017: Owner Dashboard

**As a** shop owner  
**I want to** access administrative functions  
**So that** I can manage my barbershop

**Acceptance Criteria:**
- Owner sees dashboard after login
- Dashboard displays:
  - Welcome message with user name
  - "Gerenciar Fila" card linking to queue management
  - Logout button
- Clicking queue management navigates to barber-queue-manager
- Clicking logout returns to home page

---

## Future Stories

### US-F01: Service Selection

**As a** customer  
**I want to** select my desired service  
**So that** the shop knows what I need

*Currently handled in-person with barber*

---

### US-F02: Barber Preference

**As a** customer  
**I want to** choose my preferred barber  
**So that** I'm served by who I prefer

---

### US-F03: Notifications

**As a** customer  
**I want to** receive a notification  
**So that** I know when I'm next

---

### US-F04: Analytics

**As a** shop owner  
**I want to** view queue statistics  
**So that** I can optimize staffing

---

### US-F05: Appointments

**As a** customer  
**I want to** book a specific time  
**So that** I don't have to wait in line

---

## Technical Requirements

### Real-Time Updates

All queue modifications trigger updates:
- Customer status pages: Poll every 3 seconds
- Staff management: Updates on action
- Kiosk display: Updates on action, rotation timer independent

### Confirmation Dialogs

Actions requiring confirmation:
- Customer leaving queue
- Staff removing customer
- Staff completing service

### Error Handling

Standard errors across all stories:
- Network issues: Retry with backoff
- Invalid input: Display validation messages
- Resource not found: User-friendly error
- Server errors: Log and display generic message

### Mobile Support

All customer stories work on:
- Desktop browsers
- Mobile phones (iOS, Android)
- Tablets via PWA

Staff management optimized for:
- Desktop browsers
- Tablet devices

### Offline Support

When network unavailable:
- Recently viewed data remains visible
- Forms disabled with message
- Reconnects automatically

---

## UI Components

### Modals

| Modal | Trigger | Contents |
|-------|---------|----------|
| Check-in | "Adicionar Cliente" button | Name fields, Cancel/Submit |
| Confirmation | Remove/Complete actions | Icon, Title, Message, Cancel/Confirm |
| Barber Selection | Click customer card | Customer name, Barber grid |
| Alert | Various actions | Icon, Title, Message, OK button |

### Status Badges

| Status | Badge Color | Icon | Label |
|--------|-------------|------|-------|
| waiting | Gold/Amber | schedule | Aguardando |
| in_progress | Green | cut | Em Atendimento |
| completed | Green solid | check_circle | Concluído |
| cancelled | - | - | (not displayed) |

---

## Performance Targets

| Metric | Target |
|--------|--------|
| API response time | < 200ms |
| Status page polling | 3 seconds |
| Kiosk queue view | 15 seconds |
| Kiosk ad view | 10 seconds |
| Idle timeout | 10 seconds |
| Max concurrent users | ~30 |
| Max queue size | 50 tickets |

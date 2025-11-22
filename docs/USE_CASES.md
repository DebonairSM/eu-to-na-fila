# Use Cases

This document describes all user interactions supported by the queue management system.

## Overview

The system supports three types of users:
- **Customer**: Person joining and monitoring their position in the queue
- **Barber/Staff**: Person managing the queue and updating ticket status
- **Display**: Read-only view showing queue status with advertisements

## 1. Join the Queue (Customer)

**Actor**: Customer

**Preconditions**:
- Customer has access to the shop's URL (e.g., `https://eutonafila.com/mineiro`)
- Shop is active and accepting new customers

**Steps**:
1. Customer navigates to the join page
2. System displays a simple form with one field
3. Customer enters their name
4. Customer submits the form
5. System validates the input (name is required, 1-200 characters)
6. System creates a new ticket with status `waiting`
7. System calculates queue position and estimated wait time
8. System redirects customer to status page showing ticket details

**Postconditions**:
- Ticket is created in the database
- Customer receives a ticket ID
- Queue positions for all waiting tickets are recalculated
- All connected clients receive queue update

**Alternative Flow**:
- If validation fails, system displays error message and customer corrects input
- If shop queue is full, system displays error

**Note**: Service selection is handled in-person with the barber. The system only needs the customer name to manage the queue.

## 2. Check Queue Status (Customer)

**Actor**: Customer

**Preconditions**:
- Customer has a valid ticket ID

**Steps**:
1. Customer navigates to status page (`/status/:ticketId`)
2. System fetches ticket details from API
3. System displays:
   - Estimated wait time (calculated as: average service time × position / active barbers) - displayed prominently in large format
   - Customer name
   - Current status (waiting, in progress, completed, cancelled)
4. System polls API every 30 seconds for updates
5. System only visually updates display when queue data actually changes (smart diffing)

**Postconditions**:
- Customer has current information about their estimated wait time

**Calculation Details**:
- Estimated wait time = (average cutting time × number of people ahead) / total active barbers
- Wait time updates automatically when other customers are served or leave
- Wait time decreases as queue moves forward
- Display focuses on estimated wait time displayed prominently (position number is not shown to customers)

## 3. Start Service (Staff)

**Actor**: Barber/Staff

**Preconditions**:
- Staff has access to queue management interface
- At least one customer with status `waiting` exists in the queue
- Barber is available to serve a customer

**Steps**:
1. Staff views current queue on management page
2. System displays waiting customers in order (showing only position number and name)
3. Staff identifies next customer to serve (typically first in queue)
4. Staff clicks "Start Service" or "Atender" button
5. System updates ticket status from `waiting` to `in_progress`
6. System assigns barber ID to the ticket (if applicable)
7. System sets ticket position to 0 (no longer in queue)
8. System recalculates queue positions for remaining waiting customers
9. System broadcasts update to all connected clients
10. Customer's status page shows "In Progress"

**Postconditions**:
- Ticket status is `in_progress`
- Barber is assigned to ticket
- Customer knows they are being served
- Queue positions updated for waiting customers
- Other customers see updated wait times

**Alternative Flow - Call by Name**:
- Staff can call out customer name displayed on screen
- Customer approaches barber chair
- Staff then marks as started in system

**UI Considerations**:
- "Next Customer" button prominently displayed
- Clear visual distinction between waiting and in-progress tickets
- Quick action for high-volume environments
- May show customer name in large text when starting service

## 4. Complete Service (Staff)

**Actor**: Barber/Staff

**Preconditions**:
- Staff has access to queue management interface
- Ticket status is `in_progress`
- Haircut/service is finished

**Steps**:
1. Barber finishes providing service to customer
2. Staff views active tickets on management page
3. System displays in-progress tickets (customers currently being served)
4. Staff identifies the completed customer's ticket
5. Staff clicks "Complete" or "Finish" button
6. System updates ticket status from `in_progress` to `completed`
7. System records completion timestamp
8. System broadcasts update to all connected clients
9. Customer's status page shows "Completed"
10. Barber is now available for next customer

**Postconditions**:
- Ticket status is `completed`
- Ticket is removed from active queue display
- Service duration is recorded (for analytics)
- Barber becomes available for next customer
- Historical data is preserved for analytics

**Alternative Flow - Mark Multiple**:
- If a barber finishes while another is calling next customer
- Can complete ticket without immediately starting a new one

**Analytics Data Captured**:
- Service start time (from use case #3)
- Service completion time
- Total service duration
- Barber who provided service
- Time of day completed

**Implementation Notes**:
- Completed tickets remain in database for analytics
- May archive tickets after a retention period (e.g., 90 days)
- Consider showing "Completed" status to customer briefly before allowing them to leave

## 5. Remove Customer from Queue (Staff)

**Actor**: Barber/Staff

**Preconditions**:
- Staff has access to queue management interface
- Target ticket exists in the queue

**Steps**:
1. Staff views current queue on management page
2. Staff identifies customer to remove
3. Staff clicks remove/cancel button for that ticket
4. System confirms the action
5. System updates ticket status to `cancelled`
6. System recalculates queue positions for remaining customers
7. System broadcasts update to all connected clients

**Postconditions**:
- Ticket status is `cancelled`
- Customer is removed from active queue
- Queue positions are updated for all waiting customers
- Removed customer sees cancellation on their status page

**Use Cases**:
- Customer is not present when called
- Customer requests to leave the queue
- Duplicate ticket needs removal

## 6. Adjust Active Barber Count (Staff)

**Actor**: Barber/Staff

**Preconditions**:
- Staff has access to shop configuration

**Steps**:
1. Staff navigates to settings or queue management page
2. System displays current number of active barbers
3. Staff increments or decrements the barber count
4. System validates the number (must be > 0)
5. System updates active barber count
6. System recalculates estimated wait times for all waiting tickets
7. System broadcasts updates to all connected clients

**Postconditions**:
- Active barber count is updated
- Wait time estimates reflect new barber availability
- All customers see updated wait times

**Note**: This use case adjusts the number only, not individual barber records in the database.

## 7. Leave the Queue (Customer Self-Service)

**Actor**: Customer

**Preconditions**:
- Customer has a valid ticket ID
- Ticket status is `waiting`

**Steps**:
1. Customer views their status page
2. Customer clicks "Leave Queue" or "Cancel" button
3. System requests confirmation
4. Customer confirms cancellation
5. System updates ticket status to `cancelled`
6. System recalculates queue positions
7. System displays confirmation message

**Postconditions**:
- Customer's ticket is cancelled
- Customer is removed from queue
- Other customers' positions are updated
- Customer can join again if needed

**Alternative Flow**:
- If customer is already being served (status `in_progress`), system may prevent cancellation or require staff confirmation

## 8. Mark Arrival (Customer) - ARCHIVED

**Status**: This feature has been removed from the current implementation. It may be re-added in a future version.

**Note**: The "I Have Arrived" button was removed from the customer status page to simplify the interface. Customers can still be called by name when their turn arrives.

## 9. View Analytics (Staff) - ARCHIVED

**Status**: This feature has been archived for future implementation. The analytics page mockup is available in `mockups/archive/analytics.html`.

**Note**: Analytics functionality is planned for a later phase of development. The owner dashboard currently only provides access to queue management.

## 10. Unified Queue Display with Kiosk Mode

**Actor**: Staff (Barber/Owner) or Display Screen

**Preconditions**:
- Staff has access to queue management interface
- For kiosk mode: device is connected to internet and can display fullscreen

**Steps**:
1. Staff navigates to queue management page
2. System displays queue in **Management Mode**:
   - Simple list showing position number and customer name only
   - Statistics (waiting count, serving count)
   - Barber selector to choose which barber is claiming customers
   - Action buttons: Start Service, Complete Service, Remove
3. Staff clicks TV icon button to toggle **Kiosk Mode**
4. System switches to fullscreen kiosk display
5. **Back button** appears in top-left corner (always visible) to exit kiosk mode
6. System alternates between two views:
   - **Queue View** (15 seconds):
     - Shows up to 6 customers
     - Displays position number and name only
     - Large, readable format for visibility from distance
     - Highlights customers currently being served
     - **"Atender" button** on each customer card to toggle service status (turns green when serving)
     - Barber selector visible at bottom
   - **Advertisement View** (10 seconds per ad):
     - Shop promotional content
     - Barbershop branding
     - Services offered
     - Special promotions
     - Three advertisement slides rotate
     - Barber selector hidden during ads
7. System automatically rotates between queue and ads in a loop
8. Queue data refreshes every 30 seconds via polling (only visually updates when data changes)
9. Barber selector is visible at bottom during queue view (hidden during ads)
10. Barbers can select themselves and click customers to claim them
11. Staff can press ESC key or click back button to exit kiosk mode

**Postconditions**:
- Customers in shop can see current queue status regularly
- Shop displays promotional content between queue updates
- Staff can toggle between management and kiosk modes
- Barbers can claim customers directly from kiosk display

**Display Characteristics**:
- Large font sizes for visibility from distance
- High contrast colors (dark background, gold accents)
- Smooth transitions between queue and ad views
- Fullscreen mode (auto-enters fullscreen)
- Progress bar shows rotation timing
- Shows only essential information: position + name
- Barber selector at bottom (only visible during queue view)
- Clickable customer cards when barber is selected
- "Atender" button on each customer to toggle service status
- Back button in top-left corner (always visible) to exit kiosk mode
- **Check-in button** in bottom-right corner to open quick login modal
- **QR code** in top-right corner linking to join page for mobile check-in
- Fully responsive design that adapts to different screen sizes

**Rotation Example**:
```
1. Queue View (15s) → 
2. Ad 1 (10s) → 
3. Ad 2 (10s) → 
4. Ad 3 (10s) → 
5. Queue View (15s) → 
6. [repeat]
```

**Implementation Notes**:
- Single unified page serves both management and display purposes
- Toggle between modes via TV icon button
- Use CSS for large text and high contrast in kiosk mode
- Implement slideshow/carousel component with timer
- Continue polling queue data in background during ad display (30s interval)
- Barber selector shows/hides based on active view (queue vs ads)
- Exit kiosk mode via ESC key, back button, or clicking TV icon again
- "Atender" button toggles customer service status (waiting ↔ serving)
- Responsive grid layout adapts to screen size (3 columns → 2 columns → 1 column)
- Header and item sizes scale appropriately for different displays
- Check-in button opens modal for quick customer entry at the display
- QR code allows customers to scan and join from their phones
- Queue displays all customers with scrolling (no hidden indicator)
- Serving customers appear at bottom of queue to save space at top

## 11. Staff Login

**Actor**: Barber/Staff

**Preconditions**:
- Staff needs to access management features
- Staff has valid credentials

**Steps**:
1. Staff navigates to login page (from home page or directly)
2. System shows login form:
   - Username/email field
   - Password field
   - Login button
   - Cancel button
3. Staff enters credentials
4. Staff clicks login button
5. System validates credentials
6. System determines role automatically based on username:
   - `admin` / `admin123` → Owner
   - `barber` / `barber123` → Barber
7. If valid:
   - System generates JWT token
   - System stores token in browser
   - System redirects based on role:
     - Barber → Queue management page
     - Owner → Owner dashboard
8. If invalid:
   - System displays error message
   - Staff can retry or cancel

**Postconditions**:
- Staff is authenticated
- Staff has access to management features:
  - Update ticket status
  - Remove customers from queue
  - Access owner dashboard (Owner only)
- Staff can toggle kiosk mode from management interface

**Alternative Flow - Cancel**:
- Staff clicks cancel button
- Returns to previous page or home page

**Alternative Flow - Bypass Login**:
- Staff can use "Gerenciar Fila" button on home page to access queue manager directly without login (for development/testing)

**Security Notes**:
- Password is transmitted over HTTPS only
- Failed login attempts are rate-limited
- Session expires after inactivity period
- Token is stored securely (httpOnly cookie or secure localStorage)
- Role is determined by credentials, not user selection

## 12. Direct Queue Access (Bypass Login)

**Actor**: Staff/Developer

**Preconditions**:
- User is on the home page
- User needs quick access to queue management

**Steps**:
1. User navigates to home page
2. System displays "Gerenciar Fila" button alongside customer and login options
3. User clicks "Gerenciar Fila" button
4. System redirects directly to queue management page without authentication

**Postconditions**:
- User has immediate access to queue management interface
- All queue management features are available
- User can toggle kiosk mode

**Use Cases**:
- Quick access during development/testing
- Emergency access when login system is unavailable
- Simplified workflow for trusted staff

**Note**: This bypass is intended for development and testing. Production implementation should require authentication.

## Future Use Cases

The following use cases may be implemented in future versions:

### 13. Service Selection (Future)
- Customer selects service type when joining queue
- Different services have different durations
- Wait time calculated based on selected service
- Currently: service is discussed in-person with barber

### 14. Multi-Shop Management (Future)
- Admin views multiple shops from one dashboard
- Compare performance across locations
- Aggregate analytics

### 15. Appointment Scheduling (Future)
- Customer books specific time slot
- System reserves barber for appointment
- Walk-ins and appointments managed together

### 16. Barber Selection (Future)
- Customer chooses preferred barber
- System assigns ticket to specific barber queue
- Wait times calculated per barber

### 17. Notification System (Future)
- SMS/push notifications when queue position changes
- Alert when customer is next
- Remind customer of arrival time

### 18. Payment Integration (Future)
- Customer pays via app after service
- Track revenue per ticket
- Generate invoices

## Cross-Cutting Concerns

### Real-Time Updates
All use cases that modify queue state trigger real-time updates via HTTP polling:
- Customer status pages: Poll every 30 seconds, only visually update when data changes
- Staff management interface: Updates in real-time as actions occur
- Kiosk mode display: Polls every 30 seconds, only visually updates when data changes
- No manual refresh required

### Error Handling
All use cases handle common errors:
- Network connectivity issues (retry with backoff)
- Invalid input (display validation messages)
- Resource not found (show user-friendly error)
- Server errors (log and display generic message)

### Mobile Responsiveness
All customer-facing use cases work on:
- Desktop browsers
- Mobile phones (iOS, Android)
- Tablets via PWA installation

### Offline Support (PWA)
When network is unavailable:
- Recently viewed queue data remains visible
- Forms are disabled with message
- Automatic reconnection when back online
- Queued actions may sync when reconnected (future)

## Technical Considerations

### Performance
- Queue endpoint response time: < 200ms
- Status page polling interval: 30 seconds (with smart diffing to only update on changes)
- Kiosk mode polling interval: 30 seconds (with smart diffing)
- Maximum concurrent customers: ~30
- Maximum queue size: 50 tickets

### Security
- Customer endpoints are public (no auth required)
- Staff endpoints require JWT authentication
- Rate limiting: 100 requests/minute per IP
- Input validation on all forms

### Data Privacy
- Customer name is required (minimum PII)
- Phone number is optional
- No sensitive personal data collected
- HTTPS required in production
- Data retained for analytics (configurable period)
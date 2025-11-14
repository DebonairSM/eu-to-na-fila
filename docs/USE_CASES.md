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
   - Queue position
   - Estimated wait time (calculated as: average service time × position / active barbers)
   - Customer name
   - Current status (waiting, in progress, completed, cancelled)
4. System polls API every 3 seconds for updates
5. System updates display when queue changes

**Postconditions**:
- Customer has current information about their queue position

**Calculation Details**:
- Estimated wait time = (average cutting time × number of people ahead) / total active barbers
- Position updates automatically when other customers are served or leave
- Wait time decreases as queue moves forward

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

## 8. Mark Arrival (Customer)

**Actor**: Customer

**Preconditions**:
- Customer has a valid ticket ID
- Customer has physically arrived at the barbershop
- Ticket status is `waiting`

**Steps**:
1. Customer views their status page
2. System displays "I Have Arrived" button
3. Customer clicks the button
4. System updates ticket with arrival confirmation
5. System may adjust queue priority or flag the ticket as "present"
6. Staff sees confirmation that customer is on-site

**Postconditions**:
- Ticket is marked with arrival time
- Staff knows customer is physically present
- Customer maintains their queue position

**Use Cases**:
- Prevents calling customers who haven't arrived
- Allows shop to skip customers not yet present
- Reduces no-shows and wait time confusion

**Implementation Notes**:
- May require new field in ticket schema: `arrivedAt` timestamp
- Staff interface should distinguish between arrived and not-arrived customers

## 9. View Analytics (Staff - Optional Feature)

**Actor**: Shop Owner/Manager

**Preconditions**:
- Staff has manager-level access
- Historical data exists in the database

**Steps**:
1. Staff navigates to analytics page
2. System queries ticket and barber activity data
3. System generates visualizations:
   - Haircuts completed per hour (line graph)
   - Haircuts completed per day (bar chart)
   - Average wait time trend (line graph)
   - Barbers working per hour (line graph)
   - Service type distribution (pie chart)
   - Peak hours heatmap
4. Staff can filter by date range
5. Staff can export data as CSV or PDF

**Postconditions**:
- Staff has insight into shop performance
- Data can inform staffing decisions

**Metrics Displayed**:
- Total tickets created per period
- Total tickets completed per period
- Average wait time
- Average service duration
- Busiest hours/days
- Barber productivity

**Note**: Service-specific metrics (e.g., service popularity) would require implementing service selection feature.

**Implementation Notes**:
- Query completed tickets grouped by hour/day
- Calculate averages from ticket timestamps
- Track barber login/logout times or use active barber count history
- Consider caching for performance

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
   - Action buttons: Start Service, Complete Service, Remove
3. Staff clicks TV icon button to toggle **Kiosk Mode**
4. System switches to fullscreen kiosk display
5. System alternates between two views:
   - **Queue View** (15 seconds):
     - Shows up to 6 customers
     - Displays position number and name only
     - Large, readable format for visibility from distance
     - Highlights customers currently being served
   - **Advertisement View** (10 seconds per ad):
     - Shop promotional content
     - Barbershop branding
     - Services offered
     - Special promotions
     - Three advertisement slides rotate
6. System automatically rotates between queue and ads in a loop
7. Queue data refreshes every 3 seconds via polling
8. Login button remains visible in top corner during kiosk mode
9. Staff can press ESC key to exit kiosk mode

**Postconditions**:
- Customers in shop can see current queue status regularly
- Shop displays promotional content between queue updates
- Staff can access management features via login button at any time
- Staff can toggle between management and kiosk modes

**Display Characteristics**:
- Large font sizes for visibility from distance
- High contrast colors (dark background, gold accents)
- Smooth transitions between queue and ad views
- Fullscreen mode (auto-enters fullscreen)
- Progress bar shows rotation timing
- Shows only essential information: position + name

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
- Toggle between modes via UI button
- Use CSS for large text and high contrast in kiosk mode
- Implement slideshow/carousel component with timer
- Continue polling queue data in background during ad display
- Login button positioned absolutely (stays on top of rotation)
- Exit kiosk mode via ESC key or clicking TV icon again

## 11. Staff Login from Kiosk Mode

**Actor**: Barber/Staff

**Preconditions**:
- Kiosk mode is active (displaying queue/ads)
- Staff needs to access management features

**Steps**:
1. Staff clicks login button in top corner of kiosk display
2. System navigates to login page
3. System shows login form:
   - Username/email field
   - Password field
   - Role selection (Barber or Owner)
   - Login button
   - Cancel button
4. Staff enters credentials and selects role
5. Staff clicks login button
6. System validates credentials
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
  - View analytics (Owner only)
  - Manage barbers (Owner only)
- Staff can toggle kiosk mode from management interface

**Alternative Flow - Cancel**:
- Staff clicks cancel button
- Returns to previous page or home page

**Security Notes**:
- Password is transmitted over HTTPS only
- Failed login attempts are rate-limited
- Session expires after inactivity period
- Token is stored securely (httpOnly cookie or secure localStorage)

## Future Use Cases

The following use cases may be implemented in future versions:

### 12. Service Selection (Future)
- Customer selects service type when joining queue
- Different services have different durations
- Wait time calculated based on selected service
- Currently: service is discussed in-person with barber

### 13. Multi-Shop Management (Future)
- Admin views multiple shops from one dashboard
- Compare performance across locations
- Aggregate analytics

### 14. Appointment Scheduling (Future)
- Customer books specific time slot
- System reserves barber for appointment
- Walk-ins and appointments managed together

### 15. Barber Selection (Future)
- Customer chooses preferred barber
- System assigns ticket to specific barber queue
- Wait times calculated per barber

### 16. Notification System (Future)
- SMS/push notifications when queue position changes
- Alert when customer is next
- Remind customer of arrival time

### 17. Payment Integration (Future)
- Customer pays via app after service
- Track revenue per ticket
- Generate invoices

## Cross-Cutting Concerns

### Real-Time Updates
All use cases that modify queue state trigger real-time updates via HTTP polling (every 3 seconds):
- Customer status pages refresh automatically
- Staff management interface updates
- Display screens stay current
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
- Status page polling interval: 3 seconds
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
# UI Mockups

Static HTML mockups for all pages and components of the queue management system.

## Mockup Files

### Customer Interface

1. **queue-join.html** - Customer Registration Page
   - Simple name-only input form
   - Wait time estimation display
   - Profanity filter for names
   - Success message with queue position
   - Material Design 3 with gold/white theme

2. **customer-status.html** - Customer Status Page
   - Real-time queue position display
   - Estimated wait time
   - "I Have Arrived" button
   - "Leave Queue" button
   - Status badges (waiting, in progress, completed)
   - Auto-refresh indicator
   - Responsive design for mobile

### Staff Interface

3. **barber-queue-manager.html** - Queue Management Dashboard
   - Queue statistics (waiting count, serving count)
   - "Being Served" section for in-progress customers
   - Waiting queue list with position badges
   - Barber avatars for claiming customers
   - Remove button for cancellations
   - Barber check-in panel (toggle active/inactive)
   - "Finalizar" button to complete services
   - Real-time updates simulation

4. **owner-dashboard.html** - Owner Dashboard
   - Landing page for owners after login
   - Three options: Gerenciar Fila, Gerenciar Barbeiros, or Analytics
   - Clean, simple navigation
   - Logout button
   - Animated entrance

5. **manage-barbers.html** - Manage Barbers (Owner Only)
   - List all barbers with avatars
   - Add new barber (name, email, phone, password)
   - Edit existing barber information
   - Remove barber with confirmation
   - Toggle active/inactive status
   - Stats showing total and active barbers
   - Back button to owner dashboard

6. **analytics.html** - Analytics Dashboard
   - Performance metrics and graphs
   - Haircuts per hour/day
   - Average wait times
   - Barber productivity
   - Service popularity

### Display & Auth

7. **display-screen.html** - Public TV Display
   - Fullscreen display view
   - Rotating between queue and advertisements (15s queue, 10s per ad)
   - Large, readable fonts for distance viewing
   - Progress bar showing rotation timing
   - Login button in top right corner
   - Three advertisement slides included
   - Auto-refresh queue data (only updates display when data changes)

8. **login-modal.html** - Staff Login Modal
   - Clean modal overlay design
   - Username/email and password fields
   - Role selection (Barber or Owner)
   - Show/hide password toggle
   - Error handling and validation
   - Loading states
   - Forgot password link
   - Close on Escape or backdrop click
   - Demo credentials: admin / admin123
   - Routes to barber-queue-manager.html (Barber) or owner-dashboard.html (Owner)

## Design System

All mockups use a consistent Material Design 3 theme:

### Colors
- **Primary**: `#D4AF37` (Gold)
- **On Primary**: `#FFFFFF` (White)
- **Primary Container**: `#FFF8E1` (Light Gold)
- **Surface**: `#FFFFFF` (White)
- **Success**: `#2E7D32` (Green)
- **Error**: `#BA1A1A` (Red)

### Typography
- Font Family: Roboto (Google Fonts)
- Material Symbols for icons

### Features
- Elevation shadows with gold tint
- Smooth transitions and animations
- Touch-friendly button sizes for tablets
- High contrast for readability

## Usage

Open any HTML file directly in a browser to view the mockup. Each file is self-contained with inline CSS and JavaScript for interactivity.

### Testing Mockups

1. **queue-join.html**: Try entering names with profanity to test the filter
2. **customer-status.html**: Watch the position/time updates, click "I Have Arrived"
3. **barber-queue-manager.html**: Toggle barber status, claim customers, complete services
4. **owner-dashboard.html**: See owner landing page with three options
5. **manage-barbers.html**: Add/edit/remove barbers, see stats update
6. **display-screen.html**: Watch the 15s queue + 10s ad rotation, only updates when queue changes
7. **login-modal.html**: Test with admin/admin123, try both Barber and Owner roles

## Implementation Notes

These mockups serve as visual references for implementing the actual React components. Key behaviors to replicate:

- HTTP polling every 3 seconds for queue updates
- Smooth animations for state changes
- Material Design interaction patterns
- Responsive layouts for mobile and tablet
- Error handling and loading states
- Real-time position calculations


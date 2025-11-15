# UI Mockups

Static HTML mockups for all pages and components of the queue management system.

## Mockup Files

### Home Page

0. **index.html** - Home Page
   - Central navigation hub
   - Three main options:
     - "Entrar na Fila" - Customer registration
     - "Entrar (Staff)" - Staff login page
     - "Gerenciar Fila" - Direct access to queue manager (bypass login)
   - Clean, simple design with animated cards

### Customer Interface

1. **queue-join.html** - Customer Registration Page
   - Simple name-only input form
   - Wait time estimation display
   - Profanity filter for names
   - Success message with queue position
   - Material Design 3 with gold/white theme

2. **customer-status.html** - Customer Status Page
   - Large, prominent estimated wait time display (gold gradient card)
   - Customer name and status badges (waiting, in progress, completed)
   - "Leave Queue" button
   - Auto-updates every 30 seconds (only shows changes when data actually changes)
   - Responsive design for mobile
   - Note: Position number is not displayed to customers

### Staff Interface

3. **barber-queue-manager.html** - Unified Queue Management & Kiosk Display
   - **Management Mode**: Queue statistics, simple list showing position + name only
   - Barber selector to choose which barber is claiming customers
   - Start service / Complete service buttons
   - Remove customer button
   - **Kiosk Mode**: Toggle via TV icon button
   - **Back button** in top-left corner (always visible) to exit kiosk mode
   - Fullscreen display with queue view (15s) and ads (10s each)
   - Rotates automatically between queue and 3 advertisement slides
   - Barber selector at bottom (visible only during queue view, hidden during ads)
   - Barbers can select themselves and click customers to claim them
   - **"Atender" button** on each customer card to toggle service status (turns green when serving)
   - Shows only position number and customer name (simplified)
   - Polls every 30 seconds, only visually updates when data changes
   - Fully responsive design that adapts to different screen sizes and orientations

4. **owner-dashboard.html** - Owner Dashboard
   - Landing page for owners after login
   - Option to access Gerenciar Fila
   - Clean, simple navigation
   - Logout button
   - Animated entrance

### Display & Auth

5. **login-modal.html** - Staff Login Modal
   - Clean modal overlay design
   - Username/email and password fields
   - Show/hide password toggle
   - Error handling and validation
   - Loading states
   - Forgot password link
   - Close on Escape or backdrop click
   - Demo credentials: 
     - `admin` / `admin123` → Owner → routes to owner-dashboard.html
     - `barber` / `barber123` → Barber → routes to barber-queue-manager.html
   - Role is determined automatically based on credentials

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

## Archived Files

The following files have been archived in the `archive/` folder for future implementation:
- **analytics.html** - Analytics Dashboard (performance metrics, graphs, productivity stats)
- **manage-barbers.html** - Manage Barbers page (add/edit/remove barbers, manage accounts)

These features are planned for later phases of development.

## Usage

Open any HTML file directly in a browser to view the mockup. Each file is self-contained with inline CSS and JavaScript for interactivity.

### Testing Mockups

1. **index.html**: Home page with three options:
   - "Entrar na Fila" - Customer registration
   - "Entrar (Staff)" - Staff login
   - "Gerenciar Fila" - Direct access to queue manager (bypass login)
2. **queue-join.html**: Try entering names with profanity to test the filter
3. **customer-status.html**: Watch the estimated wait time updates (updates every 30s, only when data changes). Large, prominent wait time display.
4. **barber-queue-manager.html**: 
   - Management mode: Select barber, start/complete services, remove customers
   - Click TV icon to enter kiosk mode (fullscreen)
   - In kiosk mode: 
     - Use back button (top-left) or ESC to exit
     - Select barber at bottom, click customers to claim them
     - Click "Atender" button on customers to toggle service status
     - Watch queue rotate with ads (15s queue, 10s ads)
   - Fully responsive - adapts to different screen sizes
5. **owner-dashboard.html**: See owner landing page (only shows "Gerenciar Fila" option)
6. **login-modal.html**: Test with admin/admin123 (Owner) or barber/barber123 (Barber)

## Implementation Notes

These mockups serve as visual references for implementing the actual React components. Key behaviors to replicate:

- HTTP polling every 30 seconds for customer status and kiosk mode (with smart diffing)
- Smooth animations for state changes
- Material Design interaction patterns
- Responsive layouts for mobile and tablet
- Error handling and loading states
- Real-time position calculations
- Visual updates only when data actually changes (prevents unnecessary re-renders)


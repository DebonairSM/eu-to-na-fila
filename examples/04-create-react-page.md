# Example: Creating a React Page

This example shows how to create a complete React page with data fetching, real-time updates, forms, and error handling.

## Goal

Create a Barber Dashboard page that shows:
- List of barbers with online/offline status
- Real-time status updates via WebSocket
- Form to toggle barber availability
- Loading and error states

## Step 1: Create Custom Hook for Data Fetching

**File:** `apps/web/src/hooks/useBarbers.ts`

```typescript
import { useState, useEffect, useCallback } from 'react';
import { api, ApiError } from '../lib/api';
import { useWebSocket } from './useWebSocket';
import type { Barber } from '@eutonafila/shared';

/**
 * Hook for managing barbers with real-time updates.
 * 
 * @param shopSlug - Shop identifier
 * @returns Barbers state and operations
 * 
 * @example
 * ```typescript
 * const { barbers, loading, error, toggleStatus } = useBarbers('mineiro');
 * ```
 */
export function useBarbers(shopSlug: string) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const { lastEvent } = useWebSocket(shopSlug);

  /**
   * Load barbers from API.
   */
  const loadBarbers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getBarbers(shopSlug);
      setBarbers(data);
    } catch (err) {
      const message = err instanceof ApiError
        ? err.message
        : 'Failed to load barbers';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [shopSlug]);

  /**
   * Toggle barber active status.
   * 
   * @param barberId - Barber ID
   * @param isActive - New active status
   */
  const toggleStatus = async (barberId: number, isActive: boolean) => {
    try {
      setUpdating(barberId);
      
      // Optimistic update
      setBarbers(prev =>
        prev.map(b =>
          b.id === barberId ? { ...b, isActive } : b
        )
      );

      // API call
      await api.updateBarberStatus(barberId, isActive);

      // Success (already updated optimistically)
    } catch (err) {
      // Rollback on error
      await loadBarbers();
      
      const message = err instanceof ApiError
        ? err.message
        : 'Failed to update status';
      throw new Error(message);
    } finally {
      setUpdating(null);
    }
  };

  // Initial load
  useEffect(() => {
    loadBarbers();
  }, [loadBarbers]);

  // Handle WebSocket events
  useEffect(() => {
    if (!lastEvent) return;

    if (lastEvent.type === 'barber.status.changed') {
      const { barberId, isActive } = lastEvent.data;

      setBarbers(prev =>
        prev.map(barber =>
          barber.id === barberId
            ? { ...barber, isActive }
            : barber
        )
      );
    }
  }, [lastEvent]);

  return {
    barbers,
    loading,
    error,
    updating,
    refresh: loadBarbers,
    toggleStatus,
  };
}
```

## Step 2: Create Page Component

**File:** `apps/web/src/pages/BarberDashboard.tsx`

```typescript
import { useState } from 'react';
import { useBarbers } from '../hooks/useBarbers';
import { useWebSocket } from '../hooks/useWebSocket';
import { config } from '../lib/config';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';

/**
 * Barber Dashboard page.
 * Displays all barbers with real-time status updates.
 */
export function BarberDashboard() {
  const shopSlug = config.slug;
  const { barbers, loading, error, updating, refresh, toggleStatus } = useBarbers(shopSlug);
  const { isConnected } = useWebSocket(shopSlug);
  const [statusError, setStatusError] = useState<string | null>(null);

  /**
   * Handle status toggle with error handling.
   */
  const handleToggle = async (barberId: number, currentStatus: boolean) => {
    try {
      setStatusError(null);
      await toggleStatus(barberId, !currentStatus);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">Loading barbers...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <h2 className="text-lg font-semibold text-destructive mb-2">
            Failed to Load Barbers
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <Button onClick={refresh}>Try Again</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Barber Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage barber availability
          </p>
        </div>

        {/* Connection Status */}
        <div className="flex items-center gap-2">
          <div className={`h-2 w-2 rounded-full ${
            isConnected ? 'bg-green-500' : 'bg-red-500'
          }`} />
          <span className="text-sm text-muted-foreground">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="ml-4"
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Status Error Alert */}
      {statusError && (
        <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded mb-6">
          {statusError}
        </div>
      )}

      {/* Empty State */}
      {barbers.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">No barbers found</p>
        </Card>
      ) : (
        /* Barber Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {barbers.map(barber => (
            <Card key={barber.id} className="p-6">
              {/* Barber Info */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg">{barber.name}</h3>
                  {barber.email && (
                    <p className="text-sm text-muted-foreground">
                      {barber.email}
                    </p>
                  )}
                  {barber.phone && (
                    <p className="text-sm text-muted-foreground">
                      {barber.phone}
                    </p>
                  )}
                </div>

                {/* Status Badge */}
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  barber.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
                }`}>
                  {barber.isActive ? '🟢 Online' : '🔴 Offline'}
                </span>
              </div>

              {/* Toggle Button */}
              <Button
                onClick={() => handleToggle(barber.id, barber.isActive)}
                disabled={updating === barber.id}
                variant={barber.isActive ? 'outline' : 'default'}
                className="w-full"
              >
                {updating === barber.id ? (
                  <span className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    Updating...
                  </span>
                ) : (
                  barber.isActive ? 'Go Offline' : 'Go Online'
                )}
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Step 3: Add Route

**File:** `apps/web/src/App.tsx`

```typescript
import { Routes, Route } from 'react-router-dom';
import { QueuePage } from './pages/QueuePage';
import { JoinPage } from './pages/JoinPage';
import { StatusPage } from './pages/StatusPage';
import { BarberDashboard } from './pages/BarberDashboard'; // Add this

function App() {
  return (
    <div className="min-h-screen bg-background">
      <Routes>
        <Route path="/" element={<QueuePage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/status/:id" element={<StatusPage />} />
        <Route path="/barbers" element={<BarberDashboard />} /> {/* Add this */}
      </Routes>
    </div>
  );
}

export default App;
```

## Step 4: Add Navigation (Optional)

**File:** `apps/web/src/components/Navigation.tsx`

```typescript
import { Link, useLocation } from 'react-router-dom';

export function Navigation() {
  const location = useLocation();

  const links = [
    { path: '/', label: 'Queue' },
    { path: '/join', label: 'Join Queue' },
    { path: '/barbers', label: 'Barbers' },
  ];

  return (
    <nav className="bg-white dark:bg-gray-800 shadow">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold">EuToNaFila</span>
            
            <div className="flex gap-4">
              {links.map(link => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === link.path
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
```

## Common Patterns

### Form Submission

```typescript
function CreateTicketForm() {
  const [formData, setFormData] = useState({
    customerName: '',
    serviceId: 0,
    customerPhone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      const ticket = await api.createTicket('mineiro', formData);
      
      // Success - redirect to status page
      navigate(`/status/${ticket.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {error && (
        <div className="text-destructive mb-4">
          {error.message}
          {error.fieldErrors && (
            <ul className="mt-2 text-sm">
              {Object.entries(error.getFieldErrors()).map(([field, msg]) => (
                <li key={field}>{field}: {msg}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <input
        value={formData.customerName}
        onChange={e => setFormData(prev => ({
          ...prev,
          customerName: e.target.value
        }))}
        disabled={loading}
      />

      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Join Queue'}
      </button>
    </form>
  );
}
```

### Polling for Updates

```typescript
function usePolling<T>(
  fetchFn: () => Promise<T>,
  interval: number = 5000
) {
  const [data, setData] = useState<T | null>(null);

  useEffect(() => {
    fetchFn().then(setData);

    const timer = setInterval(() => {
      fetchFn().then(setData);
    }, interval);

    return () => clearInterval(timer);
  }, [fetchFn, interval]);

  return data;
}

// Usage
const metrics = usePolling(() => api.getMetrics('mineiro'), 10000);
```

### Infinite Scroll

```typescript
function useInfiniteScroll<T>(
  fetchPage: (page: number) => Promise<T[]>,
  initialPage: number = 1
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    const newItems = await fetchPage(page);
    
    if (newItems.length === 0) {
      setHasMore(false);
    } else {
      setItems(prev => [...prev, ...newItems]);
      setPage(p => p + 1);
    }
    
    setLoading(false);
  };

  return { items, loading, hasMore, loadMore };
}
```

## Best Practices

### Component Structure

1. **Imports** - External, then internal, then types
2. **Types** - Define props interface
3. **Component** - Function component with hooks
4. **Handlers** - Event handler functions
5. **Render** - JSX return

### State Management

1. Use `useState` for local state
2. Use custom hooks for shared state
3. Keep state close to where it's used
4. Lift state only when needed

### Performance

1. Use `React.memo` for expensive renders
2. Use `useCallback` for stable function references
3. Use `useMemo` for expensive computations
4. Avoid inline function definitions in JSX

### Error Handling

1. Show user-friendly error messages
2. Provide retry mechanisms
3. Log errors for debugging
4. Handle network errors gracefully

### Accessibility

1. Use semantic HTML
2. Add ARIA labels where needed
3. Support keyboard navigation
4. Test with screen readers

## Testing

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BarberDashboard } from './BarberDashboard';

test('loads and displays barbers', async () => {
  render(<BarberDashboard />);

  // Shows loading state
  expect(screen.getByText(/loading barbers/i)).toBeInTheDocument();

  // Waits for data to load
  await waitFor(() => {
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
  });
});

test('toggles barber status', async () => {
  const user = userEvent.setup();
  render(<BarberDashboard />);

  await waitFor(() => {
    expect(screen.getByText('Carlos Silva')).toBeInTheDocument();
  });

  // Click toggle button
  const toggleButton = screen.getByRole('button', { name: /go offline/i });
  await user.click(toggleButton);

  // Status should update
  await waitFor(() => {
    expect(screen.getByText(/offline/i)).toBeInTheDocument();
  });
});
```

## Summary

You've successfully created:

✅ Custom hook with data fetching and real-time updates  
✅ Complete page component with loading/error states  
✅ Optimistic UI updates  
✅ WebSocket integration  
✅ Error handling and user feedback  
✅ Responsive design  

This pattern can be applied to any new page in your application.


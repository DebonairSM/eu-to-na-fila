# Custom React Hooks

This directory contains custom React hooks for the queue management system.

## Available Hooks

### `useWebSocket`

Real-time WebSocket connection hook for receiving queue updates.

**Usage:**
```typescript
import { useWebSocket } from './hooks/useWebSocket';

function QueuePage() {
  const { isConnected, lastEvent, ws } = useWebSocket('mineiro');

  useEffect(() => {
    if (lastEvent?.type === 'ticket.created') {
      console.log('New ticket created:', lastEvent.data);
    }
  }, [lastEvent]);

  return (
    <div>
      {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
    </div>
  );
}
```

**Returns:**
- `isConnected` (boolean) - Whether WebSocket is currently connected
- `lastEvent` (WebSocketEvent | null) - Most recent event received
- `ws` (WebSocket | null) - Raw WebSocket instance

**Features:**
- Auto-reconnection (3-second delay)
- Automatic cleanup on unmount
- Type-safe event handling

**Event Types:**
- `connection.established` - Connection confirmed
- `ticket.created` - New ticket added to queue
- `ticket.status.changed` - Ticket status updated
- `metrics.updated` - Queue metrics changed

---

## Common Patterns

### Data Fetching with Loading/Error States

```typescript
function useQueue(shopSlug: string) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getQueue(shopSlug);
      setTickets(data.tickets);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [shopSlug]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  return { tickets, loading, error, refresh: loadQueue };
}
```

### Real-Time Updates with WebSocket

```typescript
function useRealtimeQueue(shopSlug: string) {
  const { tickets, loading, error, refresh } = useQueue(shopSlug);
  const { lastEvent } = useWebSocket(shopSlug);

  // Refresh queue when relevant events occur
  useEffect(() => {
    if (!lastEvent) return;

    if (
      lastEvent.type === 'ticket.created' ||
      lastEvent.type === 'ticket.status.changed'
    ) {
      refresh();
    }
  }, [lastEvent, refresh]);

  return { tickets, loading, error };
}
```

### Form Submission with Validation

```typescript
function useCreateTicket(shopSlug: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  const createTicket = async (data: CreateTicketData) => {
    try {
      setLoading(true);
      setError(null);
      
      const ticket = await api.createTicket(shopSlug, data);
      return ticket;
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err);
      } else {
        setError(new ApiError('Failed to create ticket', 500, 'UNKNOWN'));
      }
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    createTicket,
    loading,
    error,
    fieldErrors: error?.getFieldErrors(),
  };
}
```

### Optimistic Updates

```typescript
function useOptimisticTicketUpdate() {
  const [tickets, setTickets] = useState<Ticket[]>([]);

  const updateTicket = async (
    ticketId: number,
    newStatus: TicketStatus
  ) => {
    // Save original state for rollback
    const originalTickets = tickets;

    // Optimistically update UI
    setTickets(prev =>
      prev.map(t =>
        t.id === ticketId
          ? { ...t, status: newStatus }
          : t
      )
    );

    try {
      // Make API call
      const updated = await api.updateTicketStatus(ticketId, {
        status: newStatus,
      });

      // Update with server response
      setTickets(prev =>
        prev.map(t => (t.id === ticketId ? updated : t))
      );
    } catch (error) {
      // Rollback on error
      setTickets(originalTickets);
      throw error;
    }
  };

  return { tickets, setTickets, updateTicket };
}
```

### Debounced Search

```typescript
function useSearch(delay: number = 300) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, delay);

    return () => clearTimeout(timer);
  }, [searchTerm, delay]);

  return {
    searchTerm,
    setSearchTerm,
    debouncedTerm,
  };
}

// Usage
function QueueSearch() {
  const { searchTerm, setSearchTerm, debouncedTerm } = useSearch();
  const [results, setResults] = useState<Ticket[]>([]);

  useEffect(() => {
    if (debouncedTerm) {
      // Perform search with debounced term
      searchTickets(debouncedTerm).then(setResults);
    }
  }, [debouncedTerm]);

  return (
    <input
      value={searchTerm}
      onChange={e => setSearchTerm(e.target.value)}
      placeholder="Search tickets..."
    />
  );
}
```

---

## Hook Guidelines

### Do's

✅ Use custom hooks for reusable logic  
✅ Return objects with named properties  
✅ Include loading and error states for async operations  
✅ Clean up side effects in useEffect return  
✅ Use useCallback for stable function references  
✅ Document hook parameters and return values  

### Don'ts

❌ Don't call hooks conditionally  
❌ Don't call hooks in loops  
❌ Don't call hooks in callbacks  
❌ Don't forget to handle errors  
❌ Don't skip cleanup in useEffect  
❌ Don't create hooks that do too many things  

---

## Error Handling

Always handle errors in hooks that make API calls:

```typescript
function useTicket(ticketId: number) {
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    api.getTicket(ticketId)
      .then(setTicket)
      .catch(err => {
        if (err instanceof ApiError) {
          setError(err);
          
          // Handle specific errors
          if (err.isNotFoundError()) {
            console.log('Ticket not found');
          }
        }
      });
  }, [ticketId]);

  return { ticket, error };
}
```

---

## Testing Hooks

Use `@testing-library/react-hooks` for testing custom hooks:

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useQueue } from './useQueue';

test('loads queue data', async () => {
  const { result, waitForNextUpdate } = renderHook(() =>
    useQueue('mineiro')
  );

  // Initially loading
  expect(result.current.loading).toBe(true);

  // Wait for data to load
  await waitForNextUpdate();

  // Data should be loaded
  expect(result.current.loading).toBe(false);
  expect(result.current.tickets).toHaveLength(5);
});
```


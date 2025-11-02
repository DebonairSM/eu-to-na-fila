# Custom React Hooks

This directory contains custom React hooks for the queue management system.

## Available Hooks

### `useQueuePolling`

HTTP polling hook for fetching queue data with automatic updates.

**Usage:**
```typescript
import { useQueuePolling } from './hooks/usePolling';

function QueuePage() {
  const { data, isLoading, error } = useQueuePolling('mineiro');

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading queue</div>;

  return (
    <div>
      <h2>{data?.shop.name}</h2>
      <p>{data?.tickets.length} tickets in queue</p>
    </div>
  );
}
```

**Returns:**
- `data` (QueueData | null) - Shop and tickets data
- `isLoading` (boolean) - Whether initial load is in progress
- `error` (Error | null) - Error if fetch failed
- `refetch` (function) - Manually trigger a refresh

**Options:**
- `interval` (number) - Polling interval in ms (default: 3000)
- `enabled` (boolean) - Whether polling is enabled (default: true)

**Features:**
- Automatic polling every 3 seconds
- Automatic cleanup on unmount
- Manual refresh capability

### `useTicketPolling`

HTTP polling hook for fetching a specific ticket's status.

**Usage:**
```typescript
import { useTicketPolling } from './hooks/usePolling';

function TicketStatus({ ticketId }: { ticketId: number }) {
  const { ticket, isLoading, error } = useTicketPolling(ticketId);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading ticket</div>;

  return (
    <div>
      <p>Status: {ticket?.status}</p>
      <p>Position: {ticket?.position}</p>
    </div>
  );
}
```

**Returns:**
- `ticket` (Ticket | null) - Ticket data
- `isLoading` (boolean) - Whether initial load is in progress
- `error` (Error | null) - Error if fetch failed
- `refetch` (function) - Manually trigger a refresh

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

### Automatic Updates with Polling

```typescript
function useRealtimeQueue(shopSlug: string) {
  // Polling hook automatically refreshes every 3 seconds
  const { data, isLoading, error } = useQueuePolling(shopSlug, {
    interval: 3000,
    enabled: true,
  });

  return { 
    tickets: data?.tickets || [], 
    loading: isLoading, 
    error 
  };
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


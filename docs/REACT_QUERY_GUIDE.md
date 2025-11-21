# React Query State Management Guide

This guide explains how to use React Query (TanStack Query) for professional server state management in the Maps Tracker application.

## Overview

React Query provides:

✅ **Automatic Caching** - Smart caching of server data
✅ **Background Refetching** - Keep data fresh without user action
✅ **Request Deduplication** - Avoid duplicate API calls
✅ **Optimistic Updates** - Update UI before server response
✅ **Offline Support** - Queue mutations when offline
✅ **DevTools** - Debugging and visualization

## Installation

Dependencies are already added. Just install:

```bash
cd frontend
npm install
```

## Architecture

### Before (Old Approach)

```jsx
// State management scattered across components
useState for vehicles
useState for vehicles error
useState for vehicles loading
useEffect with fetch()
Manual polling with setInterval
No caching
No deduplication
```

### After (React Query)

```jsx
// Centralized server state management
useVehicles() hook
Automatic caching
Automatic refetching
Automatic deduplication
Optimistic updates
Built-in error handling
```

## Basic Usage

### Queries (Fetching Data)

Query data from the server:

```jsx
import { useVehicles } from '../hooks/useQuery';

function VehicleList() {
  // Automatic fetching, caching, and error handling
  const { data: vehicles, isLoading, error } = useVehicles();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {vehicles.map(vehicle => (
        <li key={vehicle.id}>{vehicle.name}</li>
      ))}
    </ul>
  );
}
```

### Mutations (Modifying Data)

Create, update, or delete data:

```jsx
import { useCreateVehicle } from '../hooks/useQuery';

function CreateVehicleForm() {
  const createVehicle = useCreateVehicle();

  const handleSubmit = (e) => {
    e.preventDefault();
    createVehicle.mutate({
      name: 'New Vehicle',
      device_id: 'DEV-001'
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input type="text" placeholder="Vehicle name" />
      <button disabled={createVehicle.isPending}>
        {createVehicle.isPending ? 'Creating...' : 'Create'}
      </button>
      {createVehicle.error && <p>Error: {createVehicle.error.message}</p>}
    </form>
  );
}
```

## Query Hooks Reference

### Vehicles

```jsx
// Get all vehicles
const { data: vehicles, isLoading, error } = useVehicles();

// Get single vehicle
const { data: vehicle } = useVehicle(vehicleId);

// Get latest location
const { data: location } = useVehicleLocation(vehicleId);

// Get location history (1, 6, 24, 72, or 168 hours)
const { data: history } = useVehicleHistory(vehicleId, 24);

// Get statistics
const { data: stats } = useVehicleStats(vehicleId, 24);

// Create vehicle
const createVehicle = useCreateVehicle();
createVehicle.mutate({ name: 'Vehicle', device_id: 'ABC' });

// Update vehicle
const updateVehicle = useUpdateVehicle(vehicleId);
updateVehicle.mutate({ name: 'Updated Name' });

// Delete vehicle
const deleteVehicle = useDeleteVehicle();
deleteVehicle.mutate(vehicleId);
```

### Saved Locations

```jsx
// Get saved locations for vehicle
const { data: locations } = useVehicleSavedLocations(vehicleId);

// Create saved location
const createLocation = useCreateSavedLocation(vehicleId);
createLocation.mutate({
  name: 'Warehouse',
  latitude: 5.8520,
  longitude: -55.2038
});

// Update saved location
const updateLocation = useUpdateSavedLocation(vehicleId, locationId);
updateLocation.mutate({ name: 'Updated Name' });

// Delete saved location
const deleteLocation = useDeleteSavedLocation(vehicleId, locationId);
deleteLocation.mutate();
```

### Places of Interest

```jsx
// Get all places
const { data: places } = usePlaces();

// Create place
const createPlace = useCreatePlace();
createPlace.mutate({
  name: 'Warehouse',
  latitude: 5.8520,
  longitude: -55.2038
});

// Update place
const updatePlace = useUpdatePlace(placeId);
updatePlace.mutate({ name: 'Updated Name' });

// Delete place
const deletePlace = useDeletePlace();
deletePlace.mutate(placeId);
```

### Reports

```jsx
// Get visit reports for date range
const { data: reports } = useVisitReports(startDate, endDate);
```

### Users (Admin Only)

```jsx
// Get all users
const { data: users } = useUsers();

// Update user
const updateUser = useUpdateUser(userId);
updateUser.mutate({ role: 'manager', is_active: true });

// Delete user
const deleteUser = useDeleteUser();
deleteUser.mutate(userId);
```

## Query States

Every query returns state information:

```jsx
const {
  data,              // The data returned from query
  isLoading,        // true while fetching
  error,            // Error object if failed
  status,           // 'pending' | 'error' | 'success'
  fetchStatus,      // 'fetching' | 'paused' | 'idle'
  isSuccess,        // true if last fetch succeeded
  isError,          // true if last fetch failed
  isFetching,       // true if fetching (includes background)
  isStale,          // true if data is stale
  isPreviousData,   // true if using cached data
  refetch,          // Function to manually refetch
} = useVehicles();
```

## Mutation States

Every mutation returns state information:

```jsx
const createVehicle = useCreateVehicle();

const {
  data,              // Returned mutation data
  error,            // Error if failed
  status,           // 'idle' | 'pending' | 'error' | 'success'
  isPending,        // true while pending
  isError,          // true if failed
  isSuccess,        // true if succeeded
  mutate,           // Call to perform mutation
  mutateAsync,      // Async version of mutate
  reset,            // Reset mutation state
} = createVehicle;

// Usage
createVehicle.mutate(data);

// Or async/await
try {
  const result = await createVehicle.mutateAsync(data);
} catch (error) {
  console.error('Failed:', error);
}
```

## Common Patterns

### Loading States

```jsx
function VehicleList() {
  const { data: vehicles, isLoading } = useVehicles();

  if (isLoading) {
    return <Skeleton count={5} />;
  }

  return <div>{/* list */}</div>;
}
```

### Error Handling

```jsx
function VehicleList() {
  const { data: vehicles, error } = useVehicles();

  if (error) {
    return (
      <div className="bg-red-100 p-4">
        <h3>Error loading vehicles</h3>
        <p>{error.message}</p>
      </div>
    );
  }

  return <div>{/* list */}</div>;
}
```

### Form with Mutation

```jsx
function CreateVehicleForm() {
  const createVehicle = useCreateVehicle();
  const [name, setName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    createVehicle.mutate({ name }, {
      onSuccess: () => {
        setName(''); // Clear form
        // Optional: show success message
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Vehicle name"
      />
      <button disabled={createVehicle.isPending || !name}>
        {createVehicle.isPending ? 'Creating...' : 'Create'}
      </button>
      {createVehicle.isError && (
        <p className="error">{createVehicle.error?.message}</p>
      )}
      {createVehicle.isSuccess && (
        <p className="success">Vehicle created!</p>
      )}
    </form>
  );
}
```

### Optimistic Updates

```jsx
function UpdateVehicle({ vehicleId, currentName }) {
  const updateVehicle = useUpdateVehicle(vehicleId);
  const [name, setName] = useState(currentName);

  const handleUpdate = () => {
    updateVehicle.mutate(
      { name },
      {
        // Update UI before server responds
        onMutate: async (newData) => {
          // Cancel any outgoing refetches
          await queryClient.cancelQueries({
            queryKey: ['vehicles', vehicleId]
          });

          // Snapshot previous state
          const previousVehicle = queryClient.getQueryData(
            ['vehicles', vehicleId]
          );

          // Optimistically update
          queryClient.setQueryData(['vehicles', vehicleId], {
            ...previousVehicle,
            ...newData
          });

          return { previousVehicle };
        },
        onError: (err, newData, context) => {
          // Rollback on error
          queryClient.setQueryData(
            ['vehicles', vehicleId],
            context.previousVehicle
          );
        }
      }
    );
  };

  return (
    <div>
      <input value={name} onChange={(e) => setName(e.target.value)} />
      <button onClick={handleUpdate} disabled={updateVehicle.isPending}>
        {updateVehicle.isPending ? 'Updating...' : 'Update'}
      </button>
    </div>
  );
}
```

### Dependent Queries

```jsx
function VehicleDetails({ vehicleId }) {
  // This query waits for vehicleId
  const { data: vehicle } = useVehicle(vehicleId);

  // This query depends on vehicle existing
  const { data: locations } = useVehicleSavedLocations(vehicleId, {
    enabled: !!vehicle // Only run if vehicle exists
  });

  return (
    <div>
      <h1>{vehicle?.name}</h1>
      <p>{locations?.length} saved locations</p>
    </div>
  );
}
```

### Infinite Queries (Pagination)

Currently implemented with limit/offset. React Query supports:

```jsx
// Future: Implement with useInfiniteQuery
const {
  data,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: ['vehicles'],
  queryFn: ({ pageParam = 0 }) =>
    fetch(`/api/vehicles?offset=${pageParam}`),
  getNextPageParam: (lastPage) =>
    lastPage.hasMore ? lastPage.nextOffset : undefined,
});
```

## Cache Management

### Query Keys

Queries are cached by key:

```jsx
// Query keys are defined in src/hooks/useQuery.js
// Examples:
['vehicles']                    // All vehicles
['vehicles', 1]                 // Vehicle #1
['vehicles', 1, 'location']     // Vehicle #1 location
['vehicles', 1, 'history', 24]  // Vehicle #1 history (24h)
```

### Manual Invalidation

Force a refetch by invalidating cache:

```jsx
import { useQueryClient } from '@tanstack/react-query';

function MyComponent() {
  const queryClient = useQueryClient();

  const handleRefresh = () => {
    // Refetch specific query
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });

    // Refetch query and all related queries
    queryClient.invalidateQueries({
      queryKey: ['vehicles', 1],
      exact: false
    });
  };

  return <button onClick={handleRefresh}>Refresh</button>;
}
```

### Manual Cache Update

Update cache without API call:

```jsx
const queryClient = useQueryClient();

// Set cache directly
queryClient.setQueryData(['vehicles', 1], {
  id: 1,
  name: 'Updated Vehicle'
});

// Update cache immutably
queryClient.setQueryData(['vehicles'], (old) => [
  ...old,
  { id: 2, name: 'New Vehicle' }
]);
```

## Cache Configuration

Cache settings are in `src/config/queryClient.js`:

```javascript
export const cachePresets = {
  REALTIME: {
    staleTime: 0,                // Always fetch fresh
    gcTime: 1000 * 60 * 1,      // Keep 1 min
  },
  FREQUENT: {
    staleTime: 1000 * 60 * 1,   // 1 min
    gcTime: 1000 * 60 * 5,      // Keep 5 min
  },
  NORMAL: {
    staleTime: 1000 * 60 * 5,   // 5 min
    gcTime: 1000 * 60 * 10,     // Keep 10 min
  },
  INFREQUENT: {
    staleTime: 1000 * 60 * 30,  // 30 min
    gcTime: 1000 * 60 * 60,     // Keep 60 min
  },
};
```

### Custom Cache Settings

Override per-hook:

```jsx
const { data } = useVehicles({
  staleTime: 1000 * 60 * 10,  // Custom 10 min
  gcTime: 1000 * 60 * 30,      // Custom 30 min
  refetchInterval: 5000,        // Auto-refetch every 5s
});
```

## Integration with WebSocket

Combine React Query with WebSocket for optimal performance:

```jsx
function VehicleTracker({ vehicleId }) {
  // React Query for initial data and background updates
  const { data: vehicle } = useVehicle(vehicleId);

  // WebSocket for real-time updates
  useVehicleLocation(vehicleId, (location) => {
    // Update cache with new location from WebSocket
    queryClient.setQueryData(['vehicles', vehicleId, 'location'], location);
  });

  return <div>{/* UI */}</div>;
}
```

## Debugging

### React Query DevTools

Install dev tools (optional):

```bash
npm install -D @tanstack/react-query-devtools
```

Use in your app:

```jsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

Then press Ctrl+Alt+Q to open DevTools floating button.

### Logging Queries

```jsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      onSuccess: (data) => {
        console.log('Query succeeded:', data);
      },
      onError: (error) => {
        console.error('Query failed:', error);
      },
    },
  },
});
```

## Migration from Old Code

### Before (useState + useEffect)

```jsx
function VehicleList() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/vehicles')
      .then(r => r.json())
      .then(data => {
        setVehicles(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return <div>{vehicles.map(v => <div key={v.id}>{v.name}</div>)}</div>;
}
```

### After (React Query)

```jsx
function VehicleList() {
  const { data: vehicles, isLoading, error } = useVehicles();

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{vehicles.map(v => <div key={v.id}>{v.name}</div>)}</div>;
}
```

**Advantages:**
- 10 lines → 5 lines
- No manual state management
- Automatic caching
- Automatic deduplication
- Better error handling
- Built-in refetching

## Performance Tips

1. **Use Query Keys Correctly** - Helps caching
2. **Set Appropriate Stale Times** - Balance freshness vs calls
3. **Enable Refetch on Window Focus** - Keep data fresh
4. **Use Optimistic Updates** - Better UX
5. **Combine with WebSocket** - Real-time without polling

## Troubleshooting

### Queries not updating

```jsx
// Force refetch
const { refetch } = useVehicles();
refetch();

// Or invalidate cache
queryClient.invalidateQueries({ queryKey: ['vehicles'] });
```

### Old data showing

Check staleTime settings. May be too long:

```jsx
const { data } = useVehicles({
  staleTime: 0,  // Always fetch fresh
});
```

### Too many requests

Check refetchInterval settings. May be too aggressive:

```jsx
const { data } = useVehicles({
  refetchInterval: false,  // Don't auto-refetch
});
```

## Best Practices

✅ **DO:**
- Use provided hooks from `useQuery.js`
- Let React Query handle caching
- Use optimistic updates for good UX
- Leverage stale-while-revalidate pattern
- Combine with WebSocket for real-time

❌ **DON'T:**
- Mix useState with React Query for same data
- Manually set interval with React Query data
- Ignore error states
- Over-fetch (use dependent queries)
- Set staleTime to 0 unless necessary

## Resources

- [React Query Documentation](https://tanstack.com/query/latest)
- [Caching Guide](https://tanstack.com/query/latest/docs/react/caching)
- [Advanced Patterns](https://tanstack.com/query/latest/docs/react/examples/auto-refetching-stale-ui-in-the-background)

## Support

For React Query issues:
1. Check browser DevTools Network tab
2. Review React Query DevTools (if installed)
3. Check console for error messages
4. Verify API endpoint in Network tab
5. Check `src/hooks/useQuery.js` for available hooks

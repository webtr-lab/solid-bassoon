# Frontend Logging Guide

**Purpose**: Replace all `console.log`/`console.error` calls with the professional logger utility for better debugging, error tracking, and production monitoring.

---

## Quick Start

### Import the Logger
```javascript
import logger from '../../utils/logger';  // Adjust path as needed
```

### Replace Console Calls
```javascript
// OLD ❌
console.log('Vehicle loaded');
console.error('Error loading vehicle', error);
console.warn('Validation warning');

// NEW ✅
logger.info('Vehicle loaded');
logger.error('Error loading vehicle', error);
logger.warn('Validation warning');
```

---

## Logger Methods

### 1. `logger.error(message, data?)`
**Use for**: Caught exceptions, API errors, failed operations

```javascript
// In try-catch blocks
try {
  const response = await fetch('/api/vehicles');
} catch (err) {
  logger.error('Failed to fetch vehicles', err);
  // or just:
  logger.error('Failed to fetch vehicles', { status: err.status });
}

// Replace: console.error('Error:', error);
// With: logger.error('Error', error);
```

### 2. `logger.warn(message, data?)`
**Use for**: Validation warnings, deprecated usage, edge cases, security events

```javascript
// Validation warning
if (latitude > 90 || latitude < -90) {
  logger.warn('Invalid latitude received', { latitude });
}

// Security event
if (isAuthError) {
  logger.warn('Authentication failed', { ip: userIP });
}
```

### 3. `logger.info(message, data?)`
**Use for**: Important events, state changes, user actions

```javascript
logger.info('User logged in', { username: 'admin' });
logger.info('Vehicle created', { vehicleId: 123, name: 'Truck 1' });
logger.info('History retrieved', { hoursRequested: 24, recordsFound: 150 });
```

### 4. `logger.debug(message, data?)`
**Use for**: Detailed debugging, component lifecycle, data flow (development only - not shown in production)

```javascript
logger.debug('Rendering map', { center, zoom });
logger.debug('API response received', { endpoint: '/api/vehicles', duration: '145ms' });
```

### 5. `logger.apiCall(method, endpoint, status, duration?)`
**Use for**: Tracking API requests and responses

```javascript
// After API call completes
logger.apiCall('GET', '/api/vehicles', 200, 145);      // 145ms
logger.apiCall('POST', '/api/auth/login', 401);         // failed auth
logger.apiCall('PUT', '/api/vehicles/1', 500);          // server error
```

### 6. `logger.userAction(action, details?)`
**Use for**: Tracking user interactions

```javascript
logger.userAction('login', { username: 'admin' });
logger.userAction('vehicle_selected', { vehicleId: 5 });
logger.userAction('export_data', { format: 'csv', hours: 24 });
```

### 7. `logger.security(event, details?)`
**Use for**: Authentication, authorization, sensitive operations

```javascript
logger.security('authentication_attempt', { username: 'admin' });
logger.security('permission_denied', { resource: 'admin_panel' });
logger.security('suspicious_activity', { action: 'multiple_failed_logins' });
```

### 8. `logger.performance(metric, value, unit?)`
**Use for**: Timing information, performance monitoring

```javascript
logger.performance('render_time', 250, 'ms');
logger.performance('data_fetch', 1.5, 's');
logger.performance('memory_usage', 45, 'MB');
```

### 9. `logger.time(label)` and `endTimer()`
**Use for**: Measuring duration of code blocks

```javascript
// Measure how long an operation takes
const endTimer = logger.time('FetchAndProcess');

// ... do work ...
const vehicles = await fetchVehicles();
processVehicles(vehicles);

// Call the returned function when done
endTimer();  // Logs: "Performance: FetchAndProcess = 234.56ms"
```

### 10. `logger.componentLifecycle(component, event, data?)`
**Use for**: Component mounting, updating, unmounting (development only)

```javascript
useEffect(() => {
  logger.componentLifecycle('Map', 'mounted', { center, zoom });

  return () => {
    logger.componentLifecycle('Map', 'unmounted');
  };
}, []);
```

### 11. `logger.stateChange(oldState, newState, trigger?)`
**Use for**: State management updates (development only)

```javascript
// In state setter
const handleVehicleSelect = (vehicle) => {
  const oldSelected = selectedVehicle;
  setSelectedVehicle(vehicle);

  logger.stateChange(oldSelected, vehicle, 'user_selected_vehicle');
};
```

---

## Migration Examples

### Example 1: Error Handling in Component
```javascript
// BEFORE
const fetchData = async () => {
  try {
    const response = await fetch('/api/data');
    setData(response);
  } catch (error) {
    console.error('Error fetching data:', error);
    setError('Failed to load data');
  }
};

// AFTER
import logger from '../../utils/logger';

const fetchData = async () => {
  try {
    const response = await fetch('/api/data');
    setData(response);
  } catch (error) {
    logger.error('Error fetching data', error);
    setError('Failed to load data');
  }
};
```

### Example 2: API Call Tracking
```javascript
// BEFORE
const createVehicle = async (vehicleData) => {
  try {
    const start = performance.now();
    const response = await fetch('/api/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicleData)
    });
    const duration = performance.now() - start;
    console.log(`API call took ${duration}ms`);
    return response;
  } catch (error) {
    console.error('Failed to create vehicle:', error);
  }
};

// AFTER
const createVehicle = async (vehicleData) => {
  try {
    const start = performance.now();
    const response = await fetch('/api/vehicles', {
      method: 'POST',
      body: JSON.stringify(vehicleData)
    });
    const duration = Math.round(performance.now() - start);
    logger.apiCall('POST', '/api/vehicles', response.status, duration);
    return response;
  } catch (error) {
    logger.error('Failed to create vehicle', error);
  }
};
```

### Example 3: Component Lifecycle
```javascript
// BEFORE
const Map = ({ center, zoom }) => {
  useEffect(() => {
    console.log('Map mounted');
    return () => {
      console.log('Map unmounted');
    };
  }, []);
};

// AFTER
import logger from '../../utils/logger';

const Map = ({ center, zoom }) => {
  useEffect(() => {
    logger.componentLifecycle('Map', 'mounted', { center, zoom });
    return () => {
      logger.componentLifecycle('Map', 'unmounted');
    };
  }, []);
};
```

---

## Output Examples

### Development Mode
Logger output shows **colored, formatted messages** with timestamps:

```
[2025-11-12T14:32:45.123Z] [INFO] Vehicle loaded
[2025-11-12T14:32:46.456Z] [ERROR] Error fetching vehicles
TypeError: Cannot read property 'data' of undefined
  ...
[2025-11-12T14:32:47.789Z] [WARN] Invalid latitude received
{
  "latitude": 95
}
[2025-11-12T14:32:48.000Z] [DEBUG] Map component rendered
```

### Production Mode
Logger output shows **only WARN and ERROR levels**:

```
[2025-11-12T14:32:46.456Z] [ERROR] Error fetching vehicles
[2025-11-12T14:32:47.789Z] [WARN] Invalid latitude received
```

---

## Files Currently Using Logger

✅ **Updated**:
- `App.jsx` - All console calls replaced (7 replacements)

⏳ **Need Updates**:
- `ChangePasswordModal.jsx` - 1 console.error
- `Login.jsx` - 1 console.error
- `AdminPanel.jsx` - 5 console.error calls
- `Map.jsx` - 3 console.error calls
- `VehicleStats.jsx` - 2 console.error calls
- `ErrorBoundary.jsx` - 1 console.error (keep for visibility)
- `VehicleHistory.jsx` - 2 console.error calls

---

## Best Practices

### 1. Always Include Context
```javascript
// BAD ❌
logger.error('Error');

// GOOD ✅
logger.error('Failed to fetch vehicles', {
  endpoint: '/api/vehicles',
  status: error.status
});
```

### 2. Use Appropriate Log Levels
```javascript
// BAD ❌ - Using error for everything
logger.error('User clicked button');

// GOOD ✅ - Using appropriate level
logger.info('User logged in');
logger.warn('Validation failed');
logger.error('Database connection failed');
```

### 3. Don't Log Sensitive Data
```javascript
// BAD ❌
logger.info('User logged in', { username, password });

// GOOD ✅
logger.info('User logged in', { username });
```

### 4. Use Consistent Message Format
```javascript
// BAD ❌
logger.error('error loading data');
logger.error('Error Loading Data');
logger.error('ERROR: Data Loading Failed');

// GOOD ✅
logger.error('Failed to load data');
logger.error('Failed to load vehicles');
logger.error('Failed to fetch user permissions');
```

### 5. Include Source Context in Long Operations
```javascript
// GOOD ✅
const endTimer = logger.time('VehicleDataProcess');
const vehicles = await fetchVehicles();
const enhanced = await enhanceVehicleData(vehicles);
logger.info('Vehicles loaded and processed', { count: enhanced.length });
endTimer();
```

---

## ESLint Configuration

The ESLint configuration **warns** about console usage to help catch forgotten console calls:

```bash
# Run linter
npm run lint

# Auto-fix issues
npm run lint:fix
```

ESLint will show warnings like:
```
Line 50: Unexpected console statement (no-console)
```

---

## Testing the Logger

### In Development
1. Open browser DevTools (F12)
2. Go to Console tab
3. See colored log messages with timestamps
4. Check different log levels (info, warn, error)

### In Production
1. Open browser DevTools
2. Only ERROR and WARN level messages appear
3. Messages can be sent to monitoring service

---

## Migration Checklist

- [ ] Import logger in components with console calls
- [ ] Replace `console.error` with `logger.error`
- [ ] Replace `console.log` with appropriate level (`logger.info`, `logger.debug`)
- [ ] Replace `console.warn` with `logger.warn`
- [ ] Run `npm run lint` - expect 0 console warnings
- [ ] Test in development mode - colors should show
- [ ] Test in production mode - only WARN/ERROR show
- [ ] Commit changes

---

## Q&A

**Q: Will this slow down my app?**
A: No. Logger overhead is <1ms. Production logger is optimized for minimal impact.

**Q: Can I send logs to a monitoring service?**
A: Yes! See the TODO in `logger.js` for the `sendToMonitoringService` hook.

**Q: How do I use this in tests?**
A: Logger works in tests too. In test mode, all levels are captured for assertion.

**Q: What if I accidentally use console.log in production?**
A: ESLint will warn you during development with `npm run lint`.

---

## Resources

- Logger Implementation: `frontend/src/utils/logger.js`
- ESLint Config: `frontend/.eslintrc.json`
- Package Scripts: `npm run lint`, `npm run lint:fix`

---

**Next Steps**:
1. Review this guide
2. Update remaining components (14 console calls remaining)
3. Run `npm run lint` to verify
4. Test in dev and prod modes
5. Commit when complete

---

*For questions or suggestions, see CLAUDE.md for project contact info.*

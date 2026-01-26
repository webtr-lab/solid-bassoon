# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Maps tracking application with real-time vehicle monitoring, location history, and place of interest management. The system consists of a Flask backend, React frontend, and a separate mobile interface for location data submission.

## Architecture

### Four-Tier Deployment

1. **Backend** (Flask/Python) - Port 5000
   - RESTful API for vehicle tracking, user management, and places of interest
   - PostgreSQL database for persistent storage
   - Flask-Login for session-based authentication
   - Automatic stop detection when vehicles are stationary for 5+ minutes within 50m radius

2. **Frontend** (React + Vite) - Port 3000 (dev) / 80 & 443 (production)
   - Real-time tracking dashboard with Leaflet maps
   - Two main views: Tracking and Admin (role-based)
   - Auto-refreshes vehicle data every 5 seconds, history every 10 seconds
   - TailwindCSS for styling
   - Built-in location search with client-side caching (50 entries)

3. **Mobile** (Static HTML) - Port 8080 (HTTP) / 8443 (HTTPS)
   - Simple interface for GPS-enabled devices to submit location data
   - Served via nginx

4. **Nominatim** (Geocoding Service) - Port 8081 (external) / 8080 (internal)
   - Local OpenStreetMap Nominatim instance with Suriname map data
   - Provides instant address/location search without rate limits
   - ~350MB storage (OSM data + database)
   - Auto-updates from Geofabrik daily
   - See NOMINATIM_SETUP.md for details

### Database Models (backend/app/models.py)

- **User**: Authentication with roles (admin/manager/viewer)
- **Vehicle**: Tracked vehicles with unique device_id
- **Location**: Coordinates with timestamp and speed
- **SavedLocation**: Detected stops or manually saved locations
- **PlaceOfInterest**: Points of interest with full contact details

### Key Backend Features

- **Stop Detection** (`detect_and_save_stops()` in backend/app/services/location_service.py): Automatically saves locations when vehicle stays within 50m for 5+ minutes
- **Distance Calculation** (`calculate_distance()` in backend/app/services/location_service.py): Haversine formula for precise coordinate distance
- **Visit Reports** (`/api/reports/visits` endpoint): Matches saved locations to places of interest within 200m threshold
- **Geocoding** (`/api/geocode` endpoint): Uses local Nominatim instance for instant address lookup (configurable via NOMINATIM_URL)
- **CSRF Protection** (`backend/app/csrf_protection.py`): Double-submit cookie pattern for all state-changing operations
- **Data Retention** (`backend/app/services/data_retention_service.py`): Automatic cleanup of old GPS data (90 days), saved locations (365 days), and audit logs (180 days)

### Frontend State Management

The main App.tsx manages all state centrally:
- `activeView`: Switches between 'tracking' and 'admin' panels
- `selectedVehicle`: Controls which vehicle's details/history are displayed
- `historyHours`: Configurable time window (1h, 6h, 24h, 72h, 168h)
- Role-based rendering: Admin panel only visible to 'admin' and 'manager' roles

**Note**: Frontend is migrating to TypeScript. Most components have been converted from .jsx to .tsx files.

### Role Permissions

Defined in App.tsx:
- **admin/manager**: Full access including admin panel
- **viewer**: Read-only tracking view

## Development Commands

### Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server (requires DATABASE_URL, SECRET_KEY in environment)
python -m flask --app app.main:app run --host=0.0.0.0 --port=5000

# Database is auto-created on first run with initial admin account
# See "Initial Admin Setup" section below for credentials
```

### Initial Admin Setup

On first run, the application creates a default admin user:

**Username:** `admin`
**Password:** Configurable via environment variable

#### Setting Admin Password

**Option 1: Environment Variable (Recommended)**
```bash
# In your .env file:
ADMIN_PASSWORD=your_secure_password_here
```

**Option 2: Use Default (Not Recommended for Production)**
If `ADMIN_PASSWORD` is not set, the system uses default password: `admin123`

#### Finding Your Admin Password

After first startup, check:

1. **Backend logs:**
   ```bash
   docker logs maps_backend | grep "INITIAL ADMIN"
   ```

2. **Credentials file (inside container):**
   ```bash
   docker exec maps_backend cat /app/ADMIN_CREDENTIALS.txt
   ```

3. **Console output during first run**

**Security Notes:**
- The admin user is **forced to change password** on first login
- Default password (`admin123`) should **NEVER** be used in production
- Set `ADMIN_PASSWORD` in `.env` file before first deployment
- The credentials file is created with restrictive permissions (600)

### Logging

Application logs are persisted to the `logs/` directory:
- **logs/app.log** - General application logs (startup, database, location events, backups)
- **logs/error.log** - Errors only
- **logs/access.log** - HTTP request/response logs

Each log file auto-rotates at 10MB, keeping 10 backup files (100MB total per log type).

```bash
# View live logs
tail -f logs/app.log

# View errors
grep "ERROR" logs/error.log

# View location submissions
grep "api/gps" logs/access.log

# View stop detections
grep "Auto-detected stop" logs/app.log
```

See **docs/LOGGING.md** for complete logging documentation.

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server with backend proxy
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Full Stack with Docker

```bash
# Start all services (requires .env file with database credentials)
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down

# Rebuild after code changes
docker compose up -d --build
```

## Environment Configuration

Copy `.env.example` to `.env` and configure:

- **DATABASE_URL**: PostgreSQL connection string (format: postgresql://user:pass@host:port/dbname)
- **SECRET_KEY**: Flask session secret (min 32 chars)
- **CORS_ORIGINS**: Comma-separated allowed origins for CORS
- **FLASK_ENV**: production/development
- **NOMINATIM_URL**: Geocoding service URL (default: http://nominatim:8080 for local, or https://nominatim.openstreetmap.org for public)

## API Endpoints

### Health
- GET /api/health - Health check endpoint

### Authentication
- POST /api/auth/register - Create new user
- POST /api/auth/login - Session-based login
- POST /api/auth/logout - End session
- GET /api/auth/check - Check current auth status
- POST /api/auth/change-password - Change user password
- GET /api/auth/default-credentials - Check if default credentials should be displayed

### Location Data
- POST /api/gps - Receive location data from devices (requires device_id, latitude, longitude)

### Vehicles
- GET /api/vehicles - List all vehicles
- POST /api/vehicles - Create vehicle (admin only)
- GET /api/vehicles/:id - Get vehicle details
- PUT /api/vehicles/:id - Update vehicle (admin only)
- DELETE /api/vehicles/:id - Delete vehicle (admin only)
- GET /api/vehicles/:id/location - Latest location
- GET /api/vehicles/:id/history?hours=24 - Historical track
- GET /api/vehicles/:id/stats?hours=24 - Distance/speed statistics
- GET /api/vehicles/:id/export?format=csv&hours=24 - Export data

### Saved Locations (Vehicle Stops)
- GET /api/vehicles/:id/saved-locations - Get saved locations for vehicle
- POST /api/vehicles/:id/saved-locations - Create saved location
- PUT /api/vehicles/:id/saved-locations/:location_id - Update saved location
- DELETE /api/vehicles/:id/saved-locations/:location_id - Delete saved location

### Places of Interest
- GET /api/places-of-interest - List all places
- POST /api/places-of-interest - Create new place
- PUT /api/places-of-interest/:id - Update place
- DELETE /api/places-of-interest/:id - Remove place
- GET /api/reports/visits?start=ISO_DATE&end=ISO_DATE - Visit analytics

### Geocoding
- GET /api/geocode?q=address - Geocode address using Nominatim service

### Backup Management
- GET /api/backups - List all backup files
- POST /api/backups/create - Create new backup
- POST /api/backups/restore - Restore from backup file
- GET /api/backups/download/:filename - Download backup file
- DELETE /api/backups/delete/:filename - Delete backup file

### Admin
- GET /api/users - List users
- PUT /api/users/:id - Update user (role, active status)
- DELETE /api/users/:id - Delete user

## Frontend Component Structure

**Note**: All components have been migrated to TypeScript (.tsx files).

- **App.tsx**: Main container with auth, view switching, and API polling
- **Map.tsx**: Leaflet map with vehicle markers, history polylines, saved locations, places of interest
- **VehicleList.tsx**: Sidebar list of vehicles with last location info
- **VehicleHistory.tsx**: List of saved locations for selected vehicle
- **VehicleStats.tsx**: Distance and speed statistics
- **AdminPanel.tsx**: User and vehicle management (tabs-based UI)
- **PlacesList.tsx**: Shows places of interest when no vehicle selected
- **Login.tsx**: Authentication form
- **ChangePasswordModal.tsx**: Modal dialog for changing user passwords (shown on first login for default admin)
- **StoreMapView.tsx**: Store-focused view component (part of pivot to stores)
- **StoreDetailsPanel.tsx**: Displays store details (part of pivot to stores)

## Key Implementation Details

### API Proxy Configuration

In development (vite.config.js), `/api` routes proxy to `http://backend:5000`. In production, nginx handles routing.

### Session Cookies

Backend uses Flask-Login with httpOnly cookies. CORS configured for credentials. Cookie security settings adjust based on FLASK_ENV (SameSite=None for production HTTPS).

### Coordinate System

Default map center: [5.8520, -55.2038] (Suriname)
All coordinates use decimal degrees (latitude, longitude)

### Auto-refresh Intervals

- Vehicle positions: 5 seconds (defined in App.tsx)
- Vehicle history/saved locations: 10 seconds (defined in App.tsx)
- Only active when authenticated and in tracking view

## Common Tasks

### Adding a New API Endpoint

1. Define route in appropriate blueprint file (backend/app/routes/*.py) with @login_required and @require_csrf decorators
2. Add database queries using SQLAlchemy models or service layer functions
3. Return jsonify() response
4. Update frontend to call new endpoint via fetch('/api/...', {credentials: 'include'})

### Adding a Database Column

1. Modify model in backend/app/models.py
2. Delete database volume and restart (development): `docker compose down -v && docker compose up -d`
3. Production: Use Flask-Migrate (not currently configured)

### Changing Map Behavior

Map component accepts center and zoom props. Parent controls these via state (mapCenter, mapZoom in App.tsx). Update these to programmatically pan/zoom.

## Production Hardening Features

### Error Handling & Retry Logic

**Location:** `frontend/src/utils/retryFetch.ts`

The application includes automatic retry logic with exponential backoff for failed API requests:

- **Retry Strategies:**
  - `RETRY_CONFIGS.quick`: 2 retries, 500ms initial delay (interactive operations)
  - `RETRY_CONFIGS.standard`: 3 retries, 1s initial delay (background operations) - **Default**
  - `RETRY_CONFIGS.aggressive`: 5 retries, 1s initial delay (critical operations)
  - `RETRY_CONFIGS.none`: No retries, fail immediately

- **Retryable Errors:**
  - Network errors (status 0)
  - Server errors (5xx status codes)
  - Rate limit errors (429 status code)

- **Non-Retryable Errors:**
  - Client errors (4xx except 429) - fail immediately
  - Authentication errors (401, 403) - fail immediately

**Usage Example:**
```javascript
import { fetchWithRetry, RETRY_CONFIGS } from '../utils/retryFetch';

const data = await fetchWithRetry('/api/endpoint', {}, RETRY_CONFIGS.standard);
```

### CSRF Protection

**Location:** `backend/app/csrf_protection.py`

The application implements double-submit cookie pattern for CSRF protection:

- CSRF tokens automatically generated on GET requests
- Tokens sent via `X-CSRF-Token` response header
- Frontend automatically includes tokens in POST/PUT/DELETE requests
- Server validates tokens on state-changing operations

**Backend Usage:**
```python
from app.csrf_protection import require_csrf

@app.route('/api/endpoint', methods=['POST'])
@require_csrf  # Add this decorator to protect routes
def protected_endpoint():
    # Route logic here
    pass
```

**Frontend:** No changes needed - `apiClient.ts` handles tokens automatically.

### Rate Limiting

**Location:** Applied in route blueprints

The application enforces rate limits to prevent abuse:

| Endpoint | Limit | Purpose |
|----------|-------|---------|
| POST `/api/gps` | 10/minute | Prevent GPS spam |
| GET `/api/places-of-interest` | 100/minute | Prevent scraping |
| POST `/api/places-of-interest` | 20/hour | Prevent spam creation |
| POST `/api/places-of-interest/:id/visits` | 30/hour | Allow reasonable visits |

**Adding Rate Limits:**
```python
from app.limiter import limiter

@app.route('/api/endpoint')
@limiter.limit("10 per minute")  # Add this decorator
def rate_limited_endpoint():
    pass
```

### Data Retention & Cleanup

**Location:** `backend/app/services/data_retention_service.py`

Automatic cleanup of old data to prevent unbounded database growth:

**Retention Policies:**
- Location data (GPS points): 90 days
- Saved locations (stops/visits): 365 days
- Audit logs: 180 days

**Automatic Cleanup:**
- Runs daily at 3 AM via APScheduler
- Deletes in batches to avoid long transactions
- Logs all cleanup operations

**Manual Cleanup:**
```bash
# Dry run (see what would be deleted):
docker exec maps_backend python cleanup_old_data.py --dry-run

# Actually delete old data:
docker exec maps_backend python cleanup_old_data.py

# View database statistics:
docker exec maps_backend python cleanup_old_data.py --stats
```

**API Endpoints:**
- GET `/api/retention/stats` - View database statistics
- POST `/api/retention/cleanup` - Trigger manual cleanup (dry_run=true/false)

### Testing

**Backend Tests:**
```bash
# Run all tests:
docker exec maps_backend python -m pytest tests/

# Run with coverage:
docker exec maps_backend python -m pytest tests/ --cov=app --cov-report=html

# Run specific test file:
docker exec maps_backend python -m pytest tests/test_places.py -v
```

**Frontend Tests:**
```bash
cd frontend

# Run tests:
npm test

# Watch mode:
npm run test:watch

# Coverage report:
npm run test:coverage
```

**Test Files:**
- `frontend/src/components/__tests__/StoreMapView.test.jsx` - Component tests
- `frontend/src/utils/__tests__/retryFetch.test.js` - Retry logic tests

### Type Safety

The frontend has been migrated to TypeScript, providing compile-time type checking for all components.

**TypeScript Component Example:**
```typescript
interface MyComponentProps {
  data: Array<object>;
  onAction: () => void;
}

function MyComponent({ data, onAction }: MyComponentProps) {
  // Component logic
}

// Default props handled via destructuring or default parameters
function MyComponent({ data = [], onAction }: MyComponentProps) {
  // Component logic
}
```

**Type Definitions:**
- Located in `frontend/src/types/index.ts`
- All components use TypeScript interfaces for props
- No runtime PropTypes validation needed (TypeScript provides compile-time safety)

**Note:** Previous PropTypes have been replaced by TypeScript type definitions during migration.

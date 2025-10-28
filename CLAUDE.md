# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a GPS tracking application with real-time vehicle monitoring, location history, and place of interest management. The system consists of a Flask backend, React frontend, and a separate mobile interface for GPS data submission.

## Architecture

### Three-Tier Deployment

1. **Backend** (Flask/Python) - Port 5000
   - RESTful API for vehicle tracking, user management, and places of interest
   - PostgreSQL database for persistent storage
   - Flask-Login for session-based authentication
   - Automatic stop detection when vehicles are stationary for 5+ minutes within 50m radius

2. **Frontend** (React + Vite) - Port 3000
   - Real-time tracking dashboard with Leaflet maps
   - Two main views: Tracking and Admin (role-based)
   - Auto-refreshes vehicle data every 5 seconds, history every 10 seconds
   - TailwindCSS for styling

3. **Mobile** (Static HTML) - Port 8080
   - Simple interface for GPS-enabled devices to submit location data
   - Served via nginx

### Database Models (backend/app/models.py)

- **User**: Authentication with roles (admin/manager/viewer)
- **Vehicle**: Tracked vehicles with unique device_id
- **Location**: GPS coordinates with timestamp and speed
- **SavedLocation**: Detected stops or manually saved locations
- **PlaceOfInterest**: Points of interest with full contact details

### Key Backend Features

- **Stop Detection** (main.py:145): Automatically saves locations when vehicle stays within 50m for 5+ minutes
- **Distance Calculation** (main.py:182): Haversine formula for precise GPS distance
- **Visit Reports** (/api/reports/visits): Matches saved locations to places of interest within 200m threshold
- **Geocoding** (/api/geocode): Uses OpenStreetMap Nominatim for address lookup

### Frontend State Management

The main App.jsx manages all state centrally:
- `activeView`: Switches between 'tracking' and 'admin' panels
- `selectedVehicle`: Controls which vehicle's details/history are displayed
- `historyHours`: Configurable time window (1h, 6h, 24h, 72h, 168h)
- Role-based rendering: Admin panel only visible to 'admin' and 'manager' roles

### Role Permissions

Defined in App.jsx:11:
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

# Database is auto-created on first run with a random admin password
# Check the backend logs for the generated admin credentials
```

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
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

## Environment Configuration

Copy `.env.example` to `.env` and configure:

- **DATABASE_URL**: PostgreSQL connection string (format: postgresql://user:pass@host:port/dbname)
- **SECRET_KEY**: Flask session secret (min 32 chars)
- **CORS_ORIGINS**: Comma-separated allowed origins for CORS
- **FLASK_ENV**: production/development

## API Endpoints

### Authentication
- POST /api/auth/register - Create new user
- POST /api/auth/login - Session-based login
- POST /api/auth/logout - End session
- GET /api/auth/check - Check current auth status

### GPS Data
- POST /api/gps - Receive location data from devices (requires device_id, latitude, longitude)

### Vehicles
- GET /api/vehicles - List all vehicles
- POST /api/vehicles - Create vehicle (admin only)
- GET /api/vehicles/:id/location - Latest location
- GET /api/vehicles/:id/history?hours=24 - Historical track
- GET /api/vehicles/:id/stats?hours=24 - Distance/speed statistics
- GET /api/vehicles/:id/export?format=csv&hours=24 - Export data

### Places of Interest
- GET /api/places-of-interest - List all places
- POST /api/places-of-interest - Create new place
- PUT /api/places-of-interest/:id - Update place
- DELETE /api/places-of-interest/:id - Remove place
- GET /api/reports/visits?start=ISO_DATE&end=ISO_DATE - Visit analytics

### Admin
- GET /api/users - List users
- PUT /api/users/:id - Update user (role, active status)
- DELETE /api/users/:id - Delete user

## Frontend Component Structure

- **App.jsx**: Main container with auth, view switching, and API polling
- **Map.jsx**: Leaflet map with vehicle markers, history polylines, saved locations, places of interest
- **VehicleList.jsx**: Sidebar list of vehicles with last location info
- **VehicleHistory.jsx**: List of saved locations for selected vehicle
- **VehicleStats.jsx**: Distance and speed statistics
- **AdminPanel.jsx**: User and vehicle management (tabs-based UI)
- **PlacesList.jsx**: Shows places of interest when no vehicle selected
- **Login.jsx**: Authentication form

## Key Implementation Details

### API Proxy Configuration

In development (vite.config.js), `/api` routes proxy to `http://backend:5000`. In production, nginx handles routing.

### Session Cookies

Backend uses Flask-Login with httpOnly cookies. CORS configured for credentials. Cookie security settings adjust based on FLASK_ENV (SameSite=None for production HTTPS).

### Coordinate System

Default map center: [5.8520, -55.2038] (Suriname)
All coordinates use decimal degrees (latitude, longitude)

### Auto-refresh Intervals

- Vehicle positions: 5 seconds (App.jsx:148)
- Vehicle history/saved locations: 10 seconds (App.jsx:158)
- Only active when authenticated and in tracking view

## Common Tasks

### Adding a New API Endpoint

1. Define route in backend/app/main.py with @login_required decorator
2. Add database queries using SQLAlchemy models
3. Return jsonify() response
4. Update frontend to call new endpoint via fetch('/api/...', {credentials: 'include'})

### Adding a Database Column

1. Modify model in backend/app/models.py
2. Delete database volume and restart (development): `docker-compose down -v && docker-compose up -d`
3. Production: Use Flask-Migrate (not currently configured)

### Changing Map Behavior

Map component accepts center and zoom props. Parent controls these via state (mapCenter, mapZoom in App.jsx:25-26). Update these to programmatically pan/zoom.

# API Documentation

This document describes the REST API endpoints for the Maps Tracker application.

## Overview

The API uses RESTful conventions with JSON request/response bodies. All endpoints (except health check and GPS submission) require authentication via session cookies.

### Base URL

- **Development**: `http://localhost:5000/api`
- **Production**: `https://your-domain.com/api`

### Authentication

Authentication is session-based using httpOnly cookies:

1. User logs in via `POST /auth/login`
2. Server sets session cookie
3. Include cookies in subsequent requests (browsers do this automatically)
4. User logs out via `POST /auth/logout`

### API Response Format

All responses are JSON. Success responses typically include:

```json
{
  "message": "Operation successful",
  "data": { /* resource data */ }
}
```

Error responses include:

```json
{
  "error": "Error description",
  "details": { /* additional error info */ },
  "timestamp": "2024-11-14T12:00:00Z"
}
```

### Status Codes

- **200 OK**: Request successful
- **201 Created**: Resource created successfully
- **204 No Content**: Request successful, no response body
- **400 Bad Request**: Invalid request data
- **401 Unauthorized**: Authentication required
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

## OpenAPI Specification

The complete API is documented in OpenAPI 3.0 format. You can view it in several ways:

### 1. Swagger UI (Online)

Visit the Swagger UI to explore and test endpoints:

```
http://localhost:5000/api/docs
```

Features:
- Interactive endpoint exploration
- Try-it-out feature to test requests
- Automatic request generation
- Response visualization

### 2. ReDoc (HTML Documentation)

Alternative HTML documentation:

```
http://localhost:5000/api/redoc
```

Features:
- Clean, searchable documentation
- Code examples
- Better for documentation viewing

### 3. Raw OpenAPI Specification

Download the specification:

```
http://localhost:5000/api/openapi.json
```

Or view the YAML file:

```
http://localhost:5000/api/openapi.yaml
```

Use with OpenAPI tools:
- [Swagger Editor](https://editor.swagger.io)
- [API Swagger Client Generators](https://openapi-generator.tech/)
- [Postman Import](https://learning.postman.com/docs/integrations/available-integrations/working-with-openapi/)

## API Endpoints Reference

### Authentication

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "username": "newuser",
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:**
```json
{
  "message": "User registered successfully"
}
```

#### Login
```http
POST /auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "password"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "must_change_password": false
  }
}
```

#### Check Auth Status
```http
GET /auth/check
```

**Response:**
```json
{
  "authenticated": true,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin"
  }
}
```

#### Logout
```http
POST /auth/logout
```

#### Change Password
```http
POST /auth/change-password
Content-Type: application/json

{
  "current_password": "oldpass",
  "new_password": "NewSecurePass123!"
}
```

### Vehicles

#### List Vehicles
```http
GET /vehicles?status=active&limit=50&offset=0
```

**Query Parameters:**
- `status`: Filter by status (active, inactive, offline)
- `limit`: Results per page (default: 50)
- `offset`: Results to skip (default: 0)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Vehicle 1",
    "device_id": "DEVICE-001",
    "description": "Main delivery vehicle",
    "status": "active",
    "last_location": {
      "id": 100,
      "latitude": 5.8520,
      "longitude": -55.2038,
      "speed": 45.5,
      "timestamp": "2024-11-14T12:00:00Z"
    }
  }
]
```

#### Get Vehicle Details
```http
GET /vehicles/1
```

#### Create Vehicle (Admin Only)
```http
POST /vehicles
Content-Type: application/json

{
  "name": "New Vehicle",
  "device_id": "DEVICE-123",
  "description": "New vehicle for tracking"
}
```

#### Update Vehicle (Admin Only)
```http
PUT /vehicles/1
Content-Type: application/json

{
  "name": "Updated Vehicle Name",
  "description": "Updated description"
}
```

#### Delete Vehicle (Admin Only)
```http
DELETE /vehicles/1
```

### Locations

#### Get Latest Location
```http
GET /vehicles/1/location
```

#### Get Location History
```http
GET /vehicles/1/history?hours=24
```

**Query Parameters:**
- `hours`: 1, 6, 24, 72, or 168 (default: 24)
- `limit`: Maximum number of locations (default: 1000)

#### Get Location Statistics
```http
GET /vehicles/1/stats?hours=24
```

**Response:**
```json
{
  "distance": 150.5,
  "distance_unit": "km",
  "average_speed": 45.2,
  "max_speed": 85.0,
  "avg_speed_unit": "km/h",
  "total_duration": 3600,
  "idle_time": 600,
  "active_time": 3000
}
```

#### Submit GPS Location
```http
POST /gps
Content-Type: application/json

{
  "device_id": "DEVICE-001",
  "latitude": 5.8520,
  "longitude": -55.2038,
  "speed": 45.5,
  "heading": 180,
  "accuracy": 5.0
}
```

**Note:** This endpoint does not require authentication (public endpoint for GPS devices).

### Saved Locations

#### Get Saved Locations
```http
GET /vehicles/1/saved-locations
```

#### Create Saved Location
```http
POST /vehicles/1/saved-locations
Content-Type: application/json

{
  "name": "Main Warehouse",
  "latitude": 5.8520,
  "longitude": -55.2038,
  "notes": "Primary warehouse location"
}
```

#### Update Saved Location
```http
PUT /vehicles/1/saved-locations/5
Content-Type: application/json

{
  "name": "Updated Name",
  "notes": "Updated notes"
}
```

#### Delete Saved Location
```http
DELETE /vehicles/1/saved-locations/5
```

### Places of Interest

#### List Places
```http
GET /places-of-interest
```

#### Get Place Details
```http
GET /places-of-interest/1
```

#### Create Place
```http
POST /places-of-interest
Content-Type: application/json

{
  "name": "Central Warehouse",
  "category": "warehouse",
  "latitude": 5.8520,
  "longitude": -55.2038,
  "address": "123 Main Street, Paramaribo",
  "phone": "+597-123-4567",
  "email": "warehouse@company.com",
  "website": "https://example.com"
}
```

#### Update Place
```http
PUT /places-of-interest/1
Content-Type: application/json

{
  "name": "Updated Name",
  "phone": "+597-987-6543"
}
```

#### Delete Place
```http
DELETE /places-of-interest/1
```

### Reports

#### Get Visit Analytics
```http
GET /reports/visits?start=2024-11-01T00:00:00Z&end=2024-11-30T23:59:59Z
```

**Query Parameters:**
- `start`: Start date (ISO 8601 format, required)
- `end`: End date (ISO 8601 format, required)

**Response:**
```json
[
  {
    "place_id": 1,
    "place_name": "Main Warehouse",
    "vehicle_id": 1,
    "vehicle_name": "Vehicle 1",
    "visit_count": 5,
    "total_duration": 1200,
    "average_duration": 240
  }
]
```

#### Get Vehicle Statistics
```http
GET /vehicles/1/stats?hours=168
```

### Geocoding

#### Geocode Address
```http
GET /geocode?q=Main%20Street,%20Paramaribo
```

**Response:**
```json
[
  {
    "address": "Main Street, Paramaribo, Suriname",
    "latitude": 5.8520,
    "longitude": -55.2038
  }
]
```

#### Reverse Geocode Coordinates
```http
GET /geocode?q=5.8520,-55.2038
```

### Backups

#### List Backups (Admin Only)
```http
GET /backups
```

#### Create Backup (Admin Only)
```http
POST /backups/create
```

#### Restore from Backup (Admin Only)
```http
POST /backups/restore
Content-Type: application/json

{
  "filename": "backup_2024-11-14_120000.sql.gz"
}
```

#### Download Backup (Admin Only)
```http
GET /backups/download/backup_2024-11-14_120000.sql.gz
```

#### Delete Backup (Admin Only)
```http
DELETE /backups/delete/backup_2024-11-14_120000.sql.gz
```

### Users

#### List Users (Admin Only)
```http
GET /users
```

#### Update User (Admin Only)
```http
PUT /users/2
Content-Type: application/json

{
  "role": "manager",
  "is_active": true
}
```

#### Delete User (Admin Only)
```http
DELETE /users/2
```

## Error Handling

### Common Errors

**Invalid Credentials:**
```json
{
  "error": "Invalid username or password",
  "remaining_attempts": 4
}
```

**Rate Limited:**
```json
{
  "error": "Too many login attempts. Please try again in 15 minutes.",
  "remaining_attempts": 0
}
```

**Invalid Input:**
```json
{
  "error": "Validation failed",
  "details": {
    "email": "Invalid email format"
  }
}
```

**Permission Denied:**
```json
{
  "error": "You don't have permission to perform this action"
}
```

## Client Examples

### JavaScript/Fetch

```javascript
// Login
const response = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',  // Include cookies
  body: JSON.stringify({
    username: 'admin',
    password: 'password'
  })
});

const user = await response.json();

// Get vehicles
const vehiclesResponse = await fetch(
  'http://localhost:5000/api/vehicles',
  { credentials: 'include' }
);
const vehicles = await vehiclesResponse.json();
```

### Python/Requests

```python
import requests
from datetime import datetime, timedelta

session = requests.Session()

# Login
login_data = {'username': 'admin', 'password': 'password'}
response = session.post(
    'http://localhost:5000/api/auth/login',
    json=login_data
)
user = response.json()

# Get vehicles
response = session.get('http://localhost:5000/api/vehicles')
vehicles = response.json()

# Submit GPS location
gps_data = {
    'device_id': 'DEVICE-001',
    'latitude': 5.8520,
    'longitude': -55.2038,
    'speed': 45.5,
    'heading': 180,
    'accuracy': 5.0
}
session.post(
    'http://localhost:5000/api/gps',
    json=gps_data
)
```

### cURL

```bash
# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password"}' \
  -c cookies.txt

# Get vehicles
curl -X GET http://localhost:5000/api/vehicles \
  -b cookies.txt

# Submit GPS location
curl -X POST http://localhost:5000/api/gps \
  -H "Content-Type: application/json" \
  -d '{
    "device_id":"DEVICE-001",
    "latitude":5.8520,
    "longitude":-55.2038,
    "speed":45.5,
    "heading":180,
    "accuracy":5.0
  }'
```

## Rate Limiting

The API implements rate limiting to prevent abuse:

- **Login attempts**: 10 per minute, with temporary lockout after 5 failures in 15 minutes
- **User registration**: 5 per hour per IP
- **Global limit**: 200 requests per day, 50 requests per hour (except authenticated endpoints)

When rate limited, the API returns HTTP 429 with:
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60
}
```

## Versioning

The API version is included in responses:

```
X-API-Version: 1.0.0
```

Future breaking changes will increment the major version number.

## Pagination

List endpoints support pagination:

**Query Parameters:**
- `limit`: Results per page (default: 50, max: 200)
- `offset`: Results to skip (default: 0)

**Response Headers:**
```
X-Total-Count: 200
X-Page-Size: 50
X-Page-Offset: 0
```

## Webhooks (Future)

Webhook support is planned for:
- Vehicle status changes
- Location updates
- Stop detection
- Alerts and notifications

## Support

For API issues or questions:
1. Check this documentation
2. Review the OpenAPI specification
3. Check server logs for error details
4. Open an issue with error details and reproduction steps

## Changelog

### v1.0.0 (Current)
- Initial API release
- Full CRUD operations for vehicles, locations, places
- Authentication and authorization
- Visit analytics and reports
- Geocoding integration
- Backup and restore functionality

# Mobile Interface Endpoint Setup

Complete documentation for serving the mobile interface at `https://maps.praxisnetworking.com/mobile`.

## Overview

The mobile location data submission interface is now accessible through the main domain at `/mobile/` endpoint, eliminating the need for a separate port (8080/8443).

**Access URL**: `https://maps.praxisnetworking.com/mobile/`

## Architecture

### Before
- Frontend: `https://maps.praxisnetworking.com/` (port 443)
- Mobile: `https://maps.praxisnetworking.com:8443/` (separate port)

### After
- Frontend: `https://maps.praxisnetworking.com/` (port 443)
- Mobile: `https://maps.praxisnetworking.com/mobile/` (proxied through port 443)

## Configuration Changes

### 1. Frontend Nginx Configuration

**File**: `frontend/nginx-https.conf`

Added two new location blocks:

```nginx
location /mobile/ {
    # Serve mobile interface from the mobile service
    proxy_pass http://mobile:80/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_redirect off;
}

location /mobile {
    # Redirect /mobile to /mobile/ for consistency
    return 301 /mobile/;
}
```

**How it works**:
- `/mobile` requests are redirected to `/mobile/`
- `/mobile/` requests are proxied to the mobile service on the internal network
- The mobile service receives requests as if they came from `/` on its local server
- Response headers are properly forwarded

### 2. Mobile Nginx Configuration

**File**: `mobile/nginx-https.conf`

Simplified to handle requests from the frontend proxy:

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/javascript application/json;
}
```

**Changes**:
- Removed SSL configuration (handled by frontend)
- Simplified to serve content on port 80
- Relies on frontend proxy for HTTPS termination
- Added gzip compression for performance

### 3. Docker Network

The mobile service is on the same Docker network as the frontend:

```yaml
networks:
  - gps-network
```

This allows the frontend to reach the mobile service using the internal hostname `mobile:80`.

## Testing

### Test 1: Access Mobile Interface
```bash
curl -I https://maps.praxisnetworking.com/mobile
# Returns: HTTP/1.1 301 Moved Permanently (redirect to /mobile/)

curl -I https://maps.praxisnetworking.com/mobile/
# Returns: HTTP/1.1 200 OK
```

### Test 2: Verify Content
```bash
curl https://maps.praxisnetworking.com/mobile/ | grep -o '<title>.*</title>'
# Returns: <title>Maps Tracker - Mobile</title>
```

### Test 3: Browser Access
Open your browser and navigate to:
```
https://maps.praxisnetworking.com/mobile/
```

You should see the Maps Tracker mobile interface with the purple gradient background and form to submit location data.

## API Access from Mobile Interface

The mobile interface makes API calls to:
- `/api/gps` - Submit location coordinates
- `/api/vehicles` - Get list of vehicles
- `/api/places-of-interest` - Get places of interest
- etc.

These requests go through the frontend proxy to the backend service on port 5000.

**Request Flow**:
```
Mobile Interface (on /mobile/)
  ↓
Frontend Proxy (/api → backend:5000)
  ↓
Backend API (Flask, port 5000)
```

## SSL/HTTPS

The mobile interface is served over HTTPS with the same Let's Encrypt certificate as the main frontend:

- Certificate: `maps.praxisnetworking.com`
- Valid Until: February 7, 2026
- Protocols: TLS 1.2, TLS 1.3

## Performance Optimizations

### 1. Gzip Compression
The mobile interface HTML and assets are compressed using gzip for faster loading on mobile devices.

### 2. Internal Networking
The mobile service communicates with the frontend through Docker's internal network, avoiding the need for external routing and reducing latency.

### 3. Session Caching
Frontend SSL session caching applies to both the main interface and mobile endpoint.

## URL Structure

| Endpoint | Route | Description |
|----------|-------|-------------|
| Main Dashboard | `/` | React dashboard with tracking and admin |
| Mobile Interface | `/mobile/` | Mobile location data submission form |
| Mobile (no slash) | `/mobile` | Redirects to `/mobile/` |
| API | `/api/*` | Backend API endpoints |

## Troubleshooting

### Mobile interface returns 301 redirect loop
**Solution**: Ensure both containers have been restarted after configuration changes:
```bash
docker compose restart frontend mobile
```

### Cannot access `/mobile/` from outside network
**Solution**: Verify firewall allows HTTPS (port 443):
```bash
curl -I https://maps.praxisnetworking.com/mobile/
```

### Mobile interface loads but styling looks wrong
**Solution**: Clear browser cache:
- Chrome: Ctrl+Shift+Delete
- Firefox: Ctrl+Shift+Delete
- Safari: Cmd+Shift+Delete

### API calls from mobile return 404
**Solution**: Check backend is running:
```bash
docker compose ps backend
docker compose logs backend | tail -20
```

## Migration from Port-Based Access

### Old Way (No longer needed)
- Separate port: `https://maps.praxisnetworking.com:8443/`
- Separate container: `gps_mobile`
- Separate firewall rules

### New Way
- Same domain: `https://maps.praxisnetworking.com/mobile/`
- Proxied through frontend
- Single firewall rule (443)

You can still access the mobile service on the old ports if needed:
- `https://localhost:8443/` (local only)
- `http://localhost:8080/` (local only, redirects to HTTPS)

## Security Considerations

### 1. HTTPS Termination
All traffic to `/mobile/` is encrypted with TLS 1.2+ before reaching the mobile container. The mobile service only receives decrypted traffic on the internal network.

### 2. Same-Origin Policy
Both the main interface and mobile interface are served from the same domain (`maps.praxisnetworking.com`), so API calls don't require CORS for subpaths.

### 3. Header Forwarding
The frontend proxy forwards:
- `X-Real-IP`: Client's real IP address
- `X-Forwarded-For`: Proxy chain information
- `X-Forwarded-Proto`: Original request protocol (https)

This allows the backend to correctly identify clients and determine they connected via HTTPS.

## Files Modified

```
frontend/nginx-https.conf      - Added /mobile location blocks
mobile/nginx-https.conf        - Simplified for proxy mode
docker-compose.yml             - No changes (already configured)
```

## Related Documentation

- **docs/SSL_SETUP.md** - SSL certificate configuration
- **docs/DEPLOYMENT_TROUBLESHOOTING.md** - General troubleshooting
- **CLAUDE.md** - Project overview and architecture

## Support

For issues with the mobile interface endpoint, check:

1. Frontend container logs:
   ```bash
   docker compose logs frontend -f
   ```

2. Mobile container logs:
   ```bash
   docker compose logs mobile -f
   ```

3. Test basic connectivity:
   ```bash
   curl -v https://maps.praxisnetworking.com/mobile/
   ```

---

**Setup Date**: November 9, 2025
**Status**: ✓ Production Ready
**Endpoint**: https://maps.praxisnetworking.com/mobile/

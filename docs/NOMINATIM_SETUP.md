# Local Nominatim Setup for Fast Geocoding

This document explains the local Nominatim cache setup for fast location search/autosuggest in Suriname.

## Overview

The Maps Tracker now includes a local Nominatim geocoding service that provides:

- **Instant search results** - No network latency to external services
- **No rate limits** - Search as fast as you want
- **Offline capability** - Works without internet connection
- **Suriname-optimized** - Contains complete map data for Suriname (streets, businesses, landmarks)
- **Auto-updating** - Automatically updates from Geofabrik daily

## What is Nominatim?

Nominatim is the geocoding service that powers OpenStreetMap's search functionality. By running it locally with Suriname's map data, we get instant address/location search without relying on external services.

## Architecture

```
┌─────────────┐
│   Frontend  │ Search: "Waterkant"
│   (React)   │ ─────────────┐
└─────────────┘               │
                              ▼
┌─────────────┐        ┌──────────────┐        ┌─────────────────┐
│   Backend   │───────▶│  Nominatim   │───────▶│ Suriname OSM DB │
│   (Flask)   │        │   Service    │        │   (~15MB data)  │
└─────────────┘        └──────────────┘        └─────────────────┘
  /api/geocode         port 8081                PostgreSQL + GIS
```

## Setup Instructions

### 1. Download Suriname Map Data

Run the setup script to download Suriname OSM data from Geofabrik:

```bash
chmod +x setup-nominatim.sh
./scripts/setup/setup-nominatim.sh
```

This downloads `suriname-latest.osm.pbf` (~15MB compressed) to the `nominatim-data/` directory.

**Manual Download Alternative:**
```bash
mkdir -p nominatim-data
cd nominatim-data
curl -L -O https://download.geofabrik.de/south-america/suriname-latest.osm.pbf
cd ..
```

### 2. Start the Services

Start all services including the new Nominatim service:

```bash
docker compose up -d
```

### 3. Wait for Initial Import

The first time you start Nominatim, it needs to import the Suriname data into its database. This takes **5-10 minutes**.

Monitor the import progress:

```bash
docker compose logs -f nominatim
```

Look for these messages:
- `Import done.` - Data import complete
- `Nominatim is ready.` - Service is ready to accept requests

### 4. Verify It's Working

Once ready, test the geocoding service directly:

```bash
# Search for Paramaribo
curl "http://localhost:8081/search?q=Paramaribo&format=json&limit=5"

# Search for Waterkant
curl "http://localhost:8081/search?q=Waterkant&format=json&limit=5"
```

You should get JSON results with coordinates and place names.

### 5. Test in the Application

1. Open the Maps Tracker web interface
2. Use the search bar at the top of the map
3. Type any location in Suriname (e.g., "Waterkant", "Palmentuin", "Paramaribo")
4. Results should appear instantly without delays

## Configuration

### Environment Variables (.env)

```bash
# Use local Nominatim (default, recommended)
NOMINATIM_URL=http://nominatim:8080

# Or use public OpenStreetMap Nominatim (slower, rate limited)
# NOMINATIM_URL=https://nominatim.openstreetmap.org
```

### Docker Compose Service

The Nominatim service is defined in `docker-compose.yml`:

```yaml
nominatim:
  image: mediagis/nominatim:4.4
  ports:
    - "0.0.0.0:8081:8080"  # Access at http://localhost:8081
  volumes:
    - ./nominatim-data:/nominatim/data  # OSM data
    - nominatim-db:/var/lib/postgresql/14/main  # Database
```

## Search Capabilities

The local Nominatim instance can search for:

### Streets and Roads
- "Waterkant"
- "Henck Arronstraat"
- "Verlengde Gemenelandsweg"

### Neighborhoods and Districts
- "Paramaribo Noord"
- "Flora"
- "Blauwgrond"

### Cities and Towns
- "Paramaribo"
- "Lelydorp"
- "Nieuw Nickerie"

### Landmarks and Places
- "Palmentuin"
- "Jules Wijdenbosch Brug"
- "Onafhankelijkheidsplein"

### Postal Codes
- Works if available in OSM data

### Coordinates
- Direct coordinate search: "5.8520, -55.2038"

## Performance

### Before (Public Nominatim)
- **Response time**: 1-3 seconds (network dependent)
- **Rate limit**: 1 request per second
- **Reliability**: Subject to external service availability
- **Offline**: ❌ Requires internet

### After (Local Nominatim)
- **Response time**: 50-200ms (instant)
- **Rate limit**: ✅ None - search as fast as you want
- **Reliability**: ✅ Local service, always available
- **Offline**: ✅ Works completely offline

## Frontend Caching

The frontend (Map.jsx) includes additional client-side caching:

- **Cache size**: 50 most recent searches
- **Persistence**: Session-only (lost on page reload)
- **Benefit**: Instant results for repeated searches
- **Debouncing**: 1 second delay to avoid excessive requests

Combined with local Nominatim, this provides near-instant search results.

## Maintenance

### Updating Map Data

Nominatim automatically checks for updates from Geofabrik. To manually update:

```bash
# Download latest Suriname data
cd nominatim-data
curl -L -O https://download.geofabrik.de/south-america/suriname-latest.osm.pbf
cd ..

# Restart Nominatim to reimport
docker compose restart nominatim

# Monitor import (takes 5-10 minutes)
docker compose logs -f nominatim
```

### Storage Usage

- **OSM data**: ~15MB (suriname-latest.osm.pbf)
- **Database**: ~200-300MB (after import)
- **Total**: ~350MB

### Troubleshooting

#### Nominatim service won't start
```bash
# Check logs
docker compose logs nominatim

# Ensure data file exists
ls -lh nominatim-data/suriname-latest.osm.pbf

# Check disk space
df -h
```

#### Search returns no results
```bash
# Verify service is running
docker compose ps nominatim

# Check if import completed
docker compose logs nominatim | grep "Import done"

# Test directly
curl "http://localhost:8081/search?q=Paramaribo&format=json"
```

#### Import is taking too long
- First import takes 5-10 minutes depending on system resources
- Check CPU/RAM usage: `docker stats gps_nominatim`
- Minimum requirements: 2GB RAM, 2 CPU cores

#### Search is still slow
```bash
# Verify backend is using local Nominatim
docker compose logs backend | grep GEOCODE

# Should see: http://nominatim:8080/search
# Not: https://nominatim.openstreetmap.org/search
```

#### Want to use different region
Edit `docker-compose.yml`:
```yaml
nominatim:
  environment:
    # Change to any Geofabrik extract URL
    PBF_URL: file:///nominatim/data/your-region-latest.osm.pbf
```

Then download your region's data to `nominatim-data/`.

## API Endpoints

### Backend Geocoding API

**Endpoint**: `GET /api/geocode`

**Parameters**:
- `address` (required): Search query

**Example Request**:
```bash
curl "http://localhost:5000/api/geocode?address=Waterkant" \
  -H "Cookie: session=..." \
  --cookie-jar cookies.txt
```

**Example Response**:
```json
[
  {
    "name": "Waterkant, Paramaribo, Suriname",
    "latitude": 5.8242,
    "longitude": -55.1492,
    "type": "road",
    "importance": 0.625
  }
]
```

### Direct Nominatim API

**Endpoint**: `GET http://localhost:8081/search`

**Parameters**:
- `q`: Search query
- `format`: Response format (json, xml, geojson)
- `limit`: Max results (default 10)
- `viewbox`: Bounding box to prioritize results
- `bounded`: Restrict to viewbox (0 or 1)

**Example**:
```bash
curl "http://localhost:8081/search?q=Paramaribo&format=json&limit=5"
```

## Benefits Summary

✅ **Speed**: 10-20x faster than public Nominatim
✅ **Reliability**: No dependency on external services
✅ **Privacy**: All searches stay local
✅ **Offline**: Works without internet
✅ **No Rate Limits**: Search as frequently as needed
✅ **Auto-Updates**: Stays current with OSM data
✅ **Suriname-Optimized**: Complete coverage of all Suriname locations

## Resources

- **Nominatim Docker**: https://github.com/mediagis/nominatim-docker
- **Geofabrik Downloads**: https://download.geofabrik.de/south-america/suriname.html
- **Nominatim API Docs**: https://nominatim.org/release-docs/latest/api/Search/
- **OpenStreetMap**: https://www.openstreetmap.org/

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. View service logs: `docker compose logs nominatim`
3. Verify all services are running: `docker compose ps`
4. Test direct API access: `curl http://localhost:8081/search?q=test&format=json`

For persistent issues, you can always fall back to public Nominatim by changing `.env`:
```bash
NOMINATIM_URL=https://nominatim.openstreetmap.org
```

# Deployment Troubleshooting Guide

This guide covers common issues during deployment and how to resolve them.

## Nominatim Service Issues

### Problem: "gps_nominatim exited with code 37 (restarting)"

**Root Cause**: The container exits with error 37, which is a curl error meaning "Couldn't open file". This happens when:
1. The `nominatim-data` directory doesn't contain the required `suriname-latest.osm.pbf` file
2. The directory has restrictive permissions set by a previous Docker run
3. The setup script wasn't run before starting Docker Compose

**Solution**:

**Option 1: Fresh Setup (Recommended)**

Stop all services and clean up:
```bash
docker compose down
docker volume rm effective-guide_nominatim-db
rm -rf nominatim-data/
mkdir -p nominatim-data
```

Download the OSM data:
```bash
./scripts/setup/setup-nominatim.sh
```

Restart services:
```bash
docker compose up -d
```

**Option 2: If nominatim-data exists but has permission issues**

The `nominatim-data` directory may have been created by Docker with root ownership and restricted permissions. To fix:

```bash
docker compose down
sudo rm -rf nominatim-data/
mkdir -p nominatim-data
./scripts/setup/setup-nominatim.sh
docker compose up -d
```

**Option 3: Manual OSM Data Download**

If the setup script fails or you prefer manual control:

```bash
# Stop Docker if running
docker compose down

# Create the directory
mkdir -p nominatim-data

# Download the OSM data directly
cd nominatim-data
curl -L -O https://download.geofabrik.de/south-america/suriname-latest.osm.pbf
cd ..

# Start Docker
docker compose up -d

# Monitor the import
docker compose logs -f nominatim
```

### Expected Nominatim Import Process

After fixing the missing OSM file, Nominatim will start the import process. This is normal:

1. **Initial setup** (~30 seconds)
   - Creates PostgreSQL database
   - Initializes users and roles

2. **OSM data import** (~40 seconds)
   - Imports Suriname data using osm2pgsql
   - Processes nodes, ways, and relations

3. **Ranking process** (~2-3 minutes)
   - Processes place ranks (important step)
   - Watch for: `Done X/Y in N @ Z per second`

4. **Database validation** (~10 seconds)
   - Checks table integrity
   - Sets up replication
   - Prepares for serving

5. **Cache warming** (~30 seconds)
   - Pre-loads data into memory
   - Service becomes ready

Total time: **5-10 minutes** depending on system resources

### Monitor the Import

```bash
# Watch all logs
docker compose logs -f nominatim

# Search for key milestones
docker compose logs nominatim | grep -E "Starting rank|Import done|ready|OK"

# Check health status
docker compose ps nominatim
```

Once you see status change from "(health: starting)" to "(healthy)", the service is ready.

### Verify Nominatim is Working

Test the service directly:
```bash
curl "http://localhost:8081/search?q=Paramaribo&format=json&limit=3"
```

You should get JSON results with place information.

Test through the backend API:
```bash
curl "http://localhost:5000/api/geocode?address=Paramaribo" \
  -H "Cookie: session=YOUR_SESSION_COOKIE"
```

## Common Docker Issues

### Issue: Permission Denied Errors

**Cause**: Volume mounts or bind mounts have incorrect permissions

**Solution**:
```bash
# Check directory ownership
ls -ld nominatim-data

# If owned by root, stop Docker and remove
docker compose down
sudo rm -rf nominatim-data
mkdir -p nominatim-data
docker compose up -d
```

### Issue: Database Connection Failed

**Cause**: PostgreSQL not ready when backend starts

**Solution**: Already handled by healthcheck. If it persists:
```bash
# Check database health
docker compose logs db

# Restart only the database
docker compose restart db

# Wait 10 seconds, then restart backend
sleep 10
docker compose restart backend
```

### Issue: Ports Already in Use

**Cause**: Another service is using the required ports

**Example error**: "bind: address already in use"

**Solution**:
```bash
# Find what's using the port (e.g., 5000)
lsof -i :5000  # Linux/Mac
netstat -ano | findstr :5000  # Windows

# Either kill the process or change Docker port mapping in docker-compose.yml
# e.g., change "5000:5000" to "5001:5000"
```

### Issue: Docker Volume Conflicts

**Cause**: Stale Docker volumes from previous runs

**Solution**:
```bash
# See all volumes
docker volume ls

# Remove specific volume
docker volume rm effective-guide_nominatim-db

# Or remove all unused volumes
docker volume prune
```

### Issue: Out of Disk Space

**Cause**: Docker volumes have grown too large

**Solution**:
```bash
# Check disk usage
df -h

# Find largest Docker volumes
du -sh /var/lib/docker/volumes/*/_data | sort -h | tail -10

# Clean up Docker system
docker system prune -a --volumes
```

## Backend Issues

### Issue: Backend stuck in "(health: starting)"

**Cause**: Healthcheck failing or slow startup

**Solution**:
```bash
# Check backend logs
docker compose logs backend | tail -50

# Check if database is healthy
docker compose logs db | grep -E "ready|error"

# Restart backend after ensuring DB is healthy
docker compose restart backend
```

### Issue: API returns 502 Bad Gateway

**Cause**:
- Backend not running or crashed
- Nginx configuration issue
- Backend crashing due to database errors

**Solution**:
```bash
# Check if backend is running
docker compose ps backend

# View backend errors
docker compose logs backend | grep -i error | tail -20

# Restart backend
docker compose restart backend

# Check database
docker compose restart db
sleep 5
docker compose restart backend
```

## Frontend Issues

### Issue: Frontend shows "Connection refused"

**Cause**:
- Backend not running
- CORS configuration incorrect
- Incorrect API_URL in environment

**Solution**:
```bash
# Check backend is running
docker compose ps backend

# View frontend logs
docker compose logs frontend

# Check CORS_ORIGINS in .env
grep CORS_ORIGINS .env

# If using custom domain, verify backend is accessible from frontend
docker compose exec frontend curl http://backend:5000/api/health
```

## Database Issues

### Issue: Database won't start

**Cause**:
- Corrupted database volume
- Insufficient disk space
- PostgreSQL version mismatch

**Solution**:
```bash
# Check database logs
docker compose logs db

# If corrupted, delete and recreate volume
docker compose down
docker volume rm effective-guide_postgre*
docker compose up -d db

# Wait for database to initialize
docker compose logs db | grep "ready to accept"
```

### Issue: Can't connect to database from host

**Cause**: PostgreSQL not exposed or authentication failed

**Solution**:
```bash
# Database is only exposed internally to Docker network
# To connect from host, use docker exec:
docker compose exec db psql -U gpsadmin -d gps_tracker

# Or create a temporary container
docker run -it --network effective-guide_gps-network postgres:15-alpine psql -h db -U gpsadmin -d gps_tracker
```

## General Debugging

### Enable Verbose Logging

Check the CLAUDE.md file for application logs:
```bash
# View all application logs
tail -f logs/app.log

# View only errors
grep ERROR logs/error.log

# View location submissions
grep "api/gps" logs/access.log

# View auto-detected stops
grep "Auto-detected stop" logs/app.log
```

### Collect Diagnostic Information

```bash
# Container status
docker compose ps

# System information
docker system df

# All logs
docker compose logs > logs_dump.txt

# Service health checks
docker compose ps | grep -E "healthy|unhealthy"
```

### Reset Everything (Nuclear Option)

Use this only if nothing else works:

```bash
# Stop everything
docker compose down

# Remove all volumes
docker volume rm $(docker volume ls -q | grep effective-guide)

# Remove built images
docker rmi $(docker images | grep effective-guide | awk '{print $3}')

# Clean Docker system
docker system prune -a

# Rebuild and start
docker compose up -d --build
```

## Prevention

### Best Practices

1. **Always run setup before starting Docker**:
   ```bash
   ./scripts/setup/setup-nominatim.sh
   docker compose up -d
   ```

2. **Monitor logs during first startup**:
   ```bash
   docker compose logs -f
   ```

3. **Use health checks**:
   ```bash
   watch -n 2 'docker compose ps'
   ```

4. **Keep backups**:
   ```bash
   # Database backups are auto-created
   ls -lh backups/
   ```

5. **Check disk space regularly**:
   ```bash
   df -h | grep -E "Mounted|var|home"
   ```

## Getting Help

If issues persist:

1. **Check the logs** - Most issues appear in logs first
2. **Run diagnostics** - Collect system and container information
3. **Review documentation** - Check NOMINATIM_SETUP.md and CLAUDE.md
4. **Search issues** - Check repository for similar problems
5. **Report with logs** - Include full error messages and container logs

Common files to check:
- `logs/app.log` - Application events
- `logs/error.log` - Errors only
- `logs/access.log` - HTTP requests
- `.env` - Configuration (remove secrets before sharing)

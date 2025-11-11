# Docker Volume Setup and Permissions

**Status**: ✅ Production Ready

## Overview

Docker volumes can cause permission issues when containers try to write files to mounted directories. This guide explains how to properly initialize and manage Docker volumes for the Maps Tracker application.

---

## Quick Start

Before starting Docker for the first time, run:

```bash
./scripts/setup/init-docker-volumes.sh
```

This script will:
- Create all required directories (logs, backups, database, nominatim-data)
- Set proper ownership to your user
- Configure permissions for each directory type
- Stop running containers if needed

---

## Volume Permissions

Different directories need different permission levels:

### Logs Directory (`./logs`)
- **Permissions**: `777` (rwxrwxrwx)
- **Owner**: Current user
- **Reason**: Container processes need to create and write log files
- **Usage**: Application logs, monitoring logs, backup logs

### Backups Directory (`./backups`)
- **Permissions**: `777` (rwxrwxrwx)
- **Owner**: Current user
- **Reason**: Backend container creates backup files
- **Usage**: Database backups, restore files

### Database Directory (`./database`)
- **Permissions**: `700` (rwx------)
- **Owner**: Current user
- **Reason**: PostgreSQL requires strict permissions for security
- **Note**: Container will run as postgres (uid 70)

### Nominatim Data Directory (`./nominatim-data`)
- **Permissions**: `755` (rwxr-xr-x)
- **Owner**: Current user
- **Reason**: Nominatim imports and reads map data
- **Usage**: OSM PBF files, Nominatim database files

---

## Why Permission Issues Occur

### The Problem

1. When Docker creates volumes, they may be created with root ownership
2. Container processes run as specific users (e.g., `appuser`, `postgres`)
3. If the volume permissions don't match the container user, you get permission denied errors

### Example Error

```
PermissionError: [Errno 13] Permission denied: '/app/logs/app.log'
```

This happens because:
- The `./logs` directory is owned by root (mode 755)
- The backend container runs as `appuser` (uid 1000)
- `appuser` doesn't have write permissions to a root-owned directory

### Our Solution

We use multiple approaches:

1. **Pre-initialization Script**: Creates directories with correct permissions BEFORE containers start
2. **Volume Mount Flags**: Uses `:z` flags in docker-compose.yml for SELinux context sharing
3. **Container Permissions**: Backend Dockerfile creates directories with chmod 777
4. **Documentation**: Clear instructions for proper setup

---

## Manual Initialization (If Script Fails)

If `init-docker-volumes.sh` doesn't work for some reason:

```bash
# Create directories
mkdir -p logs backups database nominatim-data

# Set ownership (replace $USER with your username if needed)
chown $(id -u):$(id -g) logs backups database nominatim-data

# Set permissions
chmod 777 logs backups
chmod 700 database
chmod 755 nominatim-data
```

---

## Verifying Permissions

After initialization, verify permissions are correct:

```bash
ls -la | grep -E "logs|backups|database|nominatim"
```

Expected output:
```
drwxrwxrwx  logs
drwxrwxrwx  backups
drwx------  database
drwxr-xr-x  nominatim-data
```

---

## Troubleshooting

### Permission Denied on Logs

**Error**: `PermissionError: [Errno 13] Permission denied: '/app/logs/app.log'`

**Solution**:
```bash
# Recreate the logs directory
rm -rf logs
mkdir logs
chmod 777 logs
docker compose restart backend
```

### Permission Denied on Database

**Error**: `could not access the server`

**Solution**:
```bash
# PostgreSQL is strict about permissions
rm -rf database
mkdir database
chmod 700 database
docker compose down -v
docker compose up -d
```

### Backups Not Writable

**Error**: `Permission denied` when running backup scripts

**Solution**:
```bash
chmod 777 backups
./scripts/backup/backup-manager.sh --full
```

---

## Docker Compose Configuration

The `docker-compose.yml` includes volume mount flags for proper SELinux handling:

```yaml
backend:
  volumes:
    - ./backups:/app/backups:z
    - ./logs:/app/logs:z
```

The `:z` flag tells Docker to relabel the volume for SELinux context sharing.

---

## Container User Mappings

### Backend Container
- **Dockerfile User**: Creates non-root `appuser`
- **UID**: 1000 (typical for first non-root user)
- **Needs Write Access**: logs, backups

### PostgreSQL Container
- **Default User**: postgres (uid 70)
- **Needs Write Access**: database (very strict permissions)
- **Permissions**: 700 required

### Nominatim Container
- **Default User**: nominatim
- **Needs Write Access**: nominatim-data
- **Permissions**: 755 (read-only from some processes)

---

## Best Practices

### 1. Always Initialize Before First Start
```bash
./scripts/setup/init-docker-volumes.sh
./scripts/setup/setup-nominatim.sh
docker compose up -d
```

### 2. Never Use sudo for Docker Volumes
Avoid:
```bash
sudo chmod 777 logs  # Don't do this!
sudo chown root logs  # Don't do this!
```

This creates root-owned directories that containers can't access.

### 3. Keep Consistent Ownership
All volume directories should be owned by your user:
```bash
chown -R $(id -u):$(id -g) logs backups database nominatim-data
```

### 4. Recreate If Permissions Break
If permissions get corrupted:
```bash
docker compose down
rm -rf logs backups database
./scripts/setup/init-docker-volumes.sh
docker compose up -d
```

---

## Production Recommendations

For production deployments:

1. **Use dedicated user for application ownership**
   ```bash
   useradd -m -s /bin/bash gpsapp
   ```

2. **Initialize volumes as that user**
   ```bash
   su - gpsapp
   ./scripts/setup/init-docker-volumes.sh
   ```

3. **Use consistent user across all operations**
   - Database backups
   - Log rotation
   - Cron jobs

4. **Monitor volume health**
   ```bash
   # Check disk usage
   df -h | grep -E "logs|backups|database"

   # Check permissions
   ls -la | grep -E "logs|backups|database"

   # Check mounted volumes in containers
   docker inspect gps_backend | grep Mounts -A 20
   ```

---

## Advanced: Volume Mounting Options

### SELinux Flags

- `:z` - Shared SELinux context (what we use)
- `:Z` - Private SELinux context (less common)

### Read-Only Volumes

Some volumes should be read-only:
```yaml
volumes:
  - ./ssl:/etc/nginx/ssl:ro
  - ./mobile:/usr/share/nginx/html:ro
```

### Bind Mount Vs Named Volumes

We use **bind mounts** (host directory mounted directly):
- Easier to backup
- Visible from host filesystem
- Good for development

Named volumes are used for:
- `nominatim-db` - PostgreSQL data for Nominatim

---

## Cleanup and Reset

### Clean Everything (Development Only)
```bash
docker compose down -v
rm -rf logs backups database nominatim-data
./scripts/setup/init-docker-volumes.sh
docker compose up -d
```

### Keep Data (Just Fix Permissions)
```bash
docker compose down
./scripts/setup/init-docker-volumes.sh
docker compose up -d
```

---

## Related Documentation

- [README.md](../README.md) - Quick start guide with volume initialization step
- [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md) - Permission error troubleshooting
- [docker-compose.yml](../docker-compose.yml) - Volume mount configuration

---

## Questions?

If you encounter permission issues not covered here:

1. Check the initialization script was run: `ls -la logs backups database`
2. Verify container user: `docker exec gps_backend id`
3. Check Docker logs: `docker compose logs backend | tail -20`
4. Review [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md)

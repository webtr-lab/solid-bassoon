# Application Logging Guide

This document describes the logging system for the Maps Tracker application and how to use it for debugging.

## Overview

The application now maintains persistent log files on the local server for debugging and monitoring. Logs are stored in the `logs/` directory and are automatically rotated to prevent disk space issues.

## Log Files

Three main log files are created in the `logs/` directory:

### 1. `app.log` - General Application Logs
- Contains all application events (INFO level and above)
- Includes: startup messages, database operations, stop detection, backups, etc.
- **Max size**: 10MB per file
- **Retention**: 10 backup files (app.log.1, app.log.2, etc.)

### 2. `error.log` - Error Logs Only
- Contains ERROR and CRITICAL level messages only
- Useful for quickly identifying problems
- **Max size**: 10MB per file
- **Retention**: 10 backup files

### 3. `access.log` - HTTP Access Logs
- Contains all HTTP requests and responses
- Format: `[timestamp] METHOD /path - IP: x.x.x.x`
- **Max size**: 10MB per file
- **Retention**: 10 backup files

## Viewing Logs

### Real-time Monitoring

View live logs from Docker containers:

```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Last 100 lines and follow
docker compose logs -f --tail=100 backend
```

### File-based Logs

View persistent log files directly:

```bash
# View general application log
tail -f logs/app.log

# View error log
tail -f logs/error.log

# View access log
tail -f logs/access.log

# View last 100 lines
tail -100 logs/app.log

# Search for specific errors
grep "ERROR" logs/app.log

# Search for location data submissions
grep "api/gps" logs/access.log

# Search for stop detections
grep "Auto-detected stop" logs/app.log
```

## Log Rotation

Logs are automatically rotated in two ways:

### 1. Application-level Rotation (Built-in)
- Managed by Python's `RotatingFileHandler`
- Rotates when file reaches 10MB
- Keeps 10 backup files
- **Total storage per log type**: ~100MB max
- No configuration needed - works automatically

### 2. Host-level Rotation (Optional with logrotate)
- Additional rotation at the system level
- Configuration file: `logrotate.conf`

To install host-level rotation:

```bash
# Copy configuration to system
sudo cp logrotate.conf /etc/logrotate.d/gps-tracker

# Test the configuration
sudo logrotate -d /etc/logrotate.d/gps-tracker

# Force rotation manually (for testing)
sudo logrotate -f /etc/logrotate.d/gps-tracker
```

The logrotate configuration:
- Rotates daily
- Keeps 30 days of logs
- Compresses old logs (saves disk space)
- Runs automatically via system cron

## Log Levels

The application uses standard Python logging levels:

- **DEBUG**: Detailed information, typically only enabled in development
- **INFO**: General informational messages (default in production)
- **WARNING**: Warning messages for unexpected but handled situations
- **ERROR**: Error messages for failures
- **CRITICAL**: Critical errors that may cause application failure

## Important Logged Events

### Application Startup
```
[2025-10-30 10:00:00] INFO in logging_config: Logging system initialized
[2025-10-30 10:00:00] INFO in logging_config: Log directory: /app/logs
[2025-10-30 10:00:00] INFO in main: Created 5 default vehicles
[2025-10-30 10:00:00] WARNING in main: IMPORTANT: Default admin user created
```

### Location Data Reception
```
[2025-10-30 10:05:00] INFO in logging_config: POST /api/gps - IP: 172.18.0.1
[2025-10-30 10:05:00] INFO in logging_config: POST /api/gps - Status: 201
```

### Stop Detection
```
[2025-10-30 10:10:00] INFO in main: Auto-detected stop for vehicle_id=1, duration=7min, location=(5.852000, -55.203800)
```

### Automatic Backups
```
[2025-10-30 02:00:00] INFO in main: Running automatic backup...
[2025-10-30 02:00:05] INFO in main: Automatic backup created: backup_20251030_020000.sql
```

### Geocoding Requests
```
[2025-10-30 10:15:00] INFO in main: [GEOCODE] Requesting: http://nominatim:8080/search?q=Paramaribo...
[2025-10-30 10:15:01] INFO in main: [GEOCODE] Response status: 200
[2025-10-30 10:15:01] INFO in main: [GEOCODE] Found 10 results from http://nominatim:8080
```

### Errors
```
[2025-10-30 10:20:00] ERROR in main: [GEOCODE ERROR] URL Error: Connection refused
[2025-10-30 10:20:00] ERROR in main: [GEOCODE ERROR] Is the Nominatim service running? Check: docker compose logs nominatim
```

## Debugging Common Issues

### Issue: Can't see logs in files

**Check 1**: Ensure the logs directory has correct permissions
```bash
ls -la logs/
# Should show files owned by your user
```

**Check 2**: Restart backend container to ensure logging is initialized
```bash
docker compose restart backend
docker compose logs -f backend
```

### Issue: Log files are missing

**Check 1**: Verify Docker volume mount
```bash
docker compose config | grep -A 5 "backend:"
# Should show: - ./logs:/app/logs
```

**Check 2**: Recreate containers
```bash
docker compose down
docker compose up -d
```

### Issue: Logs are too large

**Solution**: Logs rotate automatically, but you can manually clean old logs:
```bash
# Remove old rotated logs (keeps main log files)
rm logs/*.log.[5-9]
rm logs/*.log.10

# Or archive old logs
mkdir -p logs/archive
mv logs/*.log.* logs/archive/
gzip logs/archive/*.log.*
```

### Issue: Need to increase log retention

Edit `backend/app/logging_config.py`:
```python
# Change backupCount from 10 to desired value
RotatingFileHandler(
    os.path.join(log_dir, 'app.log'),
    maxBytes=10485760,  # 10MB
    backupCount=20      # Change to keep more backups
)
```

Then rebuild:
```bash
docker compose up -d --build backend
```

## Log Analysis Tips

### Find all errors in the last hour
```bash
# Get timestamp from 1 hour ago
date -d '1 hour ago' '+%Y-%m-%d %H:%M:%S'

# Search for errors after that time
awk -v time="2025-10-30 09:00:00" '$0 > "["time"]" && /ERROR/' logs/app.log
```

### Count requests by endpoint
```bash
grep "POST /api" logs/access.log | cut -d' ' -f2,3 | sort | uniq -c | sort -rn
```

### Find slow requests (if timing is added)
```bash
grep "Status: 5" logs/access.log  # 5xx errors
```

### Monitor for specific vehicle
```bash
tail -f logs/app.log | grep "vehicle_id=1"
```

### Export logs for external analysis
```bash
# Last 24 hours of errors
grep "ERROR" logs/app.log > errors_$(date +%Y%m%d).log

# Compress for sending
tar -czf logs_$(date +%Y%m%d).tar.gz logs/*.log
```

## Log Locations Summary

| Location | Purpose | Max Size |
|----------|---------|----------|
| `logs/app.log` | General application logs | 100MB (10 files × 10MB) |
| `logs/error.log` | Error logs only | 100MB (10 files × 10MB) |
| `logs/access.log` | HTTP request/response logs | 100MB (10 files × 10MB) |
| Console (docker logs) | Real-time monitoring | System memory limit |

## Integration with Monitoring Tools

These log files can be integrated with log aggregation and monitoring tools:

### Filebeat / Logstash
```yaml
filebeat.inputs:
- type: log
  paths:
    - /home/demo/effective-guide/logs/*.log
  fields:
    application: maps-tracker
```

### Grafana Loki
```yaml
- job_name: maps-tracker
  static_configs:
  - targets:
      - localhost
    labels:
      job: maps-tracker
      __path__: /home/demo/effective-guide/logs/*.log
```

### Simple monitoring script
```bash
#!/bin/bash
# monitor-errors.sh - Email when errors occur

ERROR_COUNT=$(grep -c "ERROR" logs/app.log)
if [ $ERROR_COUNT -gt 0 ]; then
    mail -s "Maps Tracker Errors Detected" admin@example.com < logs/error.log
fi
```

## Disable Logging (Not Recommended)

If you need to disable file logging temporarily:

1. Remove log volume mount from `docker-compose.yml`:
```yaml
volumes:
  - ./backups:/app/backups
  # - ./logs:/app/logs  # Commented out
```

2. Restart containers:
```bash
docker compose up -d backend
```

Note: Console logging (docker logs) will still work.

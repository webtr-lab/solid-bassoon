# Server-Level Backup System

This document describes the server-level backup system for the GPS Tracker application, which operates independently from the application's built-in backup functionality.

## Overview

The GPS Tracker application provides **two complementary backup systems**:

### 1. Application-Level Backups (Built-in)

Located in: `backend/app/main.py`

- **Automatic**: Runs daily at 2:00 AM UTC via APScheduler
- **On Startup**: Creates a backup every time the backend container starts
- **Manual**: Via Admin Dashboard → Backups tab
- **Naming**: `backup_YYYYMMDD_HHMMSS.sql` or `manual_*.sql`
- **Retention**: Keeps last 10 automatic backups
- **Storage**: `/app/backups` inside container → `./backups/` on host

### 2. Server-Level Backups (Recommended for Production)

Located in: `backup-server.sh` and `setup-cron-backup.sh`

- **Independent**: Runs outside the application, more reliable
- **Cron-based**: Can be scheduled independently of application
- **Naming**: `server_backup_YYYYMMDD_HHMMSS.sql` (clearly differentiated)
- **Retention**: Keeps last 20 backups + removes backups >30 days old
- **Logging**: Writes to `backup-server.log`
- **Storage**: `./backups/` directory

## Why Two Backup Systems?

**Redundancy**: If the application fails, server-level backups continue working

**Independence**: Server backups don't depend on application code or container health

**Flexibility**: Different retention policies and schedules for different needs

**Clarity**: Different naming conventions make it easy to identify backup source

## Server Backup Scripts

### backup-server.sh

The main backup script that creates database backups from the server level.

**Location**: `/home/demo/effective-guide/backup-server.sh`

**Usage:**
```bash
# Create backup with timestamp name
./backup-server.sh

# Create backup with custom name
./backup-server.sh pre_upgrade
./backup-server.sh before_v2_migration

# View help
./backup-server.sh --help
```

**Features:**
- ✅ Checks Docker and database container status
- ✅ Loads credentials from `.env` file
- ✅ Creates backups with clear naming convention
- ✅ Validates write permissions
- ✅ Shows file size and path after creation
- ✅ Automatic cleanup of old backups
- ✅ Lists all server backups after completion
- ✅ Colored output for easy reading
- ✅ Error handling and validation

**Backup Naming:**
- Default: `server_backup_YYYYMMDD_HHMMSS.sql`
- Custom: `server_backup_<custom_name>.sql`

**Example Output:**
```
==========================================
  GPS Tracker - Server Backup Script
==========================================

[INFO] Creating backup: server_backup_20251030_005601.sql
[INFO] Target: /home/demo/effective-guide/backups/server_backup_20251030_005601.sql
[SUCCESS] Backup created successfully!
[INFO] File: /home/demo/effective-guide/backups/server_backup_20251030_005601.sql
[INFO] Size: 12K

[INFO] Cleaning up old server backups...
[INFO] No old backups to clean up

[INFO] Server backups in /home/demo/effective-guide/backups:

  server_backup_20251030_005601.sql           12K  2025-10-30 00:56:01

[INFO] Total server backups: 1

[SUCCESS] Backup process completed successfully!
```

### setup-cron-backup.sh

Helper script to set up automated backups using cron.

**Location**: `/home/demo/effective-guide/setup-cron-backup.sh`

**Usage:**
```bash
# Interactive setup
./setup-cron-backup.sh

# List current cron jobs
./setup-cron-backup.sh --list

# Remove cron jobs
./setup-cron-backup.sh --remove
```

**Pre-configured Schedules:**

1. **Daily at 2:00 AM**
   - `0 2 * * *`
   - Best for regular daily backups

2. **Daily at 3:00 AM** (if app backups at 2 AM)
   - `0 3 * * *`
   - Runs 1 hour after application backups

3. **Every 6 hours**
   - `0 */6 * * *`
   - For high-frequency backups

4. **Every 12 hours** (2 AM and 2 PM)
   - `0 2,14 * * *`
   - Balance between frequency and storage

5. **Weekly on Sunday at 3:00 AM**
   - `0 3 * * 0`
   - For weekly backup strategy

6. **Custom schedule**
   - Enter your own cron expression

**Example Output:**
```
==========================================
  GPS Tracker - Cron Backup Setup
==========================================

[INFO] Current cron jobs for demo:

  (No GPS Tracker backup jobs found)

==========================================
  Common Backup Schedules
==========================================

1) Daily at 2:00 AM
   0 2 * * * /home/demo/effective-guide/backup-server.sh >> /home/demo/effective-guide/backup-server.log 2>&1

2) Daily at 3:00 AM (if app backups at 2 AM)
   0 3 * * * /home/demo/effective-guide/backup-server.sh >> /home/demo/effective-guide/backup-server.log 2>&1

...

Select a schedule option (1-6) or 'q' to quit:
```

## Backup Naming Conventions

To avoid confusion, different backup types use different naming conventions:

| Type | Naming Convention | Example | Location |
|------|------------------|---------|----------|
| App Automatic | `backup_YYYYMMDD_HHMMSS.sql` | `backup_20251030_020000.sql` | `./backups/` |
| App Manual | `manual_<name>.sql` | `manual_before_update.sql` | `./backups/` |
| Server | `server_backup_YYYYMMDD_HHMMSS.sql` | `server_backup_20251030_030000.sql` | `./backups/` |
| Server Custom | `server_backup_<name>.sql` | `server_backup_pre_upgrade.sql` | `./backups/` |

**Benefits:**
- Easy to identify backup source at a glance
- No naming conflicts between systems
- Clear audit trail of backup creation method

## Setup Instructions

### Initial Setup

1. **Make scripts executable:**
```bash
chmod +x backup-server.sh setup-cron-backup.sh
```

2. **Fix backup directory permissions (if needed):**
```bash
sudo chown -R $USER:$USER backups/
```

3. **Test the backup script:**
```bash
./backup-server.sh test
```

4. **Set up automated backups:**
```bash
./setup-cron-backup.sh
```

### Recommended Production Setup

For production environments, we recommend:

**Dual Backup Strategy:**
- **Application backups**: Daily at 2:00 AM UTC
- **Server backups**: Daily at 3:00 AM local time

This provides:
- Hourly offset prevents conflicts
- Redundancy if one system fails
- Different triggering mechanisms (app vs cron)

**Setup commands:**
```bash
# Set up server backups to run at 3 AM
./setup-cron-backup.sh
# Select option 2: "Daily at 3:00 AM"
```

## Backup Retention Policies

### Application-Level Retention

Defined in `backend/app/main.py:972-977`:
```python
if len(backups) > 10:
    for old_backup in backups[:-10]:
        os.remove(old_backup)
```

- **Keeps**: Last 10 automatic backups
- **Manual backups**: Never auto-deleted
- **Applied**: Every time automatic backup runs

### Server-Level Retention

Defined in `backup-server.sh:139-166`:
- **Age-based**: Removes backups older than 30 days
- **Count-based**: Keeps maximum 20 server backups
- **Applied**: Every time server backup runs

**Configuration:**
```bash
RETENTION_DAYS=30        # Keep backups for 30 days
MAX_SERVER_BACKUPS=20    # Keep max 20 backups
```

To change retention, edit these variables in `backup-server.sh`.

## Monitoring Backups

### View All Backups

```bash
ls -lh backups/
```

**Output example:**
```
-rw-r--r-- 1 demo demo 15K Oct 30 02:00 backup_20251030_020000.sql          (App automatic)
-rw-r--r-- 1 demo demo 15K Oct 30 03:00 server_backup_20251030_030000.sql (Server automatic)
-rw-r--r-- 1 demo demo 15K Oct 30 10:30 manual_pre_upgrade.sql             (App manual)
-rw-r--r-- 1 demo demo 15K Oct 30 10:32 server_backup_pre_upgrade.sql     (Server manual)
```

### View Server Backup Logs

```bash
# View recent logs
tail -f backup-server.log

# View all logs
cat backup-server.log

# Search for errors
grep ERROR backup-server.log
```

### Check Cron Jobs

```bash
# List all cron jobs
crontab -l

# List only backup jobs
crontab -l | grep backup-server
```

### Verify Last Backup

```bash
# Check most recent server backup
ls -lt backups/server_backup_*.sql | head -1

# Check backup age
find backups/ -name "server_backup_*.sql" -mtime -1
```

## Restoring from Backups

### restore-server.sh - Server Restore Script

The safest and recommended way to restore backups.

**Location**: `/home/demo/effective-guide/restore-server.sh`

**Usage:**
```bash
# Interactive mode - select from numbered list
./restore-server.sh

# Restore specific backup by name
./restore-server.sh server_backup_20251030_030000.sql
./restore-server.sh backup_20251030_020000.sql
./restore-server.sh manual_pre_upgrade.sql

# Restore latest backup
./restore-server.sh --latest

# List available backups
./restore-server.sh --list

# Show help
./restore-server.sh --help
```

**Safety Features:**

1. **Pre-Restore Backup**: Automatically creates a backup before restoring (named `pre_restore_YYYYMMDD_HHMMSS.sql`)
2. **Backup Validation**: Checks file existence, readability, and PostgreSQL dump signature
3. **Explicit Confirmation**: Requires typing "yes" to proceed
4. **Backup Details**: Shows size, date, and first lines before restoring
5. **Connection Handling**: Drops active database connections before restore
6. **Backend Restart**: Automatically restarts backend after restore to clear cache
7. **Color-Coded Output**: Easy to read status messages

**Interactive Mode Example:**

```bash
$ ./restore-server.sh

==========================================
  GPS Tracker - Database Restore
==========================================

==========================================
  Available Backups
==========================================

  1) [Server]   server_backup_20251030_030000.sql       16K  2025-10-30 03:00:00
  2) [App Auto] backup_20251030_020000.sql              16K  2025-10-30 02:00:00
  3) [Manual]   manual_pre_upgrade.sql                  16K  2025-10-29 15:30:00

[INFO] Total backups: 3

Enter backup number, filename, or 'q' to quit:
1

==========================================
  Backup Details
==========================================

  Filename: server_backup_20251030_030000.sql
  Size:     16K
  Created:  2025-10-30 03:00:00 (0 days ago)
  Path:     /home/demo/effective-guide/backups/server_backup_20251030_030000.sql

  First lines:
    -- PostgreSQL database dump
    -- Dumped from database version 15.14

[WARNING] ⚠️  WARNING: This will OVERWRITE all current database data!
Are you absolutely sure you want to restore from this backup? (yes/no)
yes

[IMPORTANT] Creating pre-restore backup for safety...
[SUCCESS] Pre-restore backup created: pre_restore_20251030_040000.sql (16K)
  Location: /home/demo/effective-guide/backups/pre_restore_20251030_040000.sql

[INFO] Starting restore from: server_backup_20251030_030000.sql
[INFO] This will overwrite all current database data!

[INFO] Dropping active database connections...
[INFO] Restoring database...

[SUCCESS] Database restored successfully!

[INFO] Restored from: server_backup_20251030_030000.sql
[INFO] Restarting backend to clear cache...
[SUCCESS] Backend restarted

[IMPORTANT] Database restore complete!
[INFO] Please verify the application is working correctly
```

**Direct Restore Example:**

```bash
$ ./restore-server.sh server_backup_20251030_030000.sql

==========================================
  GPS Tracker - Database Restore
==========================================

==========================================
  Backup Details
==========================================

  Filename: server_backup_20251030_030000.sql
  Size:     16K
  Created:  2025-10-30 03:00:00 (0 days ago)
  Path:     /home/demo/effective-guide/backups/server_backup_20251030_030000.sql

  First lines:
    -- PostgreSQL database dump
    -- Dumped from database version 15.14

[WARNING] ⚠️  WARNING: This will OVERWRITE all current database data!

Continue with restore? (yes/no): yes

[IMPORTANT] Creating pre-restore backup for safety...
[SUCCESS] Pre-restore backup created: pre_restore_20251030_040005.sql (16K)

[INFO] Starting restore from: server_backup_20251030_030000.sql
...
[SUCCESS] Database restored successfully!
```

**Restore Latest Backup:**

```bash
$ ./restore-server.sh --latest

==========================================
  GPS Tracker - Restore Latest Backup
==========================================

[INFO] Latest backup found:

==========================================
  Backup Details
==========================================

  Filename: server_backup_20251030_030000.sql
  Size:     16K
  Created:  2025-10-30 03:00:00 (0 days ago)
  Path:     /home/demo/effective-guide/backups/server_backup_20251030_030000.sql

[WARNING] ⚠️  WARNING: This will OVERWRITE all current database data!

Restore from latest backup? (yes/no): yes
...
```

**Configuration:**

To disable automatic pre-restore backups, edit `restore-server.sh`:

```bash
CREATE_PRE_RESTORE_BACKUP=false  # Default: true
```

### From Command Line (Manual)

For advanced users who want to restore without the script:

```bash
# Restore from any backup file
docker compose exec -T db psql -U gpsadmin gps_tracker < backups/server_backup_20251030_030000.sql

# Restore with confirmation
echo "This will overwrite all current data. Continue? (y/N)"
read -r response
if [[ "$response" =~ ^[Yy]$ ]]; then
    docker compose exec -T db psql -U gpsadmin gps_tracker < backups/server_backup_pre_upgrade.sql
fi

# Restart backend after restore
docker compose restart backend
```

### From Admin Dashboard

1. Log in as admin
2. Go to Admin Panel → Backups tab
3. Find the backup in the list
4. Click "Restore" button
5. Confirm the action

**Note**: The dashboard can restore any `.sql` backup file, including server-level backups. However, it does not create a pre-restore backup automatically.

## Backup Best Practices

### 1. Multiple Backup Locations

**Current**: All backups in `./backups/` directory

**Recommendation**: Copy critical backups off-server

```bash
# Daily off-site backup (add to cron)
0 4 * * * rsync -az /path/to/backups/ user@backup-server:/backups/gps-tracker/

# Or use cloud storage
0 4 * * * aws s3 sync /path/to/backups/ s3://my-bucket/gps-tracker-backups/
```

### 2. Test Restores Regularly

```bash
# Monthly restore test to temporary database
docker compose exec db createdb -U gpsadmin test_restore
docker compose exec -T db psql -U gpsadmin test_restore < backups/server_backup_latest.sql
docker compose exec db dropdb -U gpsadmin test_restore
```

### 3. Document Restore Procedures

Keep restore instructions accessible outside the server:
- Print this document
- Store in password manager
- Share with team members

### 4. Monitor Backup Success

Set up monitoring for:
- Backup file creation
- Backup file size (should be consistent)
- Cron job execution
- Log file errors

**Example monitoring script:**
```bash
#!/bin/bash
# Check if backup was created today
if ! find backups/ -name "server_backup_*.sql" -mtime -1 | grep -q .; then
    echo "ERROR: No server backup created in last 24 hours!" | mail -s "Backup Alert" admin@example.com
fi
```

### 5. Backup Verification

After each backup, verify:
- File size (should be > 10KB)
- File readability
- SQL syntax validity

```bash
# Verify backup file
backup_file="backups/server_backup_latest.sql"
if [ -f "$backup_file" ] && [ -s "$backup_file" ]; then
    head -1 "$backup_file" | grep -q "PostgreSQL database dump" && echo "✓ Valid backup"
fi
```

## Troubleshooting

### Permission Denied Errors

**Problem**: `Permission denied` when creating backups

**Solution:**
```bash
# Fix directory permissions
sudo chown -R $USER:$USER backups/

# Or run script with sudo
sudo ./backup-server.sh
```

### Database Container Not Running

**Problem**: `Database container (gps_db) is not running`

**Solution:**
```bash
# Start database container
docker compose up -d db

# Check container status
docker compose ps db
```

### Cron Job Not Running

**Problem**: Scheduled backups not being created

**Check cron logs:**
```bash
# Ubuntu/Debian
grep CRON /var/log/syslog | tail -20

# Or check systemd journal
journalctl -u cron -n 20
```

**Common issues:**
1. Cron PATH doesn't include `docker compose`
   - Use full path: `/usr/bin/docker compose`
2. Script not executable
   - Run: `chmod +x backup-server.sh`
3. Wrong working directory
   - Use `cd /path/to/project && ./backup-server.sh` in cron

**Fix cron PATH:**
```bash
crontab -e

# Add at top of crontab
PATH=/usr/local/bin:/usr/bin:/bin
SHELL=/bin/bash

# Then add your backup job
0 3 * * * cd /home/demo/effective-guide && ./backup-server.sh >> backup-server.log 2>&1
```

### Backup File is Empty (0 bytes)

**Problem**: Backup completes but file is 0 bytes

**Causes:**
1. pg_dump failed silently
2. Wrong database credentials
3. Database doesn't exist

**Debug:**
```bash
# Test pg_dump manually
docker compose exec db pg_dump -U gpsadmin gps_tracker | head -20

# Check database exists
docker compose exec db psql -U gpsadmin -l

# Verify .env credentials
cat .env | grep POSTGRES
```

### Backup Too Large

**Problem**: Backups consuming too much disk space

**Solutions:**

1. **Compress backups:**
```bash
# Modify backup script to use gzip
docker compose exec -T db pg_dump -U gpsadmin gps_tracker | gzip > backup.sql.gz
```

2. **Reduce retention:**
```bash
# Edit backup-server.sh
RETENTION_DAYS=7         # Instead of 30
MAX_SERVER_BACKUPS=5     # Instead of 20
```

3. **Use custom format (smaller):**
```bash
# More efficient than plain SQL
docker compose exec db pg_dump -U gpsadmin -F c gps_tracker -f /tmp/backup.dump
docker compose cp db:/tmp/backup.dump backups/
```

## Maintenance Tasks

### Weekly

- Review backup logs for errors
- Verify recent backups exist
- Check disk space usage

```bash
# Quick weekly check script
echo "=== Backup Status ==="
echo "Server backups (last 7 days):"
find backups/ -name "server_backup_*.sql" -mtime -7 -ls
echo ""
echo "App backups (last 7 days):"
find backups/ -name "backup_*.sql" -mtime -7 -ls
echo ""
echo "Disk usage:"
du -sh backups/
```

### Monthly

- Test restore procedure
- Review retention policies
- Update documentation if needed
- Verify off-site backups (if configured)

### Quarterly

- Review backup strategy
- Test disaster recovery procedure
- Update team on restore procedures
- Audit backup access permissions

## Advanced Configuration

### Custom Backup Schedule Examples

```bash
# Every 4 hours during business hours (9 AM - 5 PM)
0 9-17/4 * * 1-5 /path/to/backup-server.sh

# First day of every month at 1 AM
0 1 1 * * /path/to/backup-server.sh monthly

# Every Sunday and Wednesday at 2:30 AM
30 2 * * 0,3 /path/to/backup-server.sh

# Every 2 hours, only on weekdays
0 */2 * * 1-5 /path/to/backup-server.sh
```

### Backup Rotation Script

Create custom rotation beyond built-in retention:

```bash
#!/bin/bash
# Keep: 7 daily, 4 weekly, 12 monthly

BACKUP_DIR="/path/to/backups"

# Keep last 7 days
find "$BACKUP_DIR" -name "server_backup_*.sql" -mtime +7 -mtime -35 -delete

# Keep 4 weekly backups (Sundays only)
# Keep 12 monthly backups (1st of month only)
# Implementation left as exercise
```

### Backup to Multiple Locations

```bash
#!/bin/bash
# Backup and copy to multiple locations

# Create backup
./backup-server.sh production_$(date +%Y%m%d)

# Copy to network share
cp backups/server_backup_* /mnt/nas/gps-backups/

# Upload to S3
aws s3 cp backups/ s3://my-backups/gps-tracker/ --recursive --exclude "*" --include "server_backup_*"

# Upload to Dropbox (using rclone)
rclone copy backups/ dropbox:GPS-Tracker-Backups/ --include "server_backup_*"
```

## Security Considerations

1. **Backup Encryption**
   - Consider encrypting backups for sensitive data
   - Use gpg or openssl for encryption

2. **Access Control**
   - Restrict backup directory permissions
   - Use separate user for automated backups

3. **Secure Transfer**
   - Use SSH/SCP for off-site transfers
   - Enable encryption for cloud uploads

4. **Retention Compliance**
   - Ensure retention policies meet regulatory requirements
   - Document data retention policies

## Conclusion

The server-level backup system provides:
- ✅ Reliable, independent backups
- ✅ Clear naming to differentiate from app backups
- ✅ Automated cleanup and retention
- ✅ Easy setup with cron integration
- ✅ Comprehensive logging
- ✅ Production-ready reliability

Use it alongside application-level backups for maximum data protection.

---

**Quick Reference Commands:**

```bash
# === BACKUP ===

# Create backup now
./backup-server.sh

# Create named backup
./backup-server.sh pre_upgrade

# Setup cron
./setup-cron-backup.sh

# List cron jobs
crontab -l

# View logs
tail -f backup-server.log

# Check recent backups
ls -lt backups/server_backup_*.sql | head -5

# === RESTORE ===

# Restore interactively (choose from list)
./restore-server.sh

# Restore specific backup
./restore-server.sh server_backup_YYYYMMDD_HHMMSS.sql

# Restore latest backup
./restore-server.sh --latest

# List available backups
./restore-server.sh --list

# Manual restore (advanced)
docker compose exec -T db psql -U gpsadmin gps_tracker < backups/server_backup_YYYYMMDD_HHMMSS.sql
```

---

For questions or issues, see BACKUP_VERIFICATION.md or README.md.

# Backup & Restore Operations - Server-Side Only

## Overview

**Important Change**: The Backup & Restore functionality has been **removed from the Admin Panel UI** and is now only accessible via **server-side operations**.

**New Features (November 2025)**:
- ✅ **6-month retention** (180 days) - increased from 10 days
- ✅ **Organized folder structure** - Backups organized by date (YYYY/MM/DD)
- ✅ **Full + Daily backups** - Weekly full backups (Sundays) + daily backups
- ✅ **Automatic compression** - Backups >30 days old are compressed
- ✅ **Metadata tracking** - JSON metadata for each backup
- ✅ **Backup index** - Fast lookup and restore
- ✅ **Smart restore script** - Interactive restore with safety features
- ✅ **Same structure on local and remote** - Consistent everywhere

This change ensures:
- ✅ Better security (no web-based restore operations)
- ✅ No accidental data loss from UI clicks
- ✅ Proper backup management through server access
- ✅ Automatic backups continue to run normally
- ✅ Easy navigation and fast restore

---

## 📚 Complete Documentation

**For comprehensive backup system documentation, see**: [BACKUP_SYSTEM.md](BACKUP_SYSTEM.md)

This file (BACKUP_OPERATIONS.md) provides a quick overview. For detailed information including:
- Complete folder structure explanation
- All command examples
- Metadata and index details
- Troubleshooting guide
- Migration instructions

**Please refer to BACKUP_SYSTEM.md**

---

## What Was Removed

### **Admin Panel UI Changes**

**Removed**:
- ❌ "Backups" tab in Admin Panel
- ❌ BackupsManagement component
- ❌ UI for creating manual backups
- ❌ UI for restoring backups
- ❌ UI for downloading backups
- ❌ UI for deleting backups

**Still Available in UI**:
- ✅ Users management
- ✅ Vehicles management
- ✅ Places of Interest management
- ✅ Visit Reports

---

## What Still Works (Server-Side)

### **1. Automatic Backups** ✅ OPERATIONAL (UPGRADED)

**Schedule**: Daily at 2:00 AM
**Script**: Backend Flask application (`backend/app/main.py`) + `backup-manager.sh`
**Location**: `/home/demo/effective-guide/backups/full/` and `/home/demo/effective-guide/backups/daily/`
**Backup Types**:
- **Full backup**: Every Sunday at 2 AM (stored in `backups/full/YYYY/MM/DD/`)
- **Daily backup**: Monday-Saturday at 2 AM (stored in `backups/daily/YYYY/MM/DD/`)
**Retention**: 180 days (6 months) - ~206 total backups (26 full + 180 daily)
**Compression**: Automatic gzip compression for backups >30 days old
**Verification**: Automatic integrity checks on creation with metadata tracking
**Monitoring**: Email notifications via app status report

**Status**: Fully automated, no user action required

---

### **2. Manual Backup Creation** ✅ AVAILABLE (Server-Side - UPGRADED)

#### **Method 1: Using Backup Manager (Recommended)**

```bash
# Auto-decide (full on Sunday, daily otherwise)
./scripts/backup/backup-manager.sh --auto

# Force full backup
./scripts/backup/backup-manager.sh --full

# Force daily backup
./scripts/backup/backup-manager.sh --daily
```

#### **Method 2: Using Docker Command (Legacy)**

```bash
# From project directory
docker compose exec backend python -c "
from app.main import app, create_backup
with app.app_context():
    result = create_backup('my_backup_name')
    print(f'Backup created: {result}')
"
```

#### **Method 3: Using pg_dump Directly (Legacy)**

```bash
# Get database credentials from .env file
source .env

# Create backup
docker compose exec db pg_dump \
  -U gpsadmin \
  -d gps_tracker \
  -F c \
  -f /backups/manual_backup_$(date +%Y%m%d_%H%M%S).sql
```

**Note**: Methods 2 and 3 create backups in flat structure. Use Method 1 for organized backups.

---

### **3. Database Restore** ✅ AVAILABLE (Server-Side - UPGRADED)

#### **Method 1: Smart Restore Script (Recommended)**

```bash
# Interactive mode (easiest)
./scripts/backup/restore-backup.sh --interactive

# Restore from latest backup
./scripts/backup/restore-backup.sh --latest

# Restore from specific date
./scripts/backup/restore-backup.sh --date 2025-11-01

# Restore from specific file
./scripts/backup/restore-backup.sh --file backups/full/2025/11/03/backup_full_20251103_020000.sql
```

**Features**:
- ✅ Automatic backup validation
- ✅ Creates safety backup before restore
- ✅ Handles compressed (.gz) backups
- ✅ Requires explicit confirmation
- ✅ Auto-restarts backend
- ✅ Email notifications

#### **Method 2: Using Docker Exec (Legacy)**

```bash
# List available backups
./scripts/backup/backup-manager.sh --list

# Restore from backup
docker compose exec db pg_restore \
  -U gpsadmin \
  -d gps_tracker \
  --clean \
  --if-exists \
  -v \
  /backups/full/2025/11/03/backup_full_20251103_020000.sql

# Restart backend to reload connections
docker compose restart backend
```

#### **Method 3: Drop and Recreate Database (Use with caution)**

```bash
# Drop existing database
docker compose exec db psql -U gpsadmin -d postgres -c "DROP DATABASE gps_tracker;"

# Create fresh database
docker compose exec db psql -U gpsadmin -d postgres -c "CREATE DATABASE gps_tracker;"

# Restore backup
docker compose exec db pg_restore \
  -U gpsadmin \
  -d gps_tracker \
  /backups/full/2025/11/03/backup_full_20251103_020000.sql

# Restart backend
docker compose restart backend
```

**Important**: Always use Method 1 (smart restore script) for safety features.

---

### **4. Backup Download** ✅ AVAILABLE (Server-Side)

#### **Using SCP**

```bash
# Download specific backup
scp demo@server:/home/demo/effective-guide/backups/backup_20251031_020000.sql ./

# Download all backups
scp demo@server:/home/demo/effective-guide/backups/*.sql ./backups/
```

#### **Using Rsync**

```bash
# Download all backups with progress
rsync -avz --progress demo@server:/home/demo/effective-guide/backups/ ./local-backups/
```

#### **Direct Copy (if you have server access)**

```bash
cp /home/demo/effective-guide/backups/backup_20251031_020000.sql /tmp/
```

---

### **5. Backup Deletion** ✅ AVAILABLE (Server-Side)

```bash
# Delete specific backup
rm /home/demo/effective-guide/backups/backup_20251030_020000.sql

# Delete old backups (keep last 20)
cd /home/demo/effective-guide/backups/
ls -t backup_*.sql | tail -n +21 | xargs rm -f

# Delete backups older than 30 days
find /home/demo/effective-guide/backups/ -name "backup_*.sql" -mtime +30 -delete
```

---

## Backend API Endpoints (Still Active)

While the UI is removed, these API endpoints remain functional for server-side scripts:

| Endpoint | Method | Purpose | Access |
|----------|--------|---------|--------|
| `/api/backups` | GET | List backups | Admin only |
| `/api/backups/create` | POST | Create backup | Admin only |
| `/api/backups/restore` | POST | Restore backup | Admin only |
| `/api/backups/download/<filename>` | GET | Download backup | Admin only |
| `/api/backups/delete/<filename>` | DELETE | Delete backup | Admin only |

**Note**: These endpoints are **not accessible from the UI** anymore but can be called via:
- Server-side scripts
- Command-line tools (curl, wget)
- Custom automation scripts

---

## Backup Verification System ✅ UNCHANGED

All verification systems continue to operate:

### **Automatic Verification**
- ✅ Format validation after each backup
- ✅ Checksum generation (.md5 files)
- ✅ Table count verification
- ✅ File integrity checks

### **Remote Backup Sync**
- ✅ Rsync to remote server (if configured)
- ✅ Checksum validation after transfer
- ✅ Email notifications

### **Monthly Restore Testing**
- ✅ Full restore test (1st of month, 3 AM)
- ✅ Data integrity verification
- ✅ Email reports

**Verification scripts**:
- `verify-backup.sh` - Manual verification
- `monthly-restore-test.sh` - Comprehensive testing
- `rsync-backup-remote.sh` - Remote sync with verification

---

## Monitoring & Email Notifications ✅ UNCHANGED

All email notifications continue:

1. **Daily App Status Report**
   - Backup age monitoring (warns if >48 hours old)
   - Backup directory status
   - Error log monitoring

2. **Monthly Restore Test**
   - Full restore verification results
   - Data integrity report
   - Email sent to: demo@praxisnetworking.com

3. **Remote Backup Sync**
   - Sync success/failure
   - Checksum verification results
   - Transfer statistics

4. **Backup Verification**
   - Format validation results
   - Integrity check status

---

## Convenience Scripts (Available)

### **List Backups**

```bash
#!/bin/bash
# list-backups.sh
ls -lth /home/demo/effective-guide/backups/*.sql | head -20
echo ""
echo "Total backups: $(ls -1 /home/demo/effective-guide/backups/*.sql | wc -l)"
```

### **Create Backup**

```bash
#!/bin/bash
# create-backup.sh
BACKUP_NAME="${1:-manual_$(date +%Y%m%d_%H%M%S)}"
docker compose exec backend python -c "
from app.main import app, create_backup
with app.app_context():
    result = create_backup('${BACKUP_NAME}')
    print(f'✓ Backup created: {result[\"filename\"]}')
    print(f'  Size: {result[\"size\"]} bytes')
    print(f'  Path: {result[\"path\"]}')
"
```

### **Restore Backup**

```bash
#!/bin/bash
# restore-backup.sh
if [ -z "$1" ]; then
    echo "Usage: $0 <backup_filename>"
    echo "Available backups:"
    ls -1 /home/demo/effective-guide/backups/*.sql
    exit 1
fi

BACKUP_FILE="$1"

echo "WARNING: This will replace all current data!"
read -p "Are you sure you want to restore from ${BACKUP_FILE}? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

echo "Restoring database..."
docker compose exec db pg_restore \
  -U gpsadmin \
  -d gps_tracker \
  --clean \
  --if-exists \
  -v \
  "/backups/$(basename ${BACKUP_FILE})"

echo "Restarting backend..."
docker compose restart backend

echo "✓ Restore complete"
```

---

## Why UI Was Removed

### **Security Reasons**

1. **Prevent Accidental Restores**
   - Database restore is a destructive operation
   - Should require server access and confirmation
   - Not suitable for web interface clicks

2. **Reduce Attack Surface**
   - Fewer web-exposed operations
   - No risk of web-based backup manipulation
   - Better access control through SSH

3. **Separation of Concerns**
   - UI for daily operations (tracking, reporting)
   - Server for system administration (backups, restores)

### **Best Practices**

- ✅ Backup/restore operations require privileged access
- ✅ Database operations should be logged and auditable
- ✅ Critical operations should not be "one-click" in UI
- ✅ Server-side operations provide better control and safety

---

## Migration Impact

### **For Regular Users**
- ✅ **No impact** - They don't need backup/restore access
- ✅ All tracking, reporting, and admin functions unchanged

### **For Administrators**
- ℹ️  **No UI access** - Backup/restore via SSH only
- ✅ **Automatic backups** - Continue unchanged
- ✅ **Email monitoring** - Receive all notifications
- ✅ **Full control** - Better command-line tools available

---

## Quick Reference

### **Check Backup Status**

```bash
# List recent backups
ls -lth backups/*.sql | head -5

# Check automatic backup cron
docker compose logs backend | grep "automatic backup"

# View latest status report
tail -50 logs/status-report.log
```

### **Verify Latest Backup**

```bash
# Quick verification
./scripts/backup/verify-backup.sh $(ls -t backups/backup_*.sql | head -1 | xargs basename)
```

### **Check Remote Backup Sync**

```bash
# View sync log
tail -50 logs/rsync-backup.log

# Check remote backups
ssh demo@192.168.100.74 "ls -lh ~/gps-tracker-backup/backups/"
```

---

## Documentation Updates

**Updated Files**:
- ✏️ `frontend/src/components/AdminPanel.jsx` - Removed Backups tab and component
- ✏️ `BACKUP_OPERATIONS.md` - This document (new)

**Unchanged Files**:
- ✅ `backend/app/main.py` - All backup API endpoints still functional
- ✅ `verify-backup.sh` - Verification script unchanged
- ✅ `monthly-restore-test.sh` - Testing script unchanged
- ✅ `rsync-backup-remote.sh` - Remote sync unchanged
- ✅ `BACKUP_INTEGRITY_VERIFICATION.md` - Verification docs unchanged
- ✅ `EMAIL_NOTIFICATIONS.md` - Email system unchanged

---

## Summary

### **What Changed**
- ❌ Removed UI access to backup/restore operations

### **What Didn't Change**
- ✅ Automatic daily backups (still running)
- ✅ Backup verification (still active)
- ✅ Remote sync (still configured)
- ✅ Monthly testing (still scheduled)
- ✅ Email notifications (still sending)
- ✅ All server-side operations (still available)

### **Result**
- ✅ **More secure** - No web-based restore operations
- ✅ **Still automated** - Backups run automatically
- ✅ **Still monitored** - Email alerts continue
- ✅ **Still accessible** - Via SSH/command line
- ✅ **Better control** - Admins have full server access

**All backup functionality remains intact, just moved to server-side only for security.**

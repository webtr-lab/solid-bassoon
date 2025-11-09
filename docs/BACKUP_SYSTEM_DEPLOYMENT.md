# Backup System Upgrade - Deployment Guide

## Summary of Changes

The GPS Tracker backup system has been upgraded from a simple 10-day retention system to a comprehensive 6-month retention system with organized folder structure, full/daily backups, and intelligent restore capabilities.

### Before vs After

| Feature | Before (Old System) | After (New System) |
|---------|-------------------|-------------------|
| **Retention** | 10 days | 180 days (6 months) |
| **Structure** | Flat (`backups/*.sql`) | Organized (`backups/full/YYYY/MM/DD/`) |
| **Backup Types** | Single daily backup | Full (weekly) + Daily backups |
| **Compression** | None | Automatic (>30 days) |
| **Metadata** | None | JSON files with checksums & details |
| **Index** | None | Master JSON index for fast lookup |
| **Restore** | Manual `pg_restore` | Smart script with validation |
| **Total Backups** | ~10 backups | ~206 backups (26 full + 180 daily) |

---

## New Files Created

### 1. Core Scripts

| File | Purpose | Status |
|------|---------|--------|
| `backup-manager.sh` | Main backup management (create, list, cleanup, archive) | ✅ Created |
| `restore-backup.sh` | Smart restore with validation and safety features | ✅ Created |
| `BACKUP_SYSTEM.md` | Comprehensive documentation | ✅ Created |
| `BACKUP_SYSTEM_DEPLOYMENT.md` | This deployment guide | ✅ Created |

### 2. Updated Files

| File | Changes | Status |
|------|---------|--------|
| `backend/app/main.py` | Updated `automatic_backup()` to use new system, updated `/api/backups` endpoint | ✅ Updated |
| `rsync-backup-remote.sh` | Updated to sync organized folder structure | ✅ Updated |
| `app-status-report.sh` | Updated `check_backup_status()` for new structure | ✅ Updated |
| `BACKUP_OPERATIONS.md` | Updated documentation with new system info | ✅ Updated |

---

## Deployment Steps

### Step 1: Verify Files

Ensure all new files are in place and executable:

```bash
cd /home/demo/effective-guide

# Check new scripts exist and are executable
ls -lh backup-manager.sh restore-backup.sh

# Make executable if needed
chmod +x backup-manager.sh restore-backup.sh

# Verify other scripts are still executable
ls -lh rsync-backup-remote.sh app-status-report.sh verify-backup.sh
```

### Step 2: Initialize Backup Structure

Create the organized folder structure:

```bash
# Initialize the new backup directory structure
./backup-manager.sh --help

# The structure will be auto-created on first backup
# Or create manually:
mkdir -p backups/{full,daily,index,archive,pre-restore-safety}
```

### Step 3: Test Manual Backup

Create a test backup to verify the system works:

```bash
# Create a manual backup (will auto-decide based on day of week)
./backup-manager.sh --auto

# OR force a full backup for testing
./backup-manager.sh --full

# Verify backup was created
./backup-manager.sh --list
```

Expected output:
```
=== FULL BACKUPS ===
/home/demo/effective-guide/backups/full/2025/11/01/backup_full_20251101_HHMMSS.sql (X.XM)

=== STATISTICS ===
Full backups: 1
Daily backups: 0
Total size: X.XM
```

### Step 4: Verify Backup Metadata

Check that metadata files were created:

```bash
# Find the latest backup
LATEST=$(find backups/full backups/daily -name "backup_*.sql" -type f | sort | tail -1)

# Check metadata files exist
ls -lh ${LATEST}*

# Should see:
# backup_full_YYYYMMDD_HHMMSS.sql
# backup_full_YYYYMMDD_HHMMSS.sql.md5
# backup_full_YYYYMMDD_HHMMSS.sql.metadata.json
```

View metadata:
```bash
cat ${LATEST}.metadata.json
```

### Step 5: Test Restore (Optional but Recommended)

Test the restore process in a safe way:

```bash
# List available backups
./restore-backup.sh --list

# Test restore (WILL PROMPT FOR CONFIRMATION)
./restore-backup.sh --latest

# This will:
# 1. Validate the backup
# 2. Create a safety backup of current database
# 3. Ask for confirmation (type 'yes')
# 4. Perform restore
# 5. Restart backend
```

**Note**: Only do this if you're comfortable restoring. The safety backup will be created first.

### Step 6: Restart Backend

Restart the backend to ensure it uses the updated code:

```bash
docker compose restart backend

# Verify backend is running
docker compose ps backend

# Check logs for any errors
docker compose logs backend | tail -50
```

### Step 7: Verify Automatic Backups

Check that automatic backups will run correctly:

```bash
# Check backend logs for backup scheduler
docker compose logs backend | grep -i backup

# Manually trigger automatic backup (simulates cron job)
docker compose exec backend python -c "
from app.main import app, automatic_backup
with app.app_context():
    automatic_backup()
"

# Verify backup was created
./backup-manager.sh --list
```

### Step 8: Test Remote Sync

Sync backups to remote server:

```bash
# Run remote sync
./rsync-backup-remote.sh

# Check logs
tail -50 logs/rsync-backup.log

# Verify on remote server
ssh demo@192.168.100.74 "ls -lh ~/gps-tracker-backup/backups/full/2025/11/"
```

### Step 9: Verify Status Report

Run the status report to ensure it recognizes the new structure:

```bash
./app-status-report.sh --no-email

# Check for backup status in output
# Should show something like:
# "X backups (Y full, Z daily) | Latest: FULL/DAILY YYYY-MM-DD"
```

---

## Verification Checklist

Use this checklist to verify the deployment:

- [ ] ✅ `backup-manager.sh` exists and is executable
- [ ] ✅ `restore-backup.sh` exists and is executable
- [ ] ✅ Backup directory structure created (`backups/full/`, `backups/daily/`, etc.)
- [ ] ✅ Manual backup test successful
- [ ] ✅ Metadata files created (`.md5`, `.metadata.json`)
- [ ] ✅ Backup index created (`backups/index/backup_index.json`)
- [ ] ✅ Backend restarted successfully
- [ ] ✅ Automatic backup test successful
- [ ] ✅ Remote sync test successful
- [ ] ✅ Status report recognizes new structure
- [ ] ✅ Restore test successful (optional)

---

## Migration from Old Backups

The old backups in the flat structure (`backups/backup_*.sql`) will remain in place. They can be:

### Option 1: Keep Both (Recommended During Transition)

```bash
# Old backups stay in backups/backup_*.sql
# New backups go in backups/full/ and backups/daily/
# Both are accessible for restore

# After 1-2 weeks of successful new backups, remove old ones
```

### Option 2: Move Old Backups to Archive

```bash
# Create archive directory for old backups
mkdir -p backups/archive/old-system

# Move old backups
mv backups/backup_*.sql backups/archive/old-system/ 2>/dev/null
mv backups/backup_*.sql.md5 backups/archive/old-system/ 2>/dev/null
```

### Option 3: Delete Old Backups (After Verification)

```bash
# ⚠️ ONLY after verifying new system works for 1-2 weeks

# List old backups first
ls -lh backups/backup_*.sql

# Delete old backups
rm backups/backup_*.sql backups/backup_*.sql.md5
```

**Recommendation**: Keep old backups for at least 2 weeks while monitoring the new system.

---

## Scheduled Automatic Backups

### Current Schedule

The backend automatic backup scheduler is already configured to run daily at 2 AM. No cron jobs needed.

**How it works**:
1. Backend scheduler triggers at 2 AM daily
2. Calls `automatic_backup()` in `backend/app/main.py`
3. `automatic_backup()` executes `backup-manager.sh --auto`
4. Backup manager creates:
   - **Full backup** if Sunday
   - **Daily backup** if Monday-Saturday
5. Cleanup runs automatically (removes backups >180 days)
6. Archiving runs automatically (compresses backups >30 days)

### Manual Schedule Verification

```bash
# Check if backend has scheduler running
docker compose logs backend | grep -i "scheduler\|backup"

# Check last automatic backup
docker compose logs backend | grep "automatic backup" | tail -5
```

---

## Monitoring & Alerts

### Daily Monitoring

Email notifications are automatically sent for:

1. **Backup creation** (success/failure)
2. **Backup verification** (success/failure)
3. **Remote sync** (success/failure)
4. **Restore operations** (success/failure)
5. **Daily status report** (includes backup status)

**Recipient**: demo@praxisnetworking.com

### Manual Monitoring

```bash
# Check backup status
./app-status-report.sh --no-email | grep -A 5 "Backups:"

# Check backup count
./backup-manager.sh --list | grep "STATISTICS" -A 3

# Check latest backup age
LATEST=$(find backups/full backups/daily -name "backup_*.sql*" -type f -printf '%T+ %p\n' | sort -r | head -1)
echo "$LATEST"

# Check disk usage
du -sh backups/
```

### Alert Thresholds

The system will alert if:
- Last backup is >48 hours old
- Backup index is >48 hours old
- No backups found
- Backup directory missing

---

## Rollback Plan

If you need to rollback to the old system:

### Step 1: Revert Backend Code

```bash
# Revert backend/app/main.py to use old backup method
git diff backend/app/main.py  # Review changes
git checkout HEAD^ -- backend/app/main.py  # Revert to previous version
```

### Step 2: Restart Backend

```bash
docker compose restart backend
```

### Step 3: Use Old Backups

```bash
# Old backups are still in backups/backup_*.sql
# Can restore using old method:
docker compose exec db pg_restore \
  -U gpsadmin \
  -d gps_tracker \
  --clean \
  --if-exists \
  /backups/backup_YYYYMMDD_HHMMSS.sql

docker compose restart backend
```

---

## Troubleshooting

### Backup Creation Fails

**Problem**: `./backup-manager.sh --auto` fails

**Solution**:
```bash
# Check logs
tail -100 logs/backup-manager.log

# Check Docker is running
docker compose ps

# Check database is accessible
docker compose exec db psql -U gpsadmin -d gps_tracker -c "SELECT version();"

# Check disk space
df -h
```

### Metadata Not Created

**Problem**: `.metadata.json` files not created

**Solution**:
```bash
# Check Python 3 is available in PATH
which python3

# Check json module available
python3 -c "import json; print('OK')"

# Run backup with verbose output
./backup-manager.sh --full 2>&1 | tee /tmp/backup-debug.log
```

### Remote Sync Fails

**Problem**: `./rsync-backup-remote.sh` fails

**Solution**:
```bash
# Check SSH connection
ssh demo@192.168.100.74 "echo 'Connection OK'"

# Check remote disk space
ssh demo@192.168.100.74 "df -h"

# Check logs
tail -100 logs/rsync-backup.log

# Test rsync manually
rsync -avz --dry-run backups/full/ demo@192.168.100.74:~/gps-tracker-backup/backups/full/
```

### Restore Fails

**Problem**: `./restore-backup.sh --latest` fails

**Solution**:
```bash
# Check restore logs
tail -100 logs/restore.log

# Verify backup is valid
./verify-backup.sh <backup-file>

# Check database is running
docker compose ps db

# Try manual restore
docker compose exec db pg_restore --list /backups/full/YYYY/MM/DD/backup_full_*.sql
```

---

## Support

### Documentation

- **Complete Guide**: `BACKUP_SYSTEM.md`
- **Operations Guide**: `BACKUP_OPERATIONS.md`
- **Deployment Guide**: This file (`BACKUP_SYSTEM_DEPLOYMENT.md`)

### Commands Reference

```bash
# Backup operations
./backup-manager.sh --help
./backup-manager.sh --list
./backup-manager.sh --auto
./backup-manager.sh --full
./backup-manager.sh --cleanup
./backup-manager.sh --archive

# Restore operations
./restore-backup.sh --help
./restore-backup.sh --list
./restore-backup.sh --latest
./restore-backup.sh --date YYYY-MM-DD
./restore-backup.sh --interactive

# Monitoring
./app-status-report.sh
./backup-manager.sh --list
tail -f logs/backup-manager.log
tail -f logs/restore.log

# Remote sync
./rsync-backup-remote.sh
tail -f logs/rsync-backup.log
```

### Log Files

- `logs/backup-manager.log` - Backup operations
- `logs/restore.log` - Restore operations
- `logs/rsync-backup.log` - Remote sync
- `logs/app.log` - Application logs
- `logs/error.log` - Error logs
- `logs/status-report.log` - Status reports

---

## Success Criteria

The deployment is successful when:

1. ✅ Manual backup creates organized folder structure
2. ✅ Metadata files (`.md5`, `.metadata.json`) are created
3. ✅ Backup index (`backups/index/backup_index.json`) is updated
4. ✅ Automatic backup runs successfully
5. ✅ Backend restart is successful
6. ✅ Remote sync completes without errors
7. ✅ Status report shows new backup structure
8. ✅ Restore test works (if performed)
9. ✅ Email notifications are received

**Timeline**: Allow 1-2 weeks of monitoring before considering the migration complete.

---

## Next Steps

After successful deployment:

1. **Monitor for 1 week**
   - Check daily email status reports
   - Verify backups are being created
   - Monitor disk usage

2. **Verify after 1 month**
   - Check that old backups are being cleaned up
   - Verify compression is working (>30 days)
   - Confirm remote sync is consistent

3. **Test disaster recovery**
   - Perform full restore test
   - Verify data integrity
   - Document recovery time

4. **Optional enhancements**
   - Set up additional remote backup locations
   - Configure offsite backup storage
   - Implement backup encryption

---

## Conclusion

The new backup system provides:
- ✅ 18x longer retention (10 days → 180 days)
- ✅ Better organization (YYYY/MM/DD structure)
- ✅ Faster restore (index-based lookup)
- ✅ Better data integrity (metadata + checksums)
- ✅ Automatic compression (space efficient)
- ✅ Safety features (pre-restore backups)
- ✅ Same structure locally and remotely

All while maintaining full automation and monitoring.

**The system is ready for production use.**

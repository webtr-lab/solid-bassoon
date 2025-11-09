# Backup Integrity Verification System

This document describes the comprehensive backup verification system that ensures data integrity for all backups.

## Overview

The verification system provides **multiple layers of integrity checks** to guarantee backups are valid, restorable, and reliable:

1. **Automatic verification** after every backup creation
2. **Checksum validation** after remote transfers
3. **Monthly restore testing** to verify full recovery capability
4. **Email notifications** for all verification events

## Architecture

###Three-Layer Verification

| Layer | When | What | Confidence Level |
|-------|------|------|------------------|
| **Level 1: Format Check** | After every backup | PostgreSQL format validation | 60% |
| **Level 2: Checksum** | After backup + transfer | MD5 checksum verification | 80% |
| **Level 3: Restore Test** | Monthly | Full restore to test database | 95%+ |

### Verification Flow

```
Database Backup (2 AM daily)
    ↓
[Flask Backend] create_backup()
    ↓
verify_backup() → Format check + Checksum
    ↓
[If verification fails]
    → Delete invalid backup
    → Log error
    → Continue (don't break system)
    ↓
[If verification succeeds]
    → Save .md5 checksum file
    → Log success
    → Backup retained
    ↓
Remote Sync (scheduled via cron)
    ↓
rsync-backup-remote.sh
    ↓
verify_backup_checksums()
    → Compare local vs remote checksums
    → Email alert if mismatch
    ↓
Monthly Restore Test (1st of month, 3 AM)
    ↓
monthly-restore-test.sh
    → Full restore to test database
    → Verify tables, data, queries
    → Email comprehensive report
```

## Components

### 1. Flask Backend Verification (`backend/app/main.py`)

**Function**: `verify_backup(backup_filename)`

**Checks performed**:
- ✅ File existence
- ✅ File size (minimum 1MB)
- ✅ PostgreSQL format validation (`pg_restore --list`)
- ✅ Table count verification (minimum 5 tables)
- ✅ MD5 checksum generation and storage

**Integration**: Called automatically after every `create_backup()`

**Behavior on failure**:
- Logs error
- Deletes invalid backup file
- Raises exception (backup fails)

---

### 2. Manual Verification Script (`verify-backup.sh`)

**Purpose**: Standalone script for manual verification or troubleshooting

**Usage**:
```bash
# Quick verification (format + checksum)
./verify-backup.sh backup_20251031_020000.sql

# Full verification with restore test
./verify-backup.sh backup_20251031_020000.sql --full-test
```

**Checks performed**:
1. File existence and size
2. PostgreSQL format validation
3. Table count verification
4. MD5 checksum generation/verification
5. **Optional**: Full restore to temporary database

**Features**:
- Email notifications (success/failure)
- Detailed logging to `logs/backup-verification.log`
- Safe cleanup (automatically drops test database)

---

### 3. Remote Backup Checksum Verification (`rsync-backup-remote.sh`)

**Function**: `verify_backup_checksums()`

**Purpose**: Validates backup integrity after rsync transfer

**How it works**:
1. Reads all `.md5` files in local backup directory
2. Calculates remote file checksums via SSH
3. Compares local vs remote checksums
4. Reports mismatches

**Integration**: Called automatically after rsync completes for `backups/` directory

---

### 4. Monthly Restore Test (`monthly-restore-test.sh`)

**Purpose**: Comprehensive monthly verification by actually restoring a backup

**Schedule**: 1st day of each month at 3:00 AM (configurable)

**Process**:
1. Selects most recent backup
2. Verifies checksum
3. Validates PostgreSQL format
4. Creates temporary test database
5. Restores backup to test database
6. Verifies all expected tables exist
7. Checks row counts for each table
8. Tests referential integrity (no orphaned records)
9. Runs sample queries
10. Cleans up test database
11. Sends detailed email report

**Usage**:
```bash
# Run test manually
./monthly-restore-test.sh

# Setup automated monthly testing
./setup-monthly-test-cron.sh
```

---

## Setup Instructions

### Initial Setup

1. **Verify all scripts are executable**:
```bash
chmod +x verify-backup.sh
chmod +x monthly-restore-test.sh
chmod +x setup-monthly-test-cron.sh
```

2. **Test manual verification** (optional):
```bash
# List available backups
ls -lh backups/*.sql

# Verify a backup
./verify-backup.sh backup_20251031_020000.sql
```

3. **Setup monthly restore testing**:
```bash
./setup-monthly-test-cron.sh
# Select option 1 (1st day of month at 3:00 AM)
```

4. **Verify cron jobs are configured**:
```bash
crontab -l
```

You should see:
```
# Automatic remote backup to 192.168.100.74
0 3 * * * /home/demo/effective-guide/rsync-backup-remote.sh >> /home/demo/effective-guide/logs/rsync-backup.log 2>&1

# Monthly backup restore test
0 3 1 * * /home/demo/effective-guide/monthly-restore-test.sh >> /home/demo/effective-guide/logs/monthly-restore-test.log 2>&1
```

---

## Email Notifications

### Configuration

Email notifications are enabled by default for:
- Backup verification failures (via `verify-backup.sh`)
- Remote backup checksum mismatches (via `rsync-backup-remote.sh`)
- Monthly restore test results (via `monthly-restore-test.sh`)

**Email settings** (in each script):
```bash
EMAIL_ENABLED=true
EMAIL_RECIPIENT="demo@praxisnetworking.com"
```

**To change email recipient**:
Edit the following files:
- `verify-backup.sh` (line 24)
- `rsync-backup-remote.sh` (line 25)
- `monthly-restore-test.sh` (line 26)

**To disable email notifications**:
Set `EMAIL_ENABLED=false` in each script

### Email Requirements

Install mailutils:
```bash
sudo apt-get update
sudo apt-get install mailutils
```

Test email:
```bash
echo "Test email" | mail -s "Test Subject" demo@praxisnetworking.com
```

---

## Monitoring & Logs

### Log Files

| Log File | Purpose | Location |
|----------|---------|----------|
| `app.log` | Backend application logs (includes backup verification) | `logs/app.log` |
| `backup-verification.log` | Manual verification script logs | `logs/backup-verification.log` |
| `rsync-backup.log` | Remote backup logs (includes checksum verification) | `logs/rsync-backup.log` |
| `monthly-restore-test.log` | Monthly restore test logs | `logs/monthly-restore-test.log` |

### View Logs

```bash
# View recent backup verifications
tail -50 logs/app.log | grep -i "verif"

# View manual verification log
tail -f logs/backup-verification.log

# View rsync checksum verifications
tail -50 logs/rsync-backup.log | grep -i "checksum"

# View monthly test results
tail -100 logs/monthly-restore-test.log

# Search for verification failures
grep -i "verification failed" logs/*.log
```

---

## Troubleshooting

### Issue: Backup Verification Fails

**Symptom**: Logs show "Backup verification failed"

**Solution**:
```bash
# Check disk space
df -h

# Check backup directory
ls -lh backups/

# Try manual verification
./verify-backup.sh backup_YYYYMMDD_HHMMSS.sql
```

### Issue: Checksum Mismatch After Rsync

**Symptom**: "Checksum mismatch" error in rsync log

**Solution**:
```bash
# Re-run rsync manually
./rsync-backup-remote.sh

# Manually verify specific file
LOCAL_MD5=$(md5sum backups/backup_20251031.sql | awk '{print $1}')
REMOTE_MD5=$(ssh demo@192.168.100.74 "md5sum ~/gps-tracker-backup/backups/backup_20251031.sql" | awk '{print $1}')
echo "Local:  $LOCAL_MD5"
echo "Remote: $REMOTE_MD5"
```

---

## Quick Reference

### Daily Operations
```bash
# Check backup verification status
grep "Backup created and verified" logs/app.log | tail -5

# View recent checksums
ls -lh backups/*.md5
```

### Manual Testing
```bash
# Verify specific backup
./verify-backup.sh backup_20251031_020000.sql

# Full restore test
./verify-backup.sh backup_20251031_020000.sql --full-test

# Run monthly test manually
./monthly-restore-test.sh
```

### Monitoring
```bash
# View all verification logs
tail -f logs/backup-verification.log

# Check for failures
grep -i "fail\|error" logs/backup-verification.log logs/monthly-restore-test.log

# View monthly test summary
tail -100 logs/monthly-restore-test.log | grep -A20 "MONTHLY RESTORE TEST"
```

For questions or issues, check the logs first, then review the troubleshooting section above.

# Maps Tracker Backup System - Complete Guide

## Overview

The Maps Tracker application uses an **organized, two-tier backup system** with full and daily backups, 6-month retention, and automatic compression. Backups are stored in a date-organized folder structure for easy navigation and fast restore.

**Key Features**:
- ✅ Weekly full backups (every Sunday)
- ✅ Daily backups (every day)
- ✅ 6-month retention (180 days)
- ✅ Date-organized structure (YYYY/MM/DD)
- ✅ Automatic compression (>30 days old)
- ✅ Metadata tracking (JSON files)
- ✅ Checksum verification
- ✅ Fast restore with index
- ✅ Same structure on local and remote servers

---

## Backup Folder Structure

```
/home/demo/effective-guide/backups/
├── full/                                    # Weekly full backups (Sundays)
│   ├── 2025/
│   │   └── 11/
│   │       ├── 03/                          # November 3, 2025 (Sunday)
│   │       │   ├── backup_full_20251103_020000.sql
│   │       │   ├── backup_full_20251103_020000.sql.md5
│   │       │   └── backup_full_20251103_020000.sql.metadata.json
│   │       ├── 10/                          # November 10, 2025 (Sunday)
│   │       │   ├── backup_full_20251110_020000.sql
│   │       │   ├── backup_full_20251110_020000.sql.md5
│   │       │   └── backup_full_20251110_020000.sql.metadata.json
│   │       └── 17/
│   │
├── daily/                                   # Daily backups (every day)
│   ├── 2025/
│   │   └── 11/
│   │       ├── 01/                          # November 1, 2025
│   │       │   ├── backup_daily_20251101_020000.sql
│   │       │   ├── backup_daily_20251101_020000.sql.md5
│   │       │   └── backup_daily_20251101_020000.sql.metadata.json
│   │       ├── 02/
│   │       ├── 04/
│   │       └── ...
│   │
├── index/                                   # Backup index for fast lookup
│   ├── backup_index.json                    # Master index of all backups
│   └── restore_guide.json                   # Restore instructions
│   │
├── pre-restore-safety/                      # Safety backups before restore
│   └── safety_backup_20251101_143025.sql
│   │
└── archive/                                 # Compressed old backups (>30 days)
    └── 2025/
        └── 09/
            └── 15/
                └── backup_daily_20250915_020000.sql.gz
```

**File Types**:
- `.sql` - PostgreSQL dump file (custom format, compressed)
- `.sql.gz` - Gzip compressed backup (auto-archived after 30 days)
- `.md5` - MD5 checksum file for verification
- `.metadata.json` - Metadata (size, date, table count, verified status)

---

## Retention Policy

| Backup Type | Frequency | Retention | Total Backups | Auto-Compression |
|-------------|-----------|-----------|---------------|------------------|
| **Full** | Every Sunday at 2 AM | 180 days (6 months) | ~26 full backups | After 30 days |
| **Daily** | Every day at 2 AM | 180 days (6 months) | ~180 daily backups | After 30 days |
| **Safety** | Before each restore | Until manually deleted | Varies | No |

**Total Storage**: ~206 backups (26 full + 180 daily)

**Cleanup Process**:
- Backups older than 180 days are automatically deleted
- Backups older than 30 days are automatically compressed (gzip)
- Cleanup runs after each automatic backup

---

## Backup Management

### 1. Create Backups

#### Automatic Backups (Recommended)
Backups run automatically via backend scheduler at 2 AM daily.

**Schedule**:
- **Sunday 2 AM**: Full backup
- **Monday-Saturday 2 AM**: Daily backup

**No manual action required** - automatic backups, cleanup, and archiving happen automatically.

#### Manual Backups

**Create full backup**:
```bash
./scripts/backup/backup-manager.sh --full
```

**Create daily backup**:
```bash
./scripts/backup/backup-manager.sh --daily
```

**Auto-decide (full on Sunday, daily otherwise)**:
```bash
./scripts/backup/backup-manager.sh --auto
```

### 2. List Backups

**Command line**:
```bash
./scripts/backup/backup-manager.sh --list
```

**Output example**:
```
=== FULL BACKUPS ===
/home/demo/effective-guide/backups/full/2025/11/10/backup_full_20251110_020000.sql (2.3M)
/home/demo/effective-guide/backups/full/2025/11/03/backup_full_20251103_020000.sql (2.2M)

=== DAILY BACKUPS ===
/home/demo/effective-guide/backups/daily/2025/11/09/backup_daily_20251109_020000.sql (2.3M)
/home/demo/effective-guide/backups/daily/2025/11/08/backup_daily_20251108_020000.sql (2.2M)
...

=== STATISTICS ===
Full backups: 4
Daily backups: 25
Total size: 65M
```

**Via API** (admin only):
```bash
curl -X GET http://localhost:5000/api/backups \
  --cookie "session=YOUR_SESSION_COOKIE"
```

### 3. Maintenance Operations

**Cleanup old backups** (removes backups >180 days):
```bash
./scripts/backup/backup-manager.sh --cleanup
```

**Archive old backups** (compress backups >30 days):
```bash
./scripts/backup/backup-manager.sh --archive
```

---

## Restore Operations

### Interactive Restore (Easiest)

```bash
./scripts/backup/restore-backup.sh --interactive
```

This will:
1. Show all available backups
2. Let you choose restore method
3. Validate the backup
4. Create safety backup of current database
5. Perform restore with confirmation

### Restore from Latest Backup

```bash
./scripts/backup/restore-backup.sh --latest
```

### Restore from Specific Date

```bash
./scripts/backup/restore-backup.sh --date 2025-11-01
```

Automatically finds the best backup from that date (prefers full, falls back to daily).

### Restore from Specific File

```bash
./scripts/backup/restore-backup.sh --file /home/demo/effective-guide/backups/full/2025/11/03/backup_full_20251103_020000.sql
```

### Safety Features

**All restore operations**:
1. ✅ Validate backup integrity first
2. ✅ Create safety backup of current database
3. ✅ Require explicit confirmation
4. ✅ Handle compressed (.gz) backups automatically
5. ✅ Verify checksums
6. ✅ Send email notifications
7. ✅ Restart backend after restore

---

## Metadata Files

Each backup has a `.metadata.json` file with comprehensive information:

```json
{
  "backup_file": "backup_full_20251103_020000.sql",
  "backup_type": "full",
  "created_at": "2025-11-03T02:00:15Z",
  "file_size": 2415872,
  "file_size_human": "2.3MiB",
  "checksum_md5": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "table_count": 5,
  "database": "maps_tracker",
  "postgres_version": "PostgreSQL 15.3",
  "compressed": false,
  "verified": true
}
```

**Metadata uses**:
- Fast backup listing (no need to scan files)
- Backup verification status tracking
- Quick integrity checks
- Restore decision making

---

## Backup Index

The `backups/index/backup_index.json` file maintains a master index of all backups:

```json
{
  "backups": [
    {
      "backup_file": "backup_full_20251103_020000.sql",
      "relative_path": "full/2025/11/03/backup_full_20251103_020000.sql",
      "backup_type": "full",
      "created_at": "2025-11-03T02:00:15Z",
      "file_size": 2415872,
      "file_size_human": "2.3MiB",
      "checksum_md5": "a1b2c3d4...",
      "table_count": 5,
      "verified": true,
      "compressed": false
    },
    ...
  ],
  "last_updated": "2025-11-03T02:00:20Z"
}
```

**Benefits**:
- **Fast API responses** - No need to scan filesystem
- **Quick restore** - Find backups instantly
- **Status tracking** - See verification status at a glance

---

## Remote Backup Sync

The system automatically syncs backups to a remote server for disaster recovery.

### Configuration

**Remote server**: 192.168.100.74
**Remote user**: demo
**Remote path**: ~/maps-tracker-backup/

### Manual Sync

```bash
./scripts/backup/rsync-backup-remote.sh
```

**What gets synced**:
- All full backups (`backups/full/`)
- All daily backups (`backups/daily/`)
- Backup index (`backups/index/`)
- Application logs (`logs/`)

**Features**:
- ✅ Mirrors entire folder structure to remote
- ✅ Checksumverification after transfer
- ✅ Email notifications
- ✅ Automatic compression detection
- ✅ Incremental sync (only transfers changes)

### Verify Remote Backups

```bash
# List remote backups
ssh demo@192.168.100.74 "ls -lh ~/maps-tracker-backup/backups/full/2025/11/"

# Check remote disk usage
ssh demo@192.168.100.74 "du -sh ~/maps-tracker-backup/"
```

---

## Monitoring & Alerts

### Daily Status Report

The `app-status-report.sh` script runs daily and checks:
- ✅ Backup count (full + daily)
- ✅ Latest backup age (warns if >48 hours)
- ✅ Backup index age
- ✅ Backup directory integrity

**Run manually**:
```bash
./scripts/monitoring/app-status-report.sh
```

### Email Notifications

**Automatic notifications sent for**:
1. Backup creation (success/failure)
2. Backup verification (success/failure)
3. Remote sync (success/failure)
4. Restore operations (success/failure)
5. Daily status report (includes backup status)

**Recipient**: demo@praxisnetworking.com

---

## Verification

### Manual Verification

**Verify specific backup**:
```bash
./scripts/backup/verify-backup.sh backups/full/2025/11/03/backup_full_20251103_020000.sql
```

**Full restore test**:
```bash
./scripts/backup/verify-backup.sh backups/full/2025/11/03/backup_full_20251103_020000.sql --full-test
```

### Verification Checks

1. ✅ File existence
2. ✅ File size (minimum 10KB)
3. ✅ PostgreSQL format validation
4. ✅ Table count (minimum 5 tables)
5. ✅ MD5 checksum generation/verification
6. ✅ Optional: Full restore to test database

### Automatic Verification

**Verification happens automatically**:
- After each backup creation
- Before each restore operation
- During monthly restore tests

---

## Best Practices

### For Daily Operations
1. ✅ Let automatic backups run (2 AM daily)
2. ✅ Check daily status report emails
3. ✅ Monitor backup age (should be <48 hours)
4. ✅ Verify backups are syncing to remote server

### Before Major Changes
1. ✅ Create manual full backup: `./scripts/backup/backup-manager.sh --full`
2. ✅ Verify backup: `./scripts/backup/verify-backup.sh <backup-file>`
3. ✅ Sync to remote: `./scripts/backup/rsync-backup-remote.sh`
4. ✅ Proceed with changes

### For Disaster Recovery
1. ✅ Keep remote backups on separate physical server
2. ✅ Test restore monthly (automatic on 1st of month)
3. ✅ Document remote server credentials
4. ✅ Practice restore procedure

### Storage Management
1. ✅ Automatic cleanup keeps last 180 days
2. ✅ Automatic compression after 30 days
3. ✅ Monitor disk usage: `du -sh backups/`
4. ✅ Adjust retention if needed (edit `scripts/backup/backup-manager.sh`)

---

## Troubleshooting

### Backup Failed
```bash
# Check logs
tail -50 logs/backup-manager.log

# Check database connectivity
docker compose ps db

# Try manual backup
./scripts/backup/backup-manager.sh --full
```

### Restore Failed
```bash
# Check restore logs
tail -50 logs/restore.log

# Verify backup first
./scripts/backup/verify-backup.sh <backup-file>

# Check database status
docker compose ps db
docker compose logs db | tail -50
```

### Remote Sync Failed
```bash
# Check sync logs
tail -50 logs/rsync-backup.log

# Test SSH connection
ssh demo@192.168.100.74 "echo 'Connection OK'"

# Check remote disk space
ssh demo@192.168.100.74 "df -h"
```

### Backup Too Old
```bash
# Check backend logs for automatic backup errors
docker compose logs backend | grep backup

# Check cron jobs
docker compose exec backend ps aux | grep cron

# Trigger manual backup
./scripts/backup/backup-manager.sh --auto
```

---

## Quick Reference

### Common Commands

| Task | Command |
|------|---------|
| **Create auto backup** | `./scripts/backup/backup-manager.sh --auto` |
| **Create full backup** | `./scripts/backup/backup-manager.sh --full` |
| **List all backups** | `./scripts/backup/backup-manager.sh --list` |
| **Restore latest** | `./scripts/backup/restore-backup.sh --latest` |
| **Restore from date** | `./scripts/backup/restore-backup.sh --date 2025-11-01` |
| **Interactive restore** | `./scripts/backup/restore-backup.sh --interactive` |
| **Verify backup** | `./scripts/backup/verify-backup.sh <file>` |
| **Sync to remote** | `./scripts/backup/rsync-backup-remote.sh` |
| **Cleanup old backups** | `./scripts/backup/backup-manager.sh --cleanup` |
| **Compress old backups** | `./scripts/backup/backup-manager.sh --archive` |
| **Check status** | `./scripts/monitoring/app-status-report.sh` |

### Important Files

| File | Purpose |
|------|---------|
| `backup-manager.sh` | Main backup management script |
| `restore-backup.sh` | Smart restore script |
| `verify-backup.sh` | Backup verification script |
| `rsync-backup-remote.sh` | Remote sync script |
| `app-status-report.sh` | Health check and monitoring |
| `logs/backup-manager.log` | Backup operation logs |
| `logs/restore.log` | Restore operation logs |
| `logs/rsync-backup.log` | Remote sync logs |
| `backups/index/backup_index.json` | Master backup index |

### Important Paths

| Path | Contents |
|------|----------|
| `/home/demo/effective-guide/backups/full/` | Weekly full backups |
| `/home/demo/effective-guide/backups/daily/` | Daily backups |
| `/home/demo/effective-guide/backups/index/` | Backup index and metadata |
| `/home/demo/effective-guide/backups/pre-restore-safety/` | Safety backups |
| `/home/demo/effective-guide/logs/` | Application and backup logs |
| `demo@192.168.100.74:~/maps-tracker-backup/` | Remote backup location |

---

## Migration from Old System

### Old Structure (10-day retention)
```
backups/
├── backup_20251101_020000.sql
├── backup_20251102_020000.sql
└── ...
```

### New Structure (180-day retention)
```
backups/
├── full/2025/11/03/backup_full_20251103_020000.sql
├── daily/2025/11/01/backup_daily_20251101_020000.sql
└── ...
```

**Migration happens automatically**:
- Backend now uses `backup-manager.sh --auto`
- Old backups remain in `backups/*.sql` (can be manually moved or deleted)
- New backups go into organized structure
- API endpoints updated to read from both locations

**Optional cleanup of old backups**:
```bash
# List old backups
ls -lh /home/demo/effective-guide/backups/backup_*.sql

# Remove old backups (after confirming new system works)
rm /home/demo/effective-guide/backups/backup_*.sql
rm /home/demo/effective-guide/backups/backup_*.sql.md5
```

---

## Summary

### What Changed
- ✅ Retention increased: 10 days → 180 days (6 months)
- ✅ Organization added: Flat structure → Date-organized (YYYY/MM/DD)
- ✅ Backup types: Single type → Full (weekly) + Daily
- ✅ Compression: None → Automatic after 30 days
- ✅ Metadata: None → JSON files with full details
- ✅ Index: None → Master JSON index for fast lookup
- ✅ Safety: No pre-restore backup → Automatic safety backup
- ✅ Restore: Manual pg_restore → Smart restore script

### What Stayed the Same
- ✅ Automatic daily backups (2 AM)
- ✅ Email notifications
- ✅ Remote sync to backup server
- ✅ Verification system
- ✅ PostgreSQL pg_dump format

### Result
- ✅ **6-month retention** - Keep backups longer for compliance
- ✅ **Easy navigation** - Find backups by date quickly
- ✅ **Fast restore** - Index for instant lookup
- ✅ **Data integrity** - Metadata and checksums
- ✅ **Same on local and remote** - Consistent structure everywhere
- ✅ **Space efficient** - Automatic compression of old backups

**All backup operations remain fully automated and monitored.**

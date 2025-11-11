# Backup System Quick Reference Guide

**Last Updated:** 2025-11-11  
**Status:** Production Ready ✅

---

## Quick Start

### Health Check (1 second)
```bash
./scripts/backup/backup-optimization.sh --health
```

### Create Backup Now
```bash
./scripts/backup/backup-manager.sh --full     # Full backup
./scripts/backup/backup-manager.sh --daily    # Daily backup
./scripts/backup/backup-manager.sh --auto     # Auto (full on Sunday)
```

### Validate Backups (Weekly)
```bash
./scripts/backup/weekly-backup-validation.sh
```

### List All Backups
```bash
./scripts/backup/backup-manager.sh --list
```

---

## Command Reference

### Core Backup Operations

| Command | Purpose | Schedule |
|---------|---------|----------|
| `backup-manager.sh --full` | Create full backup | Sundays 2 AM |
| `backup-manager.sh --daily` | Create daily backup | Every day 2 AM |
| `backup-manager.sh --auto` | Auto (full/daily) | Daily 2 AM |
| `backup-manager.sh --list` | List all backups | On-demand |
| `backup-manager.sh --cleanup` | Remove old backups | Daily 2 AM |

### Incremental Backup Operations

| Command | Purpose | Usage |
|---------|---------|-------|
| `incremental-backup.sh --full` | Create basebackup | Weekly (Sunday) |
| `incremental-backup.sh --check` | Monitor WAL files | On-demand |
| `setup-wal-archiving.sh` | Configure WAL | One-time |

### Recovery Operations

| Command | Purpose | Usage |
|---------|---------|-------|
| `pitr-restore.sh --timestamp TIMESTAMP` | Restore to specific time | On-demand |
| `pitr-restore.sh --interactive` | Guided restore | On-demand |
| `restore-backup.sh --file BACKUP` | Restore from backup | On-demand |

### Security Operations

| Command | Purpose | Schedule |
|---------|---------|----------|
| `encrypt-backup.sh --setup` | Generate GPG key | One-time |
| `encrypt-backup.sh --enable-auto` | Enable auto-encryption | One-time |
| `encrypt-backup.sh --encrypt FILE` | Encrypt backup | Manual |
| `encrypt-backup.sh --decrypt FILE` | Decrypt backup | Manual |
| `sha256-checksum.sh --generate FILE` | Create checksum | Auto (daily) |
| `sha256-checksum.sh --verify FILE` | Verify integrity | Manual |

### Validation Operations

| Command | Purpose | Schedule |
|---------|---------|----------|
| `weekly-backup-validation.sh` | Integrity checks | Mondays 3 AM |
| `monthly-restore-test.sh` | Full restore test | 1st of month 3 AM |

### Optimization Operations

| Command | Purpose | Schedule |
|---------|---------|----------|
| `backup-deduplication.sh --analyze` | Find duplicates | Monthly |
| `backup-deduplication.sh --deduplicate` | Remove duplicates | Monthly |
| `backup-deduplication.sh --report` | Generate report | Monthly |
| `backup-optimization.sh --health` | Health dashboard | Weekly |
| `backup-optimization.sh --monitor` | Performance metrics | Weekly |
| `backup-optimization.sh --audit` | Integrity audit | Monthly |
| `backup-optimization.sh --cost-analysis` | Cost breakdown | Quarterly |
| `backup-optimization.sh --cleanup` | Maintenance | Weekly |
| `backup-optimization.sh --benchmark` | Performance test | Annually |

### Remote Sync Operations

| Command | Purpose | Schedule |
|---------|---------|----------|
| `rsync-backup-remote.sh` | Full remote sync | 4 AM daily |
| `rsync-backup-incremental.sh` | Incremental sync | 6-hourly |

---

## File Locations

### Backups
```
backups/
├── full/YYYY/MM/DD/               # Full backups
├── daily/YYYY/MM/DD/              # Daily backups
├── basebackup/                     # Incremental basebackups
├── wal-archive/                    # WAL files
├── index/                          # Metadata index
└── archive/                        # Old compressed backups
```

### Logs
```
logs/
├── backup-manager.log              # Main backup log
├── weekly-validation.log           # Validation log
├── rsync-backup.log                # Remote sync log
├── encryption.log                  # Encryption log
├── deduplication.log               # Deduplication log
└── optimization.log                # Optimization log
```

### Documentation
```
docs/
├── INCREMENTAL_BACKUPS.md          # WAL archiving guide
├── BACKUP_ENCRYPTION.md            # Encryption guide
├── RETENTION_POLICY_ANALYSIS.md    # Compliance policy
└── BACKUP_OPTIMIZATION_ADVANCED.md # Dedup & monitoring

root/
├── COMPLETE_BACKUP_SYSTEM_OPTIMIZATION.md
└── BACKUP_QUICK_REFERENCE.md (this file)
```

---

## Common Tasks

### Task: Check System Health
```bash
./scripts/backup/backup-optimization.sh --health
```
**Time:** 1-2 seconds  
**Output:** Visual health dashboard

### Task: Test Backup & Recovery
```bash
# Create test backup
./scripts/backup/backup-manager.sh --full

# Validate backup
./scripts/backup/weekly-backup-validation.sh

# Test restore
./scripts/backup/monthly-restore-test.sh
```
**Time:** 5-10 minutes total  
**Output:** Validation and test reports

### Task: Check Storage Usage
```bash
du -sh ./backups                    # Total size
du -sh ./backups/full               # Full backups
du -sh ./backups/daily              # Daily backups
du -sh ./backups/wal-archive        # WAL files
```

### Task: Find Duplicate Backups
```bash
./scripts/backup/backup-deduplication.sh --analyze
./scripts/backup/backup-deduplication.sh --report
```
**Time:** 2-5 minutes  
**Output:** Deduplication analysis report

### Task: Analyze Costs
```bash
./scripts/backup/backup-optimization.sh --cost-analysis
```
**Time:** 1-2 minutes  
**Output:** Cloud cost breakdown

### Task: Recover from Specific Point in Time
```bash
# Find available timestamps
ls -la backups/basebackup/

# Restore to specific time
./scripts/backup/pitr-restore.sh --timestamp 2025-11-10T12:30:00Z

# Or use interactive mode
./scripts/backup/pitr-restore.sh --interactive
```

### Task: Enable Encryption
```bash
# One-time setup
./scripts/backup/encrypt-backup.sh --setup

# Enable auto-encryption
./scripts/backup/encrypt-backup.sh --enable-auto

# Verify
grep BACKUP_ENCRYPTION_ENABLED .env
```

### Task: Verify Backup Integrity
```bash
./scripts/backup/weekly-backup-validation.sh
```
**Time:** 2-5 minutes  
**Output:** Validation report with details

---

## Monitoring & Alerts

### Daily Monitoring
- Automatic backup runs at 2 AM
- Check logs: `tail -20 logs/backup-manager.log`
- Health status: `./scripts/backup/backup-optimization.sh --health`

### Weekly Monitoring  
- Validation runs Monday 3 AM
- Check report: `cat logs/weekly-validation.log`
- Review metrics: `./scripts/backup/backup-optimization.sh --monitor`

### Monthly Monitoring
- Full restore test 1st of month 3 AM
- Cost analysis runs 15th
- Deduplication analysis
- Review compliance status

### Alert Triggers
- ✗ Backup failed: Check logs
- ✗ Validation failed: Run audit
- ✗ Storage >80%: Run deduplication
- ✗ Encryption error: Check GPG setup

---

## Performance Benchmarks

### Backup Creation
- Full backup: 30-45 seconds
- Daily backup: 25-35 seconds
- WAL archiving: Continuous (passive)

### Validation
- Weekly validation: 2-5 minutes
- Monthly restore test: 5-10 minutes
- Integrity audit: 1-2 minutes

### Recovery
- Point-in-time restore: 60-90 seconds
- Full database restore: 2-3 minutes
- Decrypt backup: <1 second

### Optimization
- Deduplication analysis: 2-5 minutes
- Cost analysis: 1-2 minutes
- Health check: 1-2 seconds

---

## Storage Requirements

### Test Database (240KB backups)
- Daily: 240KB
- Weekly: 240KB
- Monthly: 960KB
- Yearly: 4.8MB

### Small Production (500MB database)
- Daily: 16MB (WAL only)
- Weekly: 150MB (1 basebackup + 6 WAL)
- Monthly: 640MB
- Yearly: 7.7GB

### Large Production (5GB database)
- Daily: 160MB (WAL)
- Weekly: 1.5GB (basebackup + WAL)
- Monthly: 6.4GB
- Yearly: 77GB

### Enterprise (50GB database)
- Daily: 1.6GB (WAL)
- Weekly: 15GB (basebackup + WAL)
- Monthly: 64GB
- Yearly: 770GB

---

## Troubleshooting Quick Links

| Issue | Solution |
|-------|----------|
| Backup failed | Check `logs/backup-manager.log` |
| Validation failed | Run `./scripts/backup/backup-optimization.sh --audit` |
| Encryption error | Verify GPG: `gpg --list-keys "Backup Encryption"` |
| Storage full | Run deduplication or increase capacity |
| Recovery slow | Check disk I/O, database size |
| Metrics missing | Ensure `logs/` directory is writable |

---

## Cron Job Setup

### Essential Jobs
```bash
# Daily automatic backups (2 AM)
0 2 * * * ./scripts/backup/backup-manager.sh --auto

# Weekly validation (Monday 3 AM)
0 3 * * 1 cd /home/devnan/effective-guide && ./scripts/backup/weekly-backup-validation.sh

# Remote sync (4 AM daily)
0 4 * * * cd /home/devnan/effective-guide && ./scripts/backup/rsync-backup-remote.sh

# Monthly restore test (1st at 3 AM)
0 3 1 * * cd /home/devnan/effective-guide && ./scripts/backup/monthly-restore-test.sh
```

### Optional Jobs
```bash
# Weekly health check (Sunday 6 AM)
0 6 * * 0 cd /home/devnan/effective-guide && ./scripts/backup/backup-optimization.sh --health

# Monthly deduplication analysis (15th at 3 AM)
0 3 15 * * cd /home/devnan/effective-guide && ./scripts/backup/backup-deduplication.sh --analyze

# Monthly cost analysis (15th at 3:30 AM)
30 3 15 * * cd /home/devnan/effective-guide && ./scripts/backup/backup-optimization.sh --cost-analysis

# Weekly cleanup (Sunday 2 AM)
0 2 * * 0 cd /home/devnan/effective-guide && ./scripts/backup/backup-optimization.sh --cleanup
```

---

## Environment Variables

### Required (in `.env`)
```bash
POSTGRES_USER=gpsadmin
POSTGRES_DB=gps_tracker
DATABASE_URL=postgresql://user:pass@localhost/dbname
```

### Optional Backup Configuration
```bash
# Encryption
BACKUP_ENCRYPTION_ENABLED=true

# Email notifications
BACKUP_EMAIL_ENABLED=true
BACKUP_EMAIL=admin@example.com
BACKUP_EMAIL_FROM=backup@example.com

# Remote backup
REMOTE_BACKUP_ENABLED=true
REMOTE_BACKUP_USER=demo
REMOTE_BACKUP_HOST=192.168.100.74
REMOTE_BACKUP_DIR=~/maps-tracker-backup
REMOTE_BACKUP_SSH_PORT=22

# Retention
RETENTION_DAYS=365
ARCHIVE_AFTER_DAYS=90
```

---

## Recovery Procedures

### Full Database Recovery
```bash
# 1. Create backup first
./scripts/backup/backup-manager.sh --full

# 2. List available backups
./scripts/backup/backup-manager.sh --list

# 3. Restore from specific backup
./scripts/backup/restore-backup.sh --file backups/full/2025/11/11/backup_full_20251111_105909.sql
```

### Point-in-Time Recovery
```bash
# 1. Find recovery target time
# Check backup timestamps: ls -la backups/basebackup/

# 2. Restore to specific timestamp
./scripts/backup/pitr-restore.sh --timestamp 2025-11-11T12:00:00Z

# 3. Verify recovery
psql -U gpsadmin -d gps_tracker -c "SELECT COUNT(*) FROM users;"
```

### Encrypted Backup Recovery
```bash
# 1. Decrypt backup
./scripts/backup/encrypt-backup.sh --decrypt backups/full/2025/11/11/backup.sql.gpg

# 2. Verify checksum
./scripts/backup/sha256-checksum.sh --verify backup.sql

# 3. Restore
./scripts/backup/restore-backup.sh --file backup.sql
```

---

## System Status

### Check Components
```bash
# Docker containers
docker compose ps

# Database connection
docker compose exec db pg_isready

# Backup directory
ls -lah ./backups

# Recent backups
find ./backups -name "backup_*.sql" -type f -mtime -7 -ls

# WAL files
ls -la ./backups/wal-archive/
```

---

## Performance Optimization Tips

1. **Enable Deduplication** if storage >25% wasted
2. **Use Level 9 Compression** (already enabled)
3. **Enable Encryption** (minimal overhead <1%)
4. **Monitor Weekly** with health dashboard
5. **Review Costs Quarterly** for cloud optimization

---

## Support & Documentation

| Resource | Location |
|----------|----------|
| Incremental backups | `docs/INCREMENTAL_BACKUPS.md` |
| Encryption guide | `docs/BACKUP_ENCRYPTION.md` |
| Compliance policy | `docs/RETENTION_POLICY_ANALYSIS.md` |
| Advanced features | `docs/BACKUP_OPTIMIZATION_ADVANCED.md` |
| Complete project | `COMPLETE_BACKUP_SYSTEM_OPTIMIZATION.md` |

---

**Questions?** Check the comprehensive documentation in `docs/` directory.  
**Need help?** Review log files in `logs/` directory.  
**Ready to deploy?** Follow the deployment checklist in the full documentation.


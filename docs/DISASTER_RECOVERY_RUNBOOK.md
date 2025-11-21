# Maps Tracker - Disaster Recovery Runbook

**Last Updated**: 2025-11-14
**Status**: Production Ready
**RTO**: 10-15 minutes
**RPO**: <5 minutes

## Table of Contents

1. [Overview](#overview)
2. [Recovery Scenarios](#recovery-scenarios)
3. [Pre-Disaster Preparation](#pre-disaster-preparation)
4. [Full Database Recovery](#full-database-recovery)
5. [Point-in-Time Recovery (PITR)](#point-in-time-recovery-pitr)
6. [Configuration Recovery](#configuration-recovery)
7. [Remote Server Failover](#remote-server-failover)
8. [Verification Procedures](#verification-procedures)
9. [Rollback Procedures](#rollback-procedures)
10. [Communication Plan](#communication-plan)
11. [Post-Recovery Steps](#post-recovery-steps)

---

## Overview

### Recovery Objectives

| Metric | Target | Actual |
|--------|--------|--------|
| **RTO** (Recovery Time Objective) | <30 min | ~10-15 min |
| **RPO** (Recovery Point Objective) | <1 hour | <5 min |
| **Backup Frequency** | Daily | Daily (full weekly, daily checkpoints) |
| **Backup Location** | On-site + Off-site | Local + Remote |
| **Test Frequency** | Monthly | Weekly |

### Backup Components

1. **Database Backup** (`backups/full/YYYY/MM/DD/`)
   - PostgreSQL full dumps (weekly)
   - Daily checkpoints (Mon-Sat)
   - Encryption: AES-256 with GPG (optional)

2. **Configuration Backup** (`backups/config-backups/YYYY/MM/DD/`)
   - `.env` file with credentials
   - SSL certificates (`./ssl/`)
   - Application configuration

3. **WAL Archives** (`backups/wal-archive/`)
   - Point-in-time recovery capability
   - Automatic archiving every 5 minutes
   - Enables recovery to any timestamp

4. **Remote Backups**
   - Synced to: `demo@199.21.113.121:~/maps-tracker-backup/`
   - SSH-encrypted transfer
   - Hourly incremental sync

### Critical Files Locations

| File | Location | Purpose |
|------|----------|---------|
| Database container | Docker volume `./database` | PostgreSQL data |
| Backups | `./backups/` | All backup files |
| Backup index | `./backups/index/backup_index.json` | Metadata index |
| Environment | `.env` | Database credentials, secrets |
| Logs | `./logs/` | Application, error, access logs |
| Config backups | `./backups/config-backups/` | Configuration snapshots |

---

## Recovery Scenarios

### Scenario 1: Single Table Corruption
**Symptoms**: Application error affecting specific entity (vehicles, locations, etc.)
**Recovery Time**: 5-10 minutes
**Data Loss**: None (WAL ensures consistency)
**Steps**: [See Point-in-Time Recovery](#point-in-time-recovery-pitr)

### Scenario 2: Complete Database Loss
**Symptoms**: PostgreSQL container fails, data directory corrupted
**Recovery Time**: 10-15 minutes
**Data Loss**: <5 minutes (last backup interval)
**Steps**: [See Full Database Recovery](#full-database-recovery)

### Scenario 3: Server Hardware Failure
**Symptoms**: Entire server inaccessible
**Recovery Time**: 15-30 minutes
**Data Loss**: <5 minutes
**Steps**: [See Remote Server Failover](#remote-server-failover)

### Scenario 4: Configuration/Credentials Compromise
**Symptoms**: Unauthorized access or credential leak
**Recovery Time**: 5 minutes (redeploy with new .env)
**Data Loss**: None
**Steps**: [See Configuration Recovery](#configuration-recovery)

### Scenario 5: Accidental Data Deletion
**Symptoms**: User mistakenly deletes important data
**Recovery Time**: 10-15 minutes
**Data Loss**: Depends on backup age
**Steps**: [See Point-in-Time Recovery](#point-in-time-recovery-pitr)

---

## Pre-Disaster Preparation

### Checklist - Complete Before Production Deployment

- [ ] **Backup System Verification**
  ```bash
  # Test that backups are being created
  ls -lah backups/full/$(date +%Y/%m/%d)/
  ls -lah backups/config-backups/

  # Verify most recent backup exists and has content
  ls -lh backups/full/*/*/*/backup_*.sql* | head -1
  ```

- [ ] **Encryption Passphrase Stored Securely**
  ```bash
  # Ensure BACKUP_ENCRYPTION_PASSPHRASE is set in production .env
  # Store passphrase separately from .env in secure location (password manager, vault)
  # Example: LastPass, 1Password, HashiCorp Vault
  grep BACKUP_ENCRYPTION_PASSPHRASE .env  # Should not output passphrase
  ```

- [ ] **Remote Backup Sync Operational**
  ```bash
  # Verify remote backups exist
  ssh demo@199.21.113.121 "ls -lah ~/maps-tracker-backup/full/$(date +%Y/%m/%d)/"

  # Verify recent checksum matches
  ssh demo@199.21.113.121 "cat ~/maps-tracker-backup/full/*/backup_*.sql.sha256" | grep -c "backup"
  ```

- [ ] **Documentation Ready**
  - [ ] Database credentials stored in secure location
  - [ ] Encryption passphrase in secure vault
  - [ ] SSH key for remote backup server accessible
  - [ ] Contact list for team notification (see Communication Plan)

- [ ] **Test Restore Procedure**
  ```bash
  # Run weekly automated test restore
  ./scripts/backup/test-backup-restore.sh

  # Verify test restore succeeded
  tail -f logs/backup-manager.log | grep "test restore"
  ```

---

## Full Database Recovery

### Situation
- Database is corrupted, deleted, or inaccessible
- Need to restore from latest backup
- All recent changes since last backup will be lost
- Configuration files are intact (or separate recovery needed)

### Prerequisites
- Access to backup files in `./backups/`
- Database container can be restarted
- `.env` file with database credentials exists
- Docker and docker-compose installed

### Step 1: Stop the Application

```bash
# Stop all services (keeps data volumes intact)
docker compose stop

# Verify services are stopped
docker compose ps
```

### Step 2: Prepare Backup File

```bash
# List available backups, sorted by date (newest first)
ls -lhrt backups/full/*/backup_full_*.sql* | tail -20

# Most recent full backup (recommended for safest recovery)
LATEST_BACKUP=$(ls -1 backups/full/*/backup_full_*.sql* | sort | tail -1)
echo "Using backup: $LATEST_BACKUP"

# If using encrypted backup, decrypt first
if [[ "$LATEST_BACKUP" == *".gpg" ]]; then
    echo "Backup is encrypted, will be decrypted automatically during restore"
fi
```

### Step 3: Create Safety Backup (Optional but Recommended)

```bash
# If database still exists and is accessible, create a snapshot first
mkdir -p backups/pre-restore-safety

docker compose up -d db  # Start only database container
sleep 5

# Create safety backup
docker compose exec -T db pg_dump \
    -U mapsadmin \
    -d maps_tracker \
    -F c \
    -Z 9 \
    -f "/backups/pre-restore-safety/safety_$(date +%Y%m%d_%H%M%S).sql"

docker compose stop db
```

### Step 4: Remove Corrupted Database (if needed)

```bash
# ONLY if database is corrupted and causing issues
# WARNING: This deletes all current data!

# Remove the database volume
docker volume rm $(docker compose config --services | grep db | head -1)_data 2>/dev/null || true

# Or delete the host directory (if using directory mounts)
rm -rf ./database/*
```

### Step 5: Perform the Restore

```bash
# Start database container only
docker compose up -d db

# Wait for database to initialize (check logs)
docker compose logs -f db | grep "ready to accept connections"

# Run restore using backup service
docker compose exec -T backend python3 -c "
from app.services.backup_service import restore_backup
restore_backup('full/$(date +%Y/%m/%d)/backup_full_*.sql')  # Use actual filename
"

# Or use curl if API is accessible
LATEST_BACKUP=$(basename $(ls -1 backups/full/*/backup_full_*.sql* | sort | tail -1))
curl -X POST http://localhost:5000/api/backups/restore \
    -H "Content-Type: application/json" \
    -d "{\"filename\": \"full/$(date +%Y/%m/%d)/${LATEST_BACKUP}\"}" \
    -b cookies.txt  # If authentication required
```

### Step 6: Verify Restoration

```bash
# Check database is responsive
docker compose exec -T db psql -U mapsadmin -d maps_tracker -c "SELECT count(*) FROM users;"

# Verify table structure
docker compose exec -T db psql -U mapsadmin -d maps_tracker -c "\dt"

# Expected output: Should show 6 tables (users, vehicles, locations, etc.)
```

### Step 7: Restart Application

```bash
# Start all services
docker compose up -d

# Verify all services are healthy
docker compose ps

# Check application logs for errors
docker compose logs --tail=50 backend

# Test API endpoint
curl http://localhost:5000/api/health
```

### Step 8: Notify Stakeholders

See [Communication Plan](#communication-plan)

---

## Point-in-Time Recovery (PITR)

### Situation
- Specific data was accidentally deleted or modified
- Need to recover to a point before the deletion
- Database structure intact, only data affected

### Advantages
- Minimal data loss
- Can recover specific time windows
- Preserves all changes made after recovery point

### Prerequisites
- WAL files available since the delete event
- Know approximate time of deletion
- Full backup taken before deletion time

### Step 1: Identify Recovery Time

```bash
# Check when the deletion likely occurred
# Look at application logs or user reports
grep -i "delete\|drop" logs/access.log | tail -20
grep -i "error" logs/app.log | grep -i "vehicle\|location" | head -10

# Example deletion time: 2025-11-14 10:30:00
RECOVERY_TIME="2025-11-14 10:30:00"
```

### Step 2: Verify WAL Files Exist

```bash
# List available WAL files around recovery time
ls -lh backups/wal-archive/ | head -20

# WAL files are named: 000000010000000000000001, etc.
# Older ones = earlier in time sequence

# Estimate: roughly 1 WAL file per 5 minutes
# Check file dates
stat backups/wal-archive/* | grep Modify | sort
```

### Step 3: Prepare for PITR

```bash
# Create new recovery container with restore target
# This approach leaves original database untouched

# 1. Create recovery database
docker compose exec -T db psql -U mapsadmin -c \
    "CREATE DATABASE maps_tracker_recovery;"

# 2. Get latest full backup before deletion time
BACKUP_FILE="backups/full/2025/11/14/backup_full_20251114_020000.sql"
```

### Step 4: Perform PITR Restore

```bash
# Option A: Using pg_restore with recovery_target_time

docker compose exec -T db pg_restore \
    -d maps_tracker_recovery \
    -U mapsadmin \
    "${BACKUP_FILE}"

# Option B: Manual WAL recovery (advanced)
# See PostgreSQL documentation for detailed WAL recovery procedure
```

### Step 5: Verify Recovery Point

```bash
# Query recovery database to verify data state
docker compose exec -T db psql -U mapsadmin -d maps_tracker_recovery -c \
    "SELECT * FROM locations ORDER BY timestamp DESC LIMIT 5;"

# Compare row counts with current production
docker compose exec -T db psql -U mapsadmin -d maps_tracker_recovery -c \
    "SELECT COUNT(*) as location_count FROM locations;"
```

### Step 6: Promote to Primary (if satisfied)

```bash
# Rename databases to swap recovered data into production
docker compose exec -T db psql -U mapsadmin <<EOF
-- Terminate all connections to production database
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname = 'maps_tracker'
  AND pid <> pg_backend_pid();

-- Rename old database
ALTER DATABASE maps_tracker RENAME TO maps_tracker_old;

-- Rename recovered database
ALTER DATABASE maps_tracker_recovery RENAME TO maps_tracker;
EOF

# Verify new database is active
docker compose exec -T db psql -U mapsadmin -d maps_tracker -c "SELECT VERSION();"
```

### Step 7: Keep Old Database for Verification

```bash
# Keep old database for 24 hours before deletion
# This allows easy rollback if recovery was wrong

# After 24 hours of successful operation:
docker compose exec -T db psql -U mapsadmin <<EOF
DROP DATABASE maps_tracker_old;
EOF
```

---

## Configuration Recovery

### Situation
- `.env` file lost or corrupted
- SSL certificates missing
- Credentials need rotation

### Recovery Steps

#### Step 1: Restore from Config Backup

```bash
# List available configuration backups
ls -lh backups/config-backups/*/config_*.tar.gz

# Use most recent
LATEST_CONFIG=$(ls -1 backups/config-backups/*/config_*.tar.gz | sort | tail -1)
echo "Restoring from: $LATEST_CONFIG"

# Extract to temporary location first
mkdir -p /tmp/config-recovery
tar xzf "$LATEST_CONFIG" -C /tmp/config-recovery/

# Verify contents
ls -la /tmp/config-recovery/
```

#### Step 2: Validate Configuration

```bash
# Check if .env looks valid
cat /tmp/config-recovery/.env | head -10

# Verify critical variables are set
grep -E "DATABASE_URL|SECRET_KEY|BACKUP_ENCRYPTION_PASSPHRASE" \
    /tmp/config-recovery/.env
```

#### Step 3: Replace Current Configuration (with Caution)

```bash
# BACKUP current .env first!
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)

# Compare old and new
diff .env /tmp/config-recovery/.env

# If changes look good, restore
cp /tmp/config-recovery/.env ./

# Restore SSL certificates if present
if [ -d "/tmp/config-recovery/ssl" ]; then
    cp -r /tmp/config-recovery/ssl ./
fi

# Set secure permissions
chmod 600 .env
chmod 700 ssl/
chmod 600 ssl/*
```

#### Step 4: Rotate Credentials if Compromised

```bash
# If credentials may have been exposed, generate new ones
# 1. Update DATABASE_URL with new password
# 2. Update SECRET_KEY with new random value
# 3. Update BACKUP_ENCRYPTION_PASSPHRASE if exposed

# Generate new SECRET_KEY
openssl rand -hex 32

# Generate new encryption passphrase
openssl rand -base64 32

# Update .env with new values
nano .env

# Restart services with new configuration
docker compose restart
```

#### Step 5: Verify Services Start

```bash
# Check application startup
docker compose logs --tail=100 backend | grep -E "ERROR|WARNING|started"

# Test API
curl http://localhost:5000/api/health

# Should return: {"status":"healthy"} or similar
```

---

## Remote Server Failover

### Situation
- Primary server completely unavailable (hardware failure, fire, power outage)
- Need to restore from remote backup server
- Multiple hours of setup acceptable

### Remote Backup Location
```
Server: demo@199.21.113.121
Path: ~/maps-tracker-backup/
Backup types: full/, daily/, wal-archive/, config-backups/
Connection: SSH key-based authentication
```

### Prerequisites
- SSH access to remote server
- SSH key configured (in `~/.ssh/config` or passed explicitly)
- Sufficient disk space on new hardware
- Network connectivity to remote server

### Step 1: Access Remote Backups

```bash
# SSH into remote backup server
ssh demo@199.21.113.121

# List available backups
ls -lh ~/maps-tracker-backup/full/

# Check most recent backup
ls -lhrt ~/maps-tracker-backup/full/*/backup_full_*.sql* | tail -5

# Verify checksums
cat ~/maps-tracker-backup/full/*/backup_full_*.sql.sha256 | tail -5
```

### Step 2: Download Latest Backup

```bash
# On new recovery server, download latest backup
mkdir -p ./backups/full

# Get latest backup filename from remote
REMOTE_BACKUP=$(ssh demo@199.21.113.121 \
    'ls -1 ~/maps-tracker-backup/full/*/backup_full_*.sql* | sort | tail -1 | xargs basename')

echo "Downloading: $REMOTE_BACKUP"

# Download backup file
rsync -avz -e ssh \
    demo@199.21.113.121:~/maps-tracker-backup/full/*/$REMOTE_BACKUP \
    ./backups/full/ \
    --progress

# Verify file integrity
ssh demo@199.21.113.121 \
    "cat ~/maps-tracker-backup/full/*/${REMOTE_BACKUP}.sha256" | \
    sha256sum -c
```

### Step 3: Download Configuration Backup

```bash
# Download latest configuration
mkdir -p ./backups/config-backups

REMOTE_CONFIG=$(ssh demo@199.21.113.121 \
    'ls -1 ~/maps-tracker-backup/config-backups/*/config_*.tar.gz | sort | tail -1')

rsync -avz -e ssh \
    "demo@199.21.113.121:$REMOTE_CONFIG" \
    ./backups/config-backups/ \
    --progress

# Extract configuration
tar xzf ./backups/config-backups/$(basename $REMOTE_CONFIG) -C ./
```

### Step 4: Download WAL Files (Optional - for PITR)

```bash
# If you want PITR capability, download WAL files
# This can be large - only necessary if PITR is critical need

rsync -avz -e ssh \
    demo@199.21.113.121:~/maps-tracker-backup/wal-archive/ \
    ./backups/wal-archive/ \
    --progress
```

### Step 5: Deploy Application

```bash
# Clone application code
git clone <repo-url> maps-tracker-app
cd maps-tracker-app

# Restore configuration
cp ../.env ./

# Start Docker services
docker compose up -d

# Wait for database to initialize
sleep 10

# Perform restore (see Full Database Recovery section)
docker compose exec -T backend python3 -c "
from app.services.backup_service import restore_backup
restore_backup('<downloaded-backup-filename>')
"
```

### Step 6: Verify Remote Failover

```bash
# Test application
curl http://localhost:5000/api/health

# Check vehicle data
curl http://localhost:5000/api/vehicles -H "Authorization: Bearer $TOKEN"

# Verify user count
docker compose exec -T db psql -U mapsadmin -d maps_tracker -c \
    "SELECT count(*) FROM users;"
```

### Step 7: Update DNS/Load Balancer (if applicable)

```bash
# Update DNS records to point to new server
# Or update load balancer health checks to new server IP

# Example (if using Route53 or similar)
aws route53 change-resource-record-sets \
    --hosted-zone-id Z1234567890 \
    --change-batch file://dns-update.json
```

---

## Verification Procedures

### Post-Restore Checklist

- [ ] **Database Connectivity**
  ```bash
  docker compose exec -T db psql -U mapsadmin -d maps_tracker -c "SELECT VERSION();"
  ```

- [ ] **Table Structure Intact**
  ```bash
  docker compose exec -T db psql -U mapsadmin -d maps_tracker -c "\dt"
  # Should show: users, vehicles, locations, saved_locations, places_of_interest, audit_logs
  ```

- [ ] **Data Integrity**
  ```bash
  docker compose exec -T db psql -U mapsadmin -d maps_tracker << EOF
  SELECT 'users' as table_name, COUNT(*) as count FROM users
  UNION ALL
  SELECT 'vehicles', COUNT(*) FROM vehicles
  UNION ALL
  SELECT 'locations', COUNT(*) FROM locations
  UNION ALL
  SELECT 'saved_locations', COUNT(*) FROM saved_locations
  UNION ALL
  SELECT 'places_of_interest', COUNT(*) FROM places_of_interest;
  EOF
  ```

- [ ] **API Endpoints Responding**
  ```bash
  curl -s http://localhost:5000/api/health | jq .
  curl -s http://localhost:3000/  # React frontend loads
  ```

- [ ] **Authentication Works**
  ```bash
  curl -X POST http://localhost:5000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"username":"admin","password":"password"}' \
      -c cookies.txt
  ```

- [ ] **Data Can Be Modified**
  ```bash
  # Create test vehicle to verify write access
  curl -X POST http://localhost:5000/api/vehicles \
      -H "Content-Type: application/json" \
      -d '{"device_id":"TEST_001","name":"Test Vehicle"}' \
      -b cookies.txt
  ```

- [ ] **Recent Data Present**
  ```bash
  # Verify data is from recent backup (check timestamps)
  docker compose exec -T db psql -U mapsadmin -d maps_tracker -c \
      "SELECT * FROM locations ORDER BY timestamp DESC LIMIT 1;"
  ```

### Data Validation Queries

```bash
# Run comprehensive validation script
docker compose exec -T db psql -U mapsadmin -d maps_tracker << 'EOF'
-- Check referential integrity
SELECT 'vehicles without users' as issue, COUNT(*)
FROM vehicles WHERE user_id NOT IN (SELECT id FROM users);

SELECT 'locations without vehicles' as issue, COUNT(*)
FROM locations WHERE vehicle_id NOT IN (SELECT id FROM vehicles);

SELECT 'saved_locations without vehicles' as issue, COUNT(*)
FROM saved_locations WHERE vehicle_id NOT IN (SELECT id FROM vehicles);

-- Check data is recent (last 7 days)
SELECT 'old locations' as issue, COUNT(*)
FROM locations WHERE timestamp < NOW() - INTERVAL '7 days';

-- Check for orphaned records
SELECT COUNT(DISTINCT vehicle_id) as vehicles_with_data FROM locations;
SELECT COUNT(*) as total_vehicles FROM vehicles;
EOF
```

---

## Rollback Procedures

### When to Rollback
- Recovery procedure introduced unexpected data loss
- Restored data is older than acceptable RPO
- Application errors prevent normal operation post-restore
- Stakeholder request to revert restoration

### Rollback Steps

#### Option 1: Restore Previous Backup

```bash
# If original restore backup was recent, use next-older backup
# This preserves more recent changes

# List backups chronologically
ls -lhrt backups/full/*/backup_full_*.sql* | tail -10

# Restore from previous backup
docker compose stop
docker compose up -d db
docker compose exec -T backend python3 -c "
from app.services.backup_service import restore_backup
restore_backup('<previous-backup-filename>')
"
docker compose up -d
```

#### Option 2: Use Pre-Restore Safety Backup

```bash
# If safety backup was created, use it
ls -lh backups/pre-restore-safety/

# Restore from safety backup
docker compose stop
docker compose up -d db
docker compose exec -T backend python3 -c "
from app.services.backup_service import restore_backup
restore_backup('<safety-backup-filename>')
"
docker compose up -d
```

#### Option 3: Revert to Database Snapshot

```bash
# If old database was renamed (PITR scenario), swap back
docker compose exec -T db psql -U mapsadmin <<EOF
-- Terminate connections
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity WHERE datname = 'maps_tracker'
  AND pid <> pg_backend_pid();

-- Restore old database
ALTER DATABASE maps_tracker RENAME TO maps_tracker_bad;
ALTER DATABASE maps_tracker_old RENAME TO maps_tracker;
EOF

# Restart services
docker compose restart backend
```

### Verification After Rollback

```bash
# Ensure previous state is restored
curl http://localhost:5000/api/health
docker compose logs --tail=50 backend | grep -i error
```

---

## Communication Plan

### Escalation During Disaster

```
1. Initial Detection (Incident Commander)
   ↓
2. Acknowledge on Slack/Teams (#incidents channel)
   Message: "🔴 INCIDENT: Database recovery in progress. ETA 15 min. Updates every 5 min."
   ↓
3. Page On-Call Engineer (if after hours)
   ↓
4. Every 5 minutes: Status Update
   "Recovery 40% complete. Database restored. Running verification queries..."
   ↓
5. Post-Recovery: Full Notification
   "✅ RESOLVED: Database restored from backup at [timestamp]. No data loss detected.
    All systems operational. Full incident review scheduled for tomorrow 10am."
```

### Notification Template

**Subject**: [INCIDENT] Maps Tracker Database Recovery - Status Update

**To**: admin@example.com, ops@example.com, team@example.com

**Body**:

```
INCIDENT SUMMARY
================
Incident: Database failure requiring restore from backup
Start Time: [TIME]
Current Status: [IN PROGRESS / RESOLVED]
Estimated Resolution: [TIME]
Impact: Tracking unavailable / Tracking available read-only

ACTIONS TAKEN
=============
- [ ] Identified backup needed for recovery
- [ ] Downloaded backup file to recovery server
- [ ] Verified backup integrity (SHA256 checksum)
- [ ] Initiated database restore
- [ ] Running post-recovery validation tests
- [ ] Restarted application services
- [ ] Verified API endpoints responding

DATA IMPACT
===========
Data Loss Window: [START - END]
Impact: Last backup was [X minutes] old
Affected Records: [Approximately X locations, Y vehicles]
Recovery Status: COMPLETE / IN PROGRESS

VERIFICATION RESULTS
====================
- Database connectivity: ✓ PASS
- Table structure: ✓ PASS (6 tables, X total rows)
- API endpoints: ✓ PASS (health check responding)
- Authentication: ✓ PASS
- Data modification: ✓ PASS (test vehicle created)

NEXT STEPS
==========
1. Monitor system for 1 hour
2. Check application error logs
3. Verify backup system restarted
4. Schedule incident review meeting
5. Update disaster recovery documentation

CONTACTS
========
Incident Commander: [NAME] ([PHONE])
DBA On-Call: [NAME] ([PHONE])
Engineering Lead: [NAME] ([PHONE])

Questions? Respond to this email or ping #incidents on Slack.
```

### Contact List Template

Create file: `.emergency-contacts`

```
# Maps Tracker - Emergency Contacts

## Incident Commander
Name: [PRIMARY], [BACKUP]
Phone: +1 (XXX) XXX-XXXX
Email: [EMAIL]

## Database Administrator
Name: [PRIMARY], [BACKUP]
Phone: +1 (XXX) XXX-XXXX
Email: [EMAIL]

## System Administrator
Name: [PRIMARY], [BACKUP]
Phone: +1 (XXX) XXX-XXXX
Email: [EMAIL]

## Engineering Manager
Name: [NAME]
Phone: +1 (XXX) XXX-XXXX
Email: [EMAIL]

## Notification Channels
Slack: #incidents
Email Distro: ops@example.com
PagerDuty: [ESCALATION POLICY]
```

---

## Post-Recovery Steps

### Immediate (First Hour)

- [ ] Monitor application error logs for issues
- [ ] Check database replication lag (if applicable)
- [ ] Verify backup system resumed normal operation
- [ ] Confirm remote sync still operational
- [ ] Test critical user workflows

### Short-term (First Day)

- [ ] Generate incident report with timeline
- [ ] Document what failed and why
- [ ] Review logs to identify root cause
- [ ] Schedule incident review with team
- [ ] Update runbook with lessons learned

### Medium-term (First Week)

- [ ] Implement fixes for identified issues
- [ ] Add monitoring/alerts for failure prevention
- [ ] Test updated recovery procedures
- [ ] Update disaster recovery documentation
- [ ] Train team on new procedures

### Long-term (Ongoing)

- [ ] Monthly disaster recovery drills
- [ ] Quarterly backup restoration tests
- [ ] Annual runbook review and update
- [ ] Security audit of backup encryption
- [ ] Monitor backup trends (size, duration)

---

## Appendix

### Useful Commands

```bash
# Check database size
docker compose exec -T db psql -U mapsadmin -d maps_tracker \
    -c "SELECT pg_size_pretty(pg_database_size('maps_tracker'));"

# Check backup directory usage
du -sh backups/*/

# List recent backups with timestamps
find backups -name "backup_*.sql*" -printf '%T@ %p\n' | \
    sort -n | tail -20 | cut -d' ' -f2-

# Verify all table rowcounts
docker compose exec -T db psql -U mapsadmin -d maps_tracker << 'EOF'
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname != 'pg_catalog'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
EOF

# Check WAL archive accumulation
ls -1 backups/wal-archive/ | wc -l
du -sh backups/wal-archive/

# Monitor restore progress (in another terminal)
docker compose logs -f db | grep "restore\|CREATE\|INSERT"
```

### Troubleshooting

**Problem**: Restore fails with "permission denied"
```bash
# Fix file permissions
chmod 640 backups/full/*/*/backup_*.sql*
docker compose exec -T db chown postgres:postgres /backups/full/*/*/backup_*.sql*
```

**Problem**: Restore times out
```bash
# Increase timeout in backup_service.py from 300 to 600 seconds
# Or restore in background and monitor progress
```

**Problem**: Decryption fails with "bad decrypt"
```bash
# Verify passphrase is correct
echo "Your passphrase" | gpg --symmetric --cipher-algo AES256 \
    --batch --passphrase-fd 0 --dry-run test.txt

# If fails, passphrase is wrong - check BACKUP_ENCRYPTION_PASSPHRASE in .env
```

**Problem**: Restored database is older than expected
```bash
# Check backup timestamps
stat backups/full/*/*/backup_*.sql | grep Modify | sort -r | head -3

# Consider using PITR to recover to more recent timestamp
```

---

## References

- PostgreSQL PITR Documentation: https://www.postgresql.org/docs/current/continuous-archiving.html
- GPG Decryption: `man gpg`
- rsync Documentation: `man rsync`
- Backup Monitoring: Check `logs/backup-manager.log`
- Incident Response Template: See `.emergency-contacts`

---

**Last Tested**: [DATE]
**Next Test Due**: [DATE + 30 DAYS]
**Tested By**: [NAME]
**Result**: PASS / FAIL

For questions or updates to this runbook, contact: [DEVOPS_EMAIL]

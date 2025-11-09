# Remote Backup with Rsync

This document describes the automated remote backup system that syncs local backups and logs to a remote server using rsync over SSH.

## Overview

The remote backup system automatically syncs the following directories to remote server **192.168.100.74**:
- **backups/** - Database backup files
- **logs/** - Application log files

Backups are performed via rsync over SSH with key-based authentication for security and automation.

## Remote Server Configuration

| Setting | Value |
|---------|-------|
| Remote Host | 192.168.100.74 |
| Remote User | demo (configurable) |
| Remote Base Directory | ~/gps-tracker-backup (in user's home) |
| Authentication | SSH key-based (no password) |
| Transfer Method | rsync over SSH |
| Email Notifications | demo@praxisnetworking.com |

## Email Notifications

The backup script automatically sends email notifications to **demo@praxisnetworking.com** after each backup execution with:
- ✅ SUCCESS or ❌ FAILURE status
- Number of successful/failed backups
- Backup duration
- Remote server location
- Local data sizes
- Timestamp
- Log file location

**Requirements:**
- `mailutils` package must be installed: `sudo apt-get install mailutils`
- If mail command is not available, the script will log a warning and continue without email

**Configuration:**
Edit `rsync-backup-remote.sh` to customize:
```bash
EMAIL_ENABLED=true                          # Set to false to disable emails
EMAIL_RECIPIENT="demo@praxisnetworking.com" # Change email address
EMAIL_SUBJECT_PREFIX="[GPS Tracker Backup]" # Customize subject prefix
```

## Scripts

### 1. rsync-backup-remote.sh
Backs up local data to remote server.

**Features:**
- Automatic SSH connection testing
- Progress reporting with statistics
- Creates remote directories automatically
- Uses rsync with compression and mirroring
- Detailed logging to `logs/rsync-backup.log`
- Error handling and validation
- Email notifications with status reports to demo@praxisnetworking.com

**Usage:**
```bash
# Run manual backup
./rsync-backup-remote.sh

# View backup log
tail -f logs/rsync-backup.log
```

### 2. rsync-restore-remote.sh
Restores data from remote server to local system.

**Features:**
- Selective restore (backups, logs, or all)
- Lists available remote backups
- Safety confirmation before overwriting
- Progress reporting

**Usage:**
```bash
# Restore everything
./rsync-restore-remote.sh all

# Restore only database backups
./rsync-restore-remote.sh backups

# Restore only logs
./rsync-restore-remote.sh logs

# List remote backups without restoring
./rsync-restore-remote.sh list
```

### 3. setup-rsync-cron.sh
Interactive setup for automatic scheduled backups.

**Features:**
- Multiple schedule presets
- Custom schedule support
- Automatic conflict detection
- Cron job management

**Usage:**
```bash
# Run interactive setup
./setup-rsync-cron.sh
```

**Schedule Options:**
1. Every 6 hours (recommended for active systems)
2. Every 12 hours
3. Daily at 3 AM (recommended for most systems)
4. Daily at 11 PM
5. Twice daily (3 AM and 3 PM)
6. Custom schedule

## Initial Setup

### Step 1: Verify SSH Access

SSH key authentication should already be configured. Test it:

```bash
# Test SSH connection
ssh demo@192.168.100.74 "echo 'Connection successful'"

# You should see "Connection successful" without entering a password
```

If this fails, check:
- SSH keys are properly configured: `ls -la ~/.ssh/`
- Remote server is reachable: `ping 192.168.100.74`
- SSH service is running on remote server

### Step 2: Test Manual Backup

Run a test backup to ensure everything works:

```bash
# Run the backup script manually
./rsync-backup-remote.sh

# Check the output for any errors
# Log file: logs/rsync-backup.log
```

Expected output:
```
INFO: Checking requirements...
INFO: All required commands are available
INFO: Testing SSH connection to demo@192.168.100.74...
INFO: SSH connection test passed
INFO: Setting up remote directories...
INFO: Starting backup of /home/demo/effective-guide/backups to demo@192.168.100.74:/backup/gps-tracker/backups/
...
INFO: All backups completed successfully
```

### Step 3: Configure Automatic Backups

Set up scheduled automatic backups:

```bash
# Run the interactive setup
./setup-rsync-cron.sh

# Follow the prompts to select your preferred schedule
```

The script will:
1. Ask you to choose a backup schedule
2. Create the cron job automatically
3. Show you the configured schedule
4. Provide management commands

### Step 4: Verify Cron Job

Check that the cron job was created successfully:

```bash
# List your cron jobs
crontab -l

# You should see an entry like:
# Automatic remote backup to 192.168.100.74
# 0 3 * * * /home/demo/effective-guide/rsync-backup-remote.sh >> /home/demo/effective-guide/logs/rsync-backup.log 2>&1
```

## Remote Server Directory Structure

After the first backup, the remote server will have:

```
~/gps-tracker-backup/
├── backups/
│   ├── backup_20251030_020000.sql
│   ├── backup_20251030_093851.sql
│   └── manual_*.sql
└── logs/
    ├── app.log
    ├── app.log.1
    ├── error.log
    ├── access.log
    └── rsync-backup.log
```

## Monitoring and Maintenance

### View Backup Status

```bash
# View recent backup log
tail -50 logs/rsync-backup.log

# View live backup progress
tail -f logs/rsync-backup.log

# Check last backup time
ls -lh logs/rsync-backup.log
```

### List Remote Backups

```bash
# List what's on the remote server
./rsync-restore-remote.sh list
```

### Manual Backup

```bash
# Run backup immediately (doesn't wait for cron)
./rsync-backup-remote.sh
```

### Check Remote Disk Space

```bash
# Check disk usage on remote server
ssh demo@192.168.100.74 "df -h ~/gps-tracker-backup && du -sh ~/gps-tracker-backup/*"
```

## Rsync Options Explained

The backup script uses these rsync options:

| Option | Description |
|--------|-------------|
| `-a` | Archive mode (preserves permissions, timestamps, symlinks) |
| `-v` | Verbose output |
| `-z` | Compress data during transfer |
| `--delete` | Delete remote files that don't exist locally (mirror) |
| `--stats` | Show transfer statistics |
| `--human-readable` | Display numbers in human-readable format |
| `-e ssh` | Use SSH for transfer |

The `--delete` flag ensures the remote is an exact mirror of local. This means:
- ✅ Deleted local files are also deleted remotely
- ✅ Saves remote disk space
- ⚠️ Old backups deleted locally will be deleted remotely

## Disaster Recovery

### Full System Restore

If you need to restore everything from the remote backup:

```bash
# 1. Restore database backups and logs
./rsync-restore-remote.sh all

# 2. Verify restored files
ls -lh backups/
ls -lh logs/

# 3. Restore database from backup file (if needed)
docker compose exec backend python -c "
from app.main import restore_backup
restore_backup('backup_YYYYMMDD_HHMMSS.sql')
"
# Or use the restore script:
./restore-backup.sh --latest
```

### Selective Restore

Restore only specific components:

```bash
# Restore only database backups
./rsync-restore-remote.sh backups

# Restore only logs
./rsync-restore-remote.sh logs
```

## Troubleshooting

### Issue: SSH connection fails

**Error:** `SSH connection failed`

**Solutions:**
1. Test SSH manually: `ssh demo@192.168.100.74`
2. Check SSH key: `ssh-add -l`
3. Verify remote server is up: `ping 192.168.100.74`
4. Check SSH config: `cat ~/.ssh/config`

### Issue: Permission denied on remote server

**Error:** `rsync: mkdir "~/gps-tracker-backup" failed: Permission denied`

**Solutions:**
1. The default configuration uses the home directory which should work without sudo
2. If you changed REMOTE_BASE_DIR to a system directory, check permissions:
   ```bash
   ssh demo@192.168.100.74 "ls -ld /your/custom/path"
   ```
3. For system directories, create manually with correct permissions:
   ```bash
   ssh demo@192.168.100.74 "sudo mkdir -p /your/custom/path && sudo chown demo:demo /your/custom/path"
   ```

### Issue: Cron job not running

**Error:** Backups not happening automatically

**Solutions:**
1. Check cron service is running:
   ```bash
   sudo systemctl status cron
   ```
2. Check cron logs:
   ```bash
   grep CRON /var/log/syslog | tail -20
   ```
3. Verify cron job exists:
   ```bash
   crontab -l
   ```
4. Check script permissions:
   ```bash
   ls -l rsync-backup-remote.sh
   # Should show: -rwxr-xr-x
   ```
5. Test script manually:
   ```bash
   ./rsync-backup-remote.sh
   ```

### Issue: Remote disk full

**Error:** `No space left on device`

**Solutions:**
1. Check remote disk space:
   ```bash
   ssh demo@192.168.100.74 "df -h"
   ```
2. Clean old backups on remote:
   ```bash
   ssh demo@192.168.100.74 "cd ~/gps-tracker-backup/backups && rm backup_*.sql.5 backup_*.sql.[6-9] backup_*.sql.10"
   ```
3. Clean old logs:
   ```bash
   ssh demo@192.168.100.74 "cd ~/gps-tracker-backup/logs && rm *.log.[5-9] *.log.10"
   ```

### Issue: Slow transfer speed

**Solutions:**
1. Check network connection:
   ```bash
   ping -c 10 192.168.100.74
   ```
2. Test bandwidth:
   ```bash
   # If iperf is available
   iperf3 -c 192.168.100.74
   ```
3. Reduce rsync compression (if CPU is bottleneck):
   Edit `rsync-backup-remote.sh` and change `-z` to `--compress-level=3`

### Issue: Email notifications not being sent

**Error:** `Email notification skipped: mail command not available`

**Solutions:**
1. Install mailutils package:
   ```bash
   sudo apt-get update
   sudo apt-get install mailutils
   ```
2. Test mail command:
   ```bash
   echo "Test email" | mail -s "Test Subject" demo@praxisnetworking.com
   ```
3. Check mail configuration:
   ```bash
   # Configure postfix or sendmail for your environment
   sudo dpkg-reconfigure postfix
   ```
4. Verify email was sent (check logs):
   ```bash
   grep "Email notification" logs/rsync-backup.log
   tail -f /var/log/mail.log
   ```
5. Disable email notifications if not needed:
   Edit `rsync-backup-remote.sh` and set `EMAIL_ENABLED=false`

### Issue: Restore fails with "Operation not permitted" (rsync error code 23)

**Error:**
```
rsync: [generator] chgrp "backups/backup_*.sql" failed: Operation not permitted (1)
rsync error: some files/attrs were not transferred (see previous errors) (code 23)
```

**Cause:** rsync was trying to preserve group ownership from remote files that the local user doesn't have permission to set.

**Solution:** This has been fixed in `rsync-restore-remote.sh` by adding `--no-g` and `--no-perms` flags. Update your script or pull the latest version.

**Manual fix:** If using an older version, add these flags to the rsync command:
```bash
rsync -avz --no-g --no-perms ...
```

See **RSYNC_RESTORE_FIX.md** for complete details.

### Issue: ANSI color codes in logs and piped output

**Error:** Log files or piped output contain escape sequences like `[0;32m`, `[1;33m`, `[0m`

**Cause:** Color codes were being output even in non-terminal contexts.

**Solution:** This has been fixed in both `rsync-backup-remote.sh` and `rsync-restore-remote.sh`. The scripts now detect if output is to a terminal and only use colors when appropriate.

**Result:** Clean, readable output in log files and when redirecting/piping script output.

See **RSYNC_RESTORE_FIX.md** for complete details.

## Cron Management

### View Cron Jobs
```bash
crontab -l
```

### Edit Cron Jobs
```bash
crontab -e
```

### Remove All Cron Jobs
```bash
crontab -r
```

### Remove Specific Cron Job
```bash
# Remove rsync backup job only
crontab -l | grep -v "rsync-backup-remote.sh" | crontab -
```

### Change Schedule
```bash
# Option 1: Run setup again (recommended)
./setup-rsync-cron.sh

# Option 2: Edit manually
crontab -e
# Then modify the line with rsync-backup-remote.sh
```

## Security Considerations

### SSH Key Security
- SSH private keys should have permissions 600: `chmod 600 ~/.ssh/id_rsa`
- Never share or commit private keys
- Use passphrase-protected keys when possible

### Remote Server Access
- Limit SSH access to specific IP addresses (firewall)
- Use fail2ban to prevent brute-force attacks
- Regularly update SSH server
- Disable password authentication (use keys only)

### Backup Encryption
The current setup transfers over SSH (encrypted), but files are stored unencrypted on the remote server.

For additional security, consider:
1. Encrypted filesystems on remote server (LUKS)
2. Encrypted backups before transfer (gpg)
3. VPN tunnel between servers

## Advanced Configuration

### Change Remote Directory

Edit both scripts and change:
```bash
REMOTE_BASE_DIR="~/gps-tracker-backup"
# Change to your preferred path (use full path, not ~)
REMOTE_BASE_DIR="/your/custom/path"
```

**Note:** If using a system directory (not in home), you may need sudo to create it on the remote server.

### Change Remote User

Edit both scripts and change:
```bash
REMOTE_USER="demo"
# Change to your remote username
REMOTE_USER="your_username"
```

### Exclude Files from Backup

Edit `rsync-backup-remote.sh` and add `--exclude` options:
```bash
rsync -avz \
    --delete \
    --exclude="*.tmp" \
    --exclude="*.log.10" \
    --stats \
    ...
```

### Backup to Multiple Servers

Create multiple copies of the backup script with different remote servers:
```bash
cp rsync-backup-remote.sh rsync-backup-server2.sh
# Edit rsync-backup-server2.sh to change REMOTE_HOST
# Add both to cron
```

## Bandwidth and Storage Estimates

### Initial Backup
The first backup transfers all data:
- Database backups: ~5-50 MB (depends on data volume)
- Logs: ~1-10 MB (depends on activity)
- **Total first backup**: ~10-100 MB
- **Time** (on 100 Mbps): < 1 minute

### Incremental Backups
Subsequent backups only transfer changes:
- New database backup: ~5-10 MB per backup
- New logs: ~100 KB - 1 MB per day
- **Typical incremental**: 5-15 MB
- **Time** (on 100 Mbps): < 10 seconds

### Remote Storage Requirements
With default retention (10 backups × 10MB each):
- Database backups: ~100 MB
- Logs: ~100 MB
- **Total remote storage needed**: ~200 MB

## Integration with Server Backup System

This rsync backup is separate from but complements the local backup system:

| System | Purpose | Frequency | Location |
|--------|---------|-----------|----------|
| Database Backup | PostgreSQL dumps | Daily at 2 AM | Local + Remote |
| Application Logs | Runtime logs | Continuous | Local + Remote |
| Rsync Remote | Off-site copy | Configurable | Remote only |

All three work together for comprehensive data protection.

## Testing Backup and Restore

### Test Backup
```bash
# 1. Run backup manually
./rsync-backup-remote.sh

# 2. Verify on remote
ssh demo@192.168.100.74 "ls -lh /backup/gps-tracker/backups/ && ls -lh /backup/gps-tracker/logs/"

# 3. Check log for success
tail logs/rsync-backup.log
```

### Test Restore
```bash
# 1. List remote backups
./rsync-restore-remote.sh list

# 2. Create test directory
mkdir -p /tmp/restore-test

# 3. Modify restore script temporarily to use test directory
# Or manually rsync:
rsync -avz demo@192.168.100.74:/backup/gps-tracker/backups/ /tmp/restore-test/

# 4. Verify restored files
ls -lh /tmp/restore-test/

# 5. Clean up
rm -rf /tmp/restore-test
```

## Summary

The remote backup system provides:
- ✅ Automatic off-site backups
- ✅ Protection against local hardware failure
- ✅ Easy disaster recovery
- ✅ Incremental transfers (efficient)
- ✅ Secure SSH-based transfer
- ✅ Configurable schedule
- ✅ Easy restore process

For questions or issues, check the logs:
- Backup operations: `logs/rsync-backup.log`
- Application logs: `logs/app.log`
- Cron execution: `/var/log/syslog`

# Remote Backup Configuration (rsync to Remote Server)

## Overview

This document describes how to configure and use remote backups via rsync. The Maps Tracker can automatically backup your data to a remote server, providing an off-site copy of your backups for disaster recovery.

## Features

- **Automated rsync transfers** - Securely copies backups to remote server using SSH
- **SSH key authentication** - No passwords stored in configuration
- **Configurable remote server** - Easy setup via .env file
- **Custom SSH port support** - Works with non-standard SSH ports
- **Checksum verification** - Validates file integrity after transfer
- **Organized remote structure** - Maintains date-based folder hierarchy

## Configuration

### 1. Update .env File

Add or update the following variables in your `.env` file:

```bash
# Remote Backup Configuration (rsync to remote server)
# Enable/disable remote backups via rsync
REMOTE_BACKUP_ENABLED=false
# Remote server IP address or hostname
REMOTE_BACKUP_HOST=192.168.100.74
# Remote server username (should have SSH key-based auth configured)
REMOTE_BACKUP_USER=demo
# Remote backup directory path on remote server (using ~ for home directory)
REMOTE_BACKUP_DIR=~/maps-tracker-backup
# SSH port (default 22)
REMOTE_BACKUP_SSH_PORT=22
```

### 2. Configure SSH Key-Based Authentication

**On your local system:**

```bash
# Generate SSH key if you don't have one (one-time setup)
ssh-keygen -t ed25519 -C "maps-tracker-backup"
# Press Enter to accept defaults
# Do NOT set a passphrase for automated backups

# Copy public key to remote server
ssh-copy-id -i ~/.ssh/id_ed25519.pub demo@192.168.100.74

# Test the connection
ssh -i ~/.ssh/id_ed25519 demo@192.168.100.74 "echo 'SSH connection successful'"
```

**On the remote server:**

```bash
# Create backup directory
mkdir -p ~/maps-tracker-backup
mkdir -p ~/maps-tracker-backup/backups
mkdir -p ~/maps-tracker-backup/logs

# Set permissions
chmod 700 ~/maps-tracker-backup
```

## Usage

### Manual Remote Backup

```bash
# Backup to remote server
./scripts/backup/rsync-backup-remote.sh

# Expected output:
# Testing SSH connection...
# SSH connection test passed
# Setting up remote directories...
# Remote directories created/verified
# Syncing backups to remote...
# Successfully backed up backups
# Syncing logs to remote...
# Successfully backed up logs
```

### Manual Remote Restore

```bash
# List available backups on remote server
./scripts/backup/rsync-restore-remote.sh

# Restore from remote server (interactive mode)
./scripts/backup/rsync-restore-remote.sh all

# Restore only backups
./scripts/backup/rsync-restore-remote.sh backups

# Restore only logs
./scripts/backup/rsync-restore-remote.sh logs
```

## Automated Remote Backups (Cron)

### Add to Crontab

```bash
# Edit crontab
crontab -e

# Add this line to run remote backups daily at 3 AM:
0 3 * * * cd /home/devnan/effective-guide && ./scripts/backup/rsync-backup-remote.sh >> /home/devnan/effective-guide/logs/rsync-cron.log 2>&1
```

### Crontab Examples

```bash
# Weekly (every Sunday at 3 AM)
0 3 * * 0 cd /home/devnan/effective-guide && ./scripts/backup/rsync-backup-remote.sh >> logs/rsync-cron.log 2>&1

# Daily (every day at 3 AM)
0 3 * * * cd /home/devnan/effective-guide && ./scripts/backup/rsync-backup-remote.sh >> logs/rsync-cron.log 2>&1

# Twice daily (3 AM and 3 PM)
0 3,15 * * * cd /home/devnan/effective-guide && ./scripts/backup/rsync-backup-remote.sh >> logs/rsync-cron.log 2>&1
```

## Environment Variables Reference

| Variable | Default | Description | Example |
|----------|---------|-------------|---------|
| `REMOTE_BACKUP_ENABLED` | false | Enable/disable remote backups | true/false |
| `REMOTE_BACKUP_HOST` | 192.168.100.74 | Remote server IP or hostname | 192.168.1.100 |
| `REMOTE_BACKUP_USER` | demo | SSH username on remote | admin |
| `REMOTE_BACKUP_DIR` | ~/maps-tracker-backup | Remote backup directory | ~/backups |
| `REMOTE_BACKUP_SSH_PORT` | 22 | SSH port on remote server | 2222 |

## Remote Server Structure

After first backup, the remote server will have this structure:

```
~/maps-tracker-backup/
├── backups/
│   ├── full/
│   │   └── 2025/
│   │       └── 11/
│   │           └── 08/
│   │               └── backup_full_20251108_020000.sql
│   ├── daily/
│   │   └── 2025/
│   │       └── 11/
│   │           └── 08/
│   │               └── backup_daily_20251108_020000.sql
│   ├── archive/
│   │   └── backup_old_*.sql.gz
│   └── index/
│       └── backup_index.json
└── logs/
    └── app.log
    └── error.log
    └── access.log
```

## Troubleshooting

### SSH Connection Failed

**Error**: `SSH connection failed`

**Checks**:
1. Verify SSH key is authorized on remote:
   ```bash
   ssh-copy-id -i ~/.ssh/id_ed25519.pub demo@192.168.100.74
   ```

2. Test SSH connection:
   ```bash
   ssh -i ~/.ssh/id_ed25519 -p 22 demo@192.168.100.74 "echo test"
   ```

3. Verify SSH port in .env:
   ```bash
   REMOTE_BACKUP_SSH_PORT=22
   ```

### Permission Denied

**Error**: `Permission denied (publickey)`

**Solution**:
1. Regenerate SSH key without passphrase:
   ```bash
   ssh-keygen -t ed25519 -C "gps-tracker-backup" -N ""
   ```

2. Copy to remote again:
   ```bash
   ssh-copy-id -i ~/.ssh/id_ed25519.pub demo@192.168.100.74
   ```

### Directory Not Found

**Error**: `Remote directory does not exist: ~/maps-tracker-backup/backups`

**Solution**:
```bash
# On remote server, create directories:
ssh demo@192.168.100.74 "mkdir -p ~/maps-tracker-backup/{backups,logs}"

# Or run the setup command which creates them:
./scripts/backup/rsync-backup-remote.sh
```

### Slow Transfer

**Cause**: Network latency or large files

**Solutions**:
1. Run during off-peak hours
2. Increase timeout in script (line 323 in rsync-backup-remote.sh):
   ```bash
   -e "ssh -p ${REMOTE_SSH_PORT} -o BatchMode=yes -o ConnectTimeout=30"
   ```

3. Check bandwidth:
   ```bash
   iftop  # Real-time bandwidth monitor
   ```

### Disk Space Issues

**Error**: `No space left on device`

**Solution**:
1. Check remote disk space:
   ```bash
   ssh demo@192.168.100.74 "df -h"
   ```

2. Clean up old backups on remote:
   ```bash
   ssh demo@192.168.100.74 "rm -rf ~/maps-tracker-backup/archive/*.sql.gz"
   ```

## Security Considerations

### Best Practices

✅ **Use SSH keys** - Never store passwords
✅ **Restrict directory permissions** - Use 700 for backup directories
✅ **Rotate SSH keys** - Periodically generate new keys
✅ **Monitor transfers** - Check logs for failures
✅ **Test restoration** - Verify backups are actually restorable

### SSH Key Security

```bash
# Generate key without passphrase (for automation)
ssh-keygen -t ed25519 -C "maps-tracker-backup" -N ""

# Protect key file
chmod 600 ~/.ssh/id_ed25519

# On remote, restrict key usage (optional, in ~/.ssh/authorized_keys):
command="rsync --server -avzR --safe-links --compress-level=9 --stats --human-readable",no-port-forwarding,no-X11-forwarding,no-agent-forwarding ssh-ed25519 AAAA...
```

### Firewall Rules

Ensure your firewall allows:
- **Source**: Local server where scripts run
- **Destination**: Remote server IP
- **Port**: SSH port (default 22)
- **Protocol**: TCP

```bash
# Example firewall rule (UFW)
sudo ufw allow from <LOCAL_IP> to <REMOTE_IP> port 22
```

## Monitoring

### Check Last Backup

```bash
# List remote backups
ssh demo@192.168.100.74 "ls -lh ~/maps-tracker-backup/backups/daily/*/*.sql | tail -5"

# Check remote disk usage
ssh demo@192.168.100.74 "du -sh ~/maps-tracker-backup"
```

### View Backup Logs

```bash
# Local rsync logs
tail -f logs/rsync-backup.log

# Check cron logs (if scheduled)
tail -f logs/rsync-cron.log
```

### Verify Backup Integrity

```bash
# Remote checksum verification
ssh demo@192.168.100.74 "md5sum ~/maps-tracker-backup/backups/daily/*/*.sql"

# Compare with local
md5sum backups/daily/*/*.sql
```

## Testing Remote Restore

**Important**: Test restoration regularly to ensure backups are usable.

```bash
# 1. List available backups
./scripts/backup/rsync-restore-remote.sh

# 2. Create test environment
mkdir -p /tmp/restore-test
cd /tmp/restore-test

# 3. Restore from remote
/home/devnan/effective-guide/scripts/backup/rsync-restore-remote.sh all

# 4. Verify files were restored
ls -lh backups/ logs/
```

## Disaster Recovery

If your local server fails:

```bash
# 1. On a new server, configure SSH key
ssh-copy-id -i ~/.ssh/id_ed25519.pub demo@192.168.100.74

# 2. Install rsync
sudo apt-get install rsync

# 3. Restore from remote
./scripts/backup/rsync-restore-remote.sh all

# 4. Import database backup
psql -U mapsadmin maps_tracker < backups/daily/.../backup_daily_*.sql
```

## Performance Tips

### Transfer Speed

1. **Use wired connection** - Faster than Wi-Fi
2. **Schedule during off-peak** - Avoid peak usage times
3. **Use local network** - Faster than internet
4. **Check compression** - Rsync compresses by default

### Bandwidth Optimization

```bash
# In .env, you can limit bandwidth (optional):
# Add to rsync command: --bwlimit=1000  (1000 KB/s limit)
```

## Integration with Backup Manager

The remote backup scripts work alongside the backup-manager.sh script:

```bash
# Local backup (happens first)
./scripts/backup/backup-manager.sh --daily

# Then remote backup (copies local backups to remote)
./scripts/backup/rsync-backup-remote.sh

# Combined workflow:
./scripts/backup/backup-manager.sh --daily && \
./scripts/backup/rsync-backup-remote.sh
```

## Advanced Configuration

### Custom SSH Key Location

If your SSH key is in a non-standard location:

```bash
# Create ~/.ssh/config entry
Host maps-backup-server
    HostName 192.168.100.74
    User demo
    IdentityFile ~/.ssh/custom_key
    Port 22

# Then use in script:
ssh maps-backup-server "ls ~/maps-tracker-backup"
```

### Multiple Remote Servers

To backup to multiple servers, create copies of the scripts:

```bash
# Primary server
./scripts/backup/rsync-backup-remote.sh

# Secondary server (custom script with different .env variables)
REMOTE_BACKUP_HOST=192.168.100.75 ./scripts/backup/rsync-backup-remote.sh
```

## Related Documentation

- `BACKUP_SCRIPTS_TESTING.md` - Script testing and validation
- `BACKUP_ADJUSTMENTS_APPLIED.md` - Email and path configuration
- `DEPLOYMENT_TROUBLESHOOTING.md` - General troubleshooting
- `.env.example` - Environment variable template

## Summary

Remote backups provide:
✅ Off-site data protection
✅ Automated transfers via SSH
✅ No hardcoded IP addresses
✅ Flexible configuration via .env
✅ Easy disaster recovery

The configuration is environment-based, making it easy to:
- Change servers without modifying scripts
- Use different servers for dev/staging/production
- Share scripts across teams
- Maintain security (no hardcoded values)

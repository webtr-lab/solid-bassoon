# Rsync Restore Remote - Troubleshooting & Fixes

## Issues Identified

### 1. Permission Errors (rsync code 23)

**Problem:**
When running `./rsync-restore-remote.sh`, rsync was failing with multiple "Operation not permitted" errors:

```
rsync: [generator] chgrp "/home/demo/effective-guide/backups/backup_*.sql" failed: Operation not permitted (1)
rsync error: some files/attrs were not transferred (see previous errors) (code 23) at main.c(1865)
```

**Root Cause:**
The `-a` (archive) flag in rsync attempts to preserve all file attributes including group ownership. When restoring files from the remote server, the files had group ownership that the local user didn't have permission to set, causing the restore to fail.

**Fix:**
Added two flags to the rsync command in `rsync-restore-remote.sh`:
- `--no-g`: Don't preserve group ownership
- `--no-perms`: Don't preserve permissions (use default umask instead)

Files are now restored successfully with local user ownership and default permissions.

### 2. ANSI Color Code Pollution

**Problem:**
Script output contained ANSI color escape codes even when redirected to files or pipes:

```
[0;32mINFO: Starting restore...[0m
[1;33mWARN: This will overwrite files[0m
[0;31mERROR: Failed to restore[0m
```

These codes made logs unreadable and caused issues when parsing output.

**Root Cause:**
Color codes were unconditionally defined and used in all output contexts, regardless of whether the output was going to a terminal or being redirected.

**Fix:**
Added terminal detection using the `-t 1` test (checks if stdout is a TTY):

```bash
# Colors for output (only use if outputting to a terminal)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi
```

Now color codes only appear when running interactively in a terminal, while redirected output remains clean.

## Scripts Updated

1. **rsync-restore-remote.sh**: Fixed permission errors and color codes
2. **rsync-backup-remote.sh**: Fixed color codes (backup already used proper logging)

## Testing

### Before Fix
```bash
$ ./rsync-restore-remote.sh backups
# Multiple "Operation not permitted" errors
# rsync error: code 23
# Output full of escape codes
```

### After Fix
```bash
$ ./rsync-restore-remote.sh backups
INFO: Starting restore from 192.168.100.74
INFO: Successfully restored backups

$ ./rsync-restore-remote.sh list
INFO: Database Backups:
-rw-r--r-- 1 demo demo 15K Oct 31 15:05 /home/demo/gps-tracker-backup/backups/backup_*.sql
INFO: Successfully restored backups
```

## Usage

The restore script supports multiple modes:

```bash
# List available backups on remote server
./rsync-restore-remote.sh list

# Restore only database backups
./rsync-restore-remote.sh backups

# Restore only logs
./rsync-restore-remote.sh logs

# Restore everything (default)
./rsync-restore-remote.sh all
./rsync-restore-remote.sh
```

## Configuration

Edit the script to change remote server settings:

```bash
REMOTE_USER="demo"
REMOTE_HOST="192.168.100.74"
REMOTE_BASE_DIR="~/gps-tracker-backup"
LOCAL_BASE_DIR="/home/demo/effective-guide"
```

## Cron Integration

For automated restores (disaster recovery testing), add to crontab:

```bash
# Monthly restore test (first Sunday of month at 3 AM)
0 3 1-7 * 0 /home/demo/effective-guide/rsync-restore-remote.sh all >> /home/demo/effective-guide/logs/restore-test.log 2>&1
```

The output will now be clean and readable in log files.

## Related Documentation

- **REMOTE_BACKUP.md**: Remote backup system overview
- **BACKUP_OPERATIONS.md**: Database backup procedures
- **rsync-backup-remote.sh**: The backup counterpart to this restore script

# Backup Scripts

Scripts for backing up, restoring, and verifying the GPS tracking application data.

## Scripts

### Local Backup Operations

- **backup-manager.sh** - Main backup orchestration script with automated scheduling
- **restore-backup.sh** - Restore from local backup files
- **verify-backup.sh** - Verify backup integrity and completeness
- **monthly-restore-test.sh** - Automated monthly backup restore testing

### Remote Backup Operations

- **rsync-backup-remote.sh** - Sync backups to remote server via rsync
- **rsync-restore-remote.sh** - Restore backups from remote server

## Documentation

For detailed information about the backup system, see:
- [docs/BACKUP_SYSTEM.md](../../docs/BACKUP_SYSTEM.md) - Complete backup system overview
- [docs/BACKUP_OPERATIONS.md](../../docs/BACKUP_OPERATIONS.md) - Operational procedures
- [docs/BACKUP_INTEGRITY_VERIFICATION.md](../../docs/BACKUP_INTEGRITY_VERIFICATION.md) - Verification procedures
- [docs/BACKUP_SYSTEM_DEPLOYMENT.md](../../docs/BACKUP_SYSTEM_DEPLOYMENT.md) - Deployment guide
- [docs/REMOTE_BACKUP.md](../../docs/REMOTE_BACKUP.md) - Remote backup configuration

## Quick Start

```bash
# Run a backup
./scripts/backup/backup-manager.sh

# Verify a backup
./scripts/backup/verify-backup.sh /path/to/backup

# Restore from backup
./scripts/backup/restore-backup.sh /path/to/backup
```

# Backblaze B2 Backup Configuration

**Date:** 2025-12-01
**Status:** Ready for Implementation
**Security:** Cloud-based encrypted backups

---

## Overview

This guide replaces the previous rsync-based remote backup system with **Backblaze B2** cloud storage. B2 provides:

- **Cost-effective:** ~$0.006 per GB stored (vs. traditional backup services)
- **Reliable:** Automatic replication and recovery options
- **Scalable:** Unlimited backup retention
- **Secure:** All backups encrypted locally before upload
- **Compliant:** Audit trail and access logs

---

## Quick Start

### 1. Install B2 CLI

```bash
# Install Backblaze B2 command-line tool
pip install b2

# Verify installation
b2 version
```

### 2. Create Backblaze Account

1. Sign up at https://www.backblaze.com/b2/cloud-storage
2. Create application key:
   - Go to https://secure.backblaze.com/app_keys
   - Click "Create New Application Key"
   - Select "Restrict to bucket(s)" > Create bucket
   - Bucket name: `maps-tracker-backups`
   - Allowed capabilities: `listKeys`, `readBucketInfo`, `writeFiles`, `deleteFiles`
   - Copy Account ID and Application Key

### 3. Configure Application

Add to `.env` file:

```bash
# Backblaze B2 Configuration
B2_ENABLED=true
B2_ACCOUNT_ID=your_account_id_here
B2_APPLICATION_KEY=your_application_key_here
B2_BUCKET_NAME=maps-tracker-backups
B2_BUCKET_TYPE=allPrivate
B2_RETENTION_DAYS=180
B2_CLEANUP_ENABLED=true
```

### 4. Test Connection

```bash
# Verify B2 connection
./scripts/backup/b2-backup.sh --list

# Expected output:
# Lists all files in B2 bucket
```

### 5. Enable Automatic Sync

B2 backups automatically sync after each backup. To verify:

```bash
# Create a test backup
./scripts/backup/backup-manager.sh --daily

# Check B2 bucket
./scripts/backup/backup-manager.sh --b2-list
```

---

## Usage

### Manual Sync

Sync all encrypted local backups to B2:

```bash
./scripts/backup/backup-manager.sh --b2-sync
```

### List B2 Backups

```bash
./scripts/backup/backup-manager.sh --b2-list

# Output:
# 2025-12-01  1024 MB  backups/2025/12/01/backup_daily_20251201_020000.sql.gpg
# 2025-11-30   512 MB  backups/2025/11/30/backup_daily_20251130_020000.sql.gpg
```

### Verify B2 Uploads

Verify all uploaded backups:

```bash
./scripts/backup/backup-manager.sh --b2-verify

# Output:
# Upload Status:
#   Successful: 45
#   Failed: 0
# ✓ All backups verified
```

### Download Backup from B2

```bash
./scripts/backup/b2-backup.sh --download backups/2025/12/01/backup_daily_20251201_020000.sql.gpg

# Downloads to: backups/backup_daily_20251201_020000.sql.gpg
```

### List Recent Backups

```bash
# Only encrypted backups are stored in B2
ls -lh backups/*.sql.gpg 2>/dev/null | head -10
```

---

## Automatic Scheduling

### Cron Job Setup

B2 sync happens **automatically after each backup**. Your existing cron jobs continue to work:

```bash
# View current backup schedule
crontab -l | grep backup-manager

# Typical schedule:
# 0 2 * * *   /path/to/scripts/backup/backup-manager.sh --daily
# 0 2 * * 0   /path/to/scripts/backup/backup-manager.sh --full
```

### Optional: Separate B2 Cleanup Job

If you want to clean up old B2 backups separately:

```bash
# Add to crontab for monthly cleanup
# (automatically runs if B2_CLEANUP_ENABLED=true)
0 3 1 * * /path/to/scripts/backup/b2-backup.sh --cleanup
```

---

## Cost Estimation

### Storage Costs

For a typical Maps Tracker database:

- **Database size:** ~50 MB per backup
- **Backups per month:** 35 (1 full + 30 daily)
- **Monthly storage:** 35 × 50 MB = 1.75 GB
- **6-month retention:** 10.5 GB
- **Monthly cost:** ~$0.063 (at $0.006/GB)
- **Annual cost:** ~$0.76

### Transaction Costs

- **File uploads:** Free (paid by Backblaze)
- **File downloads:** $0.01 per GB
- **API calls:** Free

### Total Monthly Cost

Approximately **$0.10-$0.50** for typical usage (varies with download frequency)

---

## Security Considerations

### Encryption

All backups are encrypted **before** uploading to B2:

1. Local encryption with AES-256 (SecretManager)
2. Upload to B2 with TLS
3. B2 server-side encryption (additional layer)

**Flow:**
```
Database → Encrypted locally (.gpg) → Upload to B2 → Server-side encrypted
```

### Access Control

1. **Application Key Scope:**
   - Restricted to specific bucket only
   - Limited to necessary operations
   - Can be rotated anytime

2. **Bucket Permissions:**
   - Set to `allPrivate` (no public access)
   - Only accessible with valid credentials

3. **Audit Trail:**
   - B2 logs all file operations
   - Monitor via Backblaze web dashboard
   - Review access logs monthly

### Credential Management

**DO NOT** store B2 credentials in git:

```bash
# .env file (already in .gitignore)
B2_ACCOUNT_ID=...       # NEVER commit
B2_APPLICATION_KEY=...  # NEVER commit

# Safe practices:
git check-ignore .env   # Verify .env is ignored
cat .gitignore | grep "^\.env"  # Confirm in .gitignore
```

---

## Disaster Recovery

### Restore from B2

If local backups are lost:

```bash
# 1. List available backups in B2
./scripts/backup/backup-manager.sh --b2-list

# 2. Download specific backup
./scripts/backup/b2-backup.sh --download backups/2025/12/01/backup_daily_20251201_020000.sql.gpg

# 3. Decrypt and restore
# (Backend automatically handles decryption)
./scripts/backup/backup-manager.sh --restore
```

### Recovery Time Objective (RTO)

| Scenario | Time | Notes |
|----------|------|-------|
| Restore from local | 5 minutes | Fast network access |
| Restore from B2 | 15-30 minutes | Depends on file size + download speed |

### Backup Lifecycle

```
Day 1-30:  Local + B2 (fresh)
Day 31-60: B2 archived (compressed)
Day 61-180: B2 archived (deep storage)
Day 181+: Deleted (retention limit)
```

---

## Troubleshooting

### "B2 CLI not found"

```bash
# Install B2 CLI
pip install b2

# Verify
b2 version
```

### "Authentication failed"

```bash
# Check credentials in .env
grep B2_ .env

# Verify account ID and key at:
# https://secure.backblaze.com/app_keys

# Test connection
b2 authorize-account $B2_ACCOUNT_ID $B2_APPLICATION_KEY
```

### "No files uploaded to B2"

```bash
# Check B2 is enabled
grep B2_ENABLED .env

# Check for encrypted backups locally
find backups -name "*.gpg" | wc -l

# If 0: Create backup with encryption
./scripts/backup/backup-manager.sh --daily

# If >0: Manually sync
./scripts/backup/backup-manager.sh --b2-sync
```

### "Upload failed"

```bash
# Check logs
tail -50 logs/b2-backup.log

# Verify bucket exists and is accessible
b2 list-buckets

# Check file permissions
ls -la backups/*.gpg
```

### "Files not syncing automatically"

```bash
# Verify B2 settings in backup-manager.sh
grep -A2 "sync_to_b2" scripts/backup/backup-manager.sh

# Check B2_SCRIPT path
ls -la scripts/backup/b2-backup.sh

# Enable debug output
B2_DEBUG=true ./scripts/backup/backup-manager.sh --daily
```

---

## Maintenance

### Monthly Tasks

1. **Review B2 costs:**
   ```bash
   # Backblaze dashboard > Bucket settings > Usage
   # Should be ~1.5-2 GB for 6-month retention
   ```

2. **Verify backup integrity:**
   ```bash
   ./scripts/backup/backup-manager.sh --b2-verify
   ```

3. **Check latest backup:**
   ```bash
   ./scripts/backup/backup-manager.sh --b2-list | head -3
   ```

### Quarterly Tasks

1. **Test restore from B2:**
   ```bash
   # Download latest backup
   ./scripts/backup/b2-backup.sh --download <filename>

   # Test restoration (non-production)
   # Restore to test database
   ```

2. **Rotate application key:**
   - Go to Backblaze dashboard
   - Create new application key
   - Update .env with new key
   - Delete old key

3. **Review access logs:**
   - Backblaze dashboard > Account > Activity Log
   - Check for unauthorized access attempts

### Annually

1. **Audit bucket settings:**
   - Verify bucket is private (allPrivate)
   - Check lifecycle rules
   - Review CORS settings (should be empty)

2. **Cost analysis:**
   - Compare actual vs. expected costs
   - Review retention policy

---

## Migration from Rsync

If you were using the old rsync backup system:

### Step 1: Disable Rsync

Comment out in `.env`:
```bash
# REMOTE_BACKUP_ENABLED=false
# REMOTE_BACKUP_HOST=...
# REMOTE_BACKUP_USER=...
```

### Step 2: Enable B2

Add to `.env`:
```bash
B2_ENABLED=true
B2_ACCOUNT_ID=...
B2_APPLICATION_KEY=...
```

### Step 3: Sync Existing Local Backups

```bash
# One-time sync of all local backups to B2
./scripts/backup/backup-manager.sh --b2-sync

# Verify
./scripts/backup/backup-manager.sh --b2-list
```

### Step 4: Archive Old Remote Backups

```bash
# Optional: Download from old rsync server
rsync -av --delete remote_server:~/maps-tracker-backup ./backups-archive/

# Then sync to B2
./scripts/backup/backup-manager.sh --b2-sync
```

---

## Performance

### Upload Speed

- **Small backups (< 100 MB):** < 1 minute
- **Medium backups (100-500 MB):** 1-5 minutes
- **Large backups (> 500 MB):** 5-15 minutes

### Download Speed

- **Small backups:** < 1 minute
- **Medium backups:** 1-3 minutes
- **Large backups:** 3-10 minutes

Network speed determines actual times (upload/download bandwidth limits apply).

---

## Advanced Configuration

### Custom Retention Policy

```bash
# Keep backups for 1 year instead of 6 months
B2_RETENTION_DAYS=365
```

### Disable Auto-Cleanup

```bash
# Retain all backups indefinitely
B2_CLEANUP_ENABLED=false
```

### Multiple Buckets

For different backup types:

```bash
# .env
B2_BUCKET_NAME=maps-tracker-backups-full    # Full backups
# Create separate B2_BUCKET_NAME for daily backups

# Would require script modifications
```

---

## API Reference

### b2-backup.sh Commands

```bash
./scripts/backup/b2-backup.sh --sync              # Sync local to B2
./scripts/backup/b2-backup.sh --upload <file>     # Upload single file
./scripts/backup/b2-backup.sh --list              # List B2 files
./scripts/backup/b2-backup.sh --verify            # Verify uploads
./scripts/backup/b2-backup.sh --cleanup           # Remove old files
./scripts/backup/b2-backup.sh --download <file>   # Download from B2
./scripts/backup/b2-backup.sh --help              # Show help
```

### backup-manager.sh B2 Integration

```bash
./scripts/backup/backup-manager.sh --auto         # Backup + sync to B2
./scripts/backup/backup-manager.sh --b2-sync      # Manual sync
./scripts/backup/backup-manager.sh --b2-list      # List B2 backups
./scripts/backup/backup-manager.sh --b2-verify    # Verify B2 backups
```

---

## Frequently Asked Questions

### Q: What if my local backups are deleted?

**A:** B2 maintains your backups for the retention period (default 180 days). Download and restore anytime.

### Q: Can I use B2 as my only backup?

**A:** Not recommended. Best practice: Local + Cloud
- **Local:** Fast access, quick recovery
- **Cloud:** Disaster recovery, compliance

### Q: How do I verify backups are encrypted?

**A:** Check file extensions:
```bash
# All files should be .gpg (encrypted)
ls -la backups/*.gpg

# Should see NO unencrypted .sql files
ls -la backups/*.sql  # Should be empty
```

### Q: What happens if I reach the retention limit?

**A:** Old backups are automatically deleted (if B2_CLEANUP_ENABLED=true). Adjust B2_RETENTION_DAYS to keep longer.

### Q: Can I restore older versions of backups?

**A:** Yes! B2 keeps backup history:
```bash
# List all versions
./scripts/backup/b2-backup.sh --list

# Download any version
./scripts/backup/b2-backup.sh --download <filename>
```

### Q: Is B2 HIPAA/GDPR compliant?

**A:** Yes, Backblaze B2 complies with:
- HIPAA (with Business Associate Agreement)
- GDPR (data residency options)
- SOC 2 Type II certified

---

## Support & Resources

- **Backblaze B2 Documentation:** https://www.backblaze.com/b2/docs/
- **B2 CLI Documentation:** https://github.com/Backblaze/B2_Command_Line_Tool
- **Backblaze Support:** https://support.backblaze.com/
- **Application Keys:** https://secure.backblaze.com/app_keys

---

## Summary

| Aspect | Details |
|--------|---------|
| **Cost** | ~$0.10-0.50/month |
| **Security** | AES-256 encrypted + server-side encryption |
| **Retention** | Configurable (default 180 days) |
| **Auto-sync** | Yes (after each backup) |
| **Recovery** | 15-30 minutes from cloud |
| **Compliance** | HIPAA, GDPR, SOC 2 Type II |

**Status: ✅ Ready to Deploy**


# Unified Email Notification System

## Overview

This is a **single, universal email system** for all backup and monitoring scripts. No more conflicts, no more duplicate emails, no more inconsistency.

**One source of truth for all notifications.**

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ANY SCRIPT (unchanged)                       │
│           backup-manager.sh, health-check.sh, etc.              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ bash script_path
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│          universal_notify_wrapper.sh                            │
│  • Disables built-in script emails (BACKUP_EMAIL_ENABLED=false) │
│  • Executes script and captures output                          │
│  • Records execution time and exit code                         │
│  • Calls notify.py with unified configuration                  │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│          scripts/email/notify.py                                │
│  • Unified entry point for ALL email notifications              │
│  • Loads Individual_script_notification.html template           │
│  • Generates professional HTML email                            │
│  • Sends via SMTP (send-email.sh)                               │
└──────────────────┬──────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────┐
│  Individual_script_notification.html Template                   │
│  • Status-based colors (green/red)                              │
│  • Professional formatting                                      │
│  • Execution details                                            │
│  • Script output preview                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Files

### Core System

1. **scripts/universal_notify_wrapper.sh**
   - Entry point for all script execution
   - Disables built-in emails
   - Captures output and timing
   - Calls notify.py

2. **scripts/email/notify.py**
   - Universal notification utility
   - Uses Individual_script_notification.html template
   - Handles all script types
   - Single configuration point

3. **Individual_script_notification.html**
   - Professional HTML email template
   - Status-based styling (green/red)
   - Mobile responsive
   - All email clients supported

### Configuration

- **.env** - SMTP settings (unchanged)
- **scripts/email/send-email.sh** - SMTP relay (unchanged)

## Usage

### Running Scripts with Unified Emails

```bash
# Instead of:
./scripts/backup/backup-manager.sh --daily

# Use:
bash scripts/universal_notify_wrapper.sh scripts/backup/backup-manager.sh --daily
```

### In Cron Jobs

```bash
# Original (with duplicate emails):
0 2 * * * /home/devnan/maps-tracker-app1/scripts/backup/backup-manager.sh --daily

# New (unified emails):
0 2 * * * bash /home/devnan/maps-tracker-app1/scripts/universal_notify_wrapper.sh /home/devnan/maps-tracker-app1/scripts/backup/backup-manager.sh --daily
```

### All 10 Scripts

```bash
# Backup Scripts
bash scripts/universal_notify_wrapper.sh scripts/backup/backup-manager.sh --daily
bash scripts/universal_notify_wrapper.sh scripts/backup/run-backup-verify.sh
bash scripts/universal_notify_wrapper.sh scripts/backup/test-backup-restore.sh
bash scripts/universal_notify_wrapper.sh scripts/backup/rsync-backup-remote.sh --all
bash scripts/universal_notify_wrapper.sh scripts/backup/rsync-restore-remote.sh backups
bash scripts/universal_notify_wrapper.sh scripts/backup/wal-archiver.sh
bash scripts/universal_notify_wrapper.sh scripts/backup/wal-cleanup.sh
bash scripts/universal_notify_wrapper.sh scripts/backup/archive-old-backups.sh

# Monitoring Scripts
bash scripts/universal_notify_wrapper.sh scripts/monitoring/backup-disk-monitor.sh
bash scripts/universal_notify_wrapper.sh scripts/monitoring/health-check.sh
```

## How It Works

### Execution Flow

1. **Wrapper starts**
   ```bash
   bash universal_notify_wrapper.sh scripts/backup/backup-manager.sh
   ```

2. **Backup .env and disable emails**
   ```
   BACKUP_EMAIL_ENABLED=false  (injected into .env)
   ```

3. **Execute script**
   - Script reads modified .env
   - Sees BACKUP_EMAIL_ENABLED=false
   - Skips built-in email logic
   - Runs normally

4. **Capture output and timing**
   - All output saved to temp file
   - Execution duration calculated
   - Exit code recorded

5. **Call notify.py**
   ```
   python3 scripts/email/notify.py "backup-manager.sh" "0" "output..." "5m 30s"
   ```

6. **Generate and send email**
   - Load Individual_script_notification.html
   - Insert script details and output
   - Apply status-based colors (green/red)
   - Send via SMTP

7. **Restore original .env**
   - Cleanup backup file
   - System returns to normal state

## Email Format

### Success Email (Green 🟢)

```
Subject: [SUCCESS] backup-manager.sh

Header:     Green gradient (#10b981 → #059669)
Icon:       ✓ Checkmark
Status:     SUCCESS

Content:
├─ System Information
│  ├─ Script Type: Backup Script
│  ├─ Server: hostname
│  ├─ Environment: Production
│  └─ Domain: Company Name
├─ Status Alert (green box)
│  └─ "Script completed successfully - No action required"
├─ Execution Details
│  ├─ Start Time: 2025-11-12 02:00:00
│  ├─ End Time: 2025-11-12 02:05:30
│  ├─ Duration: 5m 30s
│  ├─ Exit Code: 0
│  └─ Process ID: [PID]
├─ Statistics
│  ├─ Status: SUCCESS
│  ├─ Items: Processed
│  └─ Success Rate: 100%
├─ Script Output (last 15 lines)
│  └─ [2025-11-12 02:00:00] Starting backup...
│     [2025-11-12 02:05:30] Backup completed successfully
└─ Footer
   └─ Support Contact: System Administrator
```

### Failure Email (Red 🔴)

```
Subject: [CRITICAL] wal-archiver.sh

Header:     Red gradient (#ef4444 → #dc2626)
Icon:       ✕ Error mark
Status:     CRITICAL

Content: (same structure, red styling, error details)
```

## Configuration

### Email Settings (.env)

```bash
# SMTP Configuration (unchanged)
SMTP_HOST=box.praxisnetworking.com
SMTP_PORT=465
SMTP_USER=notification@praxisnetworking.com
SMTP_PASS=password
TEST_EMAIL=demo@praxisnetworking.com

# Built-in email settings (now unused - disabled by wrapper)
BACKUP_EMAIL_ENABLED=false  # (ignored when using wrapper)
BACKUP_EMAIL=admin@example.com  # (ignored when using wrapper)
```

### Manual Action Scripts

Edit `scripts/email/notify.py` to configure which scripts are manual:

```python
MANUAL_ACTION_SCRIPTS = [
    'rsync-restore-remote.sh',  # Manual restore - only run when needed
]
```

These scripts will NOT send automated emails (no email notifications).

## Advantages Over Previous System

| Feature | Before | After |
|---------|--------|-------|
| **Email Systems** | 2 competing systems | 1 unified system |
| **Template** | Inconsistent | Single template |
| **Configuration** | Multiple places | One location |
| **Duplicate Emails** | Yes, frequent | Never |
| **Script Modification** | None needed | None needed |
| **Conflicts** | Common | None |
| **Maintainability** | Complex | Simple |
| **Consistency** | Inconsistent formats | Always the same |

## Maintenance

### To Change Email Template

1. Edit `Individual_script_notification.html` directly
2. Changes apply to ALL scripts automatically
3. No script changes needed

### To Change Recipient

1. Update `.env` file: `TEST_EMAIL=new@example.com`
2. Changes apply to ALL scripts automatically

### To Add/Remove Manual Scripts

1. Edit `scripts/email/notify.py`: `MANUAL_ACTION_SCRIPTS` list
2. Changes apply to ALL scripts automatically

### To Modify Email Logic

1. Edit `scripts/email/notify.py`: `generate_email()` function
2. Changes apply to ALL scripts automatically

## Production Deployment

### Before Going Live

1. **Verify wrapper works**
   ```bash
   bash scripts/universal_notify_wrapper.sh scripts/backup/backup-manager.sh --list
   ```

2. **Test with demo email**
   ```bash
   TEST_EMAIL=your-test@example.com \
   bash scripts/universal_notify_wrapper.sh scripts/monitoring/health-check.sh
   ```

3. **Check email logs**
   ```bash
   tail -20 logs/email.log
   ```

4. **Update cron jobs** to use wrapper
   ```bash
   crontab -e
   # Change from: script.sh
   # Change to:   bash universal_notify_wrapper.sh script.sh
   ```

### Key Points

✓ **No original scripts modified** - They work unchanged
✓ **Backward compatible** - Can run scripts directly if needed
✓ **Single email system** - One config, one template, one point of failure
✓ **Instant changes** - Update template/config, affects all scripts
✓ **Production ready** - Tested with all 10 scripts

## Troubleshooting

### Email not received

1. Check .env has SMTP_HOST configured
2. Check TEST_EMAIL is set correctly
3. Review logs/email.log for errors
4. Verify notify.py exists: `ls scripts/email/notify.py`

### Built-in emails still being sent

1. Verify wrapper is being used (not raw script)
2. Check .env is being modified: `grep BACKUP_EMAIL_ENABLED .env`
3. Review script output for email sending code

### Template not being used

1. Verify template exists: `ls Individual_script_notification.html`
2. Check notify.py can find template path
3. Review logs for file not found errors

## Summary

**This is your single, unified, production-ready email notification system.**

- ✓ One template
- ✓ One configuration
- ✓ One entry point
- ✓ Zero conflicts
- ✓ Infinite scalability

Ready for production.

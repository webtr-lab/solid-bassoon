# Script Notification Wrapper Configuration

## Overview

The **Script Notification Wrapper** (`scripts/wrapper/script_notification_wrapper.py`) executes any script and sends professional HTML email notifications using the `Individual_script_notification.html` template.

## Email Configuration

### Automated Scripts (9) - Email Enabled ✓

These scripts run automatically via cron and send email notifications:

| # | Script | Type | Email | Status |
|---|--------|------|-------|--------|
| 1 | backup-manager.sh | Backup | ✓ YES | Sends daily backups |
| 2 | run-backup-verify.sh | Backup | ✓ YES | Verifies backup integrity |
| 3 | test-backup-restore.sh | Backup | ✓ YES | Tests restore capability |
| 4 | rsync-backup-remote.sh | Backup | ✓ YES | Syncs to remote server |
| 5 | **wal-archiver.sh** | Backup | ✓ YES | Archives PostgreSQL WAL logs |
| 6 | wal-cleanup.sh | Backup | ✓ YES | Cleans old WAL files |
| 7 | archive-old-backups.sh | Backup | ✓ YES | Archives old backups |
| 8 | backup-disk-monitor.sh | Monitoring | ✓ YES | Monitors disk usage |
| 9 | health-check.sh | Monitoring | ✓ YES | System health check |

**Total automated emails: 9**

### Manual Scripts (1) - Email Disabled ⊘

This script is run manually on-demand and does NOT send email notifications:

| # | Script | Type | Email | Reason |
|---|--------|------|-------|--------|
| 1 | rsync-restore-remote.sh | Restore | ⊘ NO | Manual restore - run ad-hoc when needed |

**Total manual scripts: 1**

## Script Categories

### Automated Scripts (Always on cron, email enabled)

**Daily Backups:**
- `backup-manager.sh` - Creates daily/full backups
- `run-backup-verify.sh` - Verifies backup integrity
- `archive-old-backups.sh` - Archives old backups

**Continuous Operations:**
- `wal-archiver.sh` - Archives PostgreSQL WAL logs (continuous if PostgreSQL archiving enabled)
- `wal-cleanup.sh` - Cleans up old WAL files
- `rsync-backup-remote.sh` - Syncs backups to remote server

**Monitoring:**
- `backup-disk-monitor.sh` - Monitors disk usage
- `health-check.sh` - Checks system health

**Testing:**
- `test-backup-restore.sh` - Tests restore capability

### Manual Scripts (Run on-demand, email disabled)

**Restore Operations:**
- `rsync-restore-remote.sh` - Restores from remote (only run when disaster recovery needed)

## Using the Wrapper

### Basic Usage

```bash
# Run script with email notifications
python3 scripts/wrapper/script_notification_wrapper.py scripts/backup/backup-manager.sh

# Run script and save sample email
python3 scripts/wrapper/script_notification_wrapper.py scripts/backup/backup-manager.sh --save-sample

# Run script without sending email (testing)
python3 scripts/wrapper/script_notification_wrapper.py scripts/backup/backup-manager.sh --no-email
```

### In Cron

```bash
# Daily backup with email notifications
0 2 * * * cd /home/devnan/maps-tracker-app1 && python3 scripts/wrapper/script_notification_wrapper.py scripts/backup/backup-manager.sh

# Manual restore (don't add to cron - email disabled anyway)
# Run manually when needed:
python3 scripts/wrapper/script_notification_wrapper.py scripts/backup/rsync-restore-remote.sh
```

## Email Features

### Success Email (Green) 🟢

```
Subject: [SUCCESS] backup-manager.sh

Header:    Green gradient (#10b981 → #059669)
Icon:      ✓ Checkmark
Badge:     SUCCESS

Content:
  • System information grid
  • Success alert box
  • Execution details (timestamps, duration, exit code)
  • Statistics cards (customized per script)
  • Script output preview (last 15 lines)
  • Support contact footer
```

### Failure Email (Red) 🔴

```
Subject: [CRITICAL] wal-archiver.sh

Header:    Red gradient (#ef4444 → #dc2626)
Icon:      ✕ Error mark
Badge:     CRITICAL

Content:
  • System information grid
  • Failure alert box
  • Execution details
  • Statistics showing failure
  • Script output with error details
  • Support contact footer
```

## Example Scenarios

### Scenario 1: Normal Operation

```bash
$ python3 scripts/wrapper/script_notification_wrapper.py scripts/backup/backup-manager.sh

[Output shows execution and success]
Email Sent: ✓
Recipient: demo@praxisnetworking.com
Subject: [SUCCESS] backup-manager.sh
```

### Scenario 2: Manual Restore (No Email)

```bash
$ python3 scripts/wrapper/script_notification_wrapper.py scripts/backup/rsync-restore-remote.sh

[Output shows]
⚠ Note: rsync-restore-remote.sh is a MANUAL ACTION script
         Email notifications are DISABLED for manual actions

Email: ⊘ DISABLED (manual action script)
```

### Scenario 3: Automated Script with Failure (Email Sent)

```bash
$ python3 scripts/wrapper/script_notification_wrapper.py scripts/backup/wal-archiver.sh

[Output shows failure but email still sent]
Status: ✗ FAILED
Email: ✓ Sent (RED failure notification)
Subject: [CRITICAL] wal-archiver.sh
Recipient: demo@praxisnetworking.com
```

## Configuration

### Environment Variables

Set in `.env`:

```bash
# Test email recipient (if TEST_EMAIL not set, uses SMTP_USER)
TEST_EMAIL=demo@praxisnetworking.com

# SMTP Configuration (for sending emails)
SMTP_HOST=box.praxisnetworking.com
SMTP_PORT=465
SMTP_USER=notification@praxisnetworking.com
SMTP_PASS=your_password
```

### Modifying Manual/Automated Classification

Edit `scripts/wrapper/script_notification_wrapper.py`:

```python
MANUAL_ACTION_SCRIPTS = [
    'rsync-restore-remote.sh',  # Only manual restore - no automation
]
```

To add a script as manual (no email), add to this list:

```python
MANUAL_ACTION_SCRIPTS = [
    'rsync-restore-remote.sh',
    'some-other-manual-script.sh',
]
```

## Email Sample Files

Sample emails saved to `logs/email-samples/`:

```
backup-manager-notification.html      (SUCCESS - green)
wal-archiver-notification.html        (FAILURE - red)
health-check-notification.html        (SUCCESS - green)
```

View in browser:
```bash
open logs/email-samples/backup-manager-notification.html
```

## Troubleshooting

### No Emails Sent

Check:
1. `.env` file has SMTP configuration
2. `TEST_EMAIL` environment variable set
3. Email script exists: `scripts/email/send-email.sh`
4. Wrapper not marked as manual action

### Email Not Using Template

Check:
1. `Individual_script_notification.html` exists in project root
2. Wrapper can read template file
3. Script is not in `MANUAL_ACTION_SCRIPTS` list

### Always Check Failure Emails

Even if a script fails, wrapper STILL sends notification email (unless it's a manual action script).

This is INTENTIONAL - failures need attention!

## Files Modified

- `scripts/wrapper/script_notification_wrapper.py` - Added `MANUAL_ACTION_SCRIPTS` list
- Manual action scripts: Email disabled in wrapper (no code modifications)

## Non-Invasive Design

✓ **Original scripts unchanged** - No modifications to backup scripts
✓ **Wrapper intercepts output** - Captures and formats with template
✓ **Email disabled selectively** - Only for manual action scripts
✓ **No hardcoded changes** - Configuration in code, easy to modify

## Summary

- **9 automated scripts** send email notifications with template
- **1 manual script** (restore) does NOT send emails
- **All scripts** run through the same wrapper
- **Template used**: `Individual_script_notification.html`
- **Recipient**: demo@praxisnetworking.com
- **Status colors**: Green (success), Red (failure)

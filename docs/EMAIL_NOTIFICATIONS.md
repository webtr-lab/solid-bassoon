# Email Notification System

Complete documentation for Maps Tracker email notifications, SMTP relay, and professional email templates.

## Overview

This system provides clean, easy-to-understand email notifications for:
- Backup operations (full, daily, remote sync)
- Database restore operations
- Monthly disaster recovery tests
- Monitoring and health check alerts
- Backup verification

## Components

### `send-email.sh` - SMTP Relay

Direct SMTP relay script for sending emails without requiring system mail server configuration.

**Features:**
- Uses SMTP_SSL (port 465) for secure, reliable delivery
- No `sudo` required
- No system mail server dependency (Postfix/Exim)
- Works immediately without service restart
- Proper error handling and logging
- All email activity logged to `logs/email.log`

**Usage:**
```bash
./send-email.sh <recipient> <subject> <message>
```

**Configuration:**
Set environment variables or the script uses defaults:
```bash
export SMTP_HOST="box.praxisnetworking.com"
export SMTP_PORT="465"
export SMTP_USER="notification@praxisnetworking.com"
export SMTP_PASS="vhnwPn3mK7wR"
```

### `email_templates.py` - Professional Templates

Professional email template library for consistent, clean notification formatting.

**Available Templates:**
- `format_backup_success()` - Successful backup completion
- `format_backup_failure()` - Backup failure with troubleshooting
- `format_restore_success()` - Successful database restore
- `format_restore_failure()` - Restore failure with recovery steps
- `format_remote_sync_success()` - Remote backup sync success
- `format_remote_sync_failure()` - Remote sync failure with diagnostics
- `format_monthly_restore_test_success()` - Test passed, DR verified
- `format_monthly_restore_test_failure()` - Test failed, action required

## Primary Admin Email

**Recipient**: `demo@praxisnetworking.com`

All notifications are sent to this address by default. Configure via `.env` file:
```bash
BACKUP_EMAIL="admin@example.com"
EMAIL_ENABLED=true
```

## Notification Systems

### 1. Daily App Status Report ✅

**Script**: `app-status-report.sh`
**Trigger**: Automated (daily via cron) or manual
**Email Recipient**: demo@praxisnetworking.com

**Events Notified**:
- System health status (OPERATIONAL / DEGRADED / CRITICAL)
- Docker service status
- API endpoint health checks
- Database statistics
- Disk usage warnings
- Backup status
- Error log summaries
- No GPS data warnings

**Email Format**:
```
Subject: [Maps Tracker Status] System Degraded
Body: Comprehensive status report with all metrics
```

**Test Command**:
```bash
./scripts/monitoring/app-status-report.sh
```

**Configuration**:
- Line 15: `EMAIL_RECIPIENT="demo@praxisnetworking.com"`
- Line 14: `EMAIL_ENABLED=true`

---

### 2. Monthly Restore Test ✅

**Script**: `monthly-restore-test.sh`
**Trigger**: Automated (1st of month, 3 AM) or manual
**Email Recipient**: demo@praxisnetworking.com

**Events Notified**:
- Monthly restore test results (SUCCESS / FAILURE)
- Backup file details
- Checksum verification results
- Table structure validation
- Data integrity checks
- Referential integrity status
- Sample query results

**Email Format**:
```
Subject: [Maps Tracker Monthly Restore Test] SUCCESS
Body: Detailed test report with all verification steps
```

**Test Command**:
```bash
./scripts/backup/monthly-restore-test.sh
```

**Configuration**:
- Line 26: `EMAIL_RECIPIENT="demo@praxisnetworking.com"`
- Line 25: `EMAIL_ENABLED=true`

---

### 3. Remote Backup Sync (Rsync) ✅

**Script**: `rsync-backup-remote.sh`
**Trigger**: Automated (via cron) or manual
**Email Recipient**: demo@praxisnetworking.com

**Events Notified**:
- Backup sync success/failure
- Number of files transferred
- Transfer duration
- Checksum verification results
- Remote server location
- Backup sizes

**Email Format**:
```
Subject: [Maps Tracker Backup] SUCCESS - Remote Backup Completed
Body: Backup summary with statistics
```

**Test Command**:
```bash
./scripts/backup/rsync-backup-remote.sh
```

**Configuration**:
- Line 25: `EMAIL_RECIPIENT="demo@praxisnetworking.com"`
- Line 24: `EMAIL_ENABLED=true`

---

### 4. Backup Verification ✅

**Script**: `verify-backup.sh`
**Trigger**: Manual or automated via backend
**Email Recipient**: demo@praxisnetworking.com

**Events Notified**:
- Backup verification success/failure
- File integrity checks
- PostgreSQL format validation
- Table count verification
- Checksum generation
- Optional: Full restore test results

**Email Format**:
```
Subject: [Maps Tracker Backup Verification] SUCCESS
Body: Verification details and checks performed
```

**Test Command**:
```bash
./scripts/backup/verify-backup.sh backup_20251031_144231.sql
```

**Configuration**:
- Line 24: `EMAIL_RECIPIENT="demo@praxisnetworking.com"`
- Line 23: `EMAIL_ENABLED=true`

---

### 5. Backend Automatic Backup (Indirect) ⚠️

**Location**: `backend/app/main.py` (automatic_backup function)
**Trigger**: Automated (daily at 2 AM)
**Direct Email**: NO
**Indirect Monitoring**: YES (via app status report)

**How Failures Are Detected**:
1. Backup failures logged to `logs/error.log`
2. App status report checks error.log
3. If errors found, app status email sent to admin
4. Backup verification runs inline and logs failures

**Email Coverage**: Indirect via daily app status report ✅

**Backup Success Monitoring**:
- App status report checks for backups older than 48 hours
- Sends warning email if backup age exceeds threshold

---

### 6. Backend Manual Operations (API) 📧 NEW

**New Feature**: Admin email helper script
**Script**: `send-admin-email.py`
**Purpose**: Send notifications for manual admin operations

**Usage from Backend**:
```python
import subprocess

# Example: Notify admin of manual restore
subprocess.run([
    'python3', '/home/demo/effective-guide/send-admin-email.py',
    '[Maps Tracker] Manual Restore Completed',
    f'Database restored from backup: {backup_filename}\nInitiated by: {current_user.username}'
])
```

**Potential Integration Points**:
- Manual backup creation via API
- Manual restore operations
- User management changes (optional)
- Critical configuration changes

---

## Email Configuration Requirements

### Prerequisites

1. **Mail command installed**:
```bash
sudo apt-get install mailutils
```

2. **Test email delivery**:
```bash
echo "Test" | mail -s "Test Subject" demo@praxisnetworking.com
```

3. **Check mail logs**:
```bash
tail -f /var/log/mail.log
```

---

## Notification Summary Table

| System | Email | Frequency | Success | Failure | Recipient |
|--------|-------|-----------|---------|---------|-----------|
| **App Status Report** | ✅ | Daily/Manual | ✅ | ✅ | demo@praxisnetworking.com |
| **Monthly Restore Test** | ✅ | Monthly/Manual | ✅ | ✅ | demo@praxisnetworking.com |
| **Rsync Remote Backup** | ✅ | Scheduled/Manual | ✅ | ✅ | demo@praxisnetworking.com |
| **Backup Verification** | ✅ | Per backup | ✅ | ✅ | demo@praxisnetworking.com |
| **Backend Auto Backup** | Indirect | Daily 2 AM | Via Status | Via Status | demo@praxisnetworking.com |
| **Manual Backend Ops** | 📧 Optional | On-demand | N/A | N/A | demo@praxisnetworking.com |

Legend:
- ✅ = Configured and tested
- 📧 = Helper script available for future integration
- Indirect = Monitored via app status report

---

## Email Testing

### Quick Test All Systems

```bash
# Test 1: App Status Report
./scripts/monitoring/app-status-report.sh

# Test 2: Rsync Backup (will actually sync to remote)
./scripts/backup/rsync-backup-remote.sh

# Test 3: Backup Verification
./scripts/backup/verify-backup.sh $(ls -t backups/backup_*.sql | head -1 | xargs basename)

# Test 4: Monthly Restore Test
./scripts/backup/monthly-restore-test.sh

# Test 5: Python Email Helper
python3 send-admin-email.py "[Maps Tracker] Test" "This is a test notification"
```

### Expected Results

All tests should show:
```
Email notification sent successfully
```

Check inbox for emails from each system.

---

## Disabling Email Notifications

To disable emails for a specific system, edit the script and set:

```bash
EMAIL_ENABLED=false
```

**Files to modify**:
- `app-status-report.sh` (line 15)
- `monthly-restore-test.sh` (line 25)
- `rsync-backup-remote.sh` (line 24)
- `verify-backup.sh` (line 23)

---

## Changing Email Recipient

To change the recipient email address, edit the following files:

1. **app-status-report.sh** (line 16)
2. **monthly-restore-test.sh** (line 26)
3. **rsync-backup-remote.sh** (line 25)
4. **verify-backup.sh** (line 24)
5. **send-admin-email.py** (line 5, default parameter)

Update:
```bash
EMAIL_RECIPIENT="your-email@example.com"
```

---

## Troubleshooting

### Emails Not Being Received

**Check Email Log:**
```bash
# View recent email activity
tail -20 logs/email.log

# Search for failed emails
grep "FAILED" logs/email.log

# Check specific recipient
grep "demo@praxisnetworking.com" logs/email.log
```

**Test SMTP Relay Directly:**
```bash
# Test send-email.sh script directly
./scripts/email/send-email.sh test@example.com "Test Subject" "Test message body"

# Should output:
# Connecting to SMTP server: box.praxisnetworking.com:465
# SMTP authentication successful
# Sending email to: test@example.com
# Email sent successfully
```

**Verify SMTP Credentials:**
```bash
python3 -c "
import smtplib
smtp_host = 'box.praxisnetworking.com'
smtp_port = 465
smtp_user = 'notification@praxisnetworking.com'
smtp_pass = 'vhnwPn3mK7wR'

try:
    server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30)
    server.login(smtp_user, smtp_pass)
    print('✓ SMTP authentication successful')
    server.quit()
except Exception as e:
    print(f'✗ SMTP error: {e}')
"
```

### Common Issues

**Issue**: "SMTP Authentication failed" in logs
**Solution**: Verify SMTP_USER and SMTP_PASS are correct in send-email.sh

**Issue**: "Connecting to SMTP server: timeout"
**Solution**: Check network connectivity and SMTP_HOST/SMTP_PORT settings

**Issue**: Email log shows SUCCESS but email not received
**Solution**: Check spam folder, verify recipient email address is correct

**Issue**: Script fails to find send-email.sh
**Solution**: Verify path is correct: `scripts/email/send-email.sh`

---

## Monitoring Email Delivery

### Check Recent Email Notifications

```bash
# Check all script logs for email status
grep -i "email" logs/*.log | tail -20

# Check specific logs
tail -50 logs/status-report.log | grep -i "email"
tail -50 logs/rsync-backup.log | grep -i "email"
tail -50 logs/monthly-restore-test.log | grep -i "email"
```

### Email Delivery Success Indicators

Look for these messages in logs:
```
Email notification sent successfully
```

If you see:
```
Email notification skipped: mail command not available
Failed to send email notification
```

Then troubleshoot using steps above.

---

## Future Enhancements

### Potential Additional Notifications

1. **Backend Manual Restore** - Add email when admin restores database
2. **User Management** - Optional emails for admin user changes
3. **Critical Errors** - Real-time alerts for severe errors (not just daily report)
4. **Disk Space Critical** - Immediate alert when disk >90% full
5. **Service Down** - Immediate alert if container stops unexpectedly

### Implementation

Use the `send-admin-email.py` helper script:

```python
# In backend/app/main.py
import subprocess

def send_admin_notification(subject, message):
    try:
        subprocess.run([
            'python3',
            '/home/demo/effective-guide/send-admin-email.py',
            subject,
            message
        ], timeout=30)
    except:
        app.logger.warning("Failed to send admin email notification")
```

---

## Summary

**Email Notification Coverage**: ✅ **COMPREHENSIVE**

All critical admin operations have email notifications:
- ✅ System health monitoring (daily)
- ✅ Backup integrity testing (monthly)
- ✅ Remote backup synchronization
- ✅ Backup verification
- ✅ Failure detection (via error monitoring)

**Primary Recipient**: demo@praxisnetworking.com
**Delivery Status**: All systems tested and functional

The Maps Tracker application has comprehensive email notification coverage for all admin-critical events. No additional notifications are required for normal operations.

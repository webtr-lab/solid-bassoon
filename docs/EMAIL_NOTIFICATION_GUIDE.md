# Email Notification Templates Guide
Maps Tracker Backup System

## Overview

All automated email notifications have been enhanced to clearly identify:
- **Company Name**: Placeholder `[YOUR COMPANY NAME]` to customize
- **Application**: Maps Tracker (Vehicle Tracking System)
- **Server**: Automatically populated with hostname
- **Environment**: Production
- **Business Context**: Why the email matters and what action is needed

---

## Configuration

### Setting Company Name

Edit all notification templates to replace `[YOUR COMPANY NAME]` with your actual company name:

```bash
# Quick replace in all scripts:
sed -i 's/\[YOUR COMPANY NAME\]/YOUR ACTUAL COMPANY NAME/g' /home/devnan/effective-guide/scripts/**/*.sh
sed -i 's/\[YOUR COMPANY NAME\]/YOUR ACTUAL COMPANY NAME/g' /home/devnan/effective-guide/scripts/email/*.py
```

### Email Recipients

Configure in `.env` file:

```bash
BACKUP_EMAIL_ENABLED=true
BACKUP_EMAIL=admin@example.com  # Primary recipient
EMAIL_SUBJECT_PREFIX="[Maps Tracker]"  # Subject line prefix
```

### SMTP Configuration

Configure in `.env` file or `/scripts/email/send-email.sh`:

```bash
SMTP_HOST=box.praxisnetworking.com
SMTP_PORT=465
SMTP_USER=your-email@example.com
SMTP_PASS=your-password
```

---

## Email Templates Overview

### 1. **Backup Verification Emails**
**File**: `/scripts/backup/run-backup-verify.sh`

#### ✓ Success (No email sent - verification passes silently)
No notification is sent when backups verify successfully.

#### ✗ Failure Notification
**Subject**: `[CRITICAL] Maps Tracker - Backup Verification Failed - Action Required`

**Key Sections**:
- Application & Server identification
- What happened: Backup file failed integrity checks
- Business impact: Backup cannot be used for recovery
- Immediate actions: Step-by-step troubleshooting
- Support contact information

---

### 2. **Backup Compression Emails**
**File**: `/scripts/backup/archive-old-backups.sh`

**Subject**: `[Maps Tracker Backup Archive] Report - SUCCESS` or `FAILURE`

**Key Sections**:
- Application identification with company name
- What happened: Compression process completed
- Business benefit: Storage savings explanation
- Compression details: Specific files and space saved
- Automatic compression schedule
- Support information

**Recipients**: Sent on completion (success or failure)

---

### 3. **Disk Monitoring Emails**
**File**: `/scripts/monitoring/backup-disk-monitor.sh`

**Subject**: `[Maps Tracker Backup Disk Monitor] WARNING/CRITICAL - Action Required`

**Key Sections**:
- Alert severity clearly marked (WARNING or CRITICAL)
- Alert thresholds: 75% = WARNING, 90% = CRITICAL
- What this means: Backup storage capacity issue
- Current disk status: Usage percentage and space
- Immediate actions: Prioritized list of steps
- Common reasons for high usage
- Complete troubleshooting checklist
- Prevention measures explained

**Triggers**: 75% disk usage (WARNING) or 90% (CRITICAL)

---

### 4. **Deduplication Emails**
**File**: `/scripts/backup/deduplicate-backups.sh`

**Subject**: `[Maps Tracker Backup Deduplication] Report - SUCCESS` or `NO ACTION NEEDED`

**Key Sections**:
- Application identification with company name
- Process explanation: Weekly hard-linking
- Technical details: SHA256-based deduplication
- Business benefit: Storage efficiency without sacrificing recovery
- Deduplication results: Files linked and space saved
- Important note: Files remain fully recoverable
- Support information

**Schedule**: Runs Sunday at 1:00 AM (weekly)

---

### 5. **Backup Success Emails**
**File**: `/scripts/email/email_templates.py` → `format_backup_success()`

**Subject**: `[Maps Tracker] [FULL/DAILY] Backup Completed Successfully`

**Key Sections**:
- Application: Maps Tracker (Vehicle Tracking System)
- Company: [YOUR COMPANY NAME] - **Customize this**
- Server: Automatically populated
- Environment: Production
- Status: ✓ SUCCESS with timestamp

**Details Provided**:
- Backup type (FULL or DAILY)
- Filename and file size
- SHA256 checksum (for verification)
- Backup schedule (when backups run)
- Recovery information (how to use backup)
- Business benefits listed
- Support contact details

**Auto-Triggers**: On successful backup completion

---

### 6. **Backup Failure Emails**
**File**: `/scripts/email/email_templates.py` → `format_backup_failure()`

**Subject**: `[Maps Tracker] [FULL/DAILY] Backup Failed - Action Required`

**Key Sections**:
- Application identification
- Status: ✗ FAILED with severity indicator
- Business impact: Recovery capability at risk
- Immediate action steps (numbered and detailed)
- Common failure reasons (database, disk space, permissions, etc.)
- Complete troubleshooting checklist
- Resolution procedure (5-step process)
- Support contact with TIME TO RESOLVE

**Auto-Triggers**: On backup failure

---

### 7. **Database Restore Success Emails**
**File**: `/scripts/email/email_templates.py` → `format_restore_success()`

**Subject**: `[Maps Tracker] Database Restore Completed Successfully`

**Key Sections**:
- Application: Maps Tracker with company name
- Status: ✓ SUCCESS - Database Restored
- Restore details: Backup file, duration, rows restored
- Verification completed: All checks passed
- Post-restore status: System operational
- Important information: Safety backup maintained
- Next steps: Verification procedure
- How to escalate if issues found

**Auto-Triggers**: On successful database restoration

---

### 8. **Database Restore Failure Emails**
**File**: `/scripts/email/email_templates.py` → `format_restore_failure()`

**Subject**: `[Maps Tracker] Database Restore Failed - Action Required`

**Key Sections**:
- Application identification
- Status: ✗ FAILED - Database NOT Modified (data safe)
- Business impact: Cannot restore from this backup
- Immediate actions: Contact team, verify database, review logs
- Common failure reasons (corruption, disk space, permissions, etc.)
- Troubleshooting checklist: 7-point verification
- Recovery options: Try different backup, increase resources, etc.
- Support contact with PRIORITY LEVEL

**Auto-Triggers**: On restore failure

---

### 9. **Health Check Emails**
**File**: `/scripts/monitoring/health-check.sh`

**Subject**: `[Maps Tracker Health Check] OPERATIONAL/WARNING/CRITICAL/DEGRADED`

**Status Levels**:
- **OPERATIONAL**: All systems healthy
- **WARNING**: Non-critical components have issues
- **DEGRADED**: Some services affected
- **CRITICAL**: Essential services down

**Key Sections**:
- Server and application identification
- Overall system status
- Services checked: Backend, Frontend, Mobile, Nominatim, Database
- What to check if issues found
- How to fix problems
- Support escalation

---

## Email Structure Standards

All emails now follow this consistent format:

```
════════════════════════════════════════════════════════════════
NOTIFICATION TYPE - System Name
════════════════════════════════════════════════════════════════

Application:     Maps Tracker (Vehicle Tracking System)
Company:         [YOUR COMPANY NAME]  ← CUSTOMIZE THIS
Server:          hostname
Environment:     Production
Status:          Status details
Timestamp:       YYYY-MM-DD HH:MM:SS

WHAT HAPPENED:
──────────────────────────────────────────────────────────────────
Clear explanation of what occurred

DETAILS/IMPACT:
──────────────────────────────────────────────────────────────────
Specific technical details

IMMEDIATE ACTION REQUIRED:
──────────────────────────────────────────────────────────────────
Numbered steps (if action needed)

SUPPORT CONTACT:
──────────────────────────────────────────────────────────────────
Contact person and priority level

════════════════════════════════════════════════════════════════
```

---

## Key Improvements Made

### 1. Company Name Identification
✓ All templates include placeholder `[YOUR COMPANY NAME]`
✓ Clear application name: "Maps Tracker (Vehicle Tracking System)"
✓ Server hostname automatically populated
✓ Environment clearly marked as "Production"

### 2. Clear Purpose & Context
✓ Each email states WHY it was sent
✓ Business impact explained
✓ What action is needed (or that no action is needed)
✓ How the email topic affects the business

### 3. Professional Structure
✓ Consistent formatting across all emails
✓ ASCII borders for visual clarity
✓ Sections clearly labeled with dividers
✓ Priority indicators (CRITICAL, WARNING, SUCCESS)

### 4. Actionable Information
✓ Numbered step-by-step procedures
✓ Exact commands to run for troubleshooting
✓ Common issue causes listed
✓ Complete checklists provided

### 5. Support Information
✓ Clear contact person(s) for each issue type
✓ Log file locations provided
✓ Time to resolve expectations
✓ Escalation procedures documented

---

## Testing Emails

### Manual Test: Send Test Notification

```bash
# Test backup success email
/home/devnan/effective-guide/scripts/email/send-email.sh \
  "admin@example.com" \
  "[TEST] Maps Tracker - Test Email" \
  "This is a test email from the Maps Tracker backup system.

Company: [YOUR COMPANY NAME]
Server: $(hostname)
Status: Test message

No action required."

# Test disk monitoring email
bash /home/devnan/effective-guide/scripts/monitoring/backup-disk-monitor.sh

# Test compression email
bash /home/devnan/effective-guide/scripts/backup/archive-old-backups.sh
```

---

## Email Customization Checklist

Before deploying to production, complete these steps:

- [ ] Replace `[YOUR COMPANY NAME]` with your actual company name in all scripts
- [ ] Update `BACKUP_EMAIL` in `.env` with your email address
- [ ] Update `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` in `.env` or send-email.sh
- [ ] Test sending an email: `bash /scripts/email/send-email.sh test@example.com "Test" "Test message"`
- [ ] Verify email arrives in inbox
- [ ] Check formatting is correct and readable
- [ ] Update contact person names in templates if needed
- [ ] Configure email forwarding if multiple recipients needed
- [ ] Set up email filtering if large volume expected
- [ ] Document which team members receive each alert type

---

## Monitoring Email Delivery

### Check Email Log
```bash
# View all email send attempts
tail -50 /home/devnan/effective-guide/logs/email.log

# Check for delivery failures
grep ERROR /home/devnan/effective-guide/logs/email.log

# Monitor SMTP connections
grep "SMTP" /home/devnan/effective-guide/logs/email.log
```

### Common Email Issues

**Problem**: Emails not being sent
- Check: Is `BACKUP_EMAIL_ENABLED=true` in `.env`?
- Check: Is email address valid?
- Check: SMTP credentials correct?
- Solution: Test manually with send-email.sh script

**Problem**: Emails arriving late
- Cause: SMTP server slow
- Solution: Reduce verbosity, check network connectivity
- Note: Cron sends emails asynchronously

**Problem**: Incorrect company name
- Solution: Search/replace `[YOUR COMPANY NAME]` across all scripts
- Command: `grep -r "\[YOUR COMPANY NAME\]" /scripts/`

---

## Schedule of Automated Notifications

| Time | Process | Email Type | Condition |
|------|---------|-----------|-----------|
| 1:00 AM | Deduplication | Report | Weekly (Sunday) |
| 2:00 AM | Backup | Success/Failure | Daily |
| 2:15 AM | Verification | Failure only | Daily (if fails) |
| 2:30 AM | Cleanup | (Log only) | Daily |
| 3:00 AM | Compression | Report | Daily |
| 3:30 AM | Disk Monitor | Warning/Critical only | Daily (if >75%) |
| 4:00 AM | Health Check | Operational/Warning/Critical | Daily |

---

## Email Notification Flow Diagram

```
Backup Process
     ↓
[Success] → Send Success Email → User Reviews Backup Status
[Failure] → Send Failure Email → User Takes Action
     ↓
Verification (if enabled)
     ↓
[Success] → No email (silent)
[Failure] → Send Critical Alert → User Investigates
     ↓
Disk Monitoring (3:30 AM)
     ↓
[Usage < 75%] → No email
[Usage 75-90%] → WARNING email → User Cleans Up
[Usage > 90%] → CRITICAL email → User Takes Immediate Action
     ↓
Health Check (4:00 AM)
     ↓
[All services up] → OPERATIONAL email (optional)
[Some issues] → WARNING email → User Investigates
[Critical failure] → CRITICAL email → User Escalates
```

---

## Support & Questions

For issues with email notifications, check:
1. `/home/devnan/effective-guide/logs/email.log` - All email transactions
2. `/home/devnan/effective-guide/logs/backup-manager.log` - Backup process errors
3. `/home/devnan/effective-guide/.env` - SMTP configuration
4. Email templates in `/home/devnan/effective-guide/scripts/email/`

---

**Last Updated**: 2025-11-11
**Template Version**: 2.0 (Company-Aware)
**Status**: All templates enhanced and tested

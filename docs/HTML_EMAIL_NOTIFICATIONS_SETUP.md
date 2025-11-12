# HTML Email Notifications Setup

## Overview

The Maps Tracker system now supports professional HTML email notifications with status-based color coding. Emails automatically adapt their appearance based on the operation status:

- **Success** (Green): Operations completed successfully - `#10b981`
- **Warning** (Yellow): Operations completed with issues - `#f59e0b`
- **Failed** (Red): Operations failed and require action - `#ef4444`

## Components Created

### 1. **email_html_generator.py** (`scripts/email/email_html_generator.py`)
Python module that generates professional HTML emails with status-based styling.

**Features:**
- Reusable HTML email template with responsive design
- Status-based color coding (success/warning/failed)
- Supports multiple content section types:
  - Key-value tables for structured data
  - Bullet lists for action items
  - Plain text sections for descriptions
- Email client compatibility (Outlook, Gmail, Apple Mail, etc.)
- Mobile-responsive design

**Key Functions:**
- `generate_html_email()` - Generic HTML email generator
- `backup_success_html()` - Successful backup notification
- `backup_failure_html()` - Failed backup notification
- `restore_success_html()` - Successful restore notification
- `restore_failure_html()` - Failed restore notification
- `disk_monitoring_html()` - Disk usage monitoring alert

### 2. **Updated send-email.sh** (`scripts/email/send-email.sh`)
Enhanced email sending script with HTML support.

**Changes:**
- Added `--html` flag to send HTML emails (backward compatible with plain text)
- Automatically detects email format based on flag
- Updated SMTP message creation to use `MIMEText` with HTML subtype
- Added format logging ("HTML" or "Plain Text")

**Usage:**
```bash
# Plain text email (default)
./send-email.sh recipient@example.com "Subject" "Plain text message"

# HTML email
./send-email.sh recipient@example.com "Subject" "<html>...</html>" --html
```

### 3. **test-email-templates.py** (`scripts/email/test-email-templates.py`)
Comprehensive test script to generate and send sample emails.

**Features:**
- Generates 7 different email templates:
  1. Backup Success
  2. Backup Failure
  3. Restore Success
  4. Restore Failure
  5. Disk Monitoring - Success
  6. Disk Monitoring - Warning
  7. Disk Monitoring - Critical
- Saves samples to `logs/email-samples/` for preview
- Interactive prompt to send test emails to configured recipient

## Color Coding Scheme

### Success (Green: #10b981)
- Header gradient: `linear-gradient(135deg, #10b981, #059669)`
- Status badge: Checkmark (✓)
- Use for: Successful backups, restores, normal operations
- Symbol: ✓ (checkmark)

### Warning (Yellow: #f59e0b)
- Header gradient: `linear-gradient(135deg, #f59e0b, #d97706)`
- Status badge: Warning (⚠)
- Use for: High disk usage, performance issues, non-critical problems
- Symbol: ⚠ (warning triangle)

### Failed (Red: #ef4444)
- Header gradient: `linear-gradient(135deg, #ef4444, #dc2626)`
- Status badge: Error (✗)
- Use for: Failed operations, critical issues requiring immediate action
- Symbol: ✗ (cross mark)

## Sample Emails

Generated sample email templates are available in `logs/email-samples/`:

```
├── backup-success.html           (Green - backup completed)
├── backup-failure.html           (Red - backup failed)
├── restore-success.html          (Green - restore completed)
├── restore-failure.html          (Red - restore failed)
├── disk-monitoring-success.html  (Green - normal usage)
├── disk-monitoring-warning.html  (Yellow - high usage)
└── disk-monitoring-critical.html (Red - critical usage)
```

You can open any `.html` file in a web browser to preview the email appearance.

## Integration Examples

### Example 1: Sending a Backup Success Email

```python
from email_html_generator import backup_success_html
import subprocess

html = backup_success_html(
    backup_type='daily',
    backup_file='/backups/db_backup_2025-11-12.sql.gz',
    backup_size='245.3 MB',
    duration='3m 42s'
)

subprocess.run([
    'scripts/email/send-email.sh',
    'admin@company.com',
    '[SUCCESS] Daily Database Backup Completed',
    html,
    '--html'
])
```

### Example 2: Sending a Failed Backup Alert

```python
from email_html_generator import backup_failure_html
import subprocess

html = backup_failure_html(
    backup_type='daily',
    error_message='Database connection timeout after 30 seconds',
    duration='0m 5s'
)

subprocess.run([
    'scripts/email/send-email.sh',
    'admin@company.com',
    '[FAILED] Daily Database Backup - Action Required',
    html,
    '--html'
])
```

### Example 3: Disk Monitoring Alert

```python
from email_html_generator import disk_monitoring_html
import subprocess

html = disk_monitoring_html(
    disk_usage='78%',
    backup_count='47 backups',
    status_type='warning'  # or 'success' or 'failed'
)

subprocess.run([
    'scripts/email/send-email.sh',
    'admin@company.com',
    '[WARNING] Backup Disk Usage Increasing',
    html,
    '--html'
])
```

## Running Test Emails

To generate and test the email templates:

```bash
cd scripts/email
python3 test-email-templates.py
```

The script will:
1. Generate 7 sample HTML emails
2. Save them to `logs/email-samples/` for preview
3. Optionally send test emails to the configured recipient (interactive prompt)

## Configuration

Email sending requires the following environment variables in `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
TEST_EMAIL=recipient@example.com  # For testing
```

## Technical Details

### Email Template Structure

Each HTML email includes:
1. **Header** - Status-colored gradient background with title and status badge
2. **System Info** - Server, environment, task, and timestamp details
3. **Content Sections** - Variable content with key-value tables, lists, and text
4. **Support Info** - Contact and frequency information
5. **Footer** - Copyright and auto-generated notice

### Email Client Support

The HTML emails are compatible with:
- Gmail
- Outlook / Office 365
- Apple Mail / iCloud Mail
- Yahoo Mail
- Mobile email clients (iPhone, Android)

### Responsive Design

- Maximum width: 640px (readable on all devices)
- Mobile breakpoint: 600px max-width
- Proper font sizing for readability
- Optimized padding and margins

## Backward Compatibility

The changes are fully backward compatible:
- Existing plain text email sending continues to work
- `send-email.sh` defaults to plain text if `--html` flag is not provided
- All existing scripts can continue using the script without modification

## Troubleshooting

### Emails Not Showing Colors
- Ensure `--html` flag is used: `send-email.sh recipient subject html --html`
- Check email client HTML support (most modern clients support this)
- Verify SMTP configuration in `.env`

### Email Not Received
- Check `.env` SMTP credentials
- Review `logs/email.log` for sending status
- Verify recipient email address is correct
- Check SMTP server firewall/rate limits

### HTML Rendering Issues
- Email client may strip some CSS - basic styling is preserved
- Inline styles are prioritized over external stylesheets
- Preview `.html` files in browser to verify appearance

## Files Modified

- `scripts/email/send-email.sh` - Enhanced with HTML support
- Created: `scripts/email/email_html_generator.py` - HTML email templates
- Created: `scripts/email/test-email-templates.py` - Test script

## Future Enhancements

Possible improvements:
- Add custom branding/logo support
- Support for email attachments
- Template variables for dynamic content
- Scheduled email report generation
- Email analytics/tracking

## Testing Results

All 7 email templates have been successfully:
- Generated with proper HTML structure
- Saved to `logs/email-samples/` for preview
- Tested with SMTP sending (confirmed delivery)

Test emails sent:
- ✓ Backup Success (GREEN)
- ✓ Backup Failure (RED)
- ✓ Disk Monitoring Warning (YELLOW)

# Email Template Reference - email_template.html

## Overview

The `email_template.html` file has been updated to work reliably with email clients. It now uses dynamic placeholders instead of hardcoded values and removes CSS pseudo-elements that email clients don't support.

## Fixed Issues

### ✓ Problem 1: CSS Pseudo-Elements Removed
**Before:** Used `.section-title::before { content: "✓"; }` which email clients ignore
**After:** Symbols are now inline HTML: `<span class="section-title-icon">✓</span>`

### ✓ Problem 2: Hardcoded Values Replaced
**Before:** Had hardcoded server names, disk usage, timestamps, etc.
**After:** All values use placeholders like `{{SERVER_HOSTNAME}}`, `{{DISK_USAGE_PERCENT}}`, etc.

## Template Variables

Replace these placeholders with actual values before sending:

### System Information
- `{{EMAIL_TITLE}}` - Email header title (e.g., "BACKUP DISK USAGE MONITORING")
- `{{STATUS}}` - Status type (e.g., "HEALTHY", "WARNING", "CRITICAL")
- `{{APPLICATION_NAME}}` - Application name (e.g., "Maps Tracker (Vehicle Tracking System)")
- `{{SERVER_HOSTNAME}}` - Server hostname (e.g., "racknerd-f282c00")
- `{{ENVIRONMENT}}` - Environment (e.g., "Production", "Staging")
- `{{ALERT_TYPE}}` - Type of alert (e.g., "Daily Backup Storage Monitoring")
- `{{STATUS_MESSAGE}}` - Status message (e.g., "NORMAL - All systems operational")
- `{{TIMESTAMP}}` - Current timestamp (e.g., "2025-11-12 00:18:40")

### Storage/Disk Information
- `{{DISK_USAGE_PERCENT}}` - Disk usage percentage (e.g., "9%", "78%", "95%")
- `{{BACKUP_TOTAL_SIZE}}` - Total backup directory size (e.g., "33M", "245.3 GB")
- `{{BACKUP_FILE_COUNT}}` - Number of backups (e.g., "7 backups", "47 backups")
- `{{BACKUP_COMPRESSION_STATUS}}` - Compression status (e.g., "7 uncompressed, 0 compressed")
- `{{FILESYSTEM_USED_PERCENT}}` - Used space percentage (e.g., "9%")
- `{{FILESYSTEM_AVAILABLE}}` - Available space (e.g., "86,362,624 bytes")
- `{{FILESYSTEM_TOTAL}}` - Total space (e.g., "94,858,632 bytes")
- `{{COMPRESSION_RATIO}}` - Compression ratio (e.g., "-8,405,950%")
- `{{STATUS_SUMMARY}}` - Summary message (e.g., "All systems normal - No action required")

### Support Information
- `{{SUPPORT_CONTACT}}` - Contact person/team (e.g., "System Administrator")
- `{{MONITORING_FREQUENCY}}` - How often monitoring occurs (e.g., "Daily monitoring at 3:30 AM")

## Color Scheme Variables

The template uses inline styles. To change colors for different statuses, modify the `.header` background:

### Success (Green)
```css
.header { background: linear-gradient(135deg, #10b981, #059669); }
```

### Warning (Yellow)
```css
.header { background: linear-gradient(135deg, #f59e0b, #d97706); }
```

### Critical/Failed (Red)
```css
.header { background: linear-gradient(135deg, #ef4444, #dc2626); }
```

Also update the `.section-title-icon` color to match the header gradient.

## Usage Example

### Python with String Replacement

```python
def render_email_template(variables_dict):
    with open('email_template.html', 'r') as f:
        template = f.read()

    # Replace all placeholders
    for key, value in variables_dict.items():
        template = template.replace(f'{{{{{key}}}}}', str(value))

    return template

# Use it
variables = {
    'EMAIL_TITLE': 'BACKUP DISK USAGE MONITORING',
    'STATUS': 'HEALTHY',
    'APPLICATION_NAME': 'Maps Tracker (Vehicle Tracking System)',
    'SERVER_HOSTNAME': socket.gethostname(),
    'ENVIRONMENT': 'Production',
    'ALERT_TYPE': 'Daily Backup Storage Monitoring',
    'STATUS_MESSAGE': 'NORMAL - All systems operational',
    'TIMESTAMP': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
    'DISK_USAGE_PERCENT': '9%',
    'BACKUP_TOTAL_SIZE': '33M',
    'BACKUP_FILE_COUNT': '7 backups',
    'BACKUP_COMPRESSION_STATUS': '7 uncompressed, 0 compressed',
    'FILESYSTEM_USED_PERCENT': '9%',
    'FILESYSTEM_AVAILABLE': '86,362,624 bytes',
    'FILESYSTEM_TOTAL': '94,858,632 bytes',
    'COMPRESSION_RATIO': '-8,405,950%',
    'STATUS_SUMMARY': 'All systems normal - No action required',
    'SUPPORT_CONTACT': 'System Administrator',
    'MONITORING_FREQUENCY': 'Daily monitoring at 3:30 AM',
}

html = render_email_template(variables)
```

### Bash with sed

```bash
#!/bin/bash

# Replace variables in template
sed \
  -e "s|{{EMAIL_TITLE}}|BACKUP DISK USAGE MONITORING|g" \
  -e "s|{{STATUS}}|HEALTHY|g" \
  -e "s|{{SERVER_HOSTNAME}}|$(hostname)|g" \
  -e "s|{{TIMESTAMP}}|$(date '+%Y-%m-%d %H:%M:%S')|g" \
  -e "s|{{DISK_USAGE_PERCENT}}|9%|g" \
  email_template.html > email_output.html

# Send email
./send-email.sh recipient@example.com "Subject" "$(cat email_output.html)" --html
```

## Email Client Compatibility

The updated template is compatible with:
- ✓ Gmail
- ✓ Outlook / Office 365
- ✓ Apple Mail
- ✓ Yahoo Mail
- ✓ Mobile email clients
- ✓ Thunderbird

**Key compatibility features:**
- No CSS pseudo-elements (not supported in email)
- Inline styles for maximum compatibility
- Table-based layout for email clients
- Responsive design with media queries
- Standard HTML symbols (✓, ⚠, ✗)

## Dynamic Status Indicators

To change the status icon and color, also update:
1. `{{STATUS}}` value (HEALTHY/WARNING/CRITICAL)
2. Status icon in the sections (change ✓ to ⚠ or ✗)
3. Header gradient colors

Example for WARNING status:
```html
<!-- Change header gradient -->
<style>
  .header { background: linear-gradient(135deg, #f59e0b, #d97706); }
  .section-title-icon { color: #f59e0b; }
</style>

<!-- Use in badge -->
<div class="status-badge">WARNING STATUS</div>

<!-- Use in sections -->
<h2 class="section-title"><span class="section-title-icon">⚠</span>STORAGE STATUS</h2>
```

## Advantages Over Original

| Feature | Original | Updated |
|---------|----------|---------|
| Email client support | Limited | Full compatibility |
| CSS pseudo-elements | ✗ Email clients ignore | ✓ Removed |
| Hardcoded values | ✓ Static | ✓ Dynamic with placeholders |
| Reusability | ✗ Single use | ✓ Template-based |
| Status flexibility | ✗ Fixed to green | ✓ Supports all statuses |
| Maintenance | ✗ Edit HTML | ✓ Simple variable swap |

## Files Related

- `email_template.html` - Updated master template
- `scripts/email/email_html_generator.py` - Python functions for HTML emails
- `scripts/email/send-email.sh` - Updated to support HTML emails
- `docs/HTML_EMAIL_NOTIFICATIONS_SETUP.md` - Full setup guide

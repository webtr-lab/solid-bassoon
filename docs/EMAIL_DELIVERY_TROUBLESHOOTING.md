# Email Delivery Troubleshooting Guide

Maps Tracker Backup System

---

## Problem: Emails Not Being Delivered

If you notice that emails are not arriving in your inbox, even though the email.log shows `Status: SUCCESS`, the issue is likely **SMTP server rate limiting**.

---

## Root Cause: SMTP Rate Limiting

Many SMTP servers have rate limiting enabled. When multiple emails are sent in rapid succession (within 15 seconds of each other), the server:

1. Accepts the SMTP connection ✓
2. Accepts the authentication ✓
3. Accepts the message ✓
4. **Silently drops the email** ✗ (no error returned to client)

This is why email.log shows `Status: SUCCESS` but you never receive the email.

---

## Solution: Automatic Rate Limiting

The `send-email.sh` script now includes **automatic rate limiting** to prevent this issue.

### How It Works

- Default delay: **15 seconds** between consecutive emails
- Configurable via: `SMTP_DELAY` environment variable
- Automatically enforced when scripts send emails
- Only applies delays when needed (doesn't add unnecessary delays between distant emails)

### Testing the Fix

Run multiple test emails with automatic delays:

```bash
# This will automatically space emails 15 seconds apart
/home/devnan/effective-guide/scripts/email/send-email.sh demo@praxisnetworking.com "TEST 1" "Test email 1"
/home/devnan/effective-guide/scripts/email/send-email.sh demo@praxisnetworking.com "TEST 2" "Test email 2"
/home/devnan/effective-guide/scripts/email/send-email.sh demo@praxisnetworking.com "TEST 3" "Test email 3"
```

Each email will automatically wait for the delay before sending. Check the email log:

```bash
tail -20 /home/devnan/effective-guide/logs/email.log | grep -E "Rate limiting|TEST"
```

You should see entries like:
```
[2025-11-11 18:43:35] Subject: TEST 1
[2025-11-11 18:43:36] Rate limiting: Waiting 14s to avoid SMTP server rejection
[2025-11-11 18:43:50] Subject: TEST 2
[2025-11-11 18:43:51] Rate limiting: Waiting 14s to avoid SMTP server rejection
[2025-11-11 18:44:05] Subject: TEST 3
```

---

## Customizing the Rate Limit Delay

If you find that 15 seconds is too short (emails still not arriving) or too long (emails arriving too slowly), adjust `SMTP_DELAY`:

```bash
# Increase delay to 20 seconds
SMTP_DELAY=20 /home/devnan/effective-guide/scripts/email/send-email.sh demo@praxisnetworking.com "Subject" "Message"

# Reduce delay to 10 seconds (if 15 works fine)
SMTP_DELAY=10 /home/devnan/effective-guide/scripts/email/send-email.sh demo@praxisnetworking.com "Subject" "Message"
```

Or set it globally in your shell:

```bash
export SMTP_DELAY=20
# All send-email.sh calls will now use 20-second delays
```

---

## Backup Scripts: Automatic Rate Limiting

The backup scripts (archive-old-backups.sh, backup-disk-monitor.sh, deduplicate-backups.sh, etc.) now use the improved send-email.sh which includes automatic rate limiting.

### For Single-Email Scripts
Scripts that send one email per execution (most of them) don't need any changes. Rate limiting is transparent.

### For Multi-Email Scripts
If you create a script that sends multiple emails in a loop, the rate limiting is automatically applied:

```bash
#!/bin/bash

for recipient in admin1@example.com admin2@example.com admin3@example.com; do
    # Rate limiting is automatic - no changes needed
    /home/devnan/effective-guide/scripts/email/send-email.sh "$recipient" "Subject" "Message"
done
```

Each call to send-email.sh will wait as needed to respect SMTP_DELAY.

---

## Checking Email Delivery

### 1. Check Script Log
```bash
tail -50 /home/devnan/effective-guide/logs/email.log
```

Look for `Status: SUCCESS` entries for your emails.

### 2. Verify Rate Limiting Applied
```bash
grep "Rate limiting" /home/devnan/effective-guide/logs/email.log
```

If you see rate limiting messages, the protection is working.

### 3. Check Email Inbox
Wait at least SMTP_DELAY seconds (default 15s) after the email.log shows sent, then check your inbox.

If emails still don't arrive after 15 seconds of the log entry, possible causes are:

1. **SMTP credentials incorrect**: Check SMTP_USER and SMTP_PASS in .env
2. **Recipient address blocked**: Try sending to a different email address
3. **SMTP server issues**: Check if your SMTP_HOST is accessible and DNS resolves correctly
4. **Email marked as spam**: Check your spam/junk folder

---

## Advanced Troubleshooting

### Test SMTP Connection Directly

```bash
python3 << 'EOF'
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

try:
    # Load configuration from .env
    smtp_host = os.getenv('SMTP_HOST', 'smtp.example.com')
    smtp_port = int(os.getenv('SMTP_PORT', '465'))
    smtp_user = os.getenv('SMTP_USER', 'notifications@example.com')
    smtp_pass = os.getenv('SMTP_PASS', 'your-password')

    print(f"Connecting to SMTP {smtp_host}:{smtp_port}...")
    server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30)

    print(f"Authenticating as {smtp_user}...")
    server.login(smtp_user, smtp_pass)

    print("✓ SMTP connection successful!")
    server.quit()
except Exception as e:
    print(f"✗ SMTP error: {e}")
EOF
```

### Enable SMTP Debugging

Temporarily modify send-email.sh to enable SMTP debugging:

```bash
# In the Python code, change:
# server.set_debuglevel(0)
# To:
# server.set_debuglevel(2)

# Then run send-email.sh - you'll see detailed SMTP conversation
```

---

## Summary of Changes

| Issue | Solution | Default | Configurable |
|-------|----------|---------|--------------|
| Emails dropped by SMTP rate limiting | Automatic delays between sends | 15 seconds | SMTP_DELAY |
| Silent failures not reported | Enhanced error messages | N/A | Logs all errors |
| No visibility into SMTP issues | Detailed SMTP error handling | N/A | Check stderr |
| Rapid email sends failing | Rate limiting enforces delays | 15 seconds | Adjustable |

---

## Next Steps

1. Test the improved send-email.sh with test emails
2. Verify emails arrive in your inbox after delays
3. Adjust SMTP_DELAY if needed for your SMTP server
4. All backup system emails now automatically use the rate-limited sender

**Your email delivery should now be reliable!**

---

**Last Updated**: 2025-11-11
**Status**: Email rate limiting implemented and tested
**All emails now delivered with 15-second spacing (configurable)**

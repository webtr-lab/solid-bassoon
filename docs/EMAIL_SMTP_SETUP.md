# SMTP Email Configuration Guide

This guide explains how to configure the GPS Tracker server to send emails using authenticated SMTP with a specific sender address.

## Configuration Overview

**Sender Address**: notification@praxisnetworking.com
**SMTP Server**: box.praxisnetworking.com:465
**Authentication**: Enabled (username/password)
**Encryption**: SSL/TLS (SMTPS - implicit SSL)

## Quick Setup

### Step 1: Run Configuration Script

The configuration script will automatically:
- Install required SASL authentication modules
- Configure postfix for SMTP relay
- Set up authentication credentials (securely)
- Configure sender address rewriting
- Test the configuration

```bash
sudo ./configure-email-smtp.sh
```

**Note**: This script must be run with `sudo` as it modifies system postfix configuration.

### Step 2: Verify Configuration

After running the script, check:

1. **Test email sent**: Check info@praxisnetworking.com inbox
2. **Sender address**: Verify emails come from notification@praxisnetworking.com
3. **Mail queue**: Should be empty (no errors)

```bash
# Check mail queue
mailq

# View recent mail logs
sudo journalctl -u postfix -n 20
```

### Step 3: Test Automated Notifications

Test all notification systems:

```bash
# Test status report
./app-status-report.sh

# Test backup notification
./rsync-backup-remote.sh

# Simple test email
echo "Test from configured SMTP" | mail -s "SMTP Test" info@praxisnetworking.com
```

## What Gets Configured

### 1. Postfix Main Configuration
**File**: `/etc/postfix/main.cf`

Settings added:
- SMTP relay host: box.praxisnetworking.com:465
- SASL authentication enabled
- SSL/TLS encryption enabled (SMTPS/wrappermode)
- Sender address rewriting enabled

### 2. SMTP Credentials
**File**: `/etc/postfix/sasl_passwd` (secured with 600 permissions)

Contains encrypted credentials for:
- Username: notification@praxisnetworking.com
- Password: (securely stored)

### 3. Sender Address Mapping
**File**: `/etc/postfix/generic`

Rewrites all outgoing mail to use: notification@praxisnetworking.com

This ensures all automated emails (status reports, backup notifications) appear to come from the configured sender address.

## Configuration Details

### SMTP Settings

| Setting | Value |
|---------|-------|
| SMTP Server | box.praxisnetworking.com |
| Port | 465 (SMTPS - SSL/TLS) |
| Authentication | SASL (Plain/Login) |
| Encryption | SSL/TLS (implicit) |
| Sender Address | notification@praxisnetworking.com |

### Security Features

- Credentials stored in hashed format
- File permissions: 600 (root only)
- TLS encryption required for all connections
- SASL authentication required

## Testing

### Test 1: Basic Email Test

```bash
echo "Test message body" | mail -s "Test Subject" info@praxisnetworking.com
```

**Expected**: Email received from notification@praxisnetworking.com

### Test 2: Status Report Test

```bash
./app-status-report.sh
```

**Expected**:
- Email sent successfully (logged)
- Received at info@praxisnetworking.com
- From: notification@praxisnetworking.com

### Test 3: Backup Notification Test

```bash
./rsync-backup-remote.sh
```

**Expected**:
- Email sent successfully (logged)
- Received at demo@praxisnetworking.com
- From: notification@praxisnetworking.com

### Test 4: Mail Queue Check

```bash
mailq
```

**Expected**: "Mail queue is empty"

If emails are stuck in queue, check logs:
```bash
sudo journalctl -u postfix -f
```

## Troubleshooting

### Issue: Authentication Failed

**Error**: "SASL authentication failed"

**Solutions**:
1. Verify credentials are correct in `/etc/postfix/sasl_passwd`
2. Regenerate hash database:
   ```bash
   sudo postmap /etc/postfix/sasl_passwd
   sudo systemctl restart postfix
   ```
3. Check SMTP server is reachable:
   ```bash
   telnet box.praxisnetworking.com 465
   ```

### Issue: TLS/SSL Errors

**Error**: "TLS connection failed"

**Solutions**:
1. Verify ca-certificates are installed:
   ```bash
   sudo apt-get install ca-certificates
   ```
2. Check TLS configuration:
   ```bash
   postconf | grep tls
   ```
3. Test SSL connection:
   ```bash
   openssl s_client -connect box.praxisnetworking.com:465
   ```
   Note: Port 465 uses implicit SSL, no -starttls flag needed

### Issue: Sender Address Not Rewritten

**Error**: Emails show wrong sender address

**Solutions**:
1. Verify generic mapping is configured:
   ```bash
   sudo postconf smtp_generic_maps
   ```
2. Regenerate generic database:
   ```bash
   sudo postmap /etc/postfix/generic
   sudo systemctl restart postfix
   ```
3. Check /etc/postfix/generic contains correct mapping

### Issue: Connection Timeout

**Error**: "Connection timed out"

**Solutions**:
1. Check firewall allows port 465:
   ```bash
   sudo ufw status
   sudo ufw allow 465/tcp
   ```
2. Verify SMTP server hostname resolves:
   ```bash
   nslookup box.praxisnetworking.com
   ```
3. Test connectivity:
   ```bash
   nc -zv box.praxisnetworking.com 465
   ```

### Issue: Emails Going to Spam

**Solutions**:
1. Verify sender address is authorized
2. Check SPF/DKIM records for praxisnetworking.com domain
3. Ensure reverse DNS is configured for server IP
4. Use proper subject lines (avoid spam keywords)

## Viewing Logs

### Postfix Logs

```bash
# Live log monitoring
sudo journalctl -u postfix -f

# Recent logs (last 50 lines)
sudo journalctl -u postfix -n 50

# Logs since specific time
sudo journalctl -u postfix --since "1 hour ago"

# Show only errors
sudo journalctl -u postfix -p err

# Search for specific email
sudo journalctl -u postfix | grep "info@praxisnetworking.com"
```

### Application Logs

```bash
# Status report email logs
grep "Email notification" logs/status-report.log

# Backup notification logs
grep "Email notification" logs/rsync-backup.log
```

## Configuration Files Location

| File | Purpose | Permissions |
|------|---------|-------------|
| `/etc/postfix/main.cf` | Main postfix configuration | 644 |
| `/etc/postfix/sasl_passwd` | SMTP credentials (plain) | 600 |
| `/etc/postfix/sasl_passwd.db` | SMTP credentials (hashed) | 600 |
| `/etc/postfix/generic` | Sender mapping (plain) | 644 |
| `/etc/postfix/generic.db` | Sender mapping (hashed) | 644 |
| `/etc/postfix/main.cf.backup.*` | Configuration backups | 644 |

## Reverting Configuration

If you need to revert to the original configuration:

```bash
# Stop postfix
sudo systemctl stop postfix

# Restore backup
sudo cp /etc/postfix/main.cf.backup.YYYYMMDD_HHMMSS /etc/postfix/main.cf

# Remove SMTP configuration
sudo rm /etc/postfix/sasl_passwd*
sudo rm /etc/postfix/generic*

# Restart postfix
sudo systemctl restart postfix
```

## Security Considerations

### Credential Security
- Credentials stored in `/etc/postfix/sasl_passwd` (600 permissions)
- Only root can read the password file
- Hashed database created for postfix use
- Original script should be deleted after use (contains plaintext password)

**Recommended**: After configuration is complete and tested:
```bash
# Securely delete the configuration script
shred -u configure-email-smtp.sh
```

### Network Security
- TLS encryption required for all SMTP connections
- SASL authentication prevents unauthorized relay
- Port 587 (submission) used instead of 25 (open relay)

### Monitoring
- Review mail logs regularly for unauthorized attempts
- Monitor mail queue for stuck/failed emails
- Check for bounce messages

## Maintenance

### Regular Tasks

1. **Weekly**: Check mail queue and logs
   ```bash
   mailq
   sudo journalctl -u postfix --since "7 days ago" | grep -i error
   ```

2. **Monthly**: Verify email notifications are working
   ```bash
   ./app-status-report.sh --no-email  # Check status
   ./app-status-report.sh              # Send test email
   ```

3. **Quarterly**: Test backup of postfix configuration
   ```bash
   sudo cp /etc/postfix/main.cf /backup/postfix-main.cf.$(date +%Y%m%d)
   ```

### Updating Credentials

If the SMTP password changes:

1. Edit `/etc/postfix/sasl_passwd`:
   ```bash
   sudo nano /etc/postfix/sasl_passwd
   ```

2. Update the password on the line:
   ```
   [box.praxisnetworking.com]:465 notification@praxisnetworking.com:NEW_PASSWORD
   ```

3. Regenerate hash and restart:
   ```bash
   sudo postmap /etc/postfix/sasl_passwd
   sudo systemctl restart postfix
   ```

## Integration Status

After configuration, these systems will use authenticated SMTP:

✓ **Daily Status Reports** → info@praxisnetworking.com
✓ **Backup Notifications** → demo@praxisnetworking.com
✓ **Manual test emails** → Any address

All emails will appear to come from: **notification@praxisnetworking.com**

## Support

If you encounter issues:

1. Check this documentation
2. Review logs: `sudo journalctl -u postfix -n 100`
3. Verify configuration: `sudo postconf -n`
4. Test connectivity: `telnet box.praxisnetworking.com 587`

## Related Documentation

- [HEALTH_CHECK.md](./HEALTH_CHECK.md) - Status reports and monitoring
- [REMOTE_BACKUP.md](./REMOTE_BACKUP.md) - Backup notifications
- [LOGGING.md](./LOGGING.md) - Application logging

## Summary

The SMTP configuration provides:
- ✅ Authenticated email sending
- ✅ Consistent sender address (notification@praxisnetworking.com)
- ✅ Secure credential storage
- ✅ TLS/SSL encryption
- ✅ Automatic sender rewriting
- ✅ Integration with all notification systems

All automated notifications are now sent via authenticated SMTP with a professional sender address.

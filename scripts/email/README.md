# Email Scripts

Scripts for configuring email notifications and SMTP settings.

## Scripts

- **configure-email-smtp.sh** - Interactive SMTP configuration wizard
- **fix-sasl-authentication.sh** - Fix SASL authentication issues for Postfix
- **send-admin-email.py** - Python utility for sending administrative emails

## Features

### SMTP Configuration
- Gmail integration
- Custom SMTP server support
- Authentication setup
- TLS/SSL configuration
- Test email functionality

### Notifications
- Health check alerts
- Backup status notifications
- System status reports
- Error notifications

## Documentation

For detailed setup instructions, see:
- [docs/EMAIL_SMTP_SETUP.md](../../docs/EMAIL_SMTP_SETUP.md) - SMTP configuration guide
- [docs/EMAIL_NOTIFICATIONS.md](../../docs/EMAIL_NOTIFICATIONS.md) - Notification system overview

## Quick Start

```bash
# Configure SMTP for the first time
./scripts/email/configure-email-smtp.sh

# Fix authentication issues
./scripts/email/fix-sasl-authentication.sh

# Send a test email
python3 ./scripts/email/send-admin-email.py
```

## Requirements

- Python 3 with standard library
- Postfix mail server (for system integration)
- Valid SMTP credentials

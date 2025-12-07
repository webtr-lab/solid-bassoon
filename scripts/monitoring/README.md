# Monitoring & Alert System

Professional automated monitoring and alerting for the Maps Tracker application.

## Quick Start

### Setup (One-time)
```bash
cd /path/to/maps-tracker-app1

# Configure SMTP in .env file
nano .env
# Add: ADMIN_EMAIL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS

# Setup cron jobs
./scripts/setup/setup-monitoring-cron.sh
```

### Available Monitors

| Monitor | Script | Schedule | Purpose |
|---------|--------|----------|---------|
| **System Health** | `system-monitor.sh` | Every 10 min | CPU, memory, disk, Docker, API, database |
| **Backup Status** | `backup-monitor.sh` | Daily 2 AM | Backup integrity, cloud sync, retention |

### Manual Execution
```bash
./scripts/monitoring/system-monitor.sh
./scripts/monitoring/backup-monitor.sh
```

### Check Status
```bash
# View monitor logs
tail -f logs/system-monitor.log
tail -f logs/backup-monitor.log

# Verify cron jobs
crontab -l | grep monitor
```

## Features

- **Professional HTML Emails** - Beautifully formatted reports with color-coded status badges
- **Alert Deduplication** - Prevents spam (15-minute minimum between duplicate alerts)
- **Detailed Logging** - All monitor activities logged to `logs/`
- **Real-time Monitoring** - System health, application status, and client activity
- **Cloud Integration** - Backblaze B2 backup synchronization monitoring
- **Database Monitoring** - Location data activity and metrics
- **Easy Configuration** - All settings in `.env` file

## Configuration

### Required (.env)
```bash
# Email Setup
ADMIN_EMAIL="admin@example.com"
SMTP_HOST="mail.example.com"
SMTP_PORT=465
SMTP_USER="notifications@example.com"
SMTP_PASS="your_smtp_password"

# Database
POSTGRES_USER="postgres"
POSTGRES_DB="maps_tracker"
```

### Optional
```bash
# Cloud Backup Monitoring
B2_ENABLED="true"
B2_BUCKET_NAME="your-bucket"

# Alert Threshold (minutes)
ALERT_THRESHOLD_MINUTES=15
```

## Alert Thresholds

| Metric | Threshold | Action |
|--------|-----------|--------|
| CPU Usage | >80% | Email alert sent |
| Memory Usage | >85% | Email alert sent |
| Disk Usage | >80% | Email alert sent |
| Docker Down | Container not running | Immediate alert |
| DB Down | Connection failed | Immediate alert |
| API Down | HTTP ≠200 | Immediate alert |
| Backup Missing | No backup today | Daily report |

## Troubleshooting

### Emails not sending?
```bash
# Check SMTP configuration
grep SMTP .env

# Test SMTP connection
python3 -c "
import smtplib, os
server = smtplib.SMTP_SSL(os.environ['SMTP_HOST'], 465)
server.login(os.environ['SMTP_USER'], os.environ['SMTP_PASS'])
print('✓ SMTP works')
"

# Check logs for errors
grep -i error logs/system-monitor.log
```

### Cron not running?
```bash
# Verify cron is installed
which crontab

# Check cron jobs
crontab -l

# View cron execution
grep CRON /var/log/syslog | tail -20
```

### Too many duplicate alerts?
```bash
# Increase alert threshold (in script)
sed -i 's/ALERT_THRESHOLD_MINUTES=15/ALERT_THRESHOLD_MINUTES=60/' scripts/monitoring/system-monitor.sh

# Clear alert history
rm -rf logs/.monitor-state/*
```

## Documentation

For complete documentation, see: **[docs/MONITORING_SYSTEM.md](../../docs/MONITORING_SYSTEM.md)**

Includes:
- Detailed monitor descriptions
- Configuration guide
- Email template examples
- Performance metrics
- Security information
- Maintenance procedures
- Integration details

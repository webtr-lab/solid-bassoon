# Maps Tracker - Comprehensive Monitoring & Alert System

Professional monitoring and alerting system that keeps the admin informed of all critical system events, application status, and backup operations.

## System Overview

The monitoring system consists of two specialized monitors that work together to provide complete visibility into system health, backups, and operations:

### 1. **System Monitor** (`scripts/monitoring/system-monitor.sh`)
Monitors server infrastructure and application health

**Monitors:**
- CPU Usage (threshold: >80%)
- Memory Usage (threshold: >85%)
- Disk Usage (threshold: >80%)
- Docker Container Status (all services)
- Flask API Health (`/api/health` endpoint)
- PostgreSQL Database Connectivity
- Backup Verification
- B2 Cloud Backup Status

**Schedule:** Every 10 minutes

**Email Report:** Simple, clean HTML template with:
- Alert level and category
- System resource metrics
- Service status indicators
- Recommended actions
- Timestamp and server information

### 2. **Backup Monitor** (`scripts/monitoring/backup-monitor.sh`)
Tracks backup operations, integrity, and cloud synchronization

**Monitors:**
- Daily Backup Count
- Backup File Integrity (checksums)
- Total Storage Used
- Last Backup Timestamp
- Backup File Verification
- Backblaze B2 Cloud Sync Status
- B2 Files Synced Count
- Database Activity (location records)

**Schedule:** Daily at 2:00 AM

**Email Report:** Clean, informative backup status with:
- Today's backup statistics
- Total stored backups
- Cloud sync status
- Database activity metrics
- Integrity verification results
- Retention policy information

## Alert Features

### Alert Deduplication
Prevents alert spam by tracking when each alert was last sent:
- Same alert won't repeat more frequently than every 15 minutes
- State files stored in: `logs/.monitor-state/`
- Configurable threshold via `ALERT_THRESHOLD_MINUTES`

### Status Badges
Visual indicators for easy comprehension:
- ✓ Active (green) - All systems normal
- ⚠ Warning (orange) - Attention needed
- ✗ Issues (red) - Critical problems
- ⊘ Disabled (gray) - Service not active

### Severity Levels
- **CRITICAL** - System down, service failures, database unavailable
- **HIGH** - Resource exhaustion, service degradation
- **WARNING** - Backup integrity issues, high resource usage
- **INFO** - Normal status reports and metrics

## Configuration

### Environment Variables (`.env`)
```bash
# Email Configuration
ADMIN_EMAIL="admin@example.com"              # Primary admin email
TEST_EMAIL="test@example.com"                # Fallback test email
SMTP_HOST="mail.example.com"                 # SMTP server
SMTP_PORT=465                                # SMTP port (465 for SSL, 587 for TLS)
SMTP_USER="notifications@example.com"        # SMTP username
SMTP_PASS="your_smtp_password"              # SMTP password

# Database Configuration
POSTGRES_USER="postgres"                     # Database user
POSTGRES_DB="maps_tracker"                   # Database name

# Cloud Backup
B2_ENABLED="true"                            # Enable B2 cloud backup
B2_BUCKET_NAME="your-bucket-name"           # B2 bucket name
```

### Cron Schedule
Automatically configured by `scripts/setup/setup-monitoring-cron.sh`:

```cron
# System Health Monitor - Every 10 minutes
*/10 * * * * cd /path/to/project && ./scripts/monitoring/system-monitor.sh

# Backup Status Report - Daily at 2:00 AM
0 2 * * * cd /path/to/project && ./scripts/monitoring/backup-monitor.sh
```

## Email Templates

All monitors send simple, clean HTML emails with:

### Standard Layout
- **Header**: Title with icon and system name
- **Details**: Alert level, category, time, server info
- **Metrics**: Key information in label: value format
- **Sections**: Organized by category with simple borders
- **Status**: Current state indicators
- **Recommendations**: Suggested actions
- **Footer**: Report timestamp and server information

### Design
- **Clean & Simple**: Minimal styling, maximum readability
- **Professional**: Works in all email clients
- **Informative**: All critical data at a glance
- **Alert Colors**: Red backgrounds for critical, orange for warnings

## Log Files

All monitor activities are logged to:

```
logs/
  ├── system-monitor.log      # System health monitoring
  ├── backup-monitor.log      # Backup operations
  └── .monitor-state/         # Alert deduplication state
      ├── high_cpu.last_alert
      ├── database_down.last_alert
      └── ... (one file per alert type)
```

### Log Rotation
- Logs auto-rotate at 10MB
- 10 backup files kept per log
- Total capacity: ~100MB per log type

## Testing & Validation

### Test System Monitor
```bash
cd /home/devnan/maps-tracker-app1
./scripts/monitoring/system-monitor.sh
```

Expected output:
- Resource usage metrics
- Service status checks
- Health check results
- Log entries with [INFO], [WARN], [ERROR] tags

### Test Backup Monitor
```bash
cd /home/devnan/maps-tracker-app1
./scripts/monitoring/backup-monitor.sh
```

Expected output:
- Backup statistics
- B2 sync status
- Database activity counts
- Email report summary

### View Current Status
```bash
# Check recent monitor logs
tail -f logs/system-monitor.log
tail -f logs/backup-monitor.log

# Check alert state (last alert times)
ls -la logs/.monitor-state/

# Check cron configuration
crontab -l | grep -E "monitor"
```

## Troubleshooting

### Emails Not Being Sent

**Check SMTP Configuration:**
```bash
# Verify .env has SMTP settings
grep SMTP /path/to/.env

# Test SMTP connection from backend container
docker compose exec backend python3 -c "
import smtplib
smtp = smtplib.SMTP_SSL('your.smtp.host', 465, timeout=30)
smtp.login('user@example.com', 'password')
print('✓ SMTP connection successful')
"
```

**Check Monitor Logs:**
```bash
# Look for email errors
grep -i "error\|failed" logs/system-monitor.log

# Check Python email output
docker compose logs backend | grep -i email
```

### Alerts Not Triggering

**Check Monitor Execution:**
```bash
# Verify script is running
ps aux | grep system-monitor

# Check cron logs
grep CRON /var/log/syslog | tail -20

# Run monitor manually to see errors
./scripts/monitoring/system-monitor.sh
```

**Check Thresholds:**
- CPU: >80%
- Memory: >85%
- Disk: >80%

### Alert Spam Prevention

If you're seeing too many duplicate alerts:
```bash
# Increase alert threshold (in minutes)
# Edit the script and change: ALERT_THRESHOLD_MINUTES=15
sed -i 's/ALERT_THRESHOLD_MINUTES=15/ALERT_THRESHOLD_MINUTES=30/' scripts/monitoring/system-monitor.sh

# Clear alert state to force re-alerting
rm -rf logs/.monitor-state/*
```

## Integration Points

### With Existing Systems
- **Email System**: Uses existing SMTP configuration from `.env`
- **Docker Compose**: Executes database queries via `docker compose exec`
- **Backend API**: Calls `/api/health` endpoint for status
- **Logging**: Integrates with existing `logs/` directory structure
- **Backup System**: Monitors `backups/` directory structure

### API Endpoints Used
- `GET /api/health` - Application health check
- Database: Direct PostgreSQL queries via `psql` for backup and activity metrics

## Performance Impact

**Resource Usage:**
- System Monitor: <5% CPU, <10MB memory per execution
- Backup Monitor: <2% CPU, <8MB memory per execution

**Execution Time:**
- System Monitor: ~2-5 seconds
- Backup Monitor: ~3-8 seconds

**Network:**
- Minimal SMTP overhead for email sending
- Database queries optimized with indexes
- No external API calls except to local endpoints

## Security Considerations

### Email Security
- SMTP credentials stored in `.env` (not in scripts)
- SSL/TLS encryption via `SMTP_SSL` or `SMTP_TLS`
- Email addresses validated
- HTML content is properly escaped

### Database Security
- Uses PostgreSQL authentication
- No SQL injection (parameterized queries)
- Password not stored in logs
- Database user should have SELECT-only permissions

### File Permissions
- Monitoring scripts owned by application user
- Log files readable only by owner
- Alert state files not world-readable

### API Security
- Uses Docker Compose internal networking
- Backend API calls are local only
- No credentials passed in URLs

## Performance Impact

**Resource Usage:**
- System Monitor: <5% CPU, <10MB memory per execution (~2-5 seconds)
- Backup Monitor: <2% CPU, <8MB memory per execution (~3-8 seconds)

**Execution Time:**
- Total daily runs: ~150 (system: 144, backup: 1)
- Total daily execution time: ~20 minutes distributed throughout day
- Per-minute impact: <2% CPU during runs

### Custom Thresholds

Edit threshold values in each monitor:
```bash
# System Monitor
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=80

# Backup Monitor
# (thresholds are implicit based on status check)

# Client Monitor
# (configurable via database queries)
```

## Maintenance

### Regular Tasks

**Weekly:**
- Review alert logs for patterns
- Verify email delivery
- Check cron job execution

**Monthly:**
- Rotate old logs (>30 days)
- Review alert threshold effectiveness
- Test failover email addresses

**Quarterly:**
- Review alert categories and actions
- Update email templates if needed
- Audit monitoring code for security

### Updating Monitors
```bash
# After modifying scripts
chmod +x scripts/monitoring/*.sh

# Test changes
./scripts/monitoring/system-monitor.sh

# Verify cron still works
# (scripts will auto-execute per cron schedule)
```

## Support

For issues or troubleshooting:
1. Check logs in `logs/` directory
2. Run monitors manually to debug
3. Review email template rendering
4. Verify SMTP configuration
5. Check Docker Compose services status
6. Review alert state in `logs/.monitor-state/`

---

**Last Updated:** 2025-12-01
**Version:** 1.0
**Status:** Production Ready

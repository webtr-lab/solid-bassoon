# Health Check & Status Report System

Automated health monitoring and daily status reporting for the GPS Tracker Application.

## Overview

The monitoring system provides two complementary tools:

### 1. Health Check (health-check.sh)
Basic health monitoring that checks:
- **Docker Services**: backend, frontend, mobile, nominatim, database
- **API Endpoints**: Backend API, Frontend, Mobile interface, Nominatim
- **Database Connectivity**: PostgreSQL connection test
- **System Resources**: Disk usage, volume sizes, log file sizes

### 2. Application Status Report (app-status-report.sh) 🆕
Comprehensive daily status report with email notifications that includes:
- All health check items above
- **Database Statistics**: Vehicle count, user count, total locations, places of interest
- **Activity Monitoring**: GPS updates in last 24 hours, last update timestamp
- **Error Analysis**: Error count from logs with samples
- **Backup Status**: Backup count, latest backup date and size
- **Email Notifications**: Automatic reports to info@praxisnetworking.com

## Files

### Health Check
- `health-check.sh` - Basic health check script (no email)
- `setup-health-check-cron.sh` - Cron setup for health checks
- `logs/health-check.log` - Health check results (auto-rotates at 10MB)

### Status Report 🆕
- `app-status-report.sh` - Comprehensive status report with email
- `setup-status-report-cron.sh` - Interactive cron setup for daily reports
- `logs/status-report.log` - Status report execution log

## Quick Start

### Health Check (Basic Monitoring)

#### 1. Run Health Check Manually

```bash
./health-check.sh
```

This will check all services and output results to both console and `logs/health-check.log`.

#### 2. Setup Daily Automated Checks

```bash
./setup-health-check-cron.sh
```

This configures a cron job to run the health check daily at 2:00 AM.

#### 3. View Health Check Logs

```bash
# View entire log
cat logs/health-check.log

# View recent checks
tail -n 50 logs/health-check.log

# Monitor in real-time
tail -f logs/health-check.log

# View only failed checks
grep "✗" logs/health-check.log

# View summary lines
grep "Overall Status" logs/health-check.log
```

### Application Status Report (Email Notifications) 🆕

#### 1. Run Status Report Manually

```bash
# Run with email notification
./app-status-report.sh

# Run without email (test mode)
./app-status-report.sh --no-email
```

The report includes comprehensive statistics and is sent to **demo@praxisnetworking.com**.

#### 2. Setup Daily Automated Reports

```bash
./setup-status-report-cron.sh
```

Interactive setup with schedule options:
- Daily at 8:00 AM (recommended)
- Daily at 9:00 AM
- Daily at 6:00 AM
- Daily at 12:00 PM
- Twice daily (8:00 AM and 8:00 PM)
- Custom schedule

#### 3. Install Mail Utilities (Required for Email)

```bash
sudo apt-get update
sudo apt-get install mailutils
```

During installation, select "Internet Site" and configure with your domain.

#### 4. Test Email Functionality

```bash
# Send test email
echo "Test message" | mail -s "Test Subject" info@praxisnetworking.com

# Run status report without email first
./app-status-report.sh --no-email

# Then run with email
./app-status-report.sh
```

#### 5. View Status Report Logs

```bash
# View execution log
tail -f logs/status-report.log

# Check if emails were sent
grep "Email notification" logs/status-report.log

# View mail system logs
tail -f /var/log/mail.log
```

## Health Check Output

### Status Indicators

- `✓` - Service is healthy
- `⚠` - Warning (degraded performance)
- `✗` - Service is down or failing

### Sample Output

```
[2025-10-30 02:00:01] ========== Health Check Started ==========
[2025-10-30 02:00:01] Checking Docker services...
[2025-10-30 02:00:01] ✓ backend: RUNNING
[2025-10-30 02:00:01] ✓ frontend: RUNNING
[2025-10-30 02:00:01] ✓ mobile: RUNNING
[2025-10-30 02:00:01] ✓ nominatim: RUNNING
[2025-10-30 02:00:01] ✓ db: RUNNING
[2025-10-30 02:00:02] Checking Backend API...
[2025-10-30 02:00:02] ✓ Backend API: RESPONSIVE (HTTP 401)
[2025-10-30 02:00:03] Checking Frontend...
[2025-10-30 02:00:03] ✓ Frontend: RESPONSIVE (HTTP 200)
[2025-10-30 02:00:04] Checking Mobile Interface...
[2025-10-30 02:00:04] ✓ Mobile Interface: RESPONSIVE (HTTP 200)
[2025-10-30 02:00:05] Checking Nominatim Service...
[2025-10-30 02:00:05] ✓ Nominatim: RESPONSIVE (HTTP 200)
[2025-10-30 02:00:06] Checking Database connectivity...
[2025-10-30 02:00:06] ✓ Database: CONNECTED
[2025-10-30 02:00:06] Checking Disk Usage...
[2025-10-30 02:00:06] ✓ Disk Usage: 45% (OK)
[2025-10-30 02:00:06] Checking Docker Volume Usage...
[2025-10-30 02:00:06]   - effective-guide_postgres_data: 250MB
[2025-10-30 02:00:06]   - effective-guide_nominatim_data: 350MB
[2025-10-30 02:00:06] Checking Log File Sizes...
[2025-10-30 02:00:06]   - app.log: 2.3M
[2025-10-30 02:00:06]   - error.log: 45K
[2025-10-30 02:00:06]   - access.log: 1.8M
[2025-10-30 02:00:06] ---------- Summary ----------
[2025-10-30 02:00:06] Overall Status: ✓ ALL SYSTEMS OPERATIONAL (6/6)
[2025-10-30 02:00:06] ========== Health Check Completed ==========
```

## Status Report Email Format 🆕

The daily status report email includes comprehensive information:

```
Subject: [GPS Tracker Status] ✓ All Systems Operational

✅ GPS Tracker Application Status Report
================================================

Report Time: 2025-10-31 08:00:00
Server: gps-tracker-server
Overall Status: OPERATIONAL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

DOCKER SERVICES
  backend: ✓ RUNNING
  frontend: ✓ RUNNING
  mobile: ✓ RUNNING
  nominatim: ✓ RUNNING
  db: ✓ RUNNING

ENDPOINTS
  Backend API: ✓ RESPONSIVE (HTTP 401)
  Frontend: ✓ RESPONSIVE
  Mobile Interface: ✓ RESPONSIVE
  Nominatim: ✓ RESPONSIVE

DATABASE & STATISTICS
  Status: ✓ CONNECTED
  Vehicles: 5 | Users: 3 | Places: 12
  Total Locations: 15,432 | Updates (24h): 287
  Last Update: 2025-10-31T07:45:23

STORAGE
  Disk Usage: ✓ 45% used (50G available)
  Backups: 10 backups | Latest: 2025-10-31 02:00 (15M)
  Log Files: app.log: 2.3M | error.log: 45K | access.log: 1.8M

ERROR MONITORING
  ✓ No errors in last 24 hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ All systems operating normally
✓ No issues or warnings detected

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

LOG FILES
  Status Report: /home/demo/effective-guide/logs/status-report.log
  Application: /home/demo/effective-guide/logs/app.log
  Errors: /home/demo/effective-guide/logs/error.log

QUICK COMMANDS
  View recent errors: tail -50 /home/demo/effective-guide/logs/error.log
  Check services: docker compose ps
  View app logs: tail -100 /home/demo/effective-guide/logs/app.log
```

### Status Levels

The email subject and content change based on system health:

- **✅ OPERATIONAL**: All systems working normally
- **⚠️ DEGRADED**: Some non-critical issues (warnings present)
- **❌ CRITICAL**: Critical services down or major issues

## Exit Codes

Both scripts return different exit codes based on overall health:

- `0` - All systems operational
- `1` - Degraded (some issues, but operational)
- `2` - Critical (major failures)

This allows integration with monitoring systems or alerting tools.

## Customization

### Change Check Schedule

Edit the cron job timing:

```bash
crontab -e
```

Cron format: `minute hour day month weekday command`

Examples:
- `0 */6 * * *` - Every 6 hours
- `0 2,14 * * *` - At 2 AM and 2 PM daily
- `*/30 * * * *` - Every 30 minutes

### Configure Status Report Email 🆕

Edit `app-status-report.sh` to customize email settings:

```bash
# Email configuration
EMAIL_ENABLED=true                    # Set to false to disable emails
EMAIL_RECIPIENT="info@praxisnetworking.com"  # Change recipient
EMAIL_SUBJECT_PREFIX="[GPS Tracker Status]"   # Customize subject prefix
```

You can also configure multiple recipients:

```bash
EMAIL_RECIPIENT="info@praxisnetworking.com,admin@example.com"
```

### Modify Checks

Edit `health-check.sh` or `app-status-report.sh` to:
- Add custom service checks
- Adjust thresholds (disk usage, log sizes, error counts)
- Modify warning/critical levels
- Add custom statistics

### Integration with Monitoring

```bash
# Check status and send alert if critical
./health-check.sh
if [ $? -eq 2 ]; then
    # Send alert via your preferred method
    echo "Critical system failure!" | mail -s "GPS Tracker Alert" admin@example.com
fi
```

## Troubleshooting

### Cron Job Not Running

```bash
# Check if cron service is running
systemctl status cron  # or 'crond' on some systems

# View cron logs
grep CRON /var/log/syslog  # Ubuntu/Debian
grep CRON /var/log/cron    # CentOS/RHEL

# Verify cron job exists
crontab -l | grep health-check
```

### Permission Issues

```bash
# Ensure scripts are executable
chmod +x health-check.sh setup-health-check-cron.sh

# Ensure logs directory is writable
mkdir -p logs
chmod 755 logs
```

### Docker Command Fails

The script requires Docker access. Ensure your user is in the docker group:

```bash
sudo usermod -aG docker $USER
# Log out and back in for changes to take effect
```

### Email Notifications Not Working 🆕

**Issue**: Status report emails are not being sent

**Solutions**:

1. **Install mail utilities**:
   ```bash
   sudo apt-get update
   sudo apt-get install mailutils
   ```

2. **Configure mail system**:
   ```bash
   sudo dpkg-reconfigure postfix
   # Select "Internet Site"
   # Enter your system mail name (e.g., yourdomain.com)
   ```

3. **Test mail command**:
   ```bash
   echo "Test email body" | mail -s "Test Subject" info@praxisnetworking.com
   ```

4. **Check mail logs**:
   ```bash
   tail -f /var/log/mail.log
   grep "info@praxisnetworking.com" /var/log/mail.log
   ```

5. **Check status report logs**:
   ```bash
   grep "Email notification" logs/status-report.log
   ```

6. **Verify email configuration**:
   ```bash
   # Check mail system status
   systemctl status postfix

   # Check mail queue
   mailq

   # View mail configuration
   postconf | grep relayhost
   ```

7. **Use external SMTP (if needed)**:
   If you need to relay through an external SMTP server:
   ```bash
   sudo apt-get install libsasl2-modules
   # Configure /etc/postfix/main.cf with your SMTP settings
   ```

8. **Disable emails temporarily**:
   ```bash
   # Run report without email
   ./app-status-report.sh --no-email

   # Or edit the script
   # Change: EMAIL_ENABLED=true
   # To:     EMAIL_ENABLED=false
   ```

## Log Rotation

The health check log automatically rotates when it exceeds 10MB. Rotated logs are timestamped:

```
logs/health-check.log                    # Current log
logs/health-check.log.20251030-020001   # Rotated log
```

To adjust rotation settings, modify the `MAX_LOG_SIZE` variable in `health-check.sh`.

## Monitoring Best Practices

### For Health Checks
1. **Regular Review**: Check logs weekly for patterns or recurring issues
2. **Frequent Monitoring**: Run health checks every few hours for real-time monitoring
3. **Combine with Backups**: Run health checks before/after backup operations
4. **Test Recovery**: Periodically test system recovery using health check results

### For Status Reports 🆕
1. **Daily Reports**: Schedule daily status reports (recommended at 8:00 AM)
2. **Review Trends**: Track statistics over time (vehicle count, GPS updates, error rates)
3. **Act on Warnings**: Address warnings before they become critical issues
4. **Monitor Activity**: Watch for sudden drops in GPS updates (may indicate device issues)
5. **Backup Monitoring**: Ensure backups are running regularly (check backup timestamps)
6. **Error Analysis**: Review error samples in reports to identify recurring problems
7. **Disk Space**: Keep disk usage below 80% to prevent issues
8. **Email Filtering**: Set up email filters/rules to organize daily reports

### Recommended Setup
- **Status Reports**: Daily at 8:00 AM (comprehensive email report)
- **Health Checks**: Every 6 hours (quick logging, no email)
- **Backup Checks**: After each backup completion

This combination provides:
- Daily morning overview via email
- Continuous monitoring throughout the day
- Immediate notification of backup success/failure

## Related Documentation

- [LOGGING.md](./LOGGING.md) - Application logging system
- [REMOTE_BACKUP.md](./REMOTE_BACKUP.md) - Backup and restore procedures
- [CLAUDE.md](./CLAUDE.md) - Project architecture and development guide

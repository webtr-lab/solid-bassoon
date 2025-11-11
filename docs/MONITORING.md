# Monitoring & Health Checks

**Status**: ✅ Production Ready

## Overview

The Maps Tracker includes comprehensive monitoring with two complementary systems:

### Health Check (health-check.sh)
- Basic service and system monitoring
- Email notifications for critical/degraded status
- Quick, frequent checks

### Status Report (app-status-report.sh)
- Comprehensive daily reports with email
- Database statistics and activity tracking
- Backup status and error analysis

---

## Services Monitored

### Docker Services
- **backend** - Flask API server
- **frontend** - React UI
- **mobile** - GPS submission interface
- **db** - PostgreSQL database
- **nominatim** - Geocoding service

### System Checks
- **API Endpoints**: Backend, Frontend, Mobile, Nominatim
- **Database**: Connection and query execution
- **Disk Usage**: Root filesystem capacity
- **Docker Volumes**: nominatim-db, postgres-data
- **Log Files**: Health check, app, error, access, backup logs

### Database Statistics (Status Report Only)
- User count
- Vehicle count
- Total locations
- Places of interest
- GPS updates in last 24 hours

### Activity Analysis (Status Report Only)
- Error count from logs
- Backup status (count, size, age)
- Data collection rate (GPS updates)

---

## Quick Start

### Manual Health Check
```bash
./scripts/monitoring/health-check.sh
```

### Manual Status Report
```bash
./scripts/monitoring/app-status-report.sh
```

### Without Email Notification
```bash
./scripts/monitoring/app-status-report.sh --no-email
```

---

## Cron Setup

### Health Check Cron
```bash
./scripts/setup/setup-health-check-cron.sh
```
**Recommended**: Every 5 minutes or hourly

**Example Output**:
```
✓ backend: RUNNING
✓ Backend API: RESPONSIVE
✓ Database: CONNECTED
✓ Disk Usage: 8% (OK)
Overall Status: OPERATIONAL
```

### Status Report Cron
```bash
./scripts/setup/setup-status-report-cron.sh
```
**Recommended**: Daily at 8 AM

**Email Contents**:
- Service status (all Docker services)
- API availability
- Database statistics
- Activity metrics (GPS updates, errors)
- Backup summary
- System resource usage

---

## Configuration

### .env Settings
```bash
# Email for notifications
BACKUP_EMAIL=demo@praxisnetworking.com
BACKUP_EMAIL_ENABLED=true
```

### Script Locations
- Health check: `scripts/monitoring/health-check.sh`
- Status report: `scripts/monitoring/app-status-report.sh`
- Setup scripts: `scripts/setup/setup-*-cron.sh`

### Log Files
- Health check: `logs/health-check.log`
- Status report: `logs/status-report.log`
- Cron executions: `logs/*-cron.log`

---

## Email Notifications

### Health Check Emails
**Trigger**: Critical or Degraded status only
**Subject**: `[Maps Tracker Health Check] CRITICAL - System Health Alert`

Content includes:
- Status (CRITICAL/DEGRADED/OK)
- Timestamp
- Server hostname
- Issue details
- Log file location

### Status Report Emails
**Trigger**: Every execution (unless --no-email flag)
**Subject**: `[Maps Tracker Status] Daily Application Status Report`

Content includes:
- Overall status
- All service checks
- Database statistics
- Error summary
- Backup audit
- Resource usage

---

## Exit Codes

### health-check.sh
- **0**: All systems healthy
- **1**: Degraded (4-5/6 checks passed)
- **2**: Critical (3 or fewer checks passed)

### app-status-report.sh
- **0**: Report completed successfully
- **1**: Report completed with warnings
- **2**: Report completed with critical issues

---

## Troubleshooting

### Email Not Received
1. Verify mailutils: `which mail`
2. Check .env: `grep BACKUP_EMAIL .env`
3. Verify enabled: `grep BACKUP_EMAIL_ENABLED .env`
4. Test manually: `echo "test" | mail -s "test" demo@praxisnetworking.com`

### Service Checks Failing
1. Check Docker: `docker ps`
2. Check ports: `netstat -an | grep LISTEN`
3. View logs: `docker compose logs backend`
4. Test API: `curl http://localhost:5000/api/auth/check`

### Path Issues
Scripts auto-detect paths using:
```bash
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
```

---

## Production Recommendations

### Monitoring Schedule
```bash
# Frequent monitoring (every 5 minutes)
*/5 * * * * ./scripts/monitoring/health-check.sh >> logs/health-check.log 2>&1

# Daily comprehensive report (8 AM)
0 8 * * * cd /home/devnan/effective-guide && ./scripts/monitoring/app-status-report.sh >> logs/status-report.log 2>&1
```

### Alert Escalation
1. Health check alerts → Immediate attention (critical systems)
2. Status report email → Daily awareness
3. Consider adding to alerting system (Slack, PagerDuty, etc.)

### Best Practices
- ✅ Check logs daily
- ✅ Subscribe to email notifications
- ✅ Test alerts regularly
- ✅ Document any issues found
- ✅ Keep monitoring running continuously

---

## Performance

Typical execution times:
- Health check: ~4 seconds
- Status report: ~4 seconds
- Email delivery: 0-2 seconds

---

## Related Documentation
- [PRODUCTION_READINESS_REPORT.md](PRODUCTION_READINESS_REPORT.md) - Testing results
- [DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md) - Troubleshooting guide
- [LOGGING.md](LOGGING.md) - Log file information

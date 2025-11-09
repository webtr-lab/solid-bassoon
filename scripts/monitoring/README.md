# Monitoring Scripts

Scripts for monitoring system health and generating status reports.

## Scripts

- **health-check.sh** - Comprehensive health check for all application services
- **app-status-report.sh** - Generate detailed status reports

## Features

### Health Check
- Database connectivity and performance
- Backend API availability
- Frontend accessibility
- Nominatim geocoding service
- Disk space monitoring
- Docker container status

### Status Reports
- Service uptime and availability
- Resource utilization
- Recent GPS updates
- Error log analysis
- Backup status

## Documentation

See [docs/HEALTH_CHECK.md](../../docs/HEALTH_CHECK.md) for detailed configuration and usage.

## Quick Start

```bash
# Run health check
./scripts/monitoring/health-check.sh

# Generate status report
./scripts/monitoring/app-status-report.sh
```

## Automated Monitoring

Set up automated health checks with the setup script:

```bash
./scripts/setup/setup-health-check-cron.sh
./scripts/setup/setup-status-report-cron.sh
```

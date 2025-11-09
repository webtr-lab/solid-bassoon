# Setup Scripts

Scripts for configuring automated tasks and system components.

## Scripts

### Cron Job Setup

- **setup-health-check-cron.sh** - Schedule automated health checks
- **setup-status-report-cron.sh** - Schedule status report generation
- **setup-rsync-cron.sh** - Schedule remote backup synchronization
- **setup-monthly-test-cron.sh** - Schedule monthly backup restore tests

### Service Setup

- **setup-nominatim.sh** - Initialize Nominatim geocoding service

## Usage

Each setup script configures a specific automated task or service component. Run these scripts once during initial deployment or when reconfiguring.

```bash
# Setup health monitoring
./scripts/setup/setup-health-check-cron.sh

# Setup backup automation
./scripts/setup/setup-rsync-cron.sh
./scripts/setup/setup-monthly-test-cron.sh

# Setup Nominatim geocoding
./scripts/setup/setup-nominatim.sh
```

## Cron Schedule Defaults

- **Health checks**: Every 5 minutes
- **Status reports**: Daily at 8:00 AM
- **Remote backups**: Daily at 2:00 AM
- **Monthly restore tests**: 1st of each month at 3:00 AM

## Customization

Edit the cron schedules directly after setup:

```bash
crontab -e
```

## Documentation

See the respective feature documentation in the [docs/](../../docs/) directory for detailed information about each component.

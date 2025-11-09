# Scripts

This directory contains all operational scripts for the GPS tracking application.

## Directory Structure

- **backup/** - Backup and restore scripts
- **monitoring/** - Health checks and status reporting
- **email/** - Email configuration and notification scripts
- **setup/** - Setup and cron job configuration scripts

## Usage

All scripts should be run from the project root directory to ensure correct path resolution:

```bash
# Example: Run from project root
./scripts/backup/backup-manager.sh
./scripts/monitoring/health-check.sh
```

## Permissions

Scripts are marked as executable. If you need to make a script executable:

```bash
chmod +x scripts/path/to/script.sh
```

#!/bin/bash
#
# System-Level Monitoring Cron Jobs Setup
# Configures cron jobs for system monitoring and health checks
#
# Jobs created:
# - 3:30 AM: Backup disk usage monitoring
# - 4:00 AM: System health check
#

set -e

BASE_DIR="/home/devnan/effective-guide"
MONITOR_SCRIPT="${BASE_DIR}/scripts/monitoring/backup-disk-monitor.sh"
HEALTH_CHECK_SCRIPT="${BASE_DIR}/scripts/monitoring/health-check.sh"
CRON_LOG="${BASE_DIR}/logs/cron.log"

echo "=================================================="
echo "Setting Up System-Level Monitoring Cron Jobs"
echo "=================================================="
echo ""

# Step 1: Verify scripts exist
if [ ! -x "${MONITOR_SCRIPT}" ]; then
    echo "ERROR: Monitoring script not executable: ${MONITOR_SCRIPT}"
    exit 1
fi

if [ ! -x "${HEALTH_CHECK_SCRIPT}" ]; then
    echo "ERROR: Health check script not executable: ${HEALTH_CHECK_SCRIPT}"
    exit 1
fi

echo "✓ Monitoring scripts verified"
echo "✓ Health check script verified"
echo ""

# Step 2: Create log directory
mkdir -p "$(dirname "${CRON_LOG}")"
echo "✓ Cron log directory ready: ${CRON_LOG}"
echo ""

# Step 3: Get current crontab
CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")

# Step 4: Build new crontab with monitoring jobs
NEW_CRON="${CURRENT_CRON}"

# Add disk monitoring job if not exists
if ! echo "${CURRENT_CRON}" | grep -q "backup-disk-monitor"; then
    NEW_CRON="${NEW_CRON}
# Backup disk monitoring: Check backup directory size and growth
30 3 * * * ${MONITOR_SCRIPT} >> ${CRON_LOG} 2>&1"
    echo "✓ Added: Disk monitoring job (3:30 AM daily)"
fi

# Add health check job if not exists
if ! echo "${CURRENT_CRON}" | grep -q "health-check.sh"; then
    NEW_CRON="${NEW_CRON}
# System health check: Check all services and disk usage
0 4 * * * ${HEALTH_CHECK_SCRIPT} >> ${CRON_LOG} 2>&1"
    echo "✓ Added: Health check job (4:00 AM daily)"
fi

echo ""
echo "Step 4: Installing cron jobs..."

# Install new crontab
echo "${NEW_CRON}" | crontab -
echo "✓ Cron jobs installed"
echo ""

# Step 5: Verify installation
echo "=================================================="
echo "Cron Jobs Summary"
echo "=================================================="
echo ""
crontab -l | grep -E "monitor|health" | nl
echo ""

echo "Schedule:"
echo "  3:30 AM - Backup disk usage monitoring"
echo "  4:00 AM - System health check"
echo ""
echo "Log file: ${CRON_LOG}"
echo ""
echo "=================================================="

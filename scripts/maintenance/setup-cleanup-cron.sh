#!/bin/bash
#
# Setup Data Retention Cleanup Cron Job
# Runs cleanup daily at 3 AM
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLEANUP_SCRIPT="$SCRIPT_DIR/cleanup-old-data.sh"

# Cron job: Daily at 3 AM
CRON_SCHEDULE="0 3 * * *"
CRON_COMMAND="$CLEANUP_SCRIPT >> /var/log/data-retention-cleanup.log 2>&1"
CRON_JOB="$CRON_SCHEDULE $CRON_COMMAND"

echo "Setting up data retention cleanup cron job..."
echo "Schedule: Daily at 3 AM"
echo "Script: $CLEANUP_SCRIPT"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -F "$CLEANUP_SCRIPT" > /dev/null; then
    echo "Cron job already exists. Removing old entry..."
    crontab -l | grep -v "$CLEANUP_SCRIPT" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "✓ Cron job added successfully"
echo ""
echo "Current crontab:"
crontab -l | grep "$CLEANUP_SCRIPT"
echo ""
echo "Log file: /var/log/data-retention-cleanup.log"
echo ""
echo "To run manually: $CLEANUP_SCRIPT"
echo "To run dry-run:  $CLEANUP_SCRIPT --dry-run"

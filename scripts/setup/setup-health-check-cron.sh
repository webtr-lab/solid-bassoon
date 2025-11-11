#!/bin/bash

# Setup script for daily health check cron job

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
HEALTH_CHECK_SCRIPT="$BASE_DIR/scripts/monitoring/health-check.sh"

echo "Setting up daily health check cron job..."

# Check if health-check.sh exists and is executable
if [ ! -f "$HEALTH_CHECK_SCRIPT" ]; then
    echo "Error: health-check.sh not found at $HEALTH_CHECK_SCRIPT"
    exit 1
fi

if [ ! -x "$HEALTH_CHECK_SCRIPT" ]; then
    echo "Making health-check.sh executable..."
    chmod +x "$HEALTH_CHECK_SCRIPT"
fi

# Create cron job entry
CRON_JOB="0 2 * * * cd $BASE_DIR && $HEALTH_CHECK_SCRIPT >> $BASE_DIR/logs/cron.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "$HEALTH_CHECK_SCRIPT"; then
    echo "Cron job already exists. Updating..."
    # Remove old entry and add new one
    (crontab -l 2>/dev/null | grep -v "$HEALTH_CHECK_SCRIPT"; echo "$CRON_JOB") | crontab -
else
    echo "Adding new cron job..."
    # Add new cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
fi

echo ""
echo "✓ Cron job configured successfully!"
echo ""
echo "Schedule: Daily at 2:00 AM"
echo "Script: $HEALTH_CHECK_SCRIPT"
echo "Logs: $BASE_DIR/logs/health-check.log"
echo ""
echo "Current crontab:"
crontab -l | grep health-check.sh
echo ""
echo "To run the health check manually:"
echo "  $HEALTH_CHECK_SCRIPT"
echo ""
echo "To view the health check log:"
echo "  tail -f $BASE_DIR/logs/health-check.log"
echo ""
echo "To remove the cron job:"
echo "  crontab -e  # then delete the health-check.sh line"

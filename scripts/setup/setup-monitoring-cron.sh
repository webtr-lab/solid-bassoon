#!/bin/bash
#
# Setup Monitoring & Alert Cron Jobs
# Configures automated scheduling for:
# - System health monitoring
# - Backup status reporting
# - Client activity tracking
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
MONITORING_DIR="${PROJECT_DIR}/scripts/monitoring"

echo "🔧 Setting up Monitoring & Alert Cron Jobs..."
echo "=================================================="

# Define cron jobs
SYSTEM_MONITOR_CRON="*/10 * * * * cd $PROJECT_DIR && $MONITORING_DIR/system-monitor.sh >> /dev/null 2>&1"
BACKUP_MONITOR_CRON="0 2 * * * cd $PROJECT_DIR && $MONITORING_DIR/backup-monitor.sh >> /dev/null 2>&1"
CLIENT_MONITOR_CRON="*/30 * * * * cd $PROJECT_DIR && $MONITORING_DIR/client-monitor.sh >> /dev/null 2>&1"

echo ""
echo "📋 Monitoring Schedule:"
echo "  - System Health Monitor: Every 10 minutes"
echo "  - Backup Status Report: Daily at 2:00 AM"
echo "  - Client Activity Report: Every 30 minutes"
echo ""

# Check if cron jobs already exist
EXISTING_CRONS=$(crontab -l 2>/dev/null || true)

# Function to check if cron job exists
cron_exists() {
    local cron_cmd=$1
    echo "$EXISTING_CRONS" | grep -F "$cron_cmd" >/dev/null 2>&1
    return $?
}

# Create temporary crontab file
TEMP_CRONTAB=$(mktemp)
echo "$EXISTING_CRONS" > "$TEMP_CRONTAB"

# Add monitoring crons if they don't exist
if ! cron_exists "system-monitor.sh"; then
    echo "$SYSTEM_MONITOR_CRON" >> "$TEMP_CRONTAB"
    echo "✓ Added: System Monitor (every 10 minutes)"
else
    echo "✓ System Monitor already scheduled"
fi

if ! cron_exists "backup-monitor.sh"; then
    echo "$BACKUP_MONITOR_CRON" >> "$TEMP_CRONTAB"
    echo "✓ Added: Backup Monitor (daily at 2:00 AM)"
else
    echo "✓ Backup Monitor already scheduled"
fi

if ! cron_exists "client-monitor.sh"; then
    echo "$CLIENT_MONITOR_CRON" >> "$TEMP_CRONTAB"
    echo "✓ Added: Client Activity Monitor (every 30 minutes)"
else
    echo "✓ Client Activity Monitor already scheduled"
fi

# Install the updated crontab
crontab "$TEMP_CRONTAB"
rm "$TEMP_CRONTAB"

echo ""
echo "✅ Cron jobs configured successfully!"
echo ""
echo "📊 Current Monitoring Setup:"
crontab -l | grep -E "(system-monitor|backup-monitor|client-monitor)" || echo "No monitoring crons found"
echo ""
echo "📂 Monitoring Logs Location:"
echo "  - System Monitor: ${PROJECT_DIR}/logs/system-monitor.log"
echo "  - Backup Monitor: ${PROJECT_DIR}/logs/backup-monitor.log"
echo "  - Client Monitor: ${PROJECT_DIR}/logs/client-monitor.log"
echo "  - Alert State: ${PROJECT_DIR}/logs/.monitor-state/"
echo ""
echo "📧 Email Configuration:"
echo "  - Reports sent to: \$ADMIN_EMAIL or \$TEST_EMAIL from .env"
echo "  - SMTP settings required in .env file"
echo ""
echo "🔔 Alert Threshold:"
echo "  - Same alert won't repeat more than every 15 minutes"
echo "  - Alert deduplication prevents spam"
echo ""
echo "=================================================="
echo "✨ Monitoring system is now active!"
echo ""

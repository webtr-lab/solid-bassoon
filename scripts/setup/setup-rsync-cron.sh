#!/bin/bash
#
# Setup Cron Job for Rsync Remote Backup
# This script configures automatic remote backups via cron
#
# Usage: ./setup-rsync-cron.sh
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_error() {
    echo -e "${RED}ERROR: $@${NC}" >&2
}

log_info() {
    echo -e "${GREEN}INFO: $@${NC}"
}

log_warn() {
    echo -e "${YELLOW}WARN: $@${NC}"
}

# Configuration
SCRIPT_DIR="/home/demo/effective-guide"
BACKUP_SCRIPT="${SCRIPT_DIR}/rsync-backup-remote.sh"
CRON_USER="demo"

# Check if backup script exists
if [ ! -f "${BACKUP_SCRIPT}" ]; then
    log_error "Backup script not found: ${BACKUP_SCRIPT}"
    exit 1
fi

# Make sure script is executable
chmod +x "${BACKUP_SCRIPT}"

log_info "Setting up cron job for automatic remote backups"
log_info ""

# Show schedule options
cat << EOF
Select backup schedule:

1) Every 6 hours (recommended for active systems)
2) Every 12 hours
3) Daily at 3 AM (recommended for most systems)
4) Daily at 11 PM
5) Twice daily (3 AM and 3 PM)
6) Custom schedule

EOF

read -p "Enter your choice [1-6]: " schedule_choice

case ${schedule_choice} in
    1)
        CRON_SCHEDULE="0 */6 * * *"
        DESCRIPTION="Every 6 hours"
        ;;
    2)
        CRON_SCHEDULE="0 */12 * * *"
        DESCRIPTION="Every 12 hours"
        ;;
    3)
        CRON_SCHEDULE="0 3 * * *"
        DESCRIPTION="Daily at 3 AM"
        ;;
    4)
        CRON_SCHEDULE="0 23 * * *"
        DESCRIPTION="Daily at 11 PM"
        ;;
    5)
        CRON_SCHEDULE="0 3,15 * * *"
        DESCRIPTION="Twice daily (3 AM and 3 PM)"
        ;;
    6)
        echo ""
        log_info "Cron format: minute hour day month weekday"
        log_info "Examples:"
        log_info "  0 */4 * * *   - Every 4 hours"
        log_info "  30 2 * * *    - Daily at 2:30 AM"
        log_info "  0 0 * * 0     - Weekly on Sunday at midnight"
        echo ""
        read -p "Enter custom cron schedule: " CRON_SCHEDULE
        DESCRIPTION="Custom: ${CRON_SCHEDULE}"
        ;;
    *)
        log_error "Invalid choice"
        exit 1
        ;;
esac

# Create cron job entry
CRON_ENTRY="${CRON_SCHEDULE} ${BACKUP_SCRIPT} >> ${SCRIPT_DIR}/logs/rsync-backup.log 2>&1"

log_info ""
log_info "Creating cron job with schedule: ${DESCRIPTION}"
log_info "Cron entry: ${CRON_ENTRY}"
log_info ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "${BACKUP_SCRIPT}"; then
    log_warn "A cron job for this backup script already exists"
    read -p "Do you want to replace it? [y/N]: " replace
    if [[ ! $replace =~ ^[Yy]$ ]]; then
        log_info "Keeping existing cron job"
        exit 0
    fi
    # Remove existing entry
    crontab -l 2>/dev/null | grep -v "${BACKUP_SCRIPT}" | crontab -
    log_info "Removed existing cron job"
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "# Automatic remote backup to 192.168.100.74"; echo "${CRON_ENTRY}") | crontab -

log_info ""
log_info "=========================================="
log_info "Cron job successfully created!"
log_info "=========================================="
log_info "Schedule: ${DESCRIPTION}"
log_info "Script: ${BACKUP_SCRIPT}"
log_info "Log file: ${SCRIPT_DIR}/logs/rsync-backup.log"
log_info ""
log_info "Current crontab entries:"
crontab -l | grep -A1 "remote backup" || true
log_info "=========================================="
log_info ""
log_info "Useful commands:"
log_info "  View cron jobs:        crontab -l"
log_info "  Edit cron jobs:        crontab -e"
log_info "  Remove cron jobs:      crontab -r"
log_info "  View backup log:       tail -f ${SCRIPT_DIR}/logs/rsync-backup.log"
log_info "  Test backup manually:  ${BACKUP_SCRIPT}"
log_info ""
log_info "To test the backup now, run:"
log_info "  ${BACKUP_SCRIPT}"
log_info ""

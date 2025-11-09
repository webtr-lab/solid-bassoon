#!/bin/bash

#######################################################
# GPS Tracker - Cron Backup Setup Script
#######################################################
# This script helps you set up automated server-level
# backups using cron.
#
# Usage:
#   ./setup-cron-backup.sh
#######################################################

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SCRIPT="${SCRIPT_DIR}/backup-server.sh"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if backup script exists
check_backup_script() {
    if [ ! -f "$BACKUP_SCRIPT" ]; then
        log_error "Backup script not found: $BACKUP_SCRIPT"
        exit 1
    fi

    if [ ! -x "$BACKUP_SCRIPT" ]; then
        log_info "Making backup script executable..."
        chmod +x "$BACKUP_SCRIPT"
    fi
}

# Show current cron jobs
show_current_cron() {
    log_info "Current cron jobs for $(whoami):"
    echo ""
    if crontab -l 2>/dev/null | grep -q "backup-server.sh"; then
        crontab -l 2>/dev/null | grep "backup-server.sh"
    else
        echo "  (No GPS Tracker backup jobs found)"
    fi
    echo ""
}

# Suggest cron schedules
suggest_schedules() {
    echo ""
    echo "=========================================="
    echo "  Common Backup Schedules"
    echo "=========================================="
    echo ""
    echo "1) Daily at 2:00 AM"
    echo "   0 2 * * * ${BACKUP_SCRIPT} >> ${SCRIPT_DIR}/backup-server.log 2>&1"
    echo ""
    echo "2) Daily at 3:00 AM (if app backups at 2 AM)"
    echo "   0 3 * * * ${BACKUP_SCRIPT} >> ${SCRIPT_DIR}/backup-server.log 2>&1"
    echo ""
    echo "3) Every 6 hours"
    echo "   0 */6 * * * ${BACKUP_SCRIPT} >> ${SCRIPT_DIR}/backup-server.log 2>&1"
    echo ""
    echo "4) Every 12 hours (2 AM and 2 PM)"
    echo "   0 2,14 * * * ${BACKUP_SCRIPT} >> ${SCRIPT_DIR}/backup-server.log 2>&1"
    echo ""
    echo "5) Weekly on Sunday at 3:00 AM"
    echo "   0 3 * * 0 ${BACKUP_SCRIPT} >> ${SCRIPT_DIR}/backup-server.log 2>&1"
    echo ""
    echo "6) Custom schedule"
    echo ""
}

# Add cron job
add_cron_job() {
    local cron_schedule="$1"
    local cron_command="${BACKUP_SCRIPT} >> ${SCRIPT_DIR}/backup-server.log 2>&1"
    local cron_entry="${cron_schedule} ${cron_command}"

    # Check if similar job already exists
    if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
        log_warning "A cron job for backup-server.sh already exists"
        read -p "Replace it? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Keeping existing cron job"
            return 0
        fi

        # Remove existing job
        crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -
        log_info "Removed existing cron job"
    fi

    # Add new job
    (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
    log_success "Cron job added successfully!"
    echo ""
    log_info "New cron entry:"
    echo "  $cron_entry"
}

# Interactive setup
interactive_setup() {
    echo ""
    echo "=========================================="
    echo "  GPS Tracker - Cron Backup Setup"
    echo "=========================================="
    echo ""

    check_backup_script
    show_current_cron
    suggest_schedules

    echo "Select a schedule option (1-6) or 'q' to quit:"
    read -r choice

    case $choice in
        1)
            add_cron_job "0 2 * * *"
            ;;
        2)
            add_cron_job "0 3 * * *"
            ;;
        3)
            add_cron_job "0 */6 * * *"
            ;;
        4)
            add_cron_job "0 2,14 * * *"
            ;;
        5)
            add_cron_job "0 3 * * 0"
            ;;
        6)
            echo ""
            echo "Enter your custom cron schedule (e.g., '0 4 * * *'):"
            echo "Format: minute hour day month weekday"
            read -r custom_schedule
            if [ -n "$custom_schedule" ]; then
                add_cron_job "$custom_schedule"
            else
                log_error "Empty schedule provided"
                exit 1
            fi
            ;;
        q|Q)
            log_info "Setup cancelled"
            exit 0
            ;;
        *)
            log_error "Invalid choice"
            exit 1
            ;;
    esac

    echo ""
    log_success "Setup complete!"
    echo ""
    log_info "Backup logs will be written to: ${SCRIPT_DIR}/backup-server.log"
    log_info "View current cron jobs: crontab -l"
    log_info "Edit cron jobs manually: crontab -e"
    echo ""
}

# Remove cron job
remove_cron_job() {
    if crontab -l 2>/dev/null | grep -q "$BACKUP_SCRIPT"; then
        crontab -l 2>/dev/null | grep -v "$BACKUP_SCRIPT" | crontab -
        log_success "Cron job removed"
    else
        log_info "No cron job found for backup-server.sh"
    fi
}

# Main menu
main() {
    if [ "$1" = "--remove" ] || [ "$1" = "-r" ]; then
        remove_cron_job
    elif [ "$1" = "--list" ] || [ "$1" = "-l" ]; then
        show_current_cron
    else
        interactive_setup
    fi
}

main "$@"

#!/bin/bash
#
# Setup Cron Job for Monthly Restore Test
# This script configures automatic monthly backup verification testing
#
# Usage: ./setup-monthly-test-cron.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_error() {
    echo -e "${RED}ERROR: $@${NC}" >&2
}

log_info() {
    echo -e "${GREEN}INFO: $@${NC}"
}

log_warn() {
    echo -e "${YELLOW}WARN: $@${NC}"
}

# Configuration - Automatically detect the project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
TEST_SCRIPT="${BASE_DIR}/scripts/backup/monthly-restore-test.sh"

# Check if test script exists
if [ ! -f "${TEST_SCRIPT}" ]; then
    log_error "Monthly test script not found: ${TEST_SCRIPT}"
    exit 1
fi

# Make sure script is executable
chmod +x "${TEST_SCRIPT}"

log_info "Setting up cron job for monthly restore testing"
log_info ""

# Show schedule options
cat << EOF
Select monthly test schedule:

1) 1st day of month at 3:00 AM (recommended)
2) 1st day of month at 11:00 PM
3) Last day of month at 3:00 AM
4) 15th day of month at 3:00 AM (mid-month)
5) Custom schedule

EOF

read -p "Enter your choice [1-5]: " schedule_choice

case ${schedule_choice} in
    1)
        CRON_SCHEDULE="0 3 1 * *"
        DESCRIPTION="1st day of month at 3:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 23 1 * *"
        DESCRIPTION="1st day of month at 11:00 PM"
        ;;
    3)
        CRON_SCHEDULE="0 3 L * *"
        DESCRIPTION="Last day of month at 3:00 AM"
        ;;
    4)
        CRON_SCHEDULE="0 3 15 * *"
        DESCRIPTION="15th day of month at 3:00 AM"
        ;;
    5)
        echo ""
        log_info "Cron format: minute hour day month weekday"
        log_info "Examples:"
        log_info "  0 3 1 * *     - 1st day of month at 3 AM"
        log_info "  0 0 15 * *    - 15th day of month at midnight"
        log_info "  0 2 * * 0     - Every Sunday at 2 AM"
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
CRON_ENTRY="${CRON_SCHEDULE} cd ${BASE_DIR} && ${TEST_SCRIPT} >> ${BASE_DIR}/logs/monthly-restore-test.log 2>&1"

log_info ""
log_info "Creating cron job with schedule: ${DESCRIPTION}"
log_info "Cron entry: ${CRON_ENTRY}"
log_info ""

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "${TEST_SCRIPT}"; then
    log_warn "A cron job for this test script already exists"
    read -p "Do you want to replace it? [y/N]: " replace
    if [[ ! $replace =~ ^[Yy]$ ]]; then
        log_info "Keeping existing cron job"
        exit 0
    fi
    # Remove existing entry
    crontab -l 2>/dev/null | grep -v "${TEST_SCRIPT}" | crontab -
    log_info "Removed existing cron job"
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "# Monthly backup restore test"; echo "${CRON_ENTRY}") | crontab -

log_info ""
log_info "=========================================="
log_info "Cron job successfully created!"
log_info "=========================================="
log_info "Schedule: ${DESCRIPTION}"
log_info "Script: ${TEST_SCRIPT}"
log_info "Log file: ${BASE_DIR}/logs/monthly-restore-test.log"
log_info ""
log_info "Current crontab entries:"
crontab -l | grep -A1 "Monthly" || true
log_info "=========================================="
log_info ""
log_info "Useful commands:"
log_info "  View cron jobs:        crontab -l"
log_info "  Edit cron jobs:        crontab -e"
log_info "  View test log:         tail -f ${BASE_DIR}/logs/monthly-restore-test.log"
log_info "  Test manually:         ${TEST_SCRIPT}"
log_info ""
log_info "To test the monthly restore now, run:"
log_info "  ${TEST_SCRIPT}"
log_info ""

#!/bin/bash
#
# Setup script for daily application status report cron job
# Configures automatic daily status reports via email
#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
STATUS_REPORT_SCRIPT="${BASE_DIR}/scripts/monitoring/app-status-report.sh"
EMAIL_RECIPIENT="info@praxisnetworking.com"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Maps Tracker - Status Report Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if status report script exists
if [ ! -f "$STATUS_REPORT_SCRIPT" ]; then
    echo -e "${YELLOW}Error: app-status-report.sh not found at $STATUS_REPORT_SCRIPT${NC}"
    exit 1
fi

# Make script executable if needed
if [ ! -x "$STATUS_REPORT_SCRIPT" ]; then
    echo "Making app-status-report.sh executable..."
    chmod +x "$STATUS_REPORT_SCRIPT"
fi

# Check for mail command
if ! command -v mail &> /dev/null && ! command -v mailx &> /dev/null; then
    echo -e "${YELLOW}⚠ Warning: mail command not found${NC}"
    echo "Email notifications will not work until mailutils is installed."
    echo ""
    echo "Install with:"
    echo "  sudo apt-get update"
    echo "  sudo apt-get install mailutils"
    echo ""
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Show schedule options
echo "Select status report schedule:"
echo ""
echo "  1) Daily at 8:00 AM (recommended)"
echo "  2) Daily at 9:00 AM"
echo "  3) Daily at 6:00 AM"
echo "  4) Daily at 12:00 PM (noon)"
echo "  5) Twice daily (8:00 AM and 8:00 PM)"
echo "  6) Custom time"
echo ""
read -p "Enter your choice (1-6): " choice

case $choice in
    1)
        CRON_SCHEDULE="0 8 * * *"
        SCHEDULE_DESC="Daily at 8:00 AM"
        ;;
    2)
        CRON_SCHEDULE="0 9 * * *"
        SCHEDULE_DESC="Daily at 9:00 AM"
        ;;
    3)
        CRON_SCHEDULE="0 6 * * *"
        SCHEDULE_DESC="Daily at 6:00 AM"
        ;;
    4)
        CRON_SCHEDULE="0 12 * * *"
        SCHEDULE_DESC="Daily at 12:00 PM"
        ;;
    5)
        CRON_SCHEDULE="0 8,20 * * *"
        SCHEDULE_DESC="Twice daily (8:00 AM and 8:00 PM)"
        ;;
    6)
        echo ""
        echo "Enter custom cron schedule (e.g., '0 10 * * *' for 10:00 AM daily):"
        echo "Format: minute hour day month weekday"
        echo ""
        read -p "Schedule: " CRON_SCHEDULE
        SCHEDULE_DESC="Custom: $CRON_SCHEDULE"
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac

# Create cron job entry
CRON_COMMENT="# Maps Tracker daily status report to ${EMAIL_RECIPIENT}"
CRON_JOB="$CRON_SCHEDULE cd $BASE_DIR && $STATUS_REPORT_SCRIPT >> $BASE_DIR/logs/status-report.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "app-status-report.sh"; then
    echo ""
    echo -e "${YELLOW}Existing status report cron job found.${NC}"
    read -p "Do you want to replace it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi

    # Remove old entry
    crontab -l 2>/dev/null | grep -v "app-status-report.sh" | grep -v "Maps Tracker daily status report" | crontab -
fi

echo ""
echo "Installing cron job..."

# Add new cron job with comment
(crontab -l 2>/dev/null; echo "$CRON_COMMENT"; echo "$CRON_JOB") | crontab -

echo ""
echo -e "${GREEN}✓ Status report cron job configured successfully!${NC}"
echo ""
echo -e "${BLUE}Configuration Summary:${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Schedule: $SCHEDULE_DESC"
echo "Script: $STATUS_REPORT_SCRIPT"
echo "Email: $EMAIL_RECIPIENT"
echo "Logs: $BASE_DIR/logs/status-report.log"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo -e "${BLUE}Your current crontab:${NC}"
crontab -l | grep "app-status-report"
echo ""

echo -e "${GREEN}Useful Commands:${NC}"
echo ""
echo "Run status report manually:"
echo "  $STATUS_REPORT_SCRIPT"
echo ""
echo "Run without sending email:"
echo "  $STATUS_REPORT_SCRIPT --no-email"
echo ""
echo "View status report log:"
echo "  tail -f $BASE_DIR/logs/status-report.log"
echo ""
echo "View all cron jobs:"
echo "  crontab -l"
echo ""
echo "Edit cron jobs:"
echo "  crontab -e"
echo ""
echo "Remove status report cron job:"
echo "  crontab -l | grep -v 'app-status-report.sh' | crontab -"
echo ""

echo -e "${YELLOW}Note:${NC} Make sure mailutils is installed for email notifications:"
echo "  sudo apt-get install mailutils"
echo ""

echo -e "${GREEN}Setup complete!${NC}"

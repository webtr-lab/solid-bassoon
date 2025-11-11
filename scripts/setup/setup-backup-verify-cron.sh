#!/bin/bash
#
# Backup Verification Cron Setup
# Configures automated backup verification to run 15 minutes after daily backup
# Sends email alerts if verification fails
#

set -e

# Automatically detect the project directory (scripts/setup -> scripts -> project-root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
VERIFY_SCRIPT="${BASE_DIR}/scripts/backup/verify-backup.sh"
LOG_DIR="${BASE_DIR}/logs"
VERIFY_LOG="${LOG_DIR}/backup-verification.log"

echo "=================================================="
echo "Setting Up Automated Backup Verification"
echo "=================================================="
echo ""

# Step 1: Ensure verify script exists and is executable
if [ ! -f "${VERIFY_SCRIPT}" ]; then
    echo "ERROR: Verification script not found: ${VERIFY_SCRIPT}"
    exit 1
fi

chmod +x "${VERIFY_SCRIPT}"
echo "✓ Verification script ready: ${VERIFY_SCRIPT}"
echo ""

# Step 2: Create log directory if needed
mkdir -p "${LOG_DIR}"
echo "✓ Log directory ready: ${LOG_DIR}"
echo ""

# Step 3: Get email from .env or use default
if [ -f "${BASE_DIR}/.env" ]; then
    source "${BASE_DIR}/.env"
fi

EMAIL="${BACKUP_EMAIL:-admin@example.com}"
echo "Email for alerts: ${EMAIL}"
echo ""

# Step 4: Create wrapper script for verification with logging
cat > "${BASE_DIR}/scripts/backup/run-backup-verify.sh" << 'WRAPPER_SCRIPT'
#!/bin/bash
#
# Backup Verification Wrapper
# Logs all verification output and sends email alerts on failure
#

# Automatically detect the project directory (scripts/backup -> scripts -> project-root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
VERIFY_SCRIPT="${BASE_DIR}/scripts/backup/verify-backup.sh"
VERIFY_LOG="${BASE_DIR}/logs/backup-verification.log"
EMAIL="${BACKUP_EMAIL:-admin@example.com}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Redirect output to log
{
    echo "[${TIMESTAMP}] Starting backup verification..."
    
    # Run verification
    if "${VERIFY_SCRIPT}" --latest 2>&1; then
        echo "[${TIMESTAMP}] ✓ Verification PASSED"
        status="PASSED"
        exit_code=0
    else
        echo "[${TIMESTAMP}] ✗ Verification FAILED"
        status="FAILED"
        exit_code=1
    fi
    
} >> "${VERIFY_LOG}" 2>&1

# Send email alert if verification failed
if [ $exit_code -ne 0 ]; then
    {
        echo "Backup Verification Failed - Action Required"
        echo ""
        echo "Timestamp: ${TIMESTAMP}"
        echo "Status: FAILED"
        echo ""
        echo "Last 20 lines of verification log:"
        echo "======================================"
        tail -20 "${VERIFY_LOG}"
        echo ""
        echo "Full log: ${VERIFY_LOG}"
    } | mail -s "[CRITICAL] Maps Backup Verification Failed" "${EMAIL}"
fi

exit $exit_code
WRAPPER_SCRIPT

chmod +x "${BASE_DIR}/scripts/backup/run-backup-verify.sh"
echo "✓ Verification wrapper created"
echo ""

# Step 5: Add cron job
echo "Step 5: Adding cron job..."

# Read current crontab (if exists)
CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")

# Check if verification job already exists
if echo "${CURRENT_CRON}" | grep -q "run-backup-verify.sh"; then
    echo "⚠ Verification cron job already exists"
else
    # Add new verification cron job (runs 15 minutes after backup at 2:15 AM)
    NEW_CRON="${CURRENT_CRON}
# Backup Verification: Run 15 minutes after daily backup
15 2 * * * ${BASE_DIR}/scripts/backup/run-backup-verify.sh"
    
    echo "${NEW_CRON}" | crontab -
    echo "✓ Cron job added: Daily at 2:15 AM"
fi

echo ""
echo "=================================================="
echo "Automated Verification Setup Complete"
echo "=================================================="
echo ""
echo "Configuration:"
echo "  • Verification runs: Daily at 2:15 AM"
echo "  • Verification script: ${VERIFY_SCRIPT}"
echo "  • Log file: ${VERIFY_LOG}"
echo "  • Email alerts: ${EMAIL}"
echo "  • Alert condition: Verification fails"
echo ""
echo "Current cron jobs:"
crontab -l | grep -E "backup|verify" || echo "  (none)"
echo ""

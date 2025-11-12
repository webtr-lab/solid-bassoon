#!/bin/bash
#
# Backup Verification Wrapper
# Finds latest backup and verifies it using pg_restore
#

# Automatically detect the project directory (scripts/backup -> scripts -> project-root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
BACKUP_DIR="${BASE_DIR}/backups"
VERIFY_LOG="${BASE_DIR}/logs/backup-verification.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Load .env if it exists for environment variables
if [ -f "${BASE_DIR}/.env" ]; then
    set +a
    source "${BASE_DIR}/.env"
    set -a
fi

# Set EMAIL from environment variable
EMAIL="${BACKUP_EMAIL:-admin@example.com}"

# Change to backup directory to get relative path
cd "${BACKUP_DIR}"

# Find latest backup relative path
LATEST_BACKUP=$(find . -name "backup_*.sql" -type f -printf '%T@ %P\n' 2>/dev/null | sort -rn | head -1 | awk '{print $2}')

if [ -z "${LATEST_BACKUP}" ]; then
    {
        echo "[${TIMESTAMP}] ERROR: No backup found!"
    } >> "${VERIFY_LOG}" 2>&1

    # Only send email if not disabled by wrapper
    if [ "$BACKUP_EMAIL_ENABLED" != "false" ]; then
        {
            echo "════════════════════════════════════════════════════════════════"
            echo "CRITICAL ALERT - NO BACKUP FILES FOUND"
            echo "════════════════════════════════════════════════════════════════"
            echo ""
            echo "Application:     Maps Tracker (Vehicle Tracking System)"
            echo "Server:          $(hostname)"
            echo "Environment:     Production"
            echo "Alert Severity:  CRITICAL - Action Required Immediately"
            echo "Timestamp:       ${TIMESTAMP}"
            echo ""
            echo "WHAT HAPPENED:"
            echo "──────────────────────────────────────────────────────────────────"
            echo "The scheduled backup verification process did not find any backup"
            echo "files in the expected backup directory."
            echo ""
            echo "Backup Directory: ${BACKUP_DIR}"
            echo "Expected Backups: Daily + Weekly full"
            echo ""
            echo "BUSINESS IMPACT:"
            echo "──────────────────────────────────────────────────────────────────"
            echo "⚠  Database recovery is NOT possible if failure occurs"
            echo "⚠  All data since last successful backup could be lost"
            echo "⚠  Backup protection policy is VIOLATED"
            echo ""
            echo "IMMEDIATE ACTION REQUIRED:"
            echo "──────────────────────────────────────────────────────────────────"
            echo "1. Log into server: $(hostname)"
            echo "2. Check backup directory exists:"
            echo "   ls -la ${BACKUP_DIR}"
            echo "3. View recent backup logs:"
            echo "   tail -100 ${BASE_DIR}/logs/backup-manager.log"
            echo "4. Verify disk space is available:"
            echo "   df -h ${BACKUP_DIR}"
            echo "5. Verify backup cron jobs are configured:"
            echo "   crontab -l | grep backup"
            echo "6. Manually trigger backup immediately:"
            echo "   ${BASE_DIR}/scripts/backup/backup-manager.sh --daily"
            echo ""
            echo "SUPPORT CONTACT:"
            echo "──────────────────────────────────────────────────────────────────"
            echo "Contact: DevOps/System Administrator"
            echo "Priority: CRITICAL - do not delay"
            echo "════════════════════════════════════════════════════════════════"
        } | mail -s "[CRITICAL] Maps Tracker - No Backups Found - Action Required" "${EMAIL}" 2>/dev/null || true
    fi

    exit 1
fi

# Redirect output to log
{
    echo "[${TIMESTAMP}] Starting backup verification..."
    echo "[${TIMESTAMP}] Verifying: ${LATEST_BACKUP}"
    echo ""
    
    # Verify using Docker
    if docker compose -f "${BASE_DIR}/docker-compose.yml" exec -T db pg_restore --list "/backups/${LATEST_BACKUP}" > /dev/null 2>&1; then
        echo "[${TIMESTAMP}] ✓ Verification PASSED"
        exit_code=0
    else
        echo "[${TIMESTAMP}] ✗ Verification FAILED"
        exit_code=1
    fi
    
} >> "${VERIFY_LOG}" 2>&1

# Send email notification (success or failure) - only if email is enabled
if [ "$BACKUP_EMAIL_ENABLED" != "false" ]; then
    if [ $exit_code -eq 0 ]; then
        # Success notification
        {
            echo "════════════════════════════════════════════════════════════════"
            echo "✓ BACKUP VERIFICATION SUCCESS"
            echo "════════════════════════════════════════════════════════════════"
            echo ""
            echo "Application:     Maps Tracker (Vehicle Tracking System)"
            echo "Server:          $(hostname)"
            echo "Environment:     Production"
            echo "Alert Type:      Daily Backup Verification"
            echo "Status:          SUCCESS - Backup is valid and restorable"
            echo "Timestamp:       ${TIMESTAMP}"
            echo ""
            echo "BACKUP DETAILS:"
            echo "──────────────────────────────────────────────────────────────────"
            echo "Backup File:     ${LATEST_BACKUP}"
            echo "Verification:    PASSED - pg_restore validation successful"
            echo ""
            echo "WHAT THIS MEANS:"
            echo "──────────────────────────────────────────────────────────────────"
            echo "✓ Backup file is readable and intact"
            echo "✓ Database structure can be validated"
            echo "✓ Recovery is possible from this backup"
            echo ""
            echo "NEXT STEPS:"
            echo "──────────────────────────────────────────────────────────────────"
            echo "• Backup is ready for use in case of disaster"
            echo "• Automatic cleanup will run per retention policy (180 days)"
            echo "• Compression will happen after 30 days"
            echo ""
            echo "SUPPORT CONTACT:"
            echo "──────────────────────────────────────────────────────────────────"
            echo "Contact: System Administrator"
            echo "Frequency: Daily verification at 2:15 AM"
            echo "════════════════════════════════════════════════════════════════"
        } > /tmp/verify_success_email.txt

        # Use send-email.sh script if available
        SEND_EMAIL_SCRIPT="${BASE_DIR}/scripts/email/send-email.sh"
        if [ -f "${SEND_EMAIL_SCRIPT}" ]; then
            "${SEND_EMAIL_SCRIPT}" "${EMAIL}" "[Maps Tracker Backup] ✓ Verification Passed - ${LATEST_BACKUP}" "$(cat /tmp/verify_success_email.txt)" 2>&1 | tee -a "${VERIFY_LOG}" || true
            rm -f /tmp/verify_success_email.txt
        else
            # Fallback to mail command
            cat /tmp/verify_success_email.txt | mail -s "[Maps Tracker Backup] ✓ Verification Passed - ${LATEST_BACKUP}" "${EMAIL}" 2>/dev/null || true
            rm -f /tmp/verify_success_email.txt
        fi
    fi
    if [ $exit_code -ne 0 ]; then
        # Failure notification
        {
            echo "════════════════════════════════════════════════════════════════"
            echo "CRITICAL ALERT - BACKUP VERIFICATION FAILED"
            echo "════════════════════════════════════════════════════════════════"
            echo ""
            echo "Application:     Maps Tracker (Vehicle Tracking System)"
            echo "Server:          $(hostname)"
            echo "Environment:     Production"
            echo "Alert Severity:  CRITICAL - Backup is Corrupted/Unreadable"
            echo "Timestamp:       ${TIMESTAMP}"
            echo ""
            echo "WHAT HAPPENED:"
            echo "──────────────────────────────────────────────────────────────────"
            echo "The latest backup file failed integrity verification."
            echo "This means the backup exists but cannot be restored if needed."
            echo ""
            echo "Affected Backup File: ${LATEST_BACKUP}"
            echo "Verification Status:  FAILED - Corruption Detected"
            echo ""
            echo "BUSINESS IMPACT:"
            echo "──────────────────────────────────────────────────────────────────"
            echo "⚠  This backup CANNOT be used for recovery"
            echo "⚠  May indicate database dump errors or file corruption"
            echo "⚠  Previous backups may still be valid (check older files)"
            echo ""
            echo "IMMEDIATE ACTION REQUIRED:"
            echo "──────────────────────────────────────────────────────────────────"
            echo "1. Review backup failure details below"
            echo "2. Check database integrity:"
            echo "   docker compose exec -T db pg_isready -U \${POSTGRES_USER}"
            echo "3. Verify disk space:"
            echo "   df -h"
            echo "4. Manually retry backup:"
            echo "   ${BASE_DIR}/scripts/backup/backup-manager.sh --daily"
            echo "5. Verify previous backups still exist:"
            echo "   ls -lh ${BASE_DIR}/backups/*/2025/*/backup_*.sql"
            echo ""
            echo "RECENT VERIFICATION LOG:"
            echo "──────────────────────────────────────────────────────────────────"
            tail -20 "${VERIFY_LOG}"
            echo ""
            echo "SUPPORT CONTACT:"
            echo "──────────────────────────────────────────────────────────────────"
            echo "Contact: DevOps/Database Administrator"
            echo "Priority: CRITICAL - verify recovery capability immediately"
            echo "════════════════════════════════════════════════════════════════"
        } > /tmp/verify_failure_email.txt

        # Use send-email.sh script if available
        SEND_EMAIL_SCRIPT="${BASE_DIR}/scripts/email/send-email.sh"
        if [ -f "${SEND_EMAIL_SCRIPT}" ]; then
            "${SEND_EMAIL_SCRIPT}" "${EMAIL}" "[CRITICAL] Maps Tracker - Backup Verification Failed - Action Required" "$(cat /tmp/verify_failure_email.txt)" 2>&1 | tee -a "${VERIFY_LOG}" || true
            rm -f /tmp/verify_failure_email.txt
        else
            # Fallback to mail command
            cat /tmp/verify_failure_email.txt | mail -s "[CRITICAL] Maps Tracker - Backup Verification Failed - Action Required" "${EMAIL}" 2>/dev/null || true
            rm -f /tmp/verify_failure_email.txt
        fi
    fi
fi

exit $exit_code

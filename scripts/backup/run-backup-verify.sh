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
EMAIL="${BACKUP_EMAIL:-admin@example.com}"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Change to backup directory to get relative path
cd "${BACKUP_DIR}"

# Find latest backup relative path
LATEST_BACKUP=$(find . -name "backup_*.sql" -type f -printf '%T@ %P\n' 2>/dev/null | sort -rn | head -1 | awk '{print $2}')

if [ -z "${LATEST_BACKUP}" ]; then
    {
        echo "[${TIMESTAMP}] ERROR: No backup found!"
    } >> "${VERIFY_LOG}" 2>&1
    
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

# Send email alert if verification failed
if [ $exit_code -ne 0 ]; then
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
    } | mail -s "[CRITICAL] Maps Tracker - Backup Verification Failed - Action Required" "${EMAIL}" 2>/dev/null || true
fi

exit $exit_code

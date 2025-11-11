#!/bin/bash
#
# Backup Verification Script
# Verifies backup integrity using multiple methods:
#   1. File existence and size checks
#   2. PostgreSQL format validation (pg_restore --list)
#   3. Table count verification
#   4. MD5 checksum generation/verification
#   5. Optional: Full restore test to temporary database
#
# Usage:
#   ./verify-backup.sh <backup_filename> [--full-test]
#   ./verify-backup.sh backup_20251031_020000.sql
#   ./verify-backup.sh backup_20251031_020000.sql --full-test
#

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
# Automatically detect the project directory (scripts/backup -> scripts -> effective-guide)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
BACKUP_DIR="${BASE_DIR}/backups"
LOG_FILE="${BASE_DIR}/logs/backup-verification.log"
MIN_BACKUP_SIZE=10240     # 10KB minimum
MIN_TABLE_COUNT=5         # Minimum expected tables

# Email configuration (sourced from .env or with defaults)
EMAIL_ENABLED="${BACKUP_EMAIL_ENABLED:-true}"
EMAIL_RECIPIENT="${BACKUP_EMAIL:-admin@example.com}"
EMAIL_SUBJECT_PREFIX="[Maps Tracker Backup Verification]"

# Load .env if it exists for environment variables
if [ -f "${BASE_DIR}/.env" ]; then
    set +a
    source "${BASE_DIR}/.env"
    set -a
    EMAIL_ENABLED="${BACKUP_EMAIL_ENABLED:-true}"
    EMAIL_RECIPIENT="${BACKUP_EMAIL:-admin@example.com}"
fi

# Database settings from .env with fallback defaults
DB_USER="${POSTGRES_USER:-gpsadmin}"
DB_NAME="${POSTGRES_DB:-gps_tracker}"

# Logging functions
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    log "INFO" "$@"
    echo -e "${GREEN}[INFO]${NC} $@"
}

log_error() {
    log "ERROR" "$@"
    echo -e "${RED}[ERROR]${NC} $@" >&2
}

log_warn() {
    log "WARN" "$@"
    echo -e "${YELLOW}[WARN]${NC} $@"
}

# Send email notification
send_verification_alert() {
    local status=$1
    local backup_file=$2
    local details=$3

    if [ "$EMAIL_ENABLED" != "true" ]; then
        return 0
    fi

    local subject
    if [ "$status" == "success" ]; then
        subject="${EMAIL_SUBJECT_PREFIX} [VERIFY] Backup Verification Passed"
    else
        subject="${EMAIL_SUBJECT_PREFIX} [VERIFY] Backup Verification Failed - Action Required"
    fi

    local email_body=$(cat <<EOF
Maps Tracker Backup Verification Report
════════════════════════════════════════════════════════════════

Status:     $([ "$status" == "success" ] && echo "✓ SUCCESSFUL" || echo "✗ FAILED")
Timestamp:  $(date '+%Y-%m-%d %H:%M:%S')
Backup:     $(basename "${backup_file}")
Server:     $(hostname)

VERIFICATION DETAILS
──────────────────────────────────────────────────────────────────
${details}

ACTION REQUIRED (if failure)
──────────────────────────────────────────────────────────────────
Please review the logs for detailed error information:
${LOG_FILE}

════════════════════════════════════════════════════════════════
This is an automated notification from the Maps Tracker backup verification system.
EOF
)

    # Try using the SMTP relay script from scripts/email directory
    local SEND_EMAIL_SCRIPT="${BASE_DIR}/scripts/email/send-email.sh"
    if [ -f "${SEND_EMAIL_SCRIPT}" ]; then
        "${SEND_EMAIL_SCRIPT}" "$EMAIL_RECIPIENT" "$subject" "$email_body" 2>&1 | tee -a "${LOG_FILE}"
        return 0
    fi

    # Fallback to parent directory for backward compatibility
    SEND_EMAIL_SCRIPT="$(dirname "${BASE_DIR}")/send-email.sh"
    if [ -f "${SEND_EMAIL_SCRIPT}" ]; then
        "${SEND_EMAIL_SCRIPT}" "$EMAIL_RECIPIENT" "$subject" "$email_body" 2>&1 | tee -a "${LOG_FILE}"
        return 0
    fi

    # Final fallback to mail command if available
    if command -v mail &> /dev/null || command -v mailx &> /dev/null; then
        local MAIL_CMD="mail"
        if command -v mailx &> /dev/null; then
            MAIL_CMD="mailx"
        fi
        echo "$email_body" | $MAIL_CMD -s "$subject" "$EMAIL_RECIPIENT" 2>&1 | tee -a "${LOG_FILE}"
        if [ ${PIPESTATUS[1]} -eq 0 ]; then
            log_info "Email notification sent successfully"
        fi
    fi
}

# Usage information
usage() {
    cat << EOF
Usage: $0 <backup_filename> [--full-test]

Arguments:
    backup_filename    Name of backup file to verify (in ${BACKUP_DIR})
    --full-test       Optional: Perform full restore test to temporary database

Examples:
    $0 backup_20251031_020000.sql
    $0 backup_20251031_020000.sql --full-test

Verification Levels:
    1. File existence and size check
    2. PostgreSQL format validation
    3. Table count verification
    4. MD5 checksum generation/verification
    5. Full restore test (if --full-test specified)

EOF
    exit 1
}

# Check arguments
if [ $# -lt 1 ]; then
    log_error "Missing backup filename argument"
    usage
fi

BACKUP_FILE=$1
FULL_TEST=false

if [ "$2" == "--full-test" ]; then
    FULL_TEST=true
fi

BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

log_info "=========================================="
log_info "Starting backup verification: ${BACKUP_FILE}"
log_info "=========================================="

# Track verification results
VERIFICATION_PASSED=true
VERIFICATION_DETAILS=""

# Step 1: File existence check
log_info "Step 1/5: Checking file existence..."
if [ ! -f "${BACKUP_PATH}" ]; then
    log_error "Backup file not found: ${BACKUP_PATH}"
    VERIFICATION_DETAILS="${VERIFICATION_DETAILS}\n❌ File not found: ${BACKUP_PATH}"
    send_verification_alert "failure" "${BACKUP_FILE}" "${VERIFICATION_DETAILS}"
    exit 1
fi
log_info "✓ File exists: ${BACKUP_PATH}"
VERIFICATION_DETAILS="${VERIFICATION_DETAILS}\n✓ File exists"

# Step 2: File size check
log_info "Step 2/5: Checking file size..."
SIZE=$(stat -c%s "${BACKUP_PATH}" 2>/dev/null || stat -f%z "${BACKUP_PATH}" 2>/dev/null)

if [ -z "$SIZE" ]; then
    log_error "Unable to determine file size"
    VERIFICATION_DETAILS="${VERIFICATION_DETAILS}\n❌ Unable to determine file size"
    VERIFICATION_PASSED=false
elif [ "$SIZE" -lt "$MIN_BACKUP_SIZE" ]; then
    log_error "Backup file too small: ${SIZE} bytes (minimum: ${MIN_BACKUP_SIZE})"
    VERIFICATION_DETAILS="${VERIFICATION_DETAILS}\n❌ File too small: ${SIZE} bytes"
    VERIFICATION_PASSED=false
else
    SIZE_HUMAN=$(numfmt --to=iec-i --suffix=B $SIZE 2>/dev/null || echo "${SIZE} bytes")
    log_info "✓ File size acceptable: ${SIZE_HUMAN}"
    VERIFICATION_DETAILS="${VERIFICATION_DETAILS}\n✓ File size: ${SIZE_HUMAN}"
fi

# Step 3: PostgreSQL format validation
log_info "Step 3/5: Validating PostgreSQL backup format..."
if docker compose exec -T db pg_restore --list "/backups/${BACKUP_FILE}" > /tmp/pg_restore_list_$$.txt 2>&1; then
    log_info "✓ PostgreSQL format is valid"
    VERIFICATION_DETAILS="${VERIFICATION_DETAILS}\n✓ PostgreSQL format valid"
else
    log_error "Invalid PostgreSQL backup format"
    cat /tmp/pg_restore_list_$$.txt | head -20 | tee -a "${LOG_FILE}"
    VERIFICATION_DETAILS="${VERIFICATION_DETAILS}\n❌ Invalid PostgreSQL format"
    VERIFICATION_PASSED=false
fi

# Step 4: Table count verification
log_info "Step 4/5: Verifying table count..."
if [ -f /tmp/pg_restore_list_$$.txt ]; then
    TABLE_COUNT=$(grep -c "TABLE DATA" /tmp/pg_restore_list_$$.txt || echo "0")

    if [ "$TABLE_COUNT" -lt "$MIN_TABLE_COUNT" ]; then
        log_error "Backup contains only ${TABLE_COUNT} tables (expected at least ${MIN_TABLE_COUNT})"
        VERIFICATION_DETAILS="${VERIFICATION_DETAILS}\n❌ Only ${TABLE_COUNT} tables found (expected ${MIN_TABLE_COUNT}+)"
        VERIFICATION_PASSED=false
    else
        log_info "✓ Table count acceptable: ${TABLE_COUNT} tables"
        VERIFICATION_DETAILS="${VERIFICATION_DETAILS}\n✓ Contains ${TABLE_COUNT} tables"
    fi

    rm -f /tmp/pg_restore_list_$$.txt
fi

# Step 5: Generate/verify checksum
log_info "Step 5/5: Generating MD5 checksum..."
CHECKSUM=$(md5sum "${BACKUP_PATH}" | awk '{print $1}')
CHECKSUM_FILE="${BACKUP_PATH}.md5"

# Save checksum
echo "${CHECKSUM}  ${BACKUP_FILE}" > "${CHECKSUM_FILE}"
log_info "✓ Checksum generated: ${CHECKSUM}"
log_info "✓ Checksum saved to: ${CHECKSUM_FILE}"
VERIFICATION_DETAILS="${VERIFICATION_DETAILS}\n✓ MD5 checksum: ${CHECKSUM}"

# Verify checksum if file already existed
if [ -f "${CHECKSUM_FILE}.old" ]; then
    OLD_CHECKSUM=$(cat "${CHECKSUM_FILE}.old" | awk '{print $1}')
    if [ "${CHECKSUM}" != "${OLD_CHECKSUM}" ]; then
        log_warn "Checksum changed from previous verification"
        VERIFICATION_DETAILS="${VERIFICATION_DETAILS}\n⚠️  Checksum differs from previous"
    fi
fi

# Step 6: Full restore test (optional)
if [ "$FULL_TEST" = true ]; then
    log_info ""
    log_info "=========================================="
    log_info "Performing full restore test..."
    log_info "=========================================="

    TEST_DB="test_restore_$(date +%s)"

    # Create test database
    log_info "Creating test database: ${TEST_DB}..."
    if docker compose exec -T db psql -U "${DB_USER}" -d postgres -c "CREATE DATABASE ${TEST_DB};" > /dev/null 2>&1; then
        log_info "✓ Test database created"

        # Restore backup
        log_info "Restoring backup to test database..."
        if docker compose exec -T db pg_restore -U "${DB_USER}" -d "${TEST_DB}" --clean --if-exists "/backups/${BACKUP_FILE}" 2>&1 | grep -i "error: " > /tmp/restore_errors_$$.txt; then
            if [ -s /tmp/restore_errors_$$.txt ]; then
                log_error "Restore test encountered errors:"
                cat /tmp/restore_errors_$$.txt | tee -a "${LOG_FILE}"
                VERIFICATION_DETAILS="${VERIFICATION_DETAILS}\n❌ Restore test failed"
                VERIFICATION_PASSED=false
            fi
            rm -f /tmp/restore_errors_$$.txt
        else
            log_info "✓ Restore completed"

            # Verify table row counts
            log_info "Verifying restored data..."
            ROW_COUNTS=$(docker compose exec -T db psql -U "${DB_USER}" -d "${TEST_DB}" -t -c "
                SELECT
                    'users: ' || COUNT(*) FROM users
                UNION ALL
                SELECT 'vehicles: ' || COUNT(*) FROM vehicle
                UNION ALL
                SELECT 'locations: ' || COUNT(*) FROM location
                UNION ALL
                SELECT 'saved_locations: ' || COUNT(*) FROM saved_location
                UNION ALL
                SELECT 'places: ' || COUNT(*) FROM place_of_interest;
            " 2>/dev/null | tr '\n' ', ')

            if [ -n "$ROW_COUNTS" ]; then
                log_info "✓ Restore test successful"
                log_info "  Row counts: ${ROW_COUNTS}"
                VERIFICATION_DETAILS="${VERIFICATION_DETAILS}\n✓ Full restore test passed\n  ${ROW_COUNTS}"
            else
                log_error "Unable to verify restored data"
                VERIFICATION_DETAILS="${VERIFICATION_DETAILS}\n❌ Restore verification failed"
                VERIFICATION_PASSED=false
            fi
        fi

        # Clean up test database
        log_info "Cleaning up test database..."
        docker compose exec -T db psql -U "${DB_USER}" -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};" > /dev/null 2>&1
        log_info "✓ Test database cleaned up"
    else
        log_error "Failed to create test database"
        VERIFICATION_DETAILS="${VERIFICATION_DETAILS}\n❌ Could not create test database"
        VERIFICATION_PASSED=false
    fi
fi

# Final summary
log_info ""
log_info "=========================================="
if [ "$VERIFICATION_PASSED" = true ]; then
    log_info "✅ VERIFICATION PASSED"
    log_info "=========================================="
    log_info "Backup file: ${BACKUP_FILE}"
    log_info "File size: ${SIZE_HUMAN}"
    log_info "Tables: ${TABLE_COUNT}"
    log_info "Checksum: ${CHECKSUM}"
    if [ "$FULL_TEST" = true ]; then
        log_info "Full restore test: PASSED"
    fi
    log_info "=========================================="

    send_verification_alert "success" "${BACKUP_FILE}" "${VERIFICATION_DETAILS}"
    exit 0
else
    log_error "❌ VERIFICATION FAILED"
    log_error "=========================================="
    log_error "Backup file: ${BACKUP_FILE}"
    log_error "One or more verification checks failed"
    log_error "See details above"
    log_error "=========================================="

    send_verification_alert "failure" "${BACKUP_FILE}" "${VERIFICATION_DETAILS}"
    exit 1
fi

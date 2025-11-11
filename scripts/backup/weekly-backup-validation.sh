#!/bin/bash
#
# Weekly Backup Validation Script
# Performs comprehensive backup integrity testing without full restore:
#   1. Check backup files exist and are readable
#   2. Verify checksums (SHA256)
#   3. Validate PostgreSQL format with pg_restore
#   4. Check metadata completeness
#   5. Generate validation report
#
# Usage: ./weekly-backup-validation.sh
#
# Schedule: Run weekly via cron (e.g., every Monday at 3 AM)
#

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
BACKUP_DIR="${BASE_DIR}/backups"
LOG_DIR="${BASE_DIR}/logs"
VALIDATION_LOG="${LOG_DIR}/weekly-validation.log"
REPORT_FILE="${LOG_DIR}/validation-report-$(date +%Y-%m-%d).txt"

# Email configuration
EMAIL_ENABLED="${BACKUP_EMAIL_ENABLED:-true}"
EMAIL_RECIPIENT="${BACKUP_EMAIL:-admin@example.com}"
EMAIL_SUBJECT_PREFIX="[Maps Tracker Weekly Validation]"

# Load .env if it exists
if [ -f "${BASE_DIR}/.env" ]; then
    set +a
    source "${BASE_DIR}/.env"
    set -a
    EMAIL_ENABLED="${BACKUP_EMAIL_ENABLED:-true}"
    EMAIL_RECIPIENT="${BACKUP_EMAIL:-admin@example.com}"
fi

DB_USER="${POSTGRES_USER:-gpsadmin}"
DB_NAME="${POSTGRES_DB:-gps_tracker}"

# Ensure log directory exists
mkdir -p "${LOG_DIR}"

# Logging functions
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${VALIDATION_LOG}"
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

log_test() {
    log "TEST" "$@"
    echo -e "${BLUE}[TEST]${NC} $@"
}

# Track results
TESTS_PASSED=0
TESTS_FAILED=0
TESTS_WARNED=0
REPORT_OUTPUT=""

# Test 1: Check backup directory exists
test_backup_directory() {
    log_test "Test 1: Checking backup directory..."
    
    if [ ! -d "${BACKUP_DIR}" ]; then
        log_error "Backup directory not found: ${BACKUP_DIR}"
        ((TESTS_FAILED++))
        REPORT_OUTPUT+="❌ Backup directory not found\n"
        return 1
    fi
    
    log_info "✓ Backup directory exists"
    ((TESTS_PASSED++))
    REPORT_OUTPUT+="✓ Backup directory exists\n"
}

# Test 2: Find recent backups (last 7 days)
test_recent_backups() {
    log_test "Test 2: Finding recent backups (last 7 days)..."
    
    RECENT_BACKUPS=($(find "${BACKUP_DIR}" -name "backup_*.sql" -type f -mtime -7 2>/dev/null | sort))
    
    if [ ${#RECENT_BACKUPS[@]} -eq 0 ]; then
        log_error "No backups found in the last 7 days"
        ((TESTS_FAILED++))
        REPORT_OUTPUT+="❌ No recent backups found\n"
        return 1
    fi
    
    log_info "✓ Found ${#RECENT_BACKUPS[@]} recent backups"
    REPORT_OUTPUT+="✓ Found ${#RECENT_BACKUPS[@]} recent backups\n"
    ((TESTS_PASSED++))
}

# Test 3: Verify checksum integrity
test_checksum_integrity() {
    log_test "Test 3: Verifying backup checksums..."
    
    local checksum_ok=0
    local checksum_fail=0
    
    for backup_file in "${RECENT_BACKUPS[@]}"; do
        local filename=$(basename "${backup_file}")
        
        # Check for SHA256 first, then MD5 (for backwards compatibility)
        local checksum_file="${backup_file}.sha256"
        local is_sha256=true
        
        if [ ! -f "${checksum_file}" ]; then
            checksum_file="${backup_file}.md5"
            is_sha256=false
        fi
        
        if [ ! -f "${checksum_file}" ]; then
            log_warn "No checksum file for: ${filename}"
            ((checksum_fail++))
            continue
        fi
        
        # Verify checksum (handle both formats: hash-only and hash+filename)
        if [ "$is_sha256" = true ]; then
            # First try standard format (hash + filename)
            if sha256sum -c "${checksum_file}" &>/dev/null; then
                log_info "  ✓ SHA256 verified: ${filename}"
                ((checksum_ok++))
            else
                # Fallback: try hash-only format by comparing directly
                local stored_hash=$(cat "${checksum_file}" | awk '{print $1}')
                local actual_hash=$(sha256sum "${backup_file}" | awk '{print $1}')
                if [ "$stored_hash" = "$actual_hash" ]; then
                    log_info "  ✓ SHA256 verified: ${filename}"
                    ((checksum_ok++))
                else
                    log_error "  ✗ SHA256 failed: ${filename}"
                    ((checksum_fail++))
                fi
            fi
        else
            # MD5 format
            if md5sum -c "${checksum_file}" &>/dev/null; then
                log_info "  ✓ MD5 verified: ${filename}"
                ((checksum_ok++))
            else
                # Fallback for MD5 hash-only format
                local stored_hash=$(cat "${checksum_file}" | awk '{print $1}')
                local actual_hash=$(md5sum "${backup_file}" | awk '{print $1}')
                if [ "$stored_hash" = "$actual_hash" ]; then
                    log_info "  ✓ MD5 verified: ${filename}"
                    ((checksum_ok++))
                else
                    log_error "  ✗ MD5 failed: ${filename}"
                    ((checksum_fail++))
                fi
            fi
        fi
    done
    
    if [ $checksum_fail -eq 0 ]; then
        log_info "✓ All checksums verified (${checksum_ok}/${#RECENT_BACKUPS[@]})"
        REPORT_OUTPUT+="✓ All checksums verified (${checksum_ok}/${#RECENT_BACKUPS[@]})\n"
        ((TESTS_PASSED++))
    else
        log_error "✗ ${checksum_fail} checksums failed"
        REPORT_OUTPUT+="❌ ${checksum_fail} checksums failed\n"
        ((TESTS_FAILED++))
    fi
}

# Test 4: Validate PostgreSQL format
test_postgresql_format() {
    log_test "Test 4: Validating PostgreSQL backup format..."
    
    local format_ok=0
    local format_fail=0
    
    for backup_file in "${RECENT_BACKUPS[@]}"; do
        local filename=$(basename "${backup_file}")
        local docker_path="/backups/$(echo "${backup_file}" | sed "s|${BACKUP_DIR}/||")"
        
        # Quick format check using pg_restore --list
        if docker compose exec -T db pg_restore --list "${docker_path}" &>/dev/null; then
            log_info "  ✓ Format valid: ${filename}"
            ((format_ok++))
        else
            log_error "  ✗ Format invalid: ${filename}"
            ((format_fail++))
        fi
    done
    
    if [ $format_fail -eq 0 ]; then
        log_info "✓ All backups have valid PostgreSQL format (${format_ok}/${#RECENT_BACKUPS[@]})"
        REPORT_OUTPUT+="✓ All backups valid PostgreSQL format (${format_ok}/${#RECENT_BACKUPS[@]})\n"
        ((TESTS_PASSED++))
    else
        log_error "✗ ${format_fail} backups have invalid format"
        REPORT_OUTPUT+="❌ ${format_fail} backups invalid format\n"
        ((TESTS_FAILED++))
    fi
}

# Test 5: Check metadata completeness
test_metadata_completeness() {
    log_test "Test 5: Checking backup metadata..."
    
    local metadata_complete=0
    local metadata_incomplete=0
    
    for backup_file in "${RECENT_BACKUPS[@]}"; do
        local filename=$(basename "${backup_file}")
        local metadata_file="${backup_file}.metadata.json"
        
        if [ ! -f "${metadata_file}" ]; then
            log_warn "  ⚠️  No metadata: ${filename}"
            ((metadata_incomplete++))
            continue
        fi
        
        # Check for required metadata fields
        if grep -q '"table_count"' "${metadata_file}" && \
           grep -q '"checksum_sha256"' "${metadata_file}" && \
           grep -q '"postgres_version"' "${metadata_file}"; then
            log_info "  ✓ Metadata complete: ${filename}"
            ((metadata_complete++))
        else
            log_warn "  ⚠️  Incomplete metadata: ${filename}"
            ((metadata_incomplete++))
        fi
    done
    
    if [ $metadata_incomplete -eq 0 ]; then
        log_info "✓ All metadata complete (${metadata_complete}/${#RECENT_BACKUPS[@]})"
        REPORT_OUTPUT+="✓ All metadata complete (${metadata_complete}/${#RECENT_BACKUPS[@]})\n"
        ((TESTS_PASSED++))
    else
        log_warn "⚠️  ${metadata_incomplete} backups have incomplete metadata"
        REPORT_OUTPUT+="⚠️  ${metadata_incomplete} incomplete metadata entries\n"
        ((TESTS_WARNED++))
    fi
}

# Test 6: Backup storage statistics
test_storage_statistics() {
    log_test "Test 6: Checking storage usage..."
    
    local total_size=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
    local backup_count=$(find "${BACKUP_DIR}" -name "backup_*.sql*" -type f 2>/dev/null | wc -l)
    
    log_info "  Storage used: ${total_size}"
    log_info "  Total backups: ${backup_count}"
    
    REPORT_OUTPUT+="Storage: ${total_size} (${backup_count} backups)\n"
    ((TESTS_PASSED++))
}

# Send validation report
send_validation_report() {
    local status=$1
    local details=$2
    
    if [ "$EMAIL_ENABLED" != "true" ]; then
        return 0
    fi
    
    local subject
    if [ "$status" == "success" ]; then
        subject="${EMAIL_SUBJECT_PREFIX} Weekly Validation Passed"
    else
        subject="${EMAIL_SUBJECT_PREFIX} Weekly Validation Failed - Action Required"
    fi
    
    local email_body=$(cat <<EOF
Maps Tracker Weekly Backup Validation Report
════════════════════════════════════════════════════════════════

Status:     $([ "$status" == "success" ] && echo "✓ SUCCESSFUL" || echo "✗ FAILED")
Timestamp:  $(date '+%Y-%m-%d %H:%M:%S')
Week:       $(date '+%Y-W%V')
Server:     $(hostname)

VALIDATION RESULTS
──────────────────────────────────────────────────────────────────
Tests Passed:   ${TESTS_PASSED}
Tests Failed:   ${TESTS_FAILED}
Tests Warned:   ${TESTS_WARNED}

DETAILS
──────────────────────────────────────────────────────────────────
${details}

NEXT STEPS
──────────────────────────────────────────────────────────────────
- Next weekly validation: $(date -d '1 week' '+%Y-%m-%d %H:%M:%S')
- Next monthly restore test: $(date -d '1 month' '+%Y-%m-%d %H:%M:%S')
- Full report: ${REPORT_FILE}

════════════════════════════════════════════════════════════════
This is an automated weekly backup validation for integrity verification.
EOF
)
    
    # Try using the SMTP relay script
    local SEND_EMAIL_SCRIPT="${BASE_DIR}/scripts/email/send-email.sh"
    if [ -f "${SEND_EMAIL_SCRIPT}" ]; then
        "${SEND_EMAIL_SCRIPT}" "$EMAIL_RECIPIENT" "$subject" "$email_body" 2>&1 | tee -a "${VALIDATION_LOG}"
        return 0
    fi
    
    # Fallback to mail command
    if command -v mail &> /dev/null || command -v mailx &> /dev/null; then
        local MAIL_CMD="mail"
        if command -v mailx &> /dev/null; then
            MAIL_CMD="mailx"
        fi
        echo "$email_body" | $MAIL_CMD -s "$subject" "$EMAIL_RECIPIENT" 2>&1 | tee -a "${VALIDATION_LOG}"
    fi
}

# Main execution
main() {
    log_info "=========================================="
    log_info "Weekly Backup Validation - $(date '+%Y-%m-%d')"
    log_info "=========================================="
    log_info ""
    
    # Run all tests
    test_backup_directory || true
    test_recent_backups || true
    test_checksum_integrity || true
    test_postgresql_format || true
    test_metadata_completeness || true
    test_storage_statistics || true
    
    log_info ""
    log_info "=========================================="
    log_info "Validation Summary"
    log_info "=========================================="
    log_info "Passed:  ${TESTS_PASSED}"
    log_info "Failed:  ${TESTS_FAILED}"
    log_info "Warned:  ${TESTS_WARNED}"
    log_info "=========================================="
    
    # Generate report file
    {
        echo "Weekly Backup Validation Report"
        echo "$(date '+%Y-%m-%d %H:%M:%S')"
        echo "=================================================="
        echo ""
        echo -e "$REPORT_OUTPUT"
        echo ""
        echo "Passed:  ${TESTS_PASSED}"
        echo "Failed:  ${TESTS_FAILED}"
        echo "Warned:  ${TESTS_WARNED}"
    } > "${REPORT_FILE}"
    
    # Determine overall status
    if [ $TESTS_FAILED -eq 0 ]; then
        if [ $TESTS_WARNED -eq 0 ]; then
            log_info "✅ ALL VALIDATION TESTS PASSED"
            send_validation_report "success" "$(echo -e "$REPORT_OUTPUT")"
            exit 0
        else
            log_warn "⚠️  VALIDATION PASSED WITH WARNINGS"
            send_validation_report "success" "$(echo -e "$REPORT_OUTPUT")"
            exit 0
        fi
    else
        log_error "❌ VALIDATION FAILED"
        send_validation_report "failure" "$(echo -e "$REPORT_OUTPUT")"
        exit 1
    fi
}

main "$@"

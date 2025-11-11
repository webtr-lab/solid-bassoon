#!/bin/bash
#
# Maps Tracker Smart Restore Script
# Intelligently restores from organized backup structure
#
# Features:
#   - Auto-finds latest backup
#   - Supports date-based restore (restore to specific date)
#   - Handles compressed (.gz) backups
#   - Validates before restore
#   - Creates safety backup before restore
#   - Email notifications
#
# Usage:
#   ./restore-backup.sh --latest                    # Restore from latest backup
#   ./restore-backup.sh --date 2025-11-01           # Restore from specific date
#   ./restore-backup.sh --file backup_full_*.sql    # Restore from specific file
#   ./restore-backup.sh --list                      # List available backups
#   ./restore-backup.sh --interactive               # Interactive mode
#

set -e

# Configuration
# Automatically detect the project directory (scripts/backup -> scripts -> effective-guide)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
BACKUP_ROOT="${BASE_DIR}/backups"
LOG_DIR="${BASE_DIR}/logs"
RESTORE_LOG="${LOG_DIR}/restore.log"

# Database settings (will be overridden after sourcing .env)
DB_CONTAINER="effective-guide-db-1"

# Email settings (sourced from .env or with defaults)
EMAIL_ENABLED="${BACKUP_EMAIL_ENABLED:-true}"
EMAIL_RECIPIENT="${BACKUP_EMAIL:-admin@example.com}"
EMAIL_SUBJECT_PREFIX="[Maps Tracker Restore]"

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

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Logging functions
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${RESTORE_LOG}"
}

log_info() {
    log "INFO" "$@" >&2
    echo -e "${GREEN}[INFO]${NC} $@" >&2
}

log_error() {
    log "ERROR" "$@"
    echo -e "${RED}[ERROR]${NC} $@" >&2
}

log_warn() {
    log "WARN" "$@" >&2
    echo -e "${YELLOW}[WARN]${NC} $@" >&2
}

# Find latest backup
find_latest_backup() {
    local backup_type=$1  # "full" or "daily" or "any"

    log_info "Searching for latest backup (type: ${backup_type})..."

    local search_paths=""
    if [ "$backup_type" == "full" ]; then
        search_paths="${BACKUP_ROOT}/full"
    elif [ "$backup_type" == "daily" ]; then
        search_paths="${BACKUP_ROOT}/daily"
    else
        search_paths="${BACKUP_ROOT}/full ${BACKUP_ROOT}/daily"
    fi

    local latest_backup=$(find ${search_paths} -name "backup_*.sql" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | awk '{print $2}')

    if [ -z "$latest_backup" ]; then
        log_error "No backups found"
        return 1
    fi

    log_info "Latest backup: ${latest_backup}"
    echo "${latest_backup}"
}

# Find backup by date
find_backup_by_date() {
    local target_date=$1  # Format: YYYY-MM-DD

    log_info "Searching for backup from date: ${target_date}..."

    # Convert date to path format
    local year=$(echo $target_date | cut -d'-' -f1)
    local month=$(echo $target_date | cut -d'-' -f2)
    local day=$(echo $target_date | cut -d'-' -f3)

    local search_path1="${BACKUP_ROOT}/full/${year}/${month}/${day}"
    local search_path2="${BACKUP_ROOT}/daily/${year}/${month}/${day}"

    # Prefer full backup, fall back to daily
    local backup_file=$(find "${search_path1}" "${search_path2}" -name "backup_*.sql" -type f 2>/dev/null | head -1)

    if [ -z "$backup_file" ]; then
        log_error "No backup found for date: ${target_date}"
        return 1
    fi

    log_info "Found backup: ${backup_file}"
    echo "${backup_file}"
}

# Validate backup file
validate_backup() {
    local backup_file=$1

    log_info "Validating backup: ${backup_file}"

    # Handle relative paths from backup root
    local full_path="${backup_file}"
    if [[ ! "${backup_file}" == /* ]]; then
        # Relative path - resolve from BACKUP_ROOT
        full_path="${BACKUP_ROOT}/${backup_file}"
    fi

    # Check if file exists
    if [ ! -f "${full_path}" ]; then
        log_error "Backup file not found: ${full_path}"
        return 1
    fi

    # Use resolved full path for the rest of the function
    backup_file="${full_path}"

    # Handle compressed files
    local test_file="${backup_file}"
    local is_compressed=false

    if [[ "${backup_file}" == *.gz ]]; then
        log_info "Backup is compressed, decompressing for validation..."
        is_compressed=true
        test_file="${backup_file%.gz}"

        if [ ! -f "${test_file}" ]; then
            gunzip -k "${backup_file}"
        fi
    fi

    # Validate PostgreSQL format
    log_info "Checking PostgreSQL format..."

    # Calculate the relative path from BACKUP_ROOT for Docker mount
    local docker_path="/backups"
    if [[ "${backup_file}" == "${BACKUP_ROOT}"/* ]]; then
        # Remove BACKUP_ROOT prefix to get relative path
        local relative_path="${backup_file#${BACKUP_ROOT}/}"
        docker_path="/backups/${relative_path}"
    else
        docker_path="/backups/$(basename "${test_file}")"
    fi

    if docker compose exec -T db pg_restore --list "${docker_path}" > /dev/null 2>&1; then
        log_info "✓ PostgreSQL format valid"
    else
        log_error "✗ Invalid PostgreSQL backup format"

        # Cleanup decompressed file if we created it
        if [ "$is_compressed" == true ] && [ -f "${test_file}" ]; then
            rm -f "${test_file}"
        fi

        return 1
    fi

    # Verify checksum if available
    if [ -f "${backup_file}.md5" ]; then
        log_info "Verifying checksum..."
        local stored_checksum=$(cat "${backup_file}.md5" | awk '{print $1}')
        local actual_checksum=$(md5sum "${backup_file}" | awk '{print $1}')

        if [ "${stored_checksum}" == "${actual_checksum}" ]; then
            log_info "✓ Checksum verification passed"
        else
            log_error "✗ Checksum mismatch!"
            log_error "  Stored: ${stored_checksum}"
            log_error "  Actual: ${actual_checksum}"
            return 1
        fi
    else
        log_warn "No checksum file found, skipping checksum validation"
    fi

    log_info "✓ Backup validation passed"
    return 0
}

# Create safety backup before restore
create_safety_backup() {
    log_info "Creating safety backup of current database..."

    local safety_dir="${BACKUP_ROOT}/pre-restore-safety"
    mkdir -p "${safety_dir}"

    local safety_filename="safety_backup_$(date '+%Y%m%d_%H%M%S').sql"
    local safety_path="${safety_dir}/${safety_filename}"

    docker compose exec -T db pg_dump \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -F c \
        -Z 6 \
        -f "/backups/$(basename ${safety_path})" 2>&1 | tee -a "${RESTORE_LOG}"

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        # Move to safety directory
        if [ -f "${BACKUP_ROOT}/$(basename ${safety_path})" ]; then
            mv "${BACKUP_ROOT}/$(basename ${safety_path})" "${safety_path}"
            log_info "✓ Safety backup created: ${safety_path}"
            echo "${safety_path}"
            return 0
        fi
    fi

    log_error "Failed to create safety backup"
    return 1
}

# Perform database restore
perform_restore() {
    local backup_file=$1
    local skip_safety=${2:-false}

    log_info "=========================================="
    log_info "Starting database restore..."
    log_info "=========================================="
    log_info "Backup file: ${backup_file}"

    # Validate backup first
    if ! validate_backup "${backup_file}"; then
        log_error "Backup validation failed, aborting restore"
        return 1
    fi

    # Create safety backup unless skipped
    if [ "$skip_safety" != "true" ]; then
        if ! create_safety_backup; then
            log_error "Failed to create safety backup"
            read -p "Continue anyway? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                log_info "Restore aborted by user"
                return 1
            fi
        fi
    fi

    # Resolve full path if relative
    local full_backup_path="${backup_file}"
    if [[ ! "${backup_file}" == /* ]]; then
        # Relative path - resolve from BACKUP_ROOT
        full_backup_path="${BACKUP_ROOT}/${backup_file}"
    fi

    # Handle compressed backups
    local restore_file="${full_backup_path}"
    local cleanup_decompressed=false

    if [[ "${full_backup_path}" == *.gz ]]; then
        log_info "Decompressing backup for restore..."
        restore_file="${full_backup_path%.gz}"

        if [ ! -f "${restore_file}" ]; then
            gunzip -k "${full_backup_path}"
            cleanup_decompressed=true
        fi
    fi

    # Calculate docker path from the resolved path
    local docker_path="/backups"
    if [[ "${restore_file}" == "${BACKUP_ROOT}"/* ]]; then
        local relative_path="${restore_file#${BACKUP_ROOT}/}"
        docker_path="/backups/${relative_path}"
    else
        docker_path="/backups/$(basename "${restore_file}")"
    fi

    # Confirm restore
    echo ""
    echo -e "${RED}WARNING: This will replace all current database data!${NC}"
    echo -e "Backup: ${CYAN}${backup_file}${NC}"
    echo ""
    read -p "Are you absolutely sure you want to continue? (type 'yes' to confirm): " confirm

    if [ "$confirm" != "yes" ]; then
        log_info "Restore cancelled by user"

        # Cleanup if needed
        if [ "$cleanup_decompressed" == true ]; then
            rm -f "${restore_file}"
        fi

        return 1
    fi

    # Perform restore
    log_info "Restoring database from: $(basename ${restore_file})"
    log_info "This may take several minutes..."

    docker compose exec -T db pg_restore \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        --clean \
        --if-exists \
        -v \
        "${docker_path}" 2>&1 | tee -a "${RESTORE_LOG}"

    local restore_exit_code=${PIPESTATUS[0]}

    # Cleanup decompressed file if we created it
    if [ "$cleanup_decompressed" == true ]; then
        rm -f "${restore_file}"
    fi

    if [ $restore_exit_code -eq 0 ]; then
        log_info "Database restore completed"

        # Restart backend to reload connections
        log_info "Restarting backend service..."
        docker compose restart backend 2>&1 | tee -a "${RESTORE_LOG}"

        log_info "=========================================="
        log_info "✓ RESTORE COMPLETED SUCCESSFULLY"
        log_info "=========================================="
        return 0
    else
        log_error "=========================================="
        log_error "✗ RESTORE FAILED"
        log_error "=========================================="
        log_error "Check logs for details: ${RESTORE_LOG}"
        return 1
    fi
}

# List available backups
list_available_backups() {
    echo ""
    echo -e "${BLUE}=========================================="
    echo -e "Available Backups"
    echo -e "==========================================${NC}"
    echo ""

    echo -e "${CYAN}--- FULL BACKUPS ---${NC}"
    find "${BACKUP_ROOT}/full" -name "backup_full_*.sql*" -type f -printf '%TY-%Tm-%Td %TH:%TM  %s bytes  %p\n' 2>/dev/null | sort -r | head -20

    echo ""
    echo -e "${CYAN}--- DAILY BACKUPS (Last 10) ---${NC}"
    find "${BACKUP_ROOT}/daily" -name "backup_daily_*.sql*" -type f -printf '%TY-%Tm-%Td %TH:%TM  %s bytes  %p\n' 2>/dev/null | sort -r | head -10

    echo ""
    echo -e "${CYAN}--- SAFETY BACKUPS ---${NC}"
    find "${BACKUP_ROOT}/pre-restore-safety" -name "safety_backup_*.sql" -type f -printf '%TY-%Tm-%Td %TH:%TM  %s bytes  %p\n' 2>/dev/null | sort -r | head -5

    echo ""
}

# Interactive mode
interactive_restore() {
    echo ""
    echo -e "${BLUE}=========================================="
    echo -e "Interactive Restore Mode"
    echo -e "==========================================${NC}"
    echo ""

    list_available_backups

    echo ""
    echo "Restore Options:"
    echo "  1) Restore from latest backup"
    echo "  2) Restore from specific date"
    echo "  3) Restore from specific file"
    echo "  4) Exit"
    echo ""
    read -p "Select option (1-4): " option

    case $option in
        1)
            local latest=$(find_latest_backup "any")
            if [ -n "$latest" ]; then
                perform_restore "$latest"
            fi
            ;;
        2)
            read -p "Enter date (YYYY-MM-DD): " target_date
            local backup=$(find_backup_by_date "$target_date")
            if [ -n "$backup" ]; then
                perform_restore "$backup"
            fi
            ;;
        3)
            read -p "Enter full path to backup file: " backup_file
            if [ -f "$backup_file" ]; then
                perform_restore "$backup_file"
            else
                log_error "File not found: $backup_file"
            fi
            ;;
        4)
            log_info "Exiting interactive mode"
            exit 0
            ;;
        *)
            log_error "Invalid option"
            exit 1
            ;;
    esac
}

# Send email notification
send_email_notification() {
    local status=$1
    local backup_file=$2
    local restore_duration=$3

    if [ "$EMAIL_ENABLED" != "true" ]; then
        return 0
    fi

    local subject
    local email_body

    if [ "$status" == "success" ]; then
        subject="${EMAIL_SUBJECT_PREFIX} [RESTORE] Database Restored Successfully"
        email_body=$(python3 << PYTHON_EOF
import sys
sys.path.insert(0, '$BASE_DIR')
from scripts.email.email_templates import format_restore_success

backup_file = '''$backup_file'''
restore_duration = '''$restore_duration'''

print(format_restore_success(backup_file.strip(), restore_duration.strip()))
PYTHON_EOF
)
    else
        subject="${EMAIL_SUBJECT_PREFIX} [RESTORE] Database Restore Failed - Action Required"
        email_body=$(python3 << PYTHON_EOF
import sys
sys.path.insert(0, '$BASE_DIR')
from scripts.email.email_templates import format_restore_failure

backup_file = '''$backup_file'''
error_msg = "See logs/restore-backup.log for details"

print(format_restore_failure(backup_file.strip(), error_msg))
PYTHON_EOF
)
    fi

    # Try using the SMTP relay script from scripts/email directory
    local SEND_EMAIL_SCRIPT="${BASE_DIR}/scripts/email/send-email.sh"
    if [ -f "${SEND_EMAIL_SCRIPT}" ]; then
        "${SEND_EMAIL_SCRIPT}" "$EMAIL_RECIPIENT" "$subject" "$email_body" 2>&1 | tee -a "${RESTORE_LOG}"
        return 0
    fi

    # Fallback to parent directory for backward compatibility
    SEND_EMAIL_SCRIPT="$(dirname "${BASE_DIR}")/send-email.sh"
    if [ -f "${SEND_EMAIL_SCRIPT}" ]; then
        "${SEND_EMAIL_SCRIPT}" "$EMAIL_RECIPIENT" "$subject" "$email_body" 2>&1 | tee -a "${RESTORE_LOG}"
        return 0
    fi

    # Final fallback to mail command if available
    if command -v mail &> /dev/null || command -v mailx &> /dev/null; then
        local MAIL_CMD="mail"
        if command -v mailx &> /dev/null; then
            MAIL_CMD="mailx"
        fi
        echo "$email_body" | $MAIL_CMD -s "$subject" "$EMAIL_RECIPIENT" 2>&1 | tee -a "${RESTORE_LOG}"
        return 0
    fi

    log_warn "Email notification skipped: no mail delivery method available"
    return 1
}

# Main function
main() {
    local command=${1:-"--help"}

    case "$command" in
        --latest)
            local latest=$(find_latest_backup "any")
            if [ -n "$latest" ]; then
                if perform_restore "$latest"; then
                    send_email_notification "success" "$latest" "Database successfully restored from latest backup"
                else
                    send_email_notification "failure" "$latest" "Database restore failed"
                    exit 1
                fi
            else
                exit 1
            fi
            ;;
        --date)
            if [ -z "$2" ]; then
                log_error "Date required. Format: YYYY-MM-DD"
                exit 1
            fi
            local backup=$(find_backup_by_date "$2")
            if [ -n "$backup" ]; then
                if perform_restore "$backup"; then
                    send_email_notification "success" "$backup" "Database successfully restored from $2"
                else
                    send_email_notification "failure" "$backup" "Database restore failed"
                    exit 1
                fi
            else
                exit 1
            fi
            ;;
        --file)
            if [ -z "$2" ]; then
                log_error "Backup file path required"
                exit 1
            fi
            if perform_restore "$2"; then
                send_email_notification "success" "$2" "Database successfully restored"
            else
                send_email_notification "failure" "$2" "Database restore failed"
                exit 1
            fi
            ;;
        --list)
            list_available_backups
            ;;
        --interactive)
            interactive_restore
            ;;
        --help)
            cat <<EOF
Maps Tracker Smart Restore Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  --latest              Restore from latest backup
  --date YYYY-MM-DD     Restore from specific date
  --file PATH           Restore from specific file
  --list                List available backups
  --interactive         Interactive restore mode
  --help                Show this help message

Features:
  - Automatic backup validation before restore
  - Creates safety backup before restore
  - Handles compressed (.gz) backups
  - Email notifications
  - Checksum verification

Safety:
  - Always creates a pre-restore safety backup
  - Requires explicit confirmation
  - Validates backup integrity first
  - Detailed logging

Examples:
  $0 --latest                           # Restore from latest
  $0 --date 2025-11-01                  # Restore from Nov 1
  $0 --file /path/to/backup.sql         # Restore specific file
  $0 --interactive                      # Interactive mode

IMPORTANT: This will replace all current database data!
A safety backup will be created before restore.

EOF
            ;;
        *)
            log_error "Unknown command: $command"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"

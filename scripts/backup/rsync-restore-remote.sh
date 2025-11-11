#!/bin/bash
#
# Remote Restore Script - Rsync from Remote Server
# Restores backups/ and logs/ directories from remote server
#
# Usage: ./rsync-restore-remote.sh [backups|logs|all]
#
# Configuration:
#   - Remote server: 192.168.100.74
#   - Remote user: demo (change if needed)
#   - SSH key authentication (must be configured)
#

set -e  # Exit on any error

# Automatically detect the project directory (scripts/backup -> scripts -> effective-guide)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"

# Load .env if it exists for environment variables
if [ -f "${LOCAL_BASE_DIR}/.env" ]; then
    set +a
    source "${LOCAL_BASE_DIR}/.env"
    set -a
fi

# Remote backup configuration (from .env or defaults)
REMOTE_USER="${REMOTE_BACKUP_USER:-demo}"
REMOTE_HOST="${REMOTE_BACKUP_HOST:-192.168.100.74}"
REMOTE_BASE_DIR="${REMOTE_BACKUP_DIR:-~/maps-tracker-backup}"  # Using home directory (no sudo required)
REMOTE_SSH_PORT="${REMOTE_BACKUP_SSH_PORT:-22}"

# Directories to restore
BACKUP_DIR="${LOCAL_BASE_DIR}/backups"
LOGS_DIR="${LOCAL_BASE_DIR}/logs"

# Email notification settings (from .env or defaults)
EMAIL_ENABLED="${BACKUP_EMAIL_ENABLED:-true}"
EMAIL_RECIPIENT="${BACKUP_EMAIL:-admin@example.com}"
EMAIL_SUBJECT_PREFIX="[Maps Tracker Restore]"

# Colors for output (only use if outputting to a terminal)
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    NC=''
fi

# Logging functions
log_error() {
    echo -e "${RED}ERROR: $@${NC}" >&2
}

log_info() {
    echo -e "${GREEN}INFO: $@${NC}"
}

log_warn() {
    echo -e "${YELLOW}WARN: $@${NC}"
}

# Check if required commands are available
check_requirements() {
    log_info "Checking requirements..."

    if ! command -v rsync &> /dev/null; then
        log_error "rsync is not installed. Install with: sudo apt-get install rsync"
        exit 1
    fi

    if ! command -v ssh &> /dev/null; then
        log_error "ssh is not installed."
        exit 1
    fi

    log_info "All required commands are available"
}

# Test SSH connection to remote server
test_ssh_connection() {
    log_info "Testing SSH connection to ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_SSH_PORT}..."

    if ssh -o BatchMode=yes -o ConnectTimeout=10 -p "${REMOTE_SSH_PORT}" "${REMOTE_USER}@${REMOTE_HOST}" "echo 'SSH connection successful'" &> /dev/null; then
        log_info "SSH connection test passed"
        return 0
    else
        log_error "SSH connection failed. Please check SSH configuration"
        exit 1
    fi
}

# List available backups on remote server
list_remote_backups() {
    log_info "Listing available backups on remote server..."
    echo ""

    log_info "Database Backups (organized by type and date):"
    ssh -p "${REMOTE_SSH_PORT}" "${REMOTE_USER}@${REMOTE_HOST}" "find ${REMOTE_BASE_DIR}/backups -name '*.sql' -type f 2>/dev/null | sort -r || echo 'No database backups found'"

    echo ""
    log_info "Log Files:"
    ssh -p "${REMOTE_SSH_PORT}" "${REMOTE_USER}@${REMOTE_HOST}" "ls -lh ${REMOTE_BASE_DIR}/logs/*.log* 2>/dev/null | tail -10 || echo 'No log files found'"
}

# Restore function
restore_directory() {
    local dest_dir=$1
    local source_name=$2
    local remote_source="${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BASE_DIR}/${source_name}/"

    log_info "Starting restore of ${source_name} from ${remote_source}"

    # Check if remote directory exists
    # Use single quotes to allow tilde expansion on remote side
    if ! ssh -p "${REMOTE_SSH_PORT}" "${REMOTE_USER}@${REMOTE_HOST}" '[ -d '"${REMOTE_BASE_DIR}"'/'${source_name}' ]'; then
        log_error "Remote directory does not exist: ${REMOTE_BASE_DIR}/${source_name}"
        return 1
    fi

    # Create local directory if it doesn't exist
    mkdir -p "${dest_dir}"

    # Rsync options:
    #   -a: archive mode (preserves permissions, timestamps, etc.)
    #   -v: verbose
    #   -z: compress during transfer
    #   --no-g: don't preserve group ownership (fixes permission errors)
    #   --no-perms: don't preserve permissions (use default umask)
    #   --stats: show transfer statistics
    #   --human-readable: human-readable numbers
    #   -e ssh: use ssh for transfer
    #   Note: NO --delete flag to avoid deleting local files

    rsync -avz \
        --no-g \
        --no-perms \
        --stats \
        --human-readable \
        -e "ssh -p ${REMOTE_SSH_PORT} -o BatchMode=yes -o ConnectTimeout=10" \
        "${remote_source}" \
        "${dest_dir}/"

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log_info "Successfully restored ${source_name}"
        return 0
    else
        log_error "Failed to restore ${source_name}"
        return 1
    fi
}

# Show usage
usage() {
    cat << EOF
Usage: $0 [backups|logs|all|list]

Commands:
    backups    - Restore database backups from remote server
    logs       - Restore log files from remote server
    all        - Restore both backups and logs (default)
    list       - List available backups on remote server

Examples:
    $0                  # Restore everything
    $0 backups          # Restore only database backups
    $0 logs             # Restore only logs
    $0 list             # List remote backups

Configuration:
    Remote: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BASE_DIR}
    Local: ${LOCAL_BASE_DIR}

EOF
    exit 1
}

# Main restore process
main() {
    local mode="${1:-all}"

    case "${mode}" in
        list)
            check_requirements
            test_ssh_connection
            list_remote_backups
            exit 0
            ;;
        backups|logs|all)
            ;;
        -h|--help|help)
            usage
            ;;
        *)
            log_error "Unknown command: ${mode}"
            usage
            ;;
    esac

    log_info "=========================================="
    log_info "Starting restore from ${REMOTE_HOST}"
    log_info "Mode: ${mode}"
    log_info "=========================================="

    local start_time=$(date +%s)

    # Pre-flight checks
    check_requirements
    test_ssh_connection

    # Confirm restore
    log_warn ""
    log_warn "WARNING: This will overwrite local files with remote copies"
    log_warn "Press Ctrl+C within 5 seconds to cancel..."
    sleep 5

    # Track restore results
    local restore_success=0
    local restore_failed=0

    # Restore based on mode
    if [ "${mode}" = "backups" ] || [ "${mode}" = "all" ]; then
        log_info ""
        log_info "--- Restoring database backups ---"
        if restore_directory "${BACKUP_DIR}" "backups"; then
            ((restore_success++))
        else
            ((restore_failed++))
        fi
    fi

    if [ "${mode}" = "logs" ] || [ "${mode}" = "all" ]; then
        log_info ""
        log_info "--- Restoring logs ---"
        if restore_directory "${LOGS_DIR}" "logs"; then
            ((restore_success++))
        else
            ((restore_failed++))
        fi
    fi

    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Summary
    log_info ""
    log_info "=========================================="
    log_info "Restore Summary"
    log_info "=========================================="
    log_info "Successful restores: ${restore_success}"
    log_info "Failed restores: ${restore_failed}"
    log_info "Duration: ${duration} seconds"
    log_info "=========================================="

    if [ ${restore_failed} -gt 0 ]; then
        log_error "Some restores failed"
        exit 1
    else
        log_info "All restores completed successfully"
        exit 0
    fi
}

# Run main function
main "$@"

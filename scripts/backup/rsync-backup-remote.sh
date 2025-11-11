#!/bin/bash
#
# Remote Backup Script - Rsync to Remote Server
# Backs up local backups/ and logs/ directories to remote server
#
# Usage: ./rsync-backup-remote.sh
#
# Configuration:
#   - Remote server: 192.168.100.74
#   - Remote user: demo (change if needed)
#   - SSH key authentication (must be configured)
#

# Note: We don't use 'set -e' to allow partial backups to succeed
# Individual backup failures are tracked and reported in the summary

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
REMOTE_BACKUP_ENABLED="${REMOTE_BACKUP_ENABLED:-false}"

# Email notification settings (from .env or defaults)
EMAIL_ENABLED="${BACKUP_EMAIL_ENABLED:-true}"
EMAIL_RECIPIENT="${BACKUP_EMAIL:-admin@example.com}"
EMAIL_SUBJECT_PREFIX="[Maps Tracker Backup]"

# Directories to backup (new organized structure)
BACKUP_DIR="${LOCAL_BASE_DIR}/backups"  # Root backup directory
LOGS_DIR="${LOCAL_BASE_DIR}/logs"

# Backup subdirectories
FULL_BACKUP_DIR="${BACKUP_DIR}/full"
DAILY_BACKUP_DIR="${BACKUP_DIR}/daily"
INDEX_DIR="${BACKUP_DIR}/index"
ARCHIVE_DIR="${BACKUP_DIR}/archive"

# Log file for this script
SCRIPT_LOG="${LOGS_DIR}/rsync-backup.log"

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

# Logging function
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${SCRIPT_LOG}"
}

log_error() {
    log "ERROR" "$@"
    echo -e "${RED}ERROR: $@${NC}" >&2
}

log_info() {
    log "INFO" "$@"
    echo -e "${GREEN}INFO: $@${NC}"
}

log_warn() {
    log "WARN" "$@"
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
        log_error "SSH connection failed. Please check:"
        log_error "  1. SSH keys are properly configured"
        log_error "  2. Remote host is reachable: ping ${REMOTE_HOST}"
        log_error "  3. SSH service is running on remote host (port ${REMOTE_SSH_PORT})"
        log_error "  4. Remote user exists: ${REMOTE_USER}"
        exit 1
    fi
}

# Create remote directories if they don't exist
setup_remote_directories() {
    log_info "Setting up remote directories..."

    # Use single quotes to allow tilde expansion on remote side
    ssh -p "${REMOTE_SSH_PORT}" "${REMOTE_USER}@${REMOTE_HOST}" 'mkdir -p '"${REMOTE_BASE_DIR}"'/{backups,logs}' 2>&1 | tee -a "${SCRIPT_LOG}"

    # Check the SSH exit code (first element of PIPESTATUS)
    local ssh_exit_code=${PIPESTATUS[0]}
    if [ ${ssh_exit_code} -eq 0 ]; then
        log_info "Remote directories created/verified"
    else
        log_error "Failed to create remote directories (SSH exit code: ${ssh_exit_code})"
        exit 1
    fi
}

# Send email notification with backup status
send_email_notification() {
    local status=$1
    local backup_count=$2
    local total_size=$3
    local duration=$4

    # Check if email is enabled
    if [ "$EMAIL_ENABLED" != "true" ]; then
        return 0
    fi

    local subject
    local email_body

    # Determine status and subject
    if [ "$status" == "success" ]; then
        subject="${EMAIL_SUBJECT_PREFIX} [RSYNC] Remote Backup Sync Completed Successfully"
        email_body=$(python3 << PYTHON_EOF
import sys
sys.path.insert(0, '$LOCAL_BASE_DIR')
from scripts.email.email_templates import format_remote_sync_success

backup_count = '''$backup_count'''
total_size = '''$total_size'''
duration = '''$duration'''
remote_host = '''$REMOTE_HOST'''

print(format_remote_sync_success(backup_count.strip(), total_size.strip(), duration.strip(), remote_host.strip()))
PYTHON_EOF
)
    else
        subject="${EMAIL_SUBJECT_PREFIX} [RSYNC] Remote Backup Sync Failed - Action Required"
        email_body=$(python3 << PYTHON_EOF
import sys
sys.path.insert(0, '$LOCAL_BASE_DIR')
from scripts.email.email_templates import format_remote_sync_failure

remote_host = '''$REMOTE_HOST'''
error_msg = "See logs/rsync-backup.log for details"

print(format_remote_sync_failure(error_msg, remote_host.strip()))
PYTHON_EOF
)
    fi

    # Send email
    log_info "Sending email notification to ${EMAIL_RECIPIENT}..."

    # Try using the SMTP relay script from scripts/email directory
    local SEND_EMAIL_SCRIPT="${LOCAL_BASE_DIR}/scripts/email/send-email.sh"
    if [ -f "${SEND_EMAIL_SCRIPT}" ]; then
        "${SEND_EMAIL_SCRIPT}" "$EMAIL_RECIPIENT" "$subject" "$email_body" 2>&1 | tee -a "${SCRIPT_LOG}"
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            log_info "Email notification sent successfully"
            return 0
        else
            log_error "Failed to send email notification"
            return 1
        fi
    fi

    # Fallback to parent directory for backward compatibility
    SEND_EMAIL_SCRIPT="$(dirname "${LOCAL_BASE_DIR}")/send-email.sh"
    if [ -f "${SEND_EMAIL_SCRIPT}" ]; then
        "${SEND_EMAIL_SCRIPT}" "$EMAIL_RECIPIENT" "$subject" "$email_body" 2>&1 | tee -a "${SCRIPT_LOG}"
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            log_info "Email notification sent successfully"
            return 0
        else
            log_error "Failed to send email notification"
            return 1
        fi
    fi

    # Fall back to mail command if available
    if command -v mail &> /dev/null || command -v mailx &> /dev/null; then
        local MAIL_CMD="mail"
        if command -v mailx &> /dev/null; then
            MAIL_CMD="mailx"
        fi
        echo "$email_body" | $MAIL_CMD -s "$subject" "$EMAIL_RECIPIENT" 2>&1 | tee -a "${SCRIPT_LOG}"
        if [ ${PIPESTATUS[1]} -eq 0 ]; then
            log_info "Email notification sent successfully"
            return 0
        fi
    fi

    log_warn "Email notification skipped: no mail delivery method available"
    return 1
}

# Verify checksums after backup (supports nested directory structure)
verify_backup_checksums() {
    local source_dir=$1
    local dest_name=$2
    local verification_failed=0
    local verified_count=0

    log_info "Verifying backup integrity with checksums..."

    # Find all .md5 checksum files in source directory (including subdirectories)
    while IFS= read -r -d '' checksum_file; do
        local filename=$(basename "${checksum_file}" .md5)
        local source_file="${checksum_file%.md5}"

        # Skip if source file doesn't exist
        if [ ! -f "${source_file}" ]; then
            continue
        fi

        # Get local checksum
        local local_checksum=$(cat "${checksum_file}" | awk '{print $1}')

        # Get relative path from source_dir
        local rel_path=$(realpath --relative-to="${source_dir}" "${source_file}")

        # Get remote checksum
        # Use single quotes to allow tilde expansion on remote side
        local remote_checksum=$(ssh -p "${REMOTE_SSH_PORT}" "${REMOTE_USER}@${REMOTE_HOST}" \
            'md5sum '"${REMOTE_BASE_DIR}"'/'${dest_name}'/'${rel_path}' 2>/dev/null' | awk '{print $1}')

        if [ -z "${remote_checksum}" ]; then
            log_warn "Could not verify checksum for ${rel_path} (file may not exist on remote)"
            continue
        fi

        # Compare checksums
        if [ "${local_checksum}" = "${remote_checksum}" ]; then
            log_info "  ✓ Checksum verified: ${rel_path}"
            ((verified_count++))
        else
            log_error "  ✗ Checksum mismatch: ${rel_path}"
            log_error "    Local:  ${local_checksum}"
            log_error "    Remote: ${remote_checksum}"
            ((verification_failed++))
        fi
    done < <(find "${source_dir}" -name "*.md5" -print0)

    if [ ${verification_failed} -gt 0 ]; then
        log_error "Checksum verification failed for ${verification_failed} file(s)"
        log_info "Successfully verified ${verified_count} file(s)"
        return 1
    else
        log_info "All checksums verified successfully (${verified_count} files)"
        return 0
    fi
}

# Backup function with progress reporting
backup_directory() {
    local source_dir=$1
    local dest_name=$2
    local remote_dest="${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BASE_DIR}/${dest_name}/"

    log_info "Starting backup of ${source_dir} to ${remote_dest}"

    # Check if source directory exists
    if [ ! -d "${source_dir}" ]; then
        log_warn "Source directory does not exist: ${source_dir}"
        return 1
    fi

    # Count files before backup
    local file_count=$(find "${source_dir}" -type f | wc -l)
    local dir_size=$(du -sh "${source_dir}" | cut -f1)

    log_info "Backing up ${file_count} files (${dir_size})"

    # Rsync options:
    #   -a: archive mode (preserves permissions, timestamps, etc.)
    #   -v: verbose
    #   -z: compress during transfer
    #   --delete: delete files on remote that don't exist locally (mirror)
    #   --stats: show transfer statistics
    #   --human-readable: human-readable numbers
    #   -e ssh: use ssh for transfer

    rsync -avz \
        --delete \
        --stats \
        --human-readable \
        -e "ssh -p ${REMOTE_SSH_PORT} -o BatchMode=yes -o ConnectTimeout=10" \
        "${source_dir}/" \
        "${remote_dest}" 2>&1 | tee -a "${SCRIPT_LOG}"

    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        log_info "Successfully backed up ${dest_name}"

        # Verify checksums if this is the backups directory
        if [ "${dest_name}" = "backups" ]; then
            verify_backup_checksums "${source_dir}" "${dest_name}"
            if [ $? -ne 0 ]; then
                log_error "Checksum verification failed for ${dest_name}"
                return 1
            fi
        fi

        return 0
    else
        log_error "Failed to backup ${dest_name}"
        return 1
    fi
}

# Main backup process
main() {
    log_info "=========================================="
    log_info "Starting remote backup to ${REMOTE_HOST}"
    log_info "=========================================="

    local start_time=$(date +%s)

    # Pre-flight checks
    check_requirements
    test_ssh_connection
    setup_remote_directories

    # Track backup results
    local backup_success=0
    local backup_failed=0

    # Backup entire organized backup structure (full/, daily/, index/, archive/)
    log_info ""
    log_info "--- Backing up organized backup structure ---"
    log_info "This includes: full/, daily/, index/, and archive/ directories"
    if backup_directory "${BACKUP_DIR}" "backups"; then
        ((backup_success++))
    else
        ((backup_failed++))
    fi

    # Backup logs directory
    log_info ""
    log_info "--- Backing up logs ---"
    if backup_directory "${LOGS_DIR}" "logs"; then
        ((backup_success++))
    else
        ((backup_failed++))
    fi

    # Calculate duration
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Summary
    log_info ""
    log_info "=========================================="
    log_info "Backup Summary"
    log_info "=========================================="
    log_info "Successful backups: ${backup_success}"
    log_info "Failed backups: ${backup_failed}"
    log_info "Duration: ${duration} seconds"
    log_info "Remote location: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BASE_DIR}"
    log_info "=========================================="

    # Send email notification
    if [ ${backup_failed} -gt 0 ]; then
        send_email_notification "failure" "${backup_success}" "${backup_failed}" "${duration}"
        log_error "Some backups failed. Check ${SCRIPT_LOG} for details"
        exit 1
    else
        send_email_notification "success" "${backup_success}" "${backup_failed}" "${duration}"
        log_info "All backups completed successfully"
        exit 0
    fi
}

# Run main function
main "$@"

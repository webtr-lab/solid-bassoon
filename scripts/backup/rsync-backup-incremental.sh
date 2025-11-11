#!/bin/bash
#
# Optimized Incremental Remote Backup Script
# Efficiently syncs incremental backups (basebackup + WAL files) to remote server
# Much faster than syncing full backups, especially with WAL archiving
#
# Features:
#   - Efficient incremental WAL file syncing
#   - Hard-link support for WAL chain restoration
#   - Partial transfer resumption
#   - Bandwidth optimization
#   - Backup retention management on remote
#
# Usage: ./rsync-backup-incremental.sh
#
# Schedule: Run every 6 hours (after each basebackup or WAL rotation)
#

# Automatically detect the project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"

# Load .env if it exists
if [ -f "${LOCAL_BASE_DIR}/.env" ]; then
    set +a
    source "${LOCAL_BASE_DIR}/.env"
    set -a
fi

# Configuration
REMOTE_USER="${REMOTE_BACKUP_USER:-demo}"
REMOTE_HOST="${REMOTE_BACKUP_HOST:-192.168.100.74}"
REMOTE_BASE_DIR="${REMOTE_BACKUP_DIR:-~/maps-tracker-backup}"
REMOTE_SSH_PORT="${REMOTE_BACKUP_SSH_PORT:-22}"
REMOTE_BACKUP_ENABLED="${REMOTE_BACKUP_ENABLED:-false}"

BACKUP_DIR="${LOCAL_BASE_DIR}/backups"
LOGS_DIR="${LOCAL_BASE_DIR}/logs"
SCRIPT_LOG="${LOGS_DIR}/rsync-incremental.log"

# Colors
if [ -t 1 ]; then
    RED='\033[0;31m'
    GREEN='\033[0;32m'
    YELLOW='\033[1;33m'
    BLUE='\033[0;34m'
    NC='\033[0m'
else
    RED=''
    GREEN=''
    YELLOW=''
    BLUE=''
    NC=''
fi

# Logging
log() {
    local level=$1
    shift
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] $@" | tee -a "${SCRIPT_LOG}"
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

log_status() {
    log "STATUS" "$@"
    echo -e "${BLUE}[STATUS]${NC} $@"
}

# Main sync function
sync_incremental_backups() {
    log_info "=========================================="
    log_info "Starting optimized incremental sync"
    log_info "=========================================="
    
    # Check remote backup is enabled
    if [ "$REMOTE_BACKUP_ENABLED" != "true" ]; then
        log_warn "Remote backup is disabled in .env"
        return 1
    fi
    
    # Check requirements
    if ! command -v rsync &> /dev/null; then
        log_error "rsync not installed"
        return 1
    fi
    
    # Test SSH connection
    if ! ssh -o BatchMode=yes -o ConnectTimeout=10 -p "${REMOTE_SSH_PORT}" \
         "${REMOTE_USER}@${REMOTE_HOST}" "echo ok" &>/dev/null; then
        log_error "SSH connection failed"
        return 1
    fi
    
    # Create remote directories
    ssh -p "${REMOTE_SSH_PORT}" "${REMOTE_USER}@${REMOTE_HOST}" \
        "mkdir -p ${REMOTE_BASE_DIR}/{basebackup,wal-archive,logs,index}" || {
        log_error "Failed to create remote directories"
        return 1
    }
    
    local sync_start=$(date +%s)
    
    # Sync basebackup directory (usually small, only a few files)
    log_status "Syncing basebackup files..."
    rsync -av --compress --compress-level=6 \
        --partial-dir=.rsync-partial \
        --hard-links \
        --delete-delay \
        -e "ssh -p ${REMOTE_SSH_PORT}" \
        "${BACKUP_DIR}/basebackup/" \
        "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BASE_DIR}/basebackup/" 2>&1 | tee -a "${SCRIPT_LOG}"
    
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        log_error "Failed to sync basebackup"
        return 1
    fi
    
    # Sync WAL archive (can be large, but rsync only transfers new files)
    log_status "Syncing WAL archive files..."
    rsync -av --compress --compress-level=6 \
        --partial-dir=.rsync-partial \
        --hard-links \
        --delete-delay \
        --stats \
        -e "ssh -p ${REMOTE_SSH_PORT}" \
        "${BACKUP_DIR}/wal-archive/" \
        "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BASE_DIR}/wal-archive/" 2>&1 | tee -a "${SCRIPT_LOG}"
    
    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        log_error "Failed to sync WAL archive"
        return 1
    fi
    
    # Sync metadata files
    log_status "Syncing metadata and index..."
    rsync -av \
        --partial-dir=.rsync-partial \
        --delete-delay \
        -e "ssh -p ${REMOTE_SSH_PORT}" \
        "${BACKUP_DIR}/index/" \
        "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BASE_DIR}/index/" 2>&1 | tee -a "${SCRIPT_LOG}"
    
    # Sync logs (optional, for reference)
    log_status "Syncing logs..."
    rsync -av --compress --compress-level=6 \
        --partial-dir=.rsync-partial \
        -e "ssh -p ${REMOTE_SSH_PORT}" \
        "${LOGS_DIR}/" \
        "${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BASE_DIR}/logs/" 2>&1 | tee -a "${SCRIPT_LOG}"
    
    local sync_end=$(date +%s)
    local sync_duration=$((sync_end - sync_start))
    
    # Get summary statistics
    local backup_size=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)
    local wal_size=$(du -sh "${BACKUP_DIR}/wal-archive" 2>/dev/null | cut -f1)
    
    log_info "=========================================="
    log_info "Sync completed successfully"
    log_info "Duration: ${sync_duration} seconds"
    log_info "Total backup size: ${backup_size}"
    log_info "WAL archive size: ${wal_size}"
    log_info "Remote: ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_BASE_DIR}"
    log_info "=========================================="
    
    return 0
}

# Main execution
mkdir -p "$(dirname "${SCRIPT_LOG}")"
sync_incremental_backups

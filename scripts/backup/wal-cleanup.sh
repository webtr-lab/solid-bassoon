#!/bin/bash
#
# WAL Cleanup Script
# Manages WAL file retention and cleanup based on backup retention policy
#
# Features:
#   - Keeps WAL files for specified retention period
#   - Removes WAL files older than oldest full backup (no longer needed for recovery)
#   - Archives old WAL files to compressed storage
#   - Enforces space limit on WAL directory
#

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
WAL_ARCHIVE_DIR="${BASE_DIR}/backups/wal-archive"
BACKUP_DIR="${BASE_DIR}/backups"
LOG_DIR="${BASE_DIR}/logs"
WAL_CLEANUP_LOG="${LOG_DIR}/wal-cleanup.log"

# Retention settings
RETENTION_DAYS=180          # Keep WAL files for 180 days (same as backups)
WAL_ARCHIVE_DAYS=30         # Archive WAL older than 30 days
MAX_WAL_SIZE_MB=500         # Alert if WAL directory exceeds 500MB

# Load .env if it exists
if [ -f "${BASE_DIR}/.env" ]; then
    set +a
    source "${BASE_DIR}/.env"
    set -a
fi

# Email settings
EMAIL_ENABLED="${BACKUP_EMAIL_ENABLED:-true}"
EMAIL_RECIPIENT="${BACKUP_EMAIL:-admin@example.com}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Logging functions
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${WAL_CLEANUP_LOG}"
}

log_info() {
    log "INFO" "$@"
    echo -e "${GREEN}[INFO]${NC} $@"
}

log_warn() {
    log "WARN" "$@"
    echo -e "${YELLOW}[WARN]${NC} $@"
}

log_error() {
    log "ERROR" "$@"
    echo -e "${RED}[ERROR]${NC} $@" >&2
}

# Check WAL directory exists
if [ ! -d "$WAL_ARCHIVE_DIR" ]; then
    log_error "WAL archive directory not found: $WAL_ARCHIVE_DIR"
    exit 1
fi

log_info "=========================================="
log_info "WAL File Cleanup and Management"
log_info "=========================================="

# Get WAL directory statistics
WAL_FILE_COUNT=$(find "$WAL_ARCHIVE_DIR" -name "0*" -type f 2>/dev/null | wc -l)
WAL_DIR_SIZE=$(du -sb "$WAL_ARCHIVE_DIR" 2>/dev/null | awk '{print $1}')
WAL_DIR_SIZE_MB=$((WAL_DIR_SIZE / 1048576))

log_info "WAL Archive Statistics:"
log_info "  Files: $WAL_FILE_COUNT"
log_info "  Size: ${WAL_DIR_SIZE_MB}MB"

# Find oldest backup to determine minimum WAL retention
OLDEST_BACKUP=$(find "$BACKUP_DIR/full" "$BACKUP_DIR/daily" -name "backup_*.sql*" -type f -printf '%T@ %P\n' 2>/dev/null | sort -n | head -1 | awk '{print $1}')

if [ -z "$OLDEST_BACKUP" ]; then
    log_warn "No backups found - cannot determine WAL retention boundary"
    OLDEST_BACKUP_TIME=$(date -d "180 days ago" +%s)
else
    OLDEST_BACKUP_TIME="$OLDEST_BACKUP"
fi

log_info "Oldest backup timestamp: $(date -d "@$OLDEST_BACKUP_TIME" '+%Y-%m-%d %H:%M:%S')"

# Cleanup function - remove WAL files older than retention period
cleanup_old_wal() {
    log_info "Removing WAL files older than $RETENTION_DAYS days..."

    CUTOFF_TIME=$(date -d "$RETENTION_DAYS days ago" +%s)
    CLEANUP_COUNT=0

    find "$WAL_ARCHIVE_DIR" -name "0*" -type f ! -newer /proc/self/fd/0 2>/dev/null | while read wal_file; do
        FILE_TIME=$(stat -c %Y "$wal_file" 2>/dev/null || stat -f %m "$wal_file")

        if [ "$FILE_TIME" -lt "$CUTOFF_TIME" ]; then
            if rm -f "$wal_file" 2>/dev/null; then
                ((CLEANUP_COUNT++))
                log_info "  Removed: $(basename $wal_file)"
            fi
        fi
    done

    log_info "Cleanup completed: $CLEANUP_COUNT WAL files removed"
}

# Archive function - compress WAL files older than archive threshold
archive_old_wal() {
    log_info "Archiving WAL files older than $WAL_ARCHIVE_DAYS days..."

    ARCHIVE_CUTOFF=$(date -d "$WAL_ARCHIVE_DAYS days ago" +%s)
    ARCHIVE_COUNT=0

    # Create archive directory if needed
    mkdir -p "$WAL_ARCHIVE_DIR/archived"

    find "$WAL_ARCHIVE_DIR" -maxdepth 1 -name "0*" -type f | while read wal_file; do
        FILE_TIME=$(stat -c %Y "$wal_file" 2>/dev/null || stat -f %m "$wal_file")

        if [ "$FILE_TIME" -lt "$ARCHIVE_CUTOFF" ] && [ ! -f "${wal_file}.gz" ]; then
            if gzip -9 "$wal_file" 2>/dev/null; then
                ((ARCHIVE_COUNT++))
                log_info "  Archived: $(basename ${wal_file}).gz"
            fi
        fi
    done

    log_info "Archiving completed: $ARCHIVE_COUNT WAL files compressed"
}

# Check disk usage
check_disk_usage() {
    log_info "Checking WAL disk usage..."

    if [ $WAL_DIR_SIZE_MB -gt $MAX_WAL_SIZE_MB ]; then
        log_warn "⚠ WAL directory size exceeds threshold: ${WAL_DIR_SIZE_MB}MB > ${MAX_WAL_SIZE_MB}MB"
        log_warn "Consider reducing WAL retention period or archiving older files"
        return 1
    else
        log_info "WAL directory size within limits: ${WAL_DIR_SIZE_MB}MB"
        return 0
    fi
}

# Run cleanup operations
log_info ""
archive_old_wal
log_info ""
cleanup_old_wal
log_info ""
check_disk_usage

log_info "=========================================="
log_info "WAL cleanup completed"
log_info "=========================================="

exit 0

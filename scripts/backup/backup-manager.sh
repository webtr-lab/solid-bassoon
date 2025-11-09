#!/bin/bash
#
# GPS Tracker Backup Manager
# Manages organized full and daily backups with 6-month retention
#
# Features:
#   - Weekly full backups (Sundays at 2 AM)
#   - Daily incremental-style backups (every day)
#   - Date-organized folder structure (YYYY/MM/DD)
#   - Metadata tracking (JSON)
#   - Auto-compression for backups >30 days old
#   - 6-month retention (180 days)
#   - Backup index for fast restore
#
# Usage:
#   ./backup-manager.sh --full         # Force full backup
#   ./backup-manager.sh --daily        # Force daily backup
#   ./backup-manager.sh --auto         # Auto-decide (full on Sunday, daily otherwise)
#   ./backup-manager.sh --cleanup      # Cleanup old backups
#   ./backup-manager.sh --list         # List all backups
#   ./backup-manager.sh --archive      # Compress old backups
#

set -e

# Configuration
BASE_DIR="/home/demo/effective-guide"
BACKUP_ROOT="${BASE_DIR}/backups"
LOG_DIR="${BASE_DIR}/logs"
BACKUP_LOG="${LOG_DIR}/backup-manager.log"

# Backup directories
FULL_BACKUP_DIR="${BACKUP_ROOT}/full"
DAILY_BACKUP_DIR="${BACKUP_ROOT}/daily"
ARCHIVE_DIR="${BACKUP_ROOT}/archive"
INDEX_DIR="${BACKUP_ROOT}/index"

# Retention settings
RETENTION_DAYS=180          # 6 months
ARCHIVE_AFTER_DAYS=30       # Compress backups older than 30 days
FULL_BACKUP_DAY=0           # Sunday (0=Sunday, 1=Monday, etc.)

# Database settings
DB_USER="gpsadmin"
DB_NAME="gps_tracker"
DB_CONTAINER="effective-guide-db-1"

# Email settings
EMAIL_ENABLED=true
EMAIL_RECIPIENT="demo@praxisnetworking.com"
EMAIL_SUBJECT_PREFIX="[GPS Tracker Backup]"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Logging functions
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${BACKUP_LOG}"
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

# Initialize backup directory structure
init_backup_structure() {
    log_info "Initializing backup directory structure..."

    mkdir -p "${FULL_BACKUP_DIR}"
    mkdir -p "${DAILY_BACKUP_DIR}"
    mkdir -p "${ARCHIVE_DIR}"
    mkdir -p "${INDEX_DIR}"

    # Create backup index if it doesn't exist
    if [ ! -f "${INDEX_DIR}/backup_index.json" ]; then
        echo '{"backups": [], "last_updated": ""}' > "${INDEX_DIR}/backup_index.json"
    fi

    log_info "Backup structure initialized"
}

# Get current date parts
get_date_path() {
    local timestamp=$1
    local year=$(date -d "@${timestamp}" '+%Y' 2>/dev/null || date -r "${timestamp}" '+%Y')
    local month=$(date -d "@${timestamp}" '+%m' 2>/dev/null || date -r "${timestamp}" '+%m')
    local day=$(date -d "@${timestamp}" '+%d' 2>/dev/null || date -r "${timestamp}" '+%d')
    echo "${year}/${month}/${day}"
}

# Create metadata JSON for backup
create_metadata() {
    local backup_file=$1
    local backup_type=$2
    local metadata_file="${backup_file}.metadata.json"

    local file_size=$(stat -c%s "${backup_file}" 2>/dev/null || stat -f%z "${backup_file}")
    local checksum=$(md5sum "${backup_file}" | awk '{print $1}')
    local timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

    # Get table count
    local table_count=$(docker compose exec -T db pg_restore --list "/backups/$(basename ${backup_file})" 2>/dev/null | grep -c "TABLE DATA" 2>/dev/null || echo "0")
    # Clean up table_count to ensure it's a valid number
    table_count=$(echo "$table_count" | tr -d '\n\r ' | grep -E '^[0-9]+$' || echo "0")

    # Get postgres version and clean it for JSON
    local pg_version=$(docker compose exec -T db psql -U ${DB_USER} -t -c 'SELECT version();' 2>/dev/null | head -1 | tr -d '\n\r' | xargs 2>/dev/null || echo 'unknown')

    # Use Python to create valid JSON - pass values as environment variables to avoid shell substitution issues
    BACKUP_FILE="$(basename ${backup_file})" \
    BACKUP_TYPE="${backup_type}" \
    CREATED_AT="${timestamp}" \
    FILE_SIZE="${file_size}" \
    FILE_SIZE_HUMAN="$(numfmt --to=iec-i --suffix=B ${file_size} 2>/dev/null || echo "${file_size} bytes")" \
    CHECKSUM_MD5="${checksum}" \
    TABLE_COUNT="${table_count}" \
    DATABASE="${DB_NAME}" \
    POSTGRES_VERSION="${pg_version}" \
    METADATA_FILE="${metadata_file}" \
    python3 <<'PYEOF'
import json
import os

metadata = {
    "backup_file": os.environ.get('BACKUP_FILE', ''),
    "backup_type": os.environ.get('BACKUP_TYPE', ''),
    "created_at": os.environ.get('CREATED_AT', ''),
    "file_size": int(os.environ.get('FILE_SIZE', '0')),
    "file_size_human": os.environ.get('FILE_SIZE_HUMAN', ''),
    "checksum_md5": os.environ.get('CHECKSUM_MD5', ''),
    "table_count": int(os.environ.get('TABLE_COUNT', '0')),
    "database": os.environ.get('DATABASE', ''),
    "postgres_version": os.environ.get('POSTGRES_VERSION', 'unknown'),
    "compressed": False,
    "verified": False
}

metadata_file = os.environ.get('METADATA_FILE', '')
with open(metadata_file, 'w') as f:
    json.dump(metadata, f, indent=2)
PYEOF

    if [ $? -eq 0 ]; then
        log_info "Created metadata: ${metadata_file}"
    else
        log_error "Failed to create metadata file"
        return 1
    fi
}

# Update backup index
update_backup_index() {
    local backup_file=$1
    local backup_type=$2
    local metadata_file="${backup_file}.metadata.json"

    if [ ! -f "${metadata_file}" ]; then
        log_warn "Metadata file not found: ${metadata_file}"
        return 1
    fi

    local index_file="${INDEX_DIR}/backup_index.json"
    local temp_index="/tmp/backup_index_$$.json"

    # Read current index
    local current_index=$(cat "${index_file}")

    # Add new backup entry
    local backup_entry=$(cat "${metadata_file}")
    local backup_path=$(realpath --relative-to="${BACKUP_ROOT}" "${backup_file}")

    # Update index using Python for reliable JSON handling
    python3 <<PYEOF
import json
import sys
from datetime import datetime
import traceback

try:
    # Read index file
    with open('${index_file}', 'r') as f:
        index_content = f.read()
        if not index_content.strip():
            index = {"backups": [], "last_updated": ""}
        else:
            index = json.loads(index_content)

    # Read metadata file
    with open('${metadata_file}', 'r') as f:
        metadata_content = f.read()
        metadata = json.loads(metadata_content)

    # Add relative path
    metadata['relative_path'] = '${backup_path}'

    # Ensure backups is a list
    if 'backups' not in index or not isinstance(index['backups'], list):
        index['backups'] = []

    # Add to backups list
    index['backups'].append(metadata)
    index['last_updated'] = datetime.utcnow().isoformat() + 'Z'

    # Sort by created_at (newest first)
    index['backups'] = sorted(index['backups'], key=lambda x: x.get('created_at', ''), reverse=True)

    # Write updated index
    with open('${index_file}', 'w') as f:
        json.dump(index, f, indent=2)

    print("Index updated successfully")

except json.JSONDecodeError as e:
    print(f"JSON parse error: {e}", file=sys.stderr)
    print(f"At position: {e.pos}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"Error updating index: {e}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr)
    sys.exit(1)
PYEOF

    if [ $? -eq 0 ]; then
        log_info "Backup index updated"
    else
        log_error "Failed to update backup index"
    fi
}

# Create full backup
create_full_backup() {
    log_info "=========================================="
    log_info "Creating FULL backup..."
    log_info "=========================================="

    local timestamp=$(date +%s)
    local date_path=$(get_date_path ${timestamp})
    local backup_dir="${FULL_BACKUP_DIR}/${date_path}"
    local backup_filename="backup_full_$(date '+%Y%m%d_%H%M%S').sql"
    local backup_path="${backup_dir}/${backup_filename}"

    # Create directory structure
    mkdir -p "${backup_dir}"

    log_info "Backup directory: ${backup_dir}"
    log_info "Backup filename: ${backup_filename}"

    # Create database dump
    log_info "Creating database dump..."
    docker compose exec -T db pg_dump \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -F c \
        -Z 6 \
        -f "/backups/${backup_filename}" 2>&1 | tee -a "${BACKUP_LOG}"

    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        log_error "Database dump failed"
        return 1
    fi

    # Verify backup BEFORE moving (while it's still accessible to Docker)
    log_info "Verifying backup..."
    if ! docker compose exec -T db pg_restore --list "/backups/${backup_filename}" > /dev/null 2>&1; then
        log_error "✗ Backup verification failed"
        rm -f "${BACKUP_ROOT}/${backup_filename}"
        return 1
    fi
    log_info "✓ Backup verification passed"

    # Move backup to organized location
    if [ -f "${BACKUP_ROOT}/${backup_filename}" ]; then
        mv "${BACKUP_ROOT}/${backup_filename}" "${backup_path}"
        log_info "Backup moved to: ${backup_path}"
    else
        log_error "Backup file not found: ${BACKUP_ROOT}/${backup_filename}"
        return 1
    fi

    # Create checksum
    log_info "Generating checksum..."
    md5sum "${backup_path}" | awk '{print $1}' > "${backup_path}.md5"

    # Create metadata (with verified=true since we verified above)
    create_metadata "${backup_path}" "full"

    # Update metadata to mark as verified
    METADATA_FILE="${backup_path}.metadata.json" python3 <<'PYEOF'
import json
import os
metadata_file = os.environ.get('METADATA_FILE', '')
if metadata_file:
    with open(metadata_file, 'r') as f:
        metadata = json.load(f)
    metadata['verified'] = True
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
PYEOF

    # Update index
    update_backup_index "${backup_path}" "full"

    local file_size=$(stat -c%s "${backup_path}" 2>/dev/null || stat -f%z "${backup_path}")
    local size_human=$(numfmt --to=iec-i --suffix=B ${file_size} 2>/dev/null || echo "${file_size} bytes")

    log_info "=========================================="
    log_info "✓ FULL backup completed successfully"
    log_info "File: ${backup_path}"
    log_info "Size: ${size_human}"
    log_info "=========================================="

    echo "${backup_path}"
}

# Create daily backup
create_daily_backup() {
    log_info "=========================================="
    log_info "Creating DAILY backup..."
    log_info "=========================================="

    local timestamp=$(date +%s)
    local date_path=$(get_date_path ${timestamp})
    local backup_dir="${DAILY_BACKUP_DIR}/${date_path}"
    local backup_filename="backup_daily_$(date '+%Y%m%d_%H%M%S').sql"
    local backup_path="${backup_dir}/${backup_filename}"

    # Create directory structure
    mkdir -p "${backup_dir}"

    log_info "Backup directory: ${backup_dir}"
    log_info "Backup filename: ${backup_filename}"

    # Create database dump (same as full for now - PostgreSQL doesn't have native incremental)
    # Note: True incremental would require WAL archiving or third-party tools
    log_info "Creating database dump..."
    docker compose exec -T db pg_dump \
        -U "${DB_USER}" \
        -d "${DB_NAME}" \
        -F c \
        -Z 6 \
        -f "/backups/${backup_filename}" 2>&1 | tee -a "${BACKUP_LOG}"

    if [ ${PIPESTATUS[0]} -ne 0 ]; then
        log_error "Database dump failed"
        return 1
    fi

    # Verify backup BEFORE moving (while it's still accessible to Docker)
    log_info "Verifying backup..."
    if ! docker compose exec -T db pg_restore --list "/backups/${backup_filename}" > /dev/null 2>&1; then
        log_error "✗ Backup verification failed"
        rm -f "${BACKUP_ROOT}/${backup_filename}"
        return 1
    fi
    log_info "✓ Backup verification passed"

    # Move backup to organized location
    if [ -f "${BACKUP_ROOT}/${backup_filename}" ]; then
        mv "${BACKUP_ROOT}/${backup_filename}" "${backup_path}"
        log_info "Backup moved to: ${backup_path}"
    else
        log_error "Backup file not found: ${BACKUP_ROOT}/${backup_filename}"
        return 1
    fi

    # Create checksum
    log_info "Generating checksum..."
    md5sum "${backup_path}" | awk '{print $1}' > "${backup_path}.md5"

    # Create metadata (with verified=true since we verified above)
    create_metadata "${backup_path}" "daily"

    # Update metadata to mark as verified
    METADATA_FILE="${backup_path}.metadata.json" python3 <<'PYEOF'
import json
import os
metadata_file = os.environ.get('METADATA_FILE', '')
if metadata_file:
    with open(metadata_file, 'r') as f:
        metadata = json.load(f)
    metadata['verified'] = True
    with open(metadata_file, 'w') as f:
        json.dump(metadata, f, indent=2)
PYEOF

    # Update index
    update_backup_index "${backup_path}" "daily"

    local file_size=$(stat -c%s "${backup_path}" 2>/dev/null || stat -f%z "${backup_path}")
    local size_human=$(numfmt --to=iec-i --suffix=B ${file_size} 2>/dev/null || echo "${file_size} bytes")

    log_info "=========================================="
    log_info "✓ DAILY backup completed successfully"
    log_info "File: ${backup_path}"
    log_info "Size: ${size_human}"
    log_info "=========================================="

    echo "${backup_path}"
}

# Auto-decide backup type (full on Sunday, daily otherwise)
auto_backup() {
    local current_day=$(date +%u)  # 1=Monday, 7=Sunday

    # Convert to 0-6 format (0=Sunday)
    if [ "$current_day" -eq 7 ]; then
        current_day=0
    fi

    if [ "$current_day" -eq "$FULL_BACKUP_DAY" ]; then
        log_info "Today is Sunday - creating FULL backup"
        create_full_backup
    else
        log_info "Creating DAILY backup"
        create_daily_backup
    fi
}

# Cleanup old backups (retention policy)
cleanup_old_backups() {
    log_info "=========================================="
    log_info "Running backup cleanup (${RETENTION_DAYS} days retention)..."
    log_info "=========================================="

    local cleanup_count=0
    local cutoff_date=$(date -d "${RETENTION_DAYS} days ago" +%s 2>/dev/null || date -v-${RETENTION_DAYS}d +%s)

    # Cleanup full backups
    log_info "Checking full backups..."
    find "${FULL_BACKUP_DIR}" -name "backup_full_*.sql" -type f | while read backup_file; do
        local file_date=$(stat -c %Y "${backup_file}" 2>/dev/null || stat -f %m "${backup_file}")

        if [ "$file_date" -lt "$cutoff_date" ]; then
            log_info "Removing old backup: ${backup_file}"
            rm -f "${backup_file}" "${backup_file}.md5" "${backup_file}.metadata.json" "${backup_file}.gz"
            ((cleanup_count++))
        fi
    done

    # Cleanup daily backups
    log_info "Checking daily backups..."
    find "${DAILY_BACKUP_DIR}" -name "backup_daily_*.sql" -type f | while read backup_file; do
        local file_date=$(stat -c %Y "${backup_file}" 2>/dev/null || stat -f %m "${backup_file}")

        if [ "$file_date" -lt "$cutoff_date" ]; then
            log_info "Removing old backup: ${backup_file}"
            rm -f "${backup_file}" "${backup_file}.md5" "${backup_file}.metadata.json" "${backup_file}.gz"
            ((cleanup_count++))
        fi
    done

    # Remove empty directories
    find "${FULL_BACKUP_DIR}" -type d -empty -delete 2>/dev/null || true
    find "${DAILY_BACKUP_DIR}" -type d -empty -delete 2>/dev/null || true

    log_info "=========================================="
    log_info "Cleanup completed: ${cleanup_count} old backups removed"
    log_info "=========================================="
}

# Archive old backups (compress backups >30 days)
archive_old_backups() {
    log_info "=========================================="
    log_info "Archiving backups older than ${ARCHIVE_AFTER_DAYS} days..."
    log_info "=========================================="

    local archive_count=0
    local archive_cutoff=$(date -d "${ARCHIVE_AFTER_DAYS} days ago" +%s 2>/dev/null || date -v-${ARCHIVE_AFTER_DAYS}d +%s)

    # Archive full backups
    find "${FULL_BACKUP_DIR}" -name "backup_full_*.sql" -type f | while read backup_file; do
        local file_date=$(stat -c %Y "${backup_file}" 2>/dev/null || stat -f %m "${backup_file}")

        if [ "$file_date" -lt "$archive_cutoff" ] && [ ! -f "${backup_file}.gz" ]; then
            log_info "Compressing: ${backup_file}"
            gzip -9 "${backup_file}"

            # Update metadata
            if [ -f "${backup_file}.metadata.json" ]; then
                python3 <<EOF
import json
metadata_file = "${backup_file}.metadata.json"
with open(metadata_file, 'r') as f:
    metadata = json.load(f)
metadata['compressed'] = True
metadata['backup_file'] = metadata['backup_file'] + '.gz'
with open(metadata_file, 'w') as f:
    json.dump(metadata, f, indent=2)
EOF
            fi

            ((archive_count++))
        fi
    done

    # Archive daily backups
    find "${DAILY_BACKUP_DIR}" -name "backup_daily_*.sql" -type f | while read backup_file; do
        local file_date=$(stat -c %Y "${backup_file}" 2>/dev/null || stat -f %m "${backup_file}")

        if [ "$file_date" -lt "$archive_cutoff" ] && [ ! -f "${backup_file}.gz" ]; then
            log_info "Compressing: ${backup_file}"
            gzip -9 "${backup_file}"

            # Update metadata
            if [ -f "${backup_file}.metadata.json" ]; then
                python3 <<EOF
import json
metadata_file = "${backup_file}.metadata.json"
with open(metadata_file, 'r') as f:
    metadata = json.load(f)
metadata['compressed'] = True
metadata['backup_file'] = metadata['backup_file'] + '.gz'
with open(metadata_file, 'w') as f:
    json.dump(metadata, f, indent=2)
EOF
            fi

            ((archive_count++))
        fi
    done

    log_info "=========================================="
    log_info "Archiving completed: ${archive_count} backups compressed"
    log_info "=========================================="
}

# List all backups
list_backups() {
    log_info "=========================================="
    log_info "Listing all backups..."
    log_info "=========================================="

    echo ""
    echo -e "${BLUE}=== FULL BACKUPS ===${NC}"
    find "${FULL_BACKUP_DIR}" -name "backup_full_*.sql*" -type f -exec ls -lh {} \; | awk '{print $9, "(" $5 ")"}'

    echo ""
    echo -e "${BLUE}=== DAILY BACKUPS ===${NC}"
    find "${DAILY_BACKUP_DIR}" -name "backup_daily_*.sql*" -type f -exec ls -lh {} \; | awk '{print $9, "(" $5 ")"}'

    echo ""
    echo -e "${BLUE}=== STATISTICS ===${NC}"
    local full_count=$(find "${FULL_BACKUP_DIR}" -name "backup_full_*.sql*" -type f | wc -l)
    local daily_count=$(find "${DAILY_BACKUP_DIR}" -name "backup_daily_*.sql*" -type f | wc -l)
    local total_size=$(du -sh "${BACKUP_ROOT}" | cut -f1)

    echo "Full backups: ${full_count}"
    echo "Daily backups: ${daily_count}"
    echo "Total size: ${total_size}"
    echo ""
}

# Send email notification
send_email_notification() {
    local status=$1
    local backup_type=$2
    local backup_file=$3
    local details=$4

    if [ "$EMAIL_ENABLED" != "true" ]; then
        return 0
    fi

    if ! command -v mail &> /dev/null && ! command -v mailx &> /dev/null; then
        log_warn "Email notification skipped: mail command not available"
        return 1
    fi

    local MAIL_CMD="mail"
    if command -v mailx &> /dev/null; then
        MAIL_CMD="mailx"
    fi

    local subject
    if [ "$status" == "success" ]; then
        subject="${EMAIL_SUBJECT_PREFIX} SUCCESS - ${backup_type} Backup Completed"
    else
        subject="${EMAIL_SUBJECT_PREFIX} FAILURE - ${backup_type} Backup Failed"
    fi

    local email_body=$(cat <<EOF
GPS Tracker Backup Report
==========================================

Status: ${status^^}
Backup Type: ${backup_type^^}
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')
Server: $(hostname)

${details}

Backup File: ${backup_file}

Log File: ${BACKUP_LOG}

==========================================
This is an automated notification from the GPS Tracker backup system.
EOF
)

    echo "$email_body" | $MAIL_CMD -s "$subject" "$EMAIL_RECIPIENT" 2>&1 | tee -a "${BACKUP_LOG}"
}

# Main function
main() {
    local command=${1:-"--help"}

    # Initialize structure
    init_backup_structure

    case "$command" in
        --full)
            create_full_backup
            ;;
        --daily)
            create_daily_backup
            ;;
        --auto)
            auto_backup
            ;;
        --cleanup)
            cleanup_old_backups
            ;;
        --archive)
            archive_old_backups
            ;;
        --list)
            list_backups
            ;;
        --help)
            cat <<EOF
GPS Tracker Backup Manager

Usage: $0 [COMMAND]

Commands:
  --full        Create a full backup
  --daily       Create a daily backup
  --auto        Auto-decide (full on Sunday, daily otherwise)
  --cleanup     Remove backups older than ${RETENTION_DAYS} days
  --archive     Compress backups older than ${ARCHIVE_AFTER_DAYS} days
  --list        List all backups
  --help        Show this help message

Backup Structure:
  backups/full/YYYY/MM/DD/    - Weekly full backups
  backups/daily/YYYY/MM/DD/   - Daily backups
  backups/index/              - Backup index and metadata
  backups/archive/            - Compressed old backups

Retention Policy:
  - Keep all backups for ${RETENTION_DAYS} days (6 months)
  - Compress backups older than ${ARCHIVE_AFTER_DAYS} days
  - Full backups: Every Sunday at 2 AM
  - Daily backups: Every day at 2 AM

Examples:
  $0 --auto              # Recommended for cron jobs
  $0 --full              # Force full backup now
  $0 --list              # See all backups
  $0 --cleanup           # Remove old backups

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

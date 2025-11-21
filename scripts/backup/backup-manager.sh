#!/bin/bash
#
# Maps Tracker Backup Manager
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
# Automatically detect the project directory (scripts/backup -> scripts -> effective-guide)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
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

# Load .env if it exists for environment variables
if [ -f "${BASE_DIR}/.env" ]; then
    set +a
    source "${BASE_DIR}/.env"
    set -a
fi

# Database settings (from .env or with defaults)
DB_USER="${POSTGRES_USER:-gpsadmin}"
DB_NAME="${POSTGRES_DB:-gps_tracker}"
DB_CONTAINER="maps_db"

# Email settings (from .env or with defaults)
EMAIL_ENABLED="${BACKUP_EMAIL_ENABLED:-true}"
EMAIL_RECIPIENT="${BACKUP_EMAIL:-admin@example.com}"
EMAIL_SUBJECT_PREFIX="[Maps Tracker Backup]"

# Encryption settings
ENCRYPTION_ENABLED="${BACKUP_ENCRYPTION_ENABLED:-true}"
ENCRYPTION_PASSPHRASE="${BACKUP_ENCRYPTION_PASSPHRASE:-}"

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

# Get file size in bytes (compatible with macOS and Linux)
get_file_size() {
    local file=$1
    if command -v stat &> /dev/null; then
        if stat --version &> /dev/null 2>&1; then
            # GNU stat (Linux)
            stat -c%s "${file}" 2>/dev/null
        else
            # BSD stat (macOS)
            stat -f%z "${file}" 2>/dev/null
        fi
    else
        # Fallback: use wc
        wc -c < "${file}" 2>/dev/null
    fi
}

# Get current date parts
get_date_path() {
    local timestamp=$1
    local year=$(date -d "@${timestamp}" '+%Y' 2>/dev/null || date -r "${timestamp}" '+%Y')
    local month=$(date -d "@${timestamp}" '+%m' 2>/dev/null || date -r "${timestamp}" '+%m')
    local day=$(date -d "@${timestamp}" '+%d' 2>/dev/null || date -r "${timestamp}" '+%d')
    echo "${year}/${month}/${day}"
}

# Backup configuration files (.env, SSL certs)
backup_configuration_files() {
    log_info "Creating configuration backup..."

    # Create config backup directory
    local config_backup_dir="${BACKUP_ROOT}/config-backups"
    mkdir -p "${config_backup_dir}"

    # Determine if this is full or daily backup (for organization)
    local backup_type=$1
    local timestamp=$(date +%s)
    local date_path=$(get_date_path ${timestamp})
    local config_date_dir="${config_backup_dir}/${date_path}"
    mkdir -p "${config_date_dir}"

    local config_filename="config_$(date '+%Y%m%d_%H%M%S').tar.gz"
    local config_backup_path="${config_date_dir}/${config_filename}"

    # Create temporary file for tar
    local temp_tar=$(mktemp)

    # Tar configuration files
    # We need to be careful to exclude sensitive data and only include what's needed
    tar czf "${temp_tar}" \
        --exclude=.git \
        --exclude=.env.example \
        --exclude='node_modules' \
        --exclude='__pycache__' \
        -C "${BASE_DIR}" \
        .env \
        ./ssl/ 2>/dev/null || {
        log_warn "Some configuration files not found - this may be okay"
    }

    # Check if tar file was created and has content
    if [ -f "${temp_tar}" ] && [ -s "${temp_tar}" ]; then
        mv "${temp_tar}" "${config_backup_path}"
        log_info "✓ Configuration backup created: ${config_backup_path}"

        # Create checksum
        sha256sum "${config_backup_path}" > "${config_backup_path}.sha256"

        # Log details
        local config_size=$(get_file_size "${config_backup_path}")
        local size_human=$(numfmt --to=iec-i --suffix=B ${config_size} 2>/dev/null || echo "${config_size} bytes")
        log_info "Config backup size: ${size_human}"

        return 0
    else
        log_warn "Configuration backup is empty - no configuration files to backup"
        rm -f "${temp_tar}"
        return 0
    fi
}

# Encrypt backup file using GPG with AES-256
encrypt_backup() {
    local backup_file=$1

    # Check if encryption is disabled
    if [ "$ENCRYPTION_ENABLED" != "true" ]; then
        log_info "Encryption disabled - skipping encryption"
        return 0
    fi

    # Check if passphrase is set
    if [ -z "$ENCRYPTION_PASSPHRASE" ]; then
        log_warn "Encryption enabled but BACKUP_ENCRYPTION_PASSPHRASE not set - skipping encryption"
        return 0
    fi

    # Check if GPG is available
    if ! command -v gpg &> /dev/null; then
        log_warn "GPG not available - backup will not be encrypted"
        return 0
    fi

    log_info "Encrypting backup with AES-256..."

    # Create encrypted version
    local encrypted_file="${backup_file}.gpg"

    # Use GPG with symmetric encryption (AES-256)
    # --symmetric: symmetric encryption
    # --cipher-algo AES256: use AES-256 algorithm
    # --batch --passphrase: non-interactive mode with passphrase
    # --output: specify output file
    if echo "$ENCRYPTION_PASSPHRASE" | gpg --symmetric --cipher-algo AES256 \
        --batch --passphrase-fd 0 \
        --output "${encrypted_file}" \
        "${backup_file}" 2>&1 | tee -a "${BACKUP_LOG}"; then

        # Verify encryption succeeded by checking file exists and has content
        if [ -f "${encrypted_file}" ] && [ -s "${encrypted_file}" ]; then
            local encrypted_size=$(get_file_size "${encrypted_file}")
            local original_size=$(get_file_size "${backup_file}")

            log_info "✓ Encryption successful"
            log_info "  Original size: $(numfmt --to=iec-i --suffix=B ${original_size} 2>/dev/null || echo "${original_size} bytes")"
            log_info "  Encrypted size: $(numfmt --to=iec-i --suffix=B ${encrypted_size} 2>/dev/null || echo "${encrypted_size} bytes")"

            # Remove unencrypted backup file
            log_info "Removing unencrypted backup file..."
            rm -f "${backup_file}"

            # Update file path to encrypted version
            mv "${encrypted_file}" "${backup_file}.gpg"
            log_info "Encrypted backup stored as: ${backup_file}.gpg"

            return 0
        else
            log_error "✗ Encryption failed - no encrypted file created"
            rm -f "${encrypted_file}"
            return 1
        fi
    else
        log_error "✗ GPG encryption failed"
        return 1
    fi
}

# Create metadata JSON for backup
create_metadata() {
    local backup_file=$1
    local backup_type=$2
    local metadata_file="${backup_file}.metadata.json"

    local file_size=$(get_file_size "${backup_file}")
    local checksum=$(sha256sum "${backup_file}" | awk '{print $1}')
    local timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

    # Get table count - construct the path as it appears in Docker container
    local table_count="0"
    # Convert the full path to the relative path as seen in Docker /backups mount
    local docker_backup_path="/backups/$(echo "${backup_file}" | sed "s|${BACKUP_ROOT}/||")"

    if command -v pg_restore &> /dev/null; then
        # Try local pg_restore if available
        table_count=$(pg_restore --list "${backup_file}" 2>/dev/null | grep -c "TABLE DATA" 2>/dev/null || echo "0")
    else
        # Use Docker pg_restore with correct path
        table_count=$(docker compose exec -T db pg_restore --list "${docker_backup_path}" 2>/dev/null | grep -c "TABLE DATA" 2>/dev/null || echo "0")
    fi
    # Clean up table_count to ensure it's a valid number
    table_count=$(echo "$table_count" | tr -d '\n\r ' | grep -E '^[0-9]+$' || echo "0")

    # Get postgres version - use direct query with better error handling
    local pg_version="unknown"
    if docker compose exec -T db psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT version();" 2>/dev/null | head -1 | grep -q "PostgreSQL"; then
        pg_version=$(docker compose exec -T db psql -U ${DB_USER} -d ${DB_NAME} -t -c "SELECT version();" 2>/dev/null | head -1 | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
    fi

    # Use Python to create valid JSON - pass values as environment variables to avoid shell substitution issues
    BACKUP_FILE="$(basename ${backup_file})" \
    BACKUP_TYPE="${backup_type}" \
    CREATED_AT="${timestamp}" \
    FILE_SIZE="${file_size}" \
    FILE_SIZE_HUMAN="$(numfmt --to=iec-i --suffix=B ${file_size} 2>/dev/null || echo "${file_size} bytes")" \
    CHECKSUM_SHA256="${checksum}" \
    TABLE_COUNT="${table_count}" \
    DATABASE="${DB_NAME}" \
    POSTGRES_VERSION="${pg_version}" \
    ENCRYPTION_ENABLED="${ENCRYPTION_ENABLED}" \
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
    "checksum_sha256": os.environ.get('CHECKSUM_SHA256', ''),
    "table_count": int(os.environ.get('TABLE_COUNT', '0')),
    "database": os.environ.get('DATABASE', ''),
    "postgres_version": os.environ.get('POSTGRES_VERSION', 'unknown'),
    "compressed": False,
    "encrypted": os.environ.get('ENCRYPTION_ENABLED', '') == 'true',
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
        -Z 9 \
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

        # Fix file ownership to current user (handles Docker volume ownership issues)
        # This ensures backup files are owned by the user running the script, not root
        # Use Docker container to chown since it has root privileges
        # Construct relative path from BACKUP_ROOT for Docker mount point
        rel_backup_path="${backup_path#${BACKUP_ROOT}/}"
        docker_chown_path="/backups/${rel_backup_path}"
        if docker compose exec -T db chown 1000:1000 "${docker_chown_path}" 2>/dev/null; then
            log_info "✓ Fixed backup file ownership to devnan:devnan"
        else
            log_warn "Could not change backup file ownership via Docker (volume permissions issue)"
        fi
    else
        log_error "Backup file not found: ${BACKUP_ROOT}/${backup_filename}"
        return 1
    fi

    # Backup configuration files (.env, SSL certs, etc.)
    backup_configuration_files "full"

    # Encrypt backup if enabled
    ENCRYPTED_FILE="${backup_path}"
    if [ "$ENCRYPTION_ENABLED" == "true" ] && [ -n "$ENCRYPTION_PASSPHRASE" ]; then
        encrypt_backup "${backup_path}"
        if [ $? -eq 0 ] && [ -f "${backup_path}.gpg" ]; then
            # Update to point to encrypted file only if it exists
            ENCRYPTED_FILE="${backup_path}.gpg"
            log_info "Using encrypted backup file: ${ENCRYPTED_FILE}"
        else
            # Encryption failed or skipped, use unencrypted file
            log_warn "Encryption not available, using unencrypted backup"
        fi
    fi

    # Create checksum (SHA256 - stronger than MD5) - on final file (encrypted or not)
    log_info "Generating SHA256 checksum..."
    sha256sum "${ENCRYPTED_FILE}" > "${ENCRYPTED_FILE}.sha256"

    # Create metadata (with verified=true since we verified above)
    create_metadata "${ENCRYPTED_FILE}" "full"

    # Update metadata to mark as verified
    METADATA_FILE="${ENCRYPTED_FILE}.metadata.json" python3 <<'PYEOF'
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
    update_backup_index "${ENCRYPTED_FILE}" "full"

    local file_size=$(get_file_size "${ENCRYPTED_FILE}")
    local size_human=$(numfmt --to=iec-i --suffix=B ${file_size} 2>/dev/null || echo "${file_size} bytes")

    log_info "=========================================="
    log_info "✓ FULL backup completed successfully"
    log_info "File: ${ENCRYPTED_FILE}"
    log_info "Size: ${size_human}"
    log_info "=========================================="

    echo "${ENCRYPTED_FILE}"
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
        -Z 9 \
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

        # Fix file ownership to current user (handles Docker volume ownership issues)
        # This ensures backup files are owned by the user running the script, not root
        # Use Docker container to chown since it has root privileges
        # Construct relative path from BACKUP_ROOT for Docker mount point
        rel_backup_path="${backup_path#${BACKUP_ROOT}/}"
        docker_chown_path="/backups/${rel_backup_path}"
        if docker compose exec -T db chown 1000:1000 "${docker_chown_path}" 2>/dev/null; then
            log_info "✓ Fixed backup file ownership to devnan:devnan"
        else
            log_warn "Could not change backup file ownership via Docker (volume permissions issue)"
        fi
    else
        log_error "Backup file not found: ${BACKUP_ROOT}/${backup_filename}"
        return 1
    fi

    # Backup configuration files (.env, SSL certs, etc.)
    backup_configuration_files "daily"

    # Encrypt backup if enabled
    ENCRYPTED_FILE="${backup_path}"
    if [ "$ENCRYPTION_ENABLED" == "true" ] && [ -n "$ENCRYPTION_PASSPHRASE" ]; then
        encrypt_backup "${backup_path}"
        if [ $? -eq 0 ] && [ -f "${backup_path}.gpg" ]; then
            # Update to point to encrypted file only if it exists
            ENCRYPTED_FILE="${backup_path}.gpg"
            log_info "Using encrypted backup file: ${ENCRYPTED_FILE}"
        else
            # Encryption failed or skipped, use unencrypted file
            log_warn "Encryption not available, using unencrypted backup"
        fi
    fi

    # Create checksum (SHA256 - stronger than MD5) - on final file (encrypted or not)
    log_info "Generating SHA256 checksum..."
    sha256sum "${ENCRYPTED_FILE}" > "${ENCRYPTED_FILE}.sha256"

    # Create metadata (with verified=true since we verified above)
    create_metadata "${ENCRYPTED_FILE}" "daily"

    # Update metadata to mark as verified
    METADATA_FILE="${ENCRYPTED_FILE}.metadata.json" python3 <<'PYEOF'
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
    update_backup_index "${ENCRYPTED_FILE}" "daily"

    local file_size=$(get_file_size "${ENCRYPTED_FILE}")
    local size_human=$(numfmt --to=iec-i --suffix=B ${file_size} 2>/dev/null || echo "${file_size} bytes")

    log_info "=========================================="
    log_info "✓ DAILY backup completed successfully"
    log_info "File: ${ENCRYPTED_FILE}"
    log_info "Size: ${size_human}"
    log_info "=========================================="

    echo "${ENCRYPTED_FILE}"
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
            rm -f "${backup_file}" "${backup_file}.sha256" "${backup_file}.metadata.json" "${backup_file}.gz"
            ((cleanup_count++))
        fi
    done

    # Cleanup daily backups
    log_info "Checking daily backups..."
    find "${DAILY_BACKUP_DIR}" -name "backup_daily_*.sql" -type f | while read backup_file; do
        local file_date=$(stat -c %Y "${backup_file}" 2>/dev/null || stat -f %m "${backup_file}")

        if [ "$file_date" -lt "$cutoff_date" ]; then
            log_info "Removing old backup: ${backup_file}"
            rm -f "${backup_file}" "${backup_file}.sha256" "${backup_file}.metadata.json" "${backup_file}.gz"
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
    local backup_size=$4

    if [ "$EMAIL_ENABLED" != "true" ]; then
        return 0
    fi

    local subject
    local email_body

    if [ "$status" == "success" ]; then
        subject="${EMAIL_SUBJECT_PREFIX} [${backup_type}] Backup Completed Successfully"
        # Use Python to generate professional email template
        email_body=$(python3 << PYTHON_EOF
import sys
sys.path.insert(0, '$BASE_DIR')
from scripts.email.email_templates import format_backup_success
import os

backup_file = '''$backup_file'''
backup_size = '''$backup_size'''
backup_type = '''$backup_type'''

print(format_backup_success(backup_type.strip(), backup_file.strip(), backup_size.strip()))
PYTHON_EOF
)
    else
        subject="${EMAIL_SUBJECT_PREFIX} [${backup_type}] Backup Failed - Action Required"
        error_msg="See logs/backup-manager.log for details"
        email_body=$(python3 << PYTHON_EOF
import sys
sys.path.insert(0, '$BASE_DIR')
from scripts.email.email_templates import format_backup_failure

backup_type = '''$backup_type'''
error_msg = '''$error_msg'''

print(format_backup_failure(backup_type.strip(), error_msg.strip()))
PYTHON_EOF
)
    fi

    # Try using the SMTP relay script from scripts/email directory
    local SEND_EMAIL_SCRIPT="${BASE_DIR}/scripts/email/send-email.sh"
    if [ -f "${SEND_EMAIL_SCRIPT}" ]; then
        "${SEND_EMAIL_SCRIPT}" "$EMAIL_RECIPIENT" "$subject" "$email_body" 2>&1 | tee -a "${BACKUP_LOG}"
        return 0
    fi

    # Fallback to parent directory for backward compatibility
    SEND_EMAIL_SCRIPT="$(dirname "${BASE_DIR}")/send-email.sh"
    if [ -f "${SEND_EMAIL_SCRIPT}" ]; then
        "${SEND_EMAIL_SCRIPT}" "$EMAIL_RECIPIENT" "$subject" "$email_body" 2>&1 | tee -a "${BACKUP_LOG}"
        return 0
    fi

    # Final fallback to mail command if available
    if command -v mail &> /dev/null || command -v mailx &> /dev/null; then
        local MAIL_CMD="mail"
        if command -v mailx &> /dev/null; then
            MAIL_CMD="mailx"
        fi
        echo "$email_body" | $MAIL_CMD -s "$subject" "$EMAIL_RECIPIENT" 2>&1 | tee -a "${BACKUP_LOG}"
        return 0
    fi

    log_warn "Email notification skipped: no mail delivery method available"
    return 1
}

# Main function
main() {
    local command=${1:-"--help"}

    # Initialize structure
    init_backup_structure

    case "$command" in
        --full)
            local backup_file=$(create_full_backup)
            if [ $? -eq 0 ] && [ -n "$backup_file" ]; then
                local backup_size=$(get_file_size "${backup_file}" || echo "0")
                local size_human=$(numfmt --to=iec-i --suffix=B ${backup_size} 2>/dev/null || echo "${backup_size} bytes")
                send_email_notification "success" "FULL" "$backup_file" "$size_human"
            else
                send_email_notification "failure" "FULL" "unknown" "Full backup failed"
            fi
            ;;
        --daily)
            local backup_file=$(create_daily_backup)
            if [ $? -eq 0 ] && [ -n "$backup_file" ]; then
                local backup_size=$(get_file_size "${backup_file}" || echo "0")
                local size_human=$(numfmt --to=iec-i --suffix=B ${backup_size} 2>/dev/null || echo "${backup_size} bytes")
                send_email_notification "success" "DAILY" "$backup_file" "$size_human"
            else
                send_email_notification "failure" "DAILY" "unknown" "Daily backup failed"
            fi
            ;;
        --auto)
            local backup_file=$(auto_backup)
            if [ $? -eq 0 ] && [ -n "$backup_file" ]; then
                # Determine backup type from filename
                local backup_type="DAILY"
                if [[ "$backup_file" == *"backup_full"* ]]; then
                    backup_type="FULL"
                fi
                local backup_size=$(get_file_size "${backup_file}" || echo "0")
                local size_human=$(numfmt --to=iec-i --suffix=B ${backup_size} 2>/dev/null || echo "${backup_size} bytes")
                send_email_notification "success" "$backup_type" "$backup_file" "$size_human"
            else
                send_email_notification "failure" "AUTO" "unknown" "Auto backup failed"
            fi
            ;;
        --cleanup)
            cleanup_old_backups
            if [ $? -eq 0 ]; then
                send_email_notification "success" "CLEANUP" "N/A" "Cleanup completed successfully"
            else
                send_email_notification "failure" "CLEANUP" "N/A" "Cleanup operation failed"
            fi
            ;;
        --archive)
            archive_old_backups
            if [ $? -eq 0 ]; then
                send_email_notification "success" "ARCHIVE" "N/A" "Archiving completed successfully"
            else
                send_email_notification "failure" "ARCHIVE" "N/A" "Archiving operation failed"
            fi
            ;;
        --list)
            list_backups
            ;;
        --help)
            cat <<EOF
Maps Tracker Backup Manager

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

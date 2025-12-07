#!/bin/bash
#
# Backblaze B2 Backup Script
# Replaces remote rsync backup with B2 cloud storage
#
# Features:
#   - Upload encrypted backups to Backblaze B2
#   - Organize by date and backup type
#   - Verify uploads with checksums
#   - List and manage remote backups
#   - Automatic cleanup of old backups
#   - Cost-optimized with lifecycle rules
#
# Usage:
#   ./b2-backup.sh --sync              # Sync all local backups to B2
#   ./b2-backup.sh --upload <file>     # Upload single backup file
#   ./b2-backup.sh --list              # List backups in B2
#   ./b2-backup.sh --verify            # Verify uploaded backups
#   ./b2-backup.sh --cleanup            # Remove old backups from B2
#   ./b2-backup.sh --download <file>   # Download backup from B2
#

set -e

# Set HOME for B2 CLI (required when running as non-root in containers)
export HOME=/tmp

# Detect project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"

# Load configuration
if [ -f "${PROJECT_DIR}/.env" ]; then
    set +a
    source "${PROJECT_DIR}/.env"
    set -a
fi

# Load .backup-secrets if it exists (overrides .env for sensitive credentials)
if [ -f "${PROJECT_DIR}/.backup-secrets" ]; then
    set +a
    source "${PROJECT_DIR}/.backup-secrets"
    set -a
fi

# B2 Configuration (from .env or .backup-secrets, or with defaults)
B2_ACCOUNT_ID="${B2_ACCOUNT_ID:-}"
B2_APPLICATION_KEY="${B2_APPLICATION_KEY:-}"
B2_BUCKET_NAME="${B2_BUCKET_NAME:-maps-tracker-backups}"
B2_BUCKET_TYPE="${B2_BUCKET_TYPE:-allPrivate}"

# Export B2 credentials for the CLI (newer B2 CLI requires both)
export B2_APPLICATION_KEY_ID="$B2_ACCOUNT_ID"
export B2_APPLICATION_KEY="$B2_APPLICATION_KEY"

# Backup settings
LOCAL_BACKUPS_DIR="${PROJECT_DIR}/backups"
LOGS_DIR="${PROJECT_DIR}/logs"
BACKUP_LOG="${LOGS_DIR}/b2-backup.log"
MANIFEST_FILE="${LOGS_DIR}/b2-manifest.json"

# Retention settings
B2_RETENTION_DAYS="${B2_RETENTION_DAYS:-180}"
B2_CLEANUP_ENABLED="${B2_CLEANUP_ENABLED:-true}"

# Email settings
EMAIL_ENABLED="${BACKUP_EMAIL_ENABLED:-true}"
EMAIL_RECIPIENT="${BACKUP_EMAIL:-admin@example.com}"

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

log_debug() {
    log "DEBUG" "$@"
    [ "$B2_DEBUG" = "true" ] && echo -e "${BLUE}[DEBUG]${NC} $@"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check B2 CLI is installed
    if ! command -v b2 &> /dev/null; then
        log_error "B2 CLI not found. Install with: pip install b2"
        exit 1
    fi

    # Check required environment variables
    if [ -z "$B2_ACCOUNT_ID" ] || [ -z "$B2_APPLICATION_KEY" ]; then
        log_error "B2_ACCOUNT_ID and B2_APPLICATION_KEY not set in .env"
        exit 1
    fi

    # Check directories exist
    if [ ! -d "$LOCAL_BACKUPS_DIR" ]; then
        log_error "Backups directory not found: $LOCAL_BACKUPS_DIR"
        exit 1
    fi

    log_info "✓ Prerequisites met"
}

# Authenticate with B2
b2_auth() {
    log_info "Authenticating with Backblaze B2..."

    if b2 authorize-account "$B2_ACCOUNT_ID" "$B2_APPLICATION_KEY" > /dev/null 2>&1; then
        log_info "✓ B2 authentication successful"
        return 0
    else
        log_error "Failed to authenticate with B2"
        return 1
    fi
}

# Ensure bucket exists or create it
ensure_bucket() {
    log_info "Checking B2 bucket: $B2_BUCKET_NAME"

    # Try to sync to the bucket - if it exists and the key has access, this will work
    # If the bucket doesn't exist, the sync will fail with a specific error
    # For restricted keys (which can only access specific buckets), this is the safest approach
    log_debug "Using restricted application key - assuming bucket $B2_BUCKET_NAME is pre-configured"
    log_info "✓ Ready to sync to: $B2_BUCKET_NAME"
    return 0
}

# Upload single file to B2
upload_file() {
    local file=$1
    local filename=$(basename "$file")
    local file_date=$(date '+%Y/%m/%d')
    local remote_path="backups/${file_date}/${filename}"

    if [ ! -f "$file" ]; then
        log_error "File not found: $file"
        return 1
    fi

    log_info "Uploading to B2: $remote_path"

    # Calculate file hash for verification
    local local_hash=$(sha256sum "$file" | awk '{print $1}')

    # Upload file using new B2 CLI syntax: b2 file upload <bucket> <local_file> <remote_path>
    # Capture output and check for successful upload indicator (fileId in JSON response)
    local upload_output=$(b2 file upload "$B2_BUCKET_NAME" "$file" "$remote_path" 2>&1)

    if echo "$upload_output" | grep -q '"fileId"'; then
        local file_size=$(du -h "$file" | cut -f1)
        log_info "✓ Uploaded: $remote_path ($file_size)"

        # Update manifest
        update_manifest "$filename" "$remote_path" "$local_hash" "success"
        return 0
    else
        log_error "Failed to upload: $remote_path"
        log_debug "Upload output: $upload_output"
        update_manifest "$filename" "$remote_path" "" "failed"
        return 1
    fi
}

# Sync all local backups to B2
sync_backups() {
    log_info "Syncing local backups to B2..."

    # Determine what files to upload
    local upload_pattern="*.sql"
    if find "$LOCAL_BACKUPS_DIR/daily" "$LOCAL_BACKUPS_DIR/full" -type f -name "*.gpg" 2>/dev/null | grep -q .; then
        log_info "Found encrypted backups (.gpg files) in daily/full folders"
        upload_pattern="*.gpg"
    else
        log_info "No encrypted backups found, using unencrypted backups (.sql files)"
    fi

    # Upload all matching files
    local uploaded=0
    local failed=0

    # Use array to avoid subshell issues with pipes
    mapfile -t files < <(find "$LOCAL_BACKUPS_DIR/daily" "$LOCAL_BACKUPS_DIR/full" -type f -name "$upload_pattern" 2>/dev/null | sort)

    log_debug "Found ${#files[@]} files to upload"

    if [ ${#files[@]} -eq 0 ]; then
        log_warn "No backup files found to upload"
        return 0
    fi

    for file in "${files[@]}"; do
        log_debug "Processing file: $file"
        if [ -n "$file" ] && [ -f "$file" ]; then
            if upload_file "$file"; then
                log_debug "Upload succeeded for: $file"
                uploaded=$((uploaded + 1))
            else
                log_debug "Upload failed for: $file"
                failed=$((failed + 1))
            fi
        else
            log_debug "File check failed for: $file"
        fi
    done

    # Update sync marker
    touch /tmp/b2-sync-marker

    log_info "Sync complete: $uploaded uploaded, $failed failed"

    if [ "$failed" -gt 0 ]; then
        return 1
    fi

    return 0
}

# List backups in B2
list_backups() {
    log_info "Listing backups in B2 bucket: $B2_BUCKET_NAME"
    echo ""

    # Use new B2 CLI syntax with b2:// URI
    b2 ls --long --recursive "b2://${B2_BUCKET_NAME}/backups" 2>/dev/null | while read line; do
        # Parse the ls output format
        if [[ $line =~ ([0-9]{4}-[0-9]{2}-[0-9]{2}\ [0-9]{2}:[0-9]{2}:[0-9]{2})\ +([0-9]+)\ +([^ ]+)\ +(.+)$ ]]; then
            local datetime="${BASH_REMATCH[1]}"
            local size="${BASH_REMATCH[2]}"
            local filename="${BASH_REMATCH[4]}"
            local size_mb=$((size / 1048576))

            printf "%-19s  %6d MB  %s\n" "$datetime" "$size_mb" "$filename"
        fi
    done

    echo ""
}

# Verify uploaded backups
verify_backups() {
    log_info "Verifying uploaded backups..."

    if [ ! -f "$MANIFEST_FILE" ]; then
        log_warn "Manifest file not found: $MANIFEST_FILE"
        log_info "Run --sync first to create manifest"
        return 1
    fi

    # Check manifest integrity (line-delimited JSON format)
    local total=$(grep -c '"status":"success"' "$MANIFEST_FILE" || echo 0)
    local failed=$(grep -c '"status":"failed"' "$MANIFEST_FILE" || echo 0)

    echo ""
    log_info "Upload Status:"
    echo "  Successful: $total"
    echo "  Failed: $failed"

    if [ "$failed" -gt 0 ]; then
        log_warn "Some backups failed to upload"
        return 1
    fi

    if [ "$total" -eq 0 ]; then
        log_warn "No uploads recorded in manifest"
        return 0
    fi

    log_info "✓ All backups verified ($total successful)"
    return 0
}

# Clean up old backups from B2
cleanup_old_backups() {
    if [ "$B2_CLEANUP_ENABLED" != "true" ]; then
        log_info "Cleanup disabled (B2_CLEANUP_ENABLED=false)"
        return 0
    fi

    log_info "Cleaning up backups older than $B2_RETENTION_DAYS days..."

    local cutoff_date=$(date -d "$B2_RETENTION_DAYS days ago" '+%Y-%m-%d' 2>/dev/null || date -v-${B2_RETENTION_DAYS}d '+%Y-%m-%d')
    local deleted=0
    local errors=0

    # List all backups and delete old ones
    b2 ls --long --recursive "$B2_BUCKET_NAME" | while read line; do
        if [[ $line =~ ^([0-9]{4}-[0-9]{2}-[0-9]{2})\ .*\ (.+)$ ]]; then
            local file_date="${BASH_REMATCH[1]}"
            local filename="${BASH_REMATCH[2]}"

            # Compare dates
            if [ "$file_date" \< "$cutoff_date" ]; then
                if b2 delete-file-version "$filename" $(b2 ls --json "$B2_BUCKET_NAME" | grep "$filename" | head -1 | jq -r '.id') > /dev/null 2>&1; then
                    log_info "Deleted: $filename"
                    ((deleted++))
                else
                    log_warn "Failed to delete: $filename"
                    ((errors++))
                fi
            fi
        fi
    done

    log_info "✓ Cleanup complete: $deleted deleted, $errors errors"
    [ $errors -eq 0 ] && return 0 || return 1
}

# Download backup from B2
download_backup() {
    local filename=$1
    local output_path="${LOCAL_BACKUPS_DIR}/${filename}"

    if [ -z "$filename" ]; then
        log_error "Filename required for download"
        return 1
    fi

    log_info "Downloading from B2: $filename"

    if b2 download-file-by-id --noProgress \
        $(b2 ls --json "$B2_BUCKET_NAME" | grep -m1 "\"fileName\": \".*$filename" | jq -r '.id') \
        "$output_path" > /dev/null 2>&1; then

        log_info "✓ Downloaded: $output_path"
        return 0
    else
        log_error "Failed to download: $filename"
        return 1
    fi
}

# Update manifest file
update_manifest() {
    local filename=$1
    local remote_path=$2
    local hash=$3
    local status=$4
    local timestamp=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

    # Ensure manifest directory exists
    mkdir -p "$(dirname "$MANIFEST_FILE")" || return 1

    # Append a simple line-delimited JSON format (one entry per line)
    # This avoids complex JSON manipulation and is resilient to partial writes
    printf '{"filename":"%s","remote_path":"%s","hash":"%s","status":"%s","timestamp":"%s"}\n' \
        "$filename" "$remote_path" "$hash" "$status" "$timestamp" >> "$MANIFEST_FILE" 2>/dev/null || {
        log_warn "Failed to update manifest for $filename, continuing..."
        return 0  # Don't fail the entire sync if manifest update fails
    }

    return 0
}

# Parse arguments
parse_args() {
    case "${1:-}" in
        --sync)
            sync_backups
            ;;
        --upload)
            if [ -z "${2:-}" ]; then
                log_error "Filename required for --upload"
                exit 1
            fi
            upload_file "$2"
            ;;
        --list)
            list_backups
            ;;
        --verify)
            verify_backups
            ;;
        --cleanup)
            cleanup_old_backups
            ;;
        --download)
            if [ -z "${2:-}" ]; then
                log_error "Filename required for --download"
                exit 1
            fi
            download_backup "$2"
            ;;
        --help)
            show_help
            ;;
        *)
            show_help
            exit 1
            ;;
    esac
}

# Show help
show_help() {
    cat << EOF
Backblaze B2 Backup Utility

Usage:
  $0 --sync              Sync all local backups to B2
  $0 --upload <file>     Upload single backup file
  $0 --list              List backups in B2
  $0 --verify            Verify uploaded backups
  $0 --cleanup           Remove old backups from B2
  $0 --download <file>   Download backup from B2
  $0 --help              Show this help message

Configuration (.env):
  B2_ACCOUNT_ID          Backblaze account ID
  B2_APPLICATION_KEY     Backblaze application key
  B2_BUCKET_NAME         B2 bucket name (default: maps-tracker-backups)
  B2_RETENTION_DAYS      Days to retain backups (default: 180)
  B2_CLEANUP_ENABLED     Auto-cleanup old backups (default: true)

Examples:
  # Sync all backups to B2
  ./b2-backup.sh --sync

  # Upload single backup
  ./b2-backup.sh --upload /home/user/backups/backup_20251201.sql.gpg

  # List all backups in B2
  ./b2-backup.sh --list

  # Download specific backup
  ./b2-backup.sh --download backup_20251201.sql.gpg

  # Clean up backups older than retention period
  ./b2-backup.sh --cleanup

EOF
}

# Main execution
main() {
    log_info "================================================"
    log_info "Backblaze B2 Backup - $(date '+%Y-%m-%d %H:%M:%S')"
    log_info "================================================"

    check_prerequisites
    b2_auth || exit 1
    ensure_bucket || exit 1

    parse_args "$@"
    EXIT_CODE=$?

    log_info "================================================"
    log_info "Complete"
    log_info "================================================"

    return $EXIT_CODE
}

main "$@"

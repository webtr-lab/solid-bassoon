#!/bin/bash

#######################################################
# GPS Tracker - Server Restore Script
#######################################################
# This script restores the database from backup files.
#
# Safety Features:
# - Lists available backups
# - Shows backup details before restore
# - Creates pre-restore backup automatically
# - Requires explicit confirmation
# - Validates backup file
# - Checks database container status
#
# Usage:
#   ./restore-server.sh                    # Interactive mode
#   ./restore-server.sh <backup_file>      # Direct restore with confirmation
#   ./restore-server.sh --list             # List available backups
#   ./restore-server.sh --latest           # Restore latest backup
#
# Examples:
#   ./restore-server.sh
#   ./restore-server.sh server_backup_20251030_030000.sql
#   ./restore-server.sh backup_20251030_020000.sql
#   ./restore-server.sh manual_pre_upgrade.sql
#   ./restore-server.sh --latest
#######################################################

set -e  # Exit on error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"
CREATE_PRE_RESTORE_BACKUP=true  # Set to false to skip pre-restore backup

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to print colored messages
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_important() {
    echo -e "${MAGENTA}[IMPORTANT]${NC} $1"
}

# Check if Docker is installed and running
check_docker() {
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed or not in PATH"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        log_error "Docker daemon is not running or you don't have permission"
        exit 1
    fi
}

# Check if the database container is running
check_db_container() {
    if ! docker compose ps | grep -q "gps_db.*Up"; then
        log_error "Database container (gps_db) is not running"
        log_info "Start it with: docker compose up -d db"
        exit 1
    fi
}

# List all available backups
list_backups() {
    local show_header="${1:-true}"

    if [ "$show_header" = "true" ]; then
        echo ""
        echo "=========================================="
        echo "  Available Backups"
        echo "=========================================="
        echo ""
    fi

    local count=0
    local idx=1

    # Sort by modification time, newest first
    while IFS= read -r backup_file; do
        local filename=$(basename "$backup_file")
        local size=$(du -h "$backup_file" | cut -f1)
        local date=$(stat -c %y "$backup_file" | cut -d'.' -f1)

        # Determine backup type based on filename
        local type=""
        if [[ "$filename" == server_backup_* ]]; then
            type="${CYAN}[Server]${NC}"
        elif [[ "$filename" == manual_* ]]; then
            type="${MAGENTA}[Manual]${NC}"
        elif [[ "$filename" == backup_* ]]; then
            type="${BLUE}[App Auto]${NC}"
        else
            type="${YELLOW}[Unknown]${NC}"
        fi

        printf "%3d) %s %-45s  %8s  %s\n" "$idx" "$type" "$filename" "$size" "$date"
        count=$((count + 1))
        idx=$((idx + 1))
    done < <(find "$BACKUP_DIR" -name "*.sql" -type f -printf '%T@ %p\n' | sort -rn | cut -d' ' -f2-)

    echo ""
    if [ "$count" -eq 0 ]; then
        log_warning "No backup files found in $BACKUP_DIR"
        return 1
    else
        log_info "Total backups: $count"
        return 0
    fi
}

# Get backup file path by index or name
get_backup_file() {
    local input="$1"

    # If input is empty, return error
    if [ -z "$input" ]; then
        return 1
    fi

    # If input is a number, get backup by index
    if [[ "$input" =~ ^[0-9]+$ ]]; then
        local backup_file=$(find "$BACKUP_DIR" -name "*.sql" -type f -printf '%T@ %p\n' | \
            sort -rn | cut -d' ' -f2- | sed -n "${input}p")

        if [ -n "$backup_file" ]; then
            echo "$backup_file"
            return 0
        fi
        return 1
    fi

    # If input is a filename (with or without path)
    if [[ "$input" == *.sql ]]; then
        # Check if it's a full path
        if [ -f "$input" ]; then
            echo "$input"
            return 0
        fi

        # Check if it's just a filename in backup dir
        if [ -f "$BACKUP_DIR/$input" ]; then
            echo "$BACKUP_DIR/$input"
            return 0
        fi
    fi

    return 1
}

# Validate backup file
validate_backup() {
    local backup_file="$1"

    # Check if file exists
    if [ ! -f "$backup_file" ]; then
        log_error "Backup file not found: $backup_file"
        return 1
    fi

    # Check if file is readable
    if [ ! -r "$backup_file" ]; then
        log_error "Cannot read backup file: $backup_file"
        return 1
    fi

    # Check if file is not empty
    if [ ! -s "$backup_file" ]; then
        log_error "Backup file is empty: $backup_file"
        return 1
    fi

    # Check if file contains PostgreSQL dump signature
    if ! head -5 "$backup_file" | grep -q "PostgreSQL database dump"; then
        log_warning "File may not be a valid PostgreSQL dump (missing signature)"
        log_warning "Proceeding anyway, but restore may fail..."
        return 0
    fi

    return 0
}

# Show backup details
show_backup_details() {
    local backup_file="$1"
    local filename=$(basename "$backup_file")
    local size=$(du -h "$backup_file" | cut -f1)
    local date=$(stat -c %y "$backup_file" | cut -d'.' -f1)
    local age=$(find "$backup_file" -printf '%AD\n')

    echo ""
    echo "=========================================="
    echo "  Backup Details"
    echo "=========================================="
    echo ""
    echo "  Filename: $filename"
    echo "  Size:     $size"
    echo "  Created:  $date ($age days ago)"
    echo "  Path:     $backup_file"
    echo ""

    # Show first few lines of backup for verification
    echo "  First lines:"
    head -10 "$backup_file" | grep -E "(PostgreSQL|Dumped)" | sed 's/^/    /'
    echo ""
}

# Create pre-restore backup
create_pre_restore_backup() {
    log_important "Creating pre-restore backup for safety..."

    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_name="pre_restore_${timestamp}.sql"
    local backup_path="${BACKUP_DIR}/${backup_name}"

    # Load environment variables
    if [ -f "${SCRIPT_DIR}/.env" ]; then
        source "${SCRIPT_DIR}/.env"
    else
        log_error ".env file not found"
        return 1
    fi

    # Create backup
    if docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$backup_path" 2>/dev/null; then
        local file_size=$(du -h "$backup_path" | cut -f1)
        log_success "Pre-restore backup created: $backup_name ($file_size)"
        echo "  Location: $backup_path"
        echo ""
        return 0
    else
        log_error "Failed to create pre-restore backup!"
        log_warning "Continue anyway? This is dangerous! (y/N)"
        read -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Restore cancelled"
            exit 1
        fi
        return 1
    fi
}

# Perform the restore
perform_restore() {
    local backup_file="$1"
    local filename=$(basename "$backup_file")

    log_info "Starting restore from: $filename"
    log_info "This will overwrite all current database data!"
    echo ""

    # Load environment variables
    if [ -f "${SCRIPT_DIR}/.env" ]; then
        source "${SCRIPT_DIR}/.env"
    else
        log_error ".env file not found"
        return 1
    fi

    # Drop all connections to the database
    log_info "Dropping active database connections..."
    docker compose exec -T db psql -U "$POSTGRES_USER" -d postgres << EOF >/dev/null 2>&1
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$POSTGRES_DB' AND pid <> pg_backend_pid();
EOF

    # Perform restore
    log_info "Restoring database..."
    if docker compose exec -T db psql -U "$POSTGRES_USER" "$POSTGRES_DB" < "$backup_file" >/dev/null 2>&1; then
        echo ""
        log_success "Database restored successfully!"
        echo ""
        log_info "Restored from: $filename"

        # Restart backend to clear any cached data
        log_info "Restarting backend to clear cache..."
        if docker compose restart backend >/dev/null 2>&1; then
            log_success "Backend restarted"
        else
            log_warning "Backend restart failed, you may need to restart manually"
        fi

        echo ""
        log_important "Database restore complete!"
        log_info "Please verify the application is working correctly"
        return 0
    else
        echo ""
        log_error "Database restore failed!"
        log_warning "Check the backup file format and database logs"
        log_info "View logs: docker compose logs db"
        return 1
    fi
}

# Interactive restore mode
interactive_restore() {
    echo ""
    echo "=========================================="
    echo "  GPS Tracker - Database Restore"
    echo "=========================================="

    # List available backups
    if ! list_backups; then
        exit 1
    fi

    echo ""
    echo "Enter backup number, filename, or 'q' to quit:"
    read -r selection

    if [ "$selection" = "q" ] || [ "$selection" = "Q" ]; then
        log_info "Restore cancelled"
        exit 0
    fi

    # Get backup file
    local backup_file=$(get_backup_file "$selection")
    if [ -z "$backup_file" ]; then
        log_error "Invalid selection: $selection"
        exit 1
    fi

    # Validate backup
    if ! validate_backup "$backup_file"; then
        exit 1
    fi

    # Show backup details
    show_backup_details "$backup_file"

    # Confirm restore
    log_warning "⚠️  WARNING: This will OVERWRITE all current database data!"
    log_warning "Are you absolutely sure you want to restore from this backup? (yes/no)"
    read -r confirmation

    if [ "$confirmation" != "yes" ]; then
        log_info "Restore cancelled (must type 'yes' to confirm)"
        exit 0
    fi

    # Create pre-restore backup
    if [ "$CREATE_PRE_RESTORE_BACKUP" = true ]; then
        if ! create_pre_restore_backup; then
            log_warning "Pre-restore backup failed but continuing..."
        fi
    fi

    # Perform restore
    perform_restore "$backup_file"
}

# Direct restore mode
direct_restore() {
    local backup_input="$1"

    echo ""
    echo "=========================================="
    echo "  GPS Tracker - Database Restore"
    echo "=========================================="
    echo ""

    # Get backup file
    local backup_file=$(get_backup_file "$backup_input")
    if [ -z "$backup_file" ]; then
        log_error "Backup file not found: $backup_input"
        log_info "Available backups:"
        list_backups false
        exit 1
    fi

    # Validate backup
    if ! validate_backup "$backup_file"; then
        exit 1
    fi

    # Show backup details
    show_backup_details "$backup_file"

    # Confirm restore
    log_warning "⚠️  WARNING: This will OVERWRITE all current database data!"
    echo ""
    read -p "Continue with restore? (yes/no): " -r confirmation

    if [ "$confirmation" != "yes" ]; then
        log_info "Restore cancelled (must type 'yes' to confirm)"
        exit 0
    fi

    # Create pre-restore backup
    if [ "$CREATE_PRE_RESTORE_BACKUP" = true ]; then
        if ! create_pre_restore_backup; then
            log_warning "Pre-restore backup failed but continuing..."
        fi
    fi

    # Perform restore
    perform_restore "$backup_file"
}

# Restore latest backup
restore_latest() {
    echo ""
    echo "=========================================="
    echo "  GPS Tracker - Restore Latest Backup"
    echo "=========================================="
    echo ""

    # Get latest backup
    local latest_backup=$(find "$BACKUP_DIR" -name "*.sql" -type f -printf '%T@ %p\n' | \
        sort -rn | head -1 | cut -d' ' -f2-)

    if [ -z "$latest_backup" ]; then
        log_error "No backup files found"
        exit 1
    fi

    log_info "Latest backup found:"
    show_backup_details "$latest_backup"

    # Confirm restore
    log_warning "⚠️  WARNING: This will OVERWRITE all current database data!"
    echo ""
    read -p "Restore from latest backup? (yes/no): " -r confirmation

    if [ "$confirmation" != "yes" ]; then
        log_info "Restore cancelled"
        exit 0
    fi

    # Create pre-restore backup
    if [ "$CREATE_PRE_RESTORE_BACKUP" = true ]; then
        if ! create_pre_restore_backup; then
            log_warning "Pre-restore backup failed but continuing..."
        fi
    fi

    # Perform restore
    perform_restore "$latest_backup"
}

# Main execution
main() {
    # Perform checks
    check_docker
    check_db_container

    # Parse arguments
    case "${1:-}" in
        --list|-l)
            list_backups
            ;;
        --latest)
            restore_latest
            ;;
        --help|-h)
            echo "Usage: $0 [options] [backup_file]"
            echo ""
            echo "Options:"
            echo "  (no args)          Interactive mode - select from list"
            echo "  <backup_file>      Restore specific backup"
            echo "  --latest           Restore latest backup"
            echo "  --list, -l         List available backups"
            echo "  --help, -h         Show this help"
            echo ""
            echo "Examples:"
            echo "  $0                                    # Interactive"
            echo "  $0 server_backup_20251030_030000.sql # Direct"
            echo "  $0 --latest                           # Latest"
            echo "  $0 --list                             # List only"
            ;;
        "")
            interactive_restore
            ;;
        *)
            direct_restore "$1"
            ;;
    esac
}

# Run main function with all arguments
main "$@"

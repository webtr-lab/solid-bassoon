#!/bin/bash

#######################################################
# GPS Tracker - Server Backup Script
#######################################################
# This script creates database backups from the server
# level, independent of the application's built-in
# backup system.
#
# Naming Convention:
# - Server backups: server_backup_YYYYMMDD_HHMMSS.sql
# - App automatic:  backup_YYYYMMDD_HHMMSS.sql
# - App manual:     manual_*.sql
#
# Usage:
#   ./backup-server.sh [backup_name]
#
# Examples:
#   ./backup-server.sh                    # Uses default timestamp name
#   ./backup-server.sh pre_upgrade        # Creates server_backup_pre_upgrade.sql
#######################################################

set -e  # Exit on error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/backups"
RETENTION_DAYS=30  # Keep server backups for 30 days
MAX_SERVER_BACKUPS=20  # Keep max 20 server backups

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
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

# Create backup directory if it doesn't exist
ensure_backup_dir() {
    if [ ! -d "$BACKUP_DIR" ]; then
        log_info "Creating backup directory: $BACKUP_DIR"
        mkdir -p "$BACKUP_DIR"
    fi
}

# Generate backup filename
generate_backup_name() {
    local custom_name="$1"
    local timestamp=$(date +%Y%m%d_%H%M%S)

    if [ -n "$custom_name" ]; then
        # Custom name provided
        echo "server_backup_${custom_name}.sql"
    else
        # Use timestamp
        echo "server_backup_${timestamp}.sql"
    fi
}

# Create the backup
create_backup() {
    local backup_name="$1"
    local backup_path="${BACKUP_DIR}/${backup_name}"

    log_info "Creating backup: $backup_name"
    log_info "Target: $backup_path"

    # Load environment variables to get database credentials
    if [ -f "${SCRIPT_DIR}/.env" ]; then
        source "${SCRIPT_DIR}/.env"
    else
        log_error ".env file not found"
        exit 1
    fi

    # Check if we have write permissions to backup directory
    if [ ! -w "$BACKUP_DIR" ]; then
        log_error "No write permission to backup directory: $BACKUP_DIR"
        log_info "Run: sudo chown -R \$USER:\$USER ${BACKUP_DIR}"
        log_info "Or run this script with sudo"
        return 1
    fi

    # Execute pg_dump in the database container
    if docker compose exec -T db pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$backup_path" 2>/dev/null; then
        local file_size=$(du -h "$backup_path" | cut -f1)
        log_success "Backup created successfully!"
        log_info "File: $backup_path"
        log_info "Size: $file_size"
        return 0
    else
        log_error "Backup failed!"
        # Remove failed backup file if it exists
        [ -f "$backup_path" ] && rm "$backup_path"
        return 1
    fi
}

# Clean up old server backups
cleanup_old_backups() {
    log_info "Cleaning up old server backups..."

    # Remove backups older than RETENTION_DAYS
    local removed_count=0
    while IFS= read -r backup_file; do
        if [ -f "$backup_file" ]; then
            rm "$backup_file"
            removed_count=$((removed_count + 1))
            log_info "Removed old backup: $(basename "$backup_file")"
        fi
    done < <(find "$BACKUP_DIR" -name "server_backup_*.sql" -type f -mtime +$RETENTION_DAYS)

    # Keep only the last MAX_SERVER_BACKUPS backups
    local backup_count=$(find "$BACKUP_DIR" -name "server_backup_*.sql" -type f | wc -l)
    if [ "$backup_count" -gt "$MAX_SERVER_BACKUPS" ]; then
        local to_remove=$((backup_count - MAX_SERVER_BACKUPS))
        log_info "Found $backup_count server backups, keeping only last $MAX_SERVER_BACKUPS"

        find "$BACKUP_DIR" -name "server_backup_*.sql" -type f -printf '%T@ %p\n' | \
            sort -n | \
            head -n "$to_remove" | \
            cut -d' ' -f2- | \
            while IFS= read -r old_file; do
                rm "$old_file"
                removed_count=$((removed_count + 1))
                log_info "Removed excess backup: $(basename "$old_file")"
            done
    fi

    if [ "$removed_count" -gt 0 ]; then
        log_success "Cleaned up $removed_count old backup(s)"
    else
        log_info "No old backups to clean up"
    fi
}

# List all backups
list_backups() {
    log_info "Server backups in $BACKUP_DIR:"
    echo ""

    local count=0
    while IFS= read -r backup_file; do
        local size=$(du -h "$backup_file" | cut -f1)
        local date=$(stat -c %y "$backup_file" | cut -d'.' -f1)
        printf "  %-40s  %8s  %s\n" "$(basename "$backup_file")" "$size" "$date"
        count=$((count + 1))
    done < <(find "$BACKUP_DIR" -name "server_backup_*.sql" -type f | sort -r)

    echo ""
    log_info "Total server backups: $count"
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "  GPS Tracker - Server Backup Script"
    echo "=========================================="
    echo ""

    # Perform checks
    check_docker
    check_db_container
    ensure_backup_dir

    # Generate backup name
    local custom_name="$1"
    local backup_name=$(generate_backup_name "$custom_name")

    # Check if backup already exists
    if [ -f "${BACKUP_DIR}/${backup_name}" ]; then
        log_warning "Backup already exists: $backup_name"
        read -p "Overwrite? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Backup cancelled"
            exit 0
        fi
    fi

    # Create the backup
    if create_backup "$backup_name"; then
        echo ""
        cleanup_old_backups
        echo ""
        list_backups
        echo ""
        log_success "Backup process completed successfully!"
        echo ""
    else
        echo ""
        log_error "Backup process failed!"
        exit 1
    fi
}

# Run main function with all arguments
main "$@"

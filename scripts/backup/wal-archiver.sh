#!/bin/bash
#
# WAL Archiver Script
# Called by PostgreSQL archive_command to archive WAL files
# PostgreSQL will call this with: %p (path to WAL file) and %f (WAL filename)
#
# Usage: wal-archiver.sh <path-to-wal-file> <wal-filename>
# Example: wal-archiver.sh /var/lib/postgresql/pg_wal/000000010000000000000001 000000010000000000000001
#
# Note: Called only by PostgreSQL in production
# Do not run manually unless testing WAL archiving specifically
#

# Arguments from PostgreSQL archive_command
WAL_FILE="$1"
WAL_FILENAME="$2"

# Archive destination (must match Docker volume mount)
ARCHIVE_DIR="/var/lib/postgresql/wal-archive"

# Logging
LOG_FILE="/var/log/postgresql/wal-archive.log"

# Check if called with parameters (from PostgreSQL) or without (manual test)
IS_POSTGRESQL_CALL=false
if [ -n "$WAL_FILE" ] && [ -n "$WAL_FILENAME" ]; then
    IS_POSTGRESQL_CALL=true
fi

# Ensure archive directory exists
if [ ! -d "$ARCHIVE_DIR" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Archive directory does not exist: $ARCHIVE_DIR" >> "$LOG_FILE"
    exit 1
fi

# Copy WAL file to archive directory
if [ ! -f "$WAL_FILE" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Source WAL file does not exist: $WAL_FILE" >> "$LOG_FILE"
    # Only exit 1 if called by PostgreSQL (send alert) or if not a test
    if [ "$IS_POSTGRESQL_CALL" = true ]; then
        exit 1
    fi
    exit 1
fi

# Copy the WAL file
if cp "$WAL_FILE" "$ARCHIVE_DIR/$WAL_FILENAME" 2>> "$LOG_FILE"; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: Archived $WAL_FILENAME" >> "$LOG_FILE"
    exit 0
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Failed to archive $WAL_FILENAME" >> "$LOG_FILE"
    exit 1
fi

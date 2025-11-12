#!/bin/bash
#
# Universal Notification Wrapper
# Runs any script, disables built-in emails, sends notification via unified system
# Usage: universal_notify_wrapper.sh <script_path> [script_args...]
#
# This wrapper:
#   1. Disables built-in script emails (BACKUP_EMAIL_ENABLED=false)
#   2. Executes the script and captures output
#   3. Sends notification via notify.py (Individual_script_notification.html)
#   4. Returns original script exit code
#

set -e

if [ $# -lt 1 ]; then
    echo "Usage: $0 <script_path> [script_args...]"
    echo "Example: $0 scripts/backup/backup-manager.sh --daily"
    exit 1
fi

SCRIPT_PATH="$1"
shift  # Remove script path from arguments
SCRIPT_ARGS="$@"

# Verify script exists
if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Error: Script not found: $SCRIPT_PATH"
    exit 1
fi

SCRIPT_NAME=$(basename "$SCRIPT_PATH")
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$SCRIPT_DIR")"

# Create temporary log file
TEMP_LOG="/tmp/wrapper_${SCRIPT_NAME}.log.$$"
mkdir -p "$(dirname "$TEMP_LOG")"

# Capture start time
START_TIME=$(date +%s)

# Temporarily disable built-in emails by modifying .env
ENV_FILE="${BASE_DIR}/.env"
ENV_BACKUP="${ENV_FILE}.wrapper_backup.$$"

# Backup and modify .env
if [ -f "$ENV_FILE" ]; then
    cp "$ENV_FILE" "$ENV_BACKUP"
    # Remove existing BACKUP_EMAIL_ENABLED line and add disabled version
    grep -v "^BACKUP_EMAIL_ENABLED=" "$ENV_FILE" > "${ENV_FILE}.tmp" || true
    mv "${ENV_FILE}.tmp" "$ENV_FILE"
    echo "BACKUP_EMAIL_ENABLED=false" >> "$ENV_FILE"
fi

# Execute script with disabled emails, capture output
EXIT_CODE=0
if [ -n "$SCRIPT_ARGS" ]; then
    bash "$SCRIPT_PATH" $SCRIPT_ARGS > "$TEMP_LOG" 2>&1 || EXIT_CODE=$?
else
    bash "$SCRIPT_PATH" > "$TEMP_LOG" 2>&1 || EXIT_CODE=$?
fi

# Restore original .env
if [ -f "$ENV_BACKUP" ]; then
    mv "$ENV_BACKUP" "$ENV_FILE"
fi

# Capture end time and calculate duration
END_TIME=$(date +%s)
DURATION_SECONDS=$((END_TIME - START_TIME))

# Format duration
HOURS=$((DURATION_SECONDS / 3600))
MINUTES=$(((DURATION_SECONDS % 3600) / 60))
SECONDS=$((DURATION_SECONDS % 60))

if [ $HOURS -gt 0 ]; then
    DURATION="${HOURS}h ${MINUTES}m"
elif [ $MINUTES -gt 0 ]; then
    DURATION="${MINUTES}m ${SECONDS}s"
else
    DURATION="${SECONDS}s"
fi

# Get script output
OUTPUT=""
if [ -f "$TEMP_LOG" ]; then
    OUTPUT=$(cat "$TEMP_LOG")
    rm -f "$TEMP_LOG"
fi

# Send notification via universal notify utility
NOTIFY_SCRIPT="${BASE_DIR}/scripts/email/notify.py"

if [ -f "$NOTIFY_SCRIPT" ]; then
    python3 "$NOTIFY_SCRIPT" "$SCRIPT_NAME" "$EXIT_CODE" "$OUTPUT" "$DURATION" 2>/dev/null || true
fi

# Return original script exit code
exit $EXIT_CODE

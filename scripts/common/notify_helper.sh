#!/bin/bash
#
# Universal Notification Helper
# Source this in any script to automatically send notifications on completion
# Usage: source scripts/common/notify_helper.sh
#

# Capture script start time (should be sourced early in the script)
SCRIPT_START_TIME=$(date +%s)
SCRIPT_TEMP_LOG="/tmp/${SCRIPT_NAME:-script}.log.$$"

# Redirect output to temp log file (appended)
exec 1> >(tee -a "$SCRIPT_TEMP_LOG")
exec 2>&1

# Function to send notification on script exit
notify_on_exit() {
    local exit_code=$?
    local script_name="${1:-$(basename "$0")}"

    # Calculate duration
    local script_end_time=$(date +%s)
    local duration_seconds=$((script_end_time - SCRIPT_START_TIME))

    local hours=$((duration_seconds / 3600))
    local minutes=$(((duration_seconds % 3600) / 60))
    local seconds=$((duration_seconds % 60))

    local duration=""
    if [ $hours -gt 0 ]; then
        duration="${hours}h ${minutes}m"
    elif [ $minutes -gt 0 ]; then
        duration="${minutes}m ${seconds}s"
    else
        duration="${seconds}s"
    fi

    # Get script output
    local output=""
    if [ -f "$SCRIPT_TEMP_LOG" ]; then
        output=$(cat "$SCRIPT_TEMP_LOG")
        rm -f "$SCRIPT_TEMP_LOG"
    fi

    # Send notification via Python utility
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    local base_dir="$(dirname "$(dirname "${script_dir}")")"
    local notify_script="${base_dir}/scripts/email/notify.py"

    if [ -f "$notify_script" ]; then
        python3 "$notify_script" "$script_name" "$exit_code" "$output" "$duration" 2>/dev/null || true
    fi
}

# Register exit trap
trap 'notify_on_exit "$0"' EXIT

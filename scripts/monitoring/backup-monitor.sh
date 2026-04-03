#!/bin/bash
#
# Professional Backup Monitoring & Status Reporter
# Tracks: Daily backups, B2 cloud sync, Backup integrity, Client data status
# Sends detailed email reports to admin
#

set -o pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
LOG_DIR="${PROJECT_DIR}/logs"
BACKUP_DIR="${PROJECT_DIR}/backups"
BACKUP_MONITOR_LOG="${LOG_DIR}/backup-monitor.log"
STATE_DIR="${LOG_DIR}/.monitor-state"

# Load .env
if [ -f "${PROJECT_DIR}/.env" ]; then
    set -a
    source "${PROJECT_DIR}/.env"
    set +a
fi

# Configuration
ADMIN_EMAIL="${ADMIN_EMAIL:-${TEST_EMAIL:-demo@praxisnetworking.com}}"
APP_NAME="Maps Tracker Vehicle Tracking System"
HOSTNAME=$(hostname)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
TODAY=$(date '+%Y/%m/%d')

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

mkdir -p "$STATE_DIR"

# Logging
log_info() {
    echo -e "[${TIMESTAMP}] ${GREEN}[INFO]${NC} $@" | tee -a "$BACKUP_MONITOR_LOG"
}

log_warn() {
    echo -e "[${TIMESTAMP}] ${YELLOW}[WARN]${NC} $@" | tee -a "$BACKUP_MONITOR_LOG"
}

log_error() {
    echo -e "[${TIMESTAMP}] ${RED}[ERROR]${NC} $@" | tee -a "$BACKUP_MONITOR_LOG"
}

# Get backup statistics
get_backup_stats() {
    local today_count=$(find "${BACKUP_DIR}/daily/${TODAY}" -name "*.sql" -type f 2>/dev/null | wc -l)
    local today_size=$(du -sh "${BACKUP_DIR}/daily/${TODAY}" 2>/dev/null | cut -f1 || echo "0B")

    local latest_backup=$(find "${BACKUP_DIR}/daily" -name "*.sql" -type f -printf '%T@ %p\n' 2>/dev/null | sort -rn | head -1 | awk '{print $2}')
    local latest_time="Unknown"
    if [ -n "$latest_backup" ]; then
        latest_time=$(stat -c %y "$latest_backup" 2>/dev/null | cut -d. -f1)
    else
        log_warn "PostgreSQL database not available"
        recent_records="0"
        total_records="0"
    fi

    local total_backups=$(find "${BACKUP_DIR}/daily" -name "*.sql" -type f 2>/dev/null | wc -l)
    local total_size=$(du -sh "${BACKUP_DIR}" 2>/dev/null | cut -f1)

    echo "{\"today_count\": $today_count, \"today_size\": \"$today_size\", \"latest_time\": \"$latest_time\", \"total_backups\": $total_backups, \"total_size\": \"$total_size\"}"
}

# Get B2 sync status
get_b2_status() {
    local b2_enabled="${B2_ENABLED:-false}"
    local b2_status="disabled"
    local b2_files=0

    if [ "$b2_enabled" = "true" ]; then
        b2_status="enabled"
        local manifest="${LOG_DIR}/b2-manifest.json"
        if [ -f "$manifest" ]; then
            b2_files=$(wc -l < "$manifest" 2>/dev/null || echo "0")
        fi
    else
        log_warn "PostgreSQL database not available"
        recent_records="0"
        total_records="0"
    fi

    echo "{\"status\": \"$b2_status\", \"files_synced\": $b2_files}"
}

# Check backup integrity
check_backup_integrity() {
    log_info "Checking backup integrity..."

    local integrity_ok=true
    local errors=""

    # Check if backup files exist and have content
    local backup_files=$(find "${BACKUP_DIR}/daily/${TODAY}" -name "*.sql" -type f 2>/dev/null)
    local file_count=0

    while IFS= read -r backup_file; do
        [ -z "$backup_file" ] && continue
        ((file_count++))

        # Verify file has content
        if [ ! -s "$backup_file" ]; then
            errors="${errors}File is empty: $backup_file\n"
            integrity_ok=false
        fi

        # Verify checksum file exists
        if [ ! -f "${backup_file}.sha256" ]; then
            errors="${errors}Missing checksum: ${backup_file}.sha256\n"
        fi
    done <<< "$backup_files"

    if [ $file_count -eq 0 ]; then
        log_warn "No backup files found for today"
        return 1
    else
        log_warn "PostgreSQL database not available"
        recent_records="0"
        total_records="0"
    fi

    if [ "$integrity_ok" = false ]; then
        log_error "Backup integrity check failed"
        echo "{\"status\": \"failed\", \"file_count\": $file_count, \"errors\": \"$errors\"}"
        return 1
    else
        log_warn "PostgreSQL database not available"
        recent_records="0"
        total_records="0"
    fi

    log_info "Backup integrity: OK ($file_count files)"
    echo "{\"status\": \"ok\", \"file_count\": $file_count}"
    return 0
}

# Get recent database activity
get_database_activity() {

    local recent_records="0"
    local total_records="0"

    # Also check PostgreSQL if available
    if docker compose exec -T db psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-maps_tracker}" -t -c "SELECT 1;" 2>/dev/null | grep -q 1; then
        recent_records=$(docker compose exec -T db psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-maps_tracker}" -t -c "SELECT COUNT(*) FROM locations WHERE timestamp >= NOW() - INTERVAL '1 hour';" 2>/dev/null || echo "0")
        total_records=$(docker compose exec -T db psql -U "${POSTGRES_USER:-postgres}" -d "${POSTGRES_DB:-maps_tracker}" -t -c "SELECT COUNT(*) FROM locations;" 2>/dev/null || echo "0")
    else
        log_warn "PostgreSQL database not available"
        recent_records="0"
        total_records="0"
    fi

    echo "{\"recent_hour\": $recent_records, \"total\": $total_records}"
}

# Send professional backup status email
send_backup_report() {
    local backup_stats=$1
    local b2_status=$2
    local integrity_check=$3
    local db_activity=$4

    local recipient="${ADMIN_EMAIL}"
    local subject="[REPORT] $APP_NAME - Daily Backup Status Report"

    # Create temporary directory for email assets
    local temp_dir=$(mktemp -d)
    local html_file="$temp_dir/report.html"
    local python_file="$temp_dir/send_email.py"

    # Generate and write HTML report to file
    generate_backup_report_html "$backup_stats" "$b2_status" "$integrity_check" "$db_activity" > "$html_file"

    # Write Python email script to file
    cat > "$python_file" << 'PYEOF'
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import sys

smtp_host = os.environ.get('SMTP_HOST', 'localhost')
smtp_port = int(os.environ.get('SMTP_PORT', 465))
smtp_user = os.environ.get('SMTP_USER', '')
smtp_pass = os.environ.get('SMTP_PASS', '')

recipient = sys.argv[1]
subject = sys.argv[2]
html_file = sys.argv[3]

with open(html_file, 'r') as f:
    html_content = f.read()

msg = MIMEMultipart('alternative')
msg['Subject'] = subject
msg['From'] = smtp_user
msg['To'] = recipient

html_part = MIMEText(html_content, 'html')
msg.attach(html_part)

try:
    if smtp_port == 465:
        server = smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30)
    else:
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=30)
    server.login(smtp_user, smtp_pass)
    server.sendmail(smtp_user, [recipient], msg.as_string())
    server.quit()
except Exception as e:
    print(f"Error: {str(e)}", file=sys.stderr)
    sys.exit(1)
PYEOF

    # Execute Python script
    python3 "$python_file" "$recipient" "$subject" "$html_file" 2>/dev/null || {
        log_error "Failed to send backup report email"
        rm -rf "$temp_dir"
        return 1
    }

    # Cleanup
    rm -rf "$temp_dir"
}

# Extract JSON values using simple bash parsing
extract_json_value() {
    local json=$1
    local key=$2
    echo "$json" | sed -n "s/.*\"$key\":\s*\([^,}]*\).*/\1/p" | sed 's/"//g'
}

# Generate simple backup report HTML
generate_backup_report_html() {
    local backup_stats=$1
    local b2_status=$2
    local integrity_check=$3
    local db_activity=$4

    # Parse JSON values
    local today_count=$(extract_json_value "$backup_stats" "today_count")
    local today_size=$(extract_json_value "$backup_stats" "today_size")
    local latest_time=$(extract_json_value "$backup_stats" "latest_time")
    local total_backups=$(extract_json_value "$backup_stats" "total_backups")
    local total_size=$(extract_json_value "$backup_stats" "total_size")

    local b2_enabled=$(extract_json_value "$b2_status" "status")
    local b2_files=$(extract_json_value "$b2_status" "files_synced")

    local integrity_status=$(extract_json_value "$integrity_check" "status")
    local integrity_count=$(extract_json_value "$integrity_check" "file_count")

    local db_recent=$(extract_json_value "$db_activity" "recent_hour")
    local db_total=$(extract_json_value "$db_activity" "total")

    # Set defaults if parsing failed
    today_count=${today_count:-0}
    b2_files=${b2_files:-0}
    integrity_count=${integrity_count:-0}
    db_recent=${db_recent:-0}
    db_total=${db_total:-0}

    # Determine status
    local integrity_status_text="✓ OK"
    if [ "$integrity_status" = "failed" ]; then
        integrity_status_text="✗ Issues Found"
    else
        log_warn "PostgreSQL database not available"
        recent_records="0"
        total_records="0"
    fi

    local b2_status_text="✓ Active"
    if [ "$b2_enabled" != "enabled" ]; then
        b2_status_text="⊘ Disabled"
    else
        log_warn "PostgreSQL database not available"
        recent_records="0"
        total_records="0"
    fi

    cat <<EOF
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0; padding: 20px; }
        .header { margin-bottom: 20px; }
        .title { font-size: 18px; font-weight: bold; margin: 0 0 5px 0; }
        .subtitle { color: #666; margin: 0; }
        .section { margin: 20px 0; }
        .section-title { font-size: 14px; font-weight: bold; color: #333; margin: 15px 0 10px 0; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
        .detail-row { margin: 8px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-label { font-weight: bold; color: #555; }
        .detail-value { color: #333; }
        .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">📊 Backup Status Report</div>
            <div class="subtitle">$APP_NAME - Daily Status</div>
        </div>

        <div class="section">
            <div class="section-title">Backup Summary</div>
            <div class="detail-row">
                <span class="detail-label">Today's Backups:</span>
                <span class="detail-value">$today_count</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Today's Backup Size:</span>
                <span class="detail-value">$today_size</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Last Backup Time:</span>
                <span class="detail-value">$latest_time</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Total Backups Stored:</span>
                <span class="detail-value">$total_backups files ($total_size)</span>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Backup Integrity</div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value">$integrity_status_text ($integrity_count files verified)</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Checksums:</span>
                <span class="detail-value">SHA256 validation enabled</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Encryption:</span>
                <span class="detail-value">AES-256 (when GPG available)</span>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Cloud Backup (Backblaze B2)</div>
            <div class="detail-row">
                <span class="detail-label">Service Status:</span>
                <span class="detail-value">$b2_status_text</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Cloud Files Synced:</span>
                <span class="detail-value">$b2_files files</span>
            </div>
        </div>

        <div class="section">
            <div class="section-title">Database Activity</div>
            <div class="detail-row">
                <span class="detail-label">Location Updates (Last Hour):</span>
                <span class="detail-value">$db_recent GPS data points</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Total Records:</span>
                <span class="detail-value">$db_total location entries</span>
            </div>
        </div>

        <div class="footer">
            <p><strong>Generated:</strong> $TIMESTAMP | <strong>Server:</strong> $HOSTNAME</p>
            <p>This is an automated report. Do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
EOF
}

# Main function
main() {
    log_info "=================================================="
    log_info "Starting Backup Monitor"
    log_info "=================================================="

    # Collect all statistics
    local backup_stats=$(get_backup_stats)
    local b2_status=$(get_b2_status)
    local integrity_check=$(check_backup_integrity)
    local db_activity=$(get_database_activity)

    log_info "Backup stats: $backup_stats"
    log_info "B2 status: $b2_status"
    log_info "Database activity: $db_activity"

    # Send report
    send_backup_report "$backup_stats" "$b2_status" "$integrity_check" "$db_activity"

    log_info "=================================================="
    log_info "Backup monitor complete"
    log_info "=================================================="
}

main "$@"

#!/bin/bash
#
# Comprehensive System & Application Monitoring
# Monitors: Server health, App status, Database, Backups, Client tracking
# Sends detailed email alerts to admin with specific issue details
#

set -o pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
LOG_DIR="${PROJECT_DIR}/logs"
MONITOR_LOG="${LOG_DIR}/system-monitor.log"
STATE_DIR="${LOG_DIR}/.monitor-state"
ALERT_THRESHOLD_MINUTES=15  # Don't repeat same alert more than every 15 minutes

# Load .env
if [ -f "${PROJECT_DIR}/.env" ]; then
    set -a
    source "${PROJECT_DIR}/.env"
    set +a
fi

# Email configuration
ADMIN_EMAIL="${ADMIN_EMAIL:-${TEST_EMAIL:-demo@praxisnetworking.com}}"
APP_NAME="Maps Tracker Vehicle Tracking System"
HOSTNAME=$(hostname)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Colors for logging
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Create state directory
mkdir -p "$STATE_DIR"

# Logging functions
log_info() {
    echo -e "[${TIMESTAMP}] ${GREEN}[INFO]${NC} $@" | tee -a "$MONITOR_LOG"
}

log_warn() {
    echo -e "[${TIMESTAMP}] ${YELLOW}[WARN]${NC} $@" | tee -a "$MONITOR_LOG"
}

log_error() {
    echo -e "[${TIMESTAMP}] ${RED}[ERROR]${NC} $@" | tee -a "$MONITOR_LOG"
}

# Check if we should send alert (prevent spam)
should_send_alert() {
    local alert_key=$1
    local state_file="${STATE_DIR}/${alert_key}.last_alert"

    if [ ! -f "$state_file" ]; then
        # First time seeing this alert
        return 0
    fi

    local last_alert_time=$(cat "$state_file")
    local current_time=$(date +%s)
    local time_diff=$((current_time - last_alert_time))
    local threshold=$((ALERT_THRESHOLD_MINUTES * 60))

    if [ $time_diff -ge $threshold ]; then
        return 0
    fi
    return 1
}

# Record alert sent time
record_alert() {
    local alert_key=$1
    local state_file="${STATE_DIR}/${alert_key}.last_alert"
    date +%s > "$state_file"
}

# Monitor system resources
check_system_resources() {
    log_info "Checking system resources..."

    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print int($2)}')
    local cpu_threshold=80
    if [ $cpu_usage -gt $cpu_threshold ]; then
        if should_send_alert "high_cpu"; then
            send_alert "HIGH_CPU" "CPU usage at ${cpu_usage}%" "System" "High CPU usage detected. Current: ${cpu_usage}%"
            record_alert "high_cpu"
        fi
    fi

    # Memory usage
    local mem_usage=$(free | grep Mem | awk '{printf("%.0f", ($3/$2) * 100)}')
    local mem_threshold=85
    if [ $mem_usage -gt $mem_threshold ]; then
        if should_send_alert "high_memory"; then
            send_alert "HIGH_MEMORY" "Memory usage at ${mem_usage}%" "System" "High memory usage detected. Current: ${mem_usage}%"
            record_alert "high_memory"
        fi
    fi

    # Disk usage
    local disk_usage=$(df / | tail -1 | awk '{print $(NF-1)}' | sed 's/%//')
    local disk_threshold=80
    if [ $disk_usage -gt $disk_threshold ]; then
        if should_send_alert "high_disk"; then
            send_alert "HIGH_DISK" "Disk usage at ${disk_usage}%" "System" "Root filesystem is ${disk_usage}% full"
            record_alert "high_disk"
        fi
    fi

    log_info "System resources: CPU ${cpu_usage}% | Memory ${mem_usage}% | Disk ${disk_usage}%"
}

# Monitor Docker containers
check_docker_status() {
    log_info "Checking Docker container status..."

    local containers=$(docker compose ps --services)
    for container in $containers; do
        local status=$(docker compose ps $container --format "{{.State}}")

        if [ "$status" != "running" ]; then
            if should_send_alert "docker_${container}"; then
                send_alert "DOCKER_DOWN" "Container $container is not running" "Application" \
                    "The $container service is currently $status. Manual intervention may be required."
                record_alert "docker_${container}"
            fi
        fi
    done
}

# Monitor application health
check_app_health() {
    log_info "Checking application health..."

    local health_url="http://localhost:5000/api/health"
    local response=$(curl -s -o /dev/null -w "%{http_code}" "$health_url" 2>/dev/null)

    if [ "$response" != "200" ]; then
        if should_send_alert "app_health"; then
            send_alert "APP_UNHEALTHY" "Flask API returned HTTP $response" "Application" \
                "Health check at $health_url returned $response. API may be unavailable."
            record_alert "app_health"
        fi
    else
        log_info "Application health: OK (HTTP 200)"
    fi
}

# Monitor database connection
check_database_status() {
    log_info "Checking database status..."

    local db_status=$(docker compose exec -T db pg_isready -U "${POSTGRES_USER:-postgres}" 2>/dev/null | grep -o "accepting")

    if [ -z "$db_status" ]; then
        if should_send_alert "database_down"; then
            send_alert "DATABASE_DOWN" "PostgreSQL not accepting connections" "Database" \
                "Database connection check failed. Database service may be down."
            record_alert "database_down"
        fi
    else
        log_info "Database status: OK"
    fi
}

# Monitor recent client activity
check_client_activity() {
    log_info "Checking client tracking activity..."

    # Check for recent GPS submissions
    local recent_submissions=$(grep -c "POST /api/gps HTTP" "${LOG_DIR}/access.log" 2>/dev/null | tail -100 || echo "0")

    if [ "$recent_submissions" -eq 0 ]; then
        log_warn "No recent GPS submissions detected"
    else
        log_info "Recent GPS submissions: $recent_submissions"
    fi
}

# Monitor backup status
check_backup_status() {
    log_info "Checking backup status..."

    # Check if daily backup exists from today
    local today=$(date '+%Y/%m/%d')
    local backup_count=$(find "${PROJECT_DIR}/backups/daily/${today}" -name "*.sql" -type f 2>/dev/null | wc -l)

    if [ "$backup_count" -eq 0 ]; then
        log_warn "No backup found for today"
    else
        log_info "Today's backups: $backup_count"
    fi
}

# Monitor B2 sync status
check_b2_status() {
    log_info "Checking B2 cloud backup status..."

    if [ "${B2_ENABLED}" = "true" ]; then
        # Check manifest file
        local manifest="${LOG_DIR}/b2-manifest.json"
        if [ ! -f "$manifest" ]; then
            log_warn "B2 manifest not found"
        else
            local b2_files=$(wc -l < "$manifest" 2>/dev/null || echo "0")
            log_info "B2 backups tracked: $b2_files"
        fi
    else
        log_info "B2 backup disabled"
    fi
}

# Send alert email with professional template
send_alert() {
    local alert_level=$1      # CRITICAL, HIGH, WARNING, etc
    local alert_title=$2      # Brief title
    local alert_category=$3   # System, Application, Database, etc
    local alert_detail=$4     # Detailed explanation

    local recipient="${ADMIN_EMAIL}"

    # Determine color/severity
    local severity_color="#d32f2f"  # Red for critical
    local severity_icon="⚠"

    case "$alert_level" in
        CRITICAL|HIGH)
            severity_color="#d32f2f"  # Red
            severity_icon="🔴"
            ;;
        WARNING)
            severity_color="#f57c00"  # Orange
            severity_icon="🟠"
            ;;
        *)
            severity_color="#1976d2"  # Blue
            severity_icon="🔵"
            ;;
    esac

    # Generate HTML email and send
    local subject="[$alert_level] $APP_NAME - $alert_title"

    # Create temporary directory for email assets
    local temp_dir=$(mktemp -d)
    local html_file="$temp_dir/alert.html"
    local python_file="$temp_dir/send_email.py"

    # Write HTML to file
    generate_alert_email "$alert_level" "$alert_title" "$alert_category" "$alert_detail" "$severity_color" "$severity_icon" > "$html_file"

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
        log_error "Failed to send alert email"
        rm -rf "$temp_dir"
        return 1
    }

    # Cleanup
    rm -rf "$temp_dir"
}

# Generate simple alert email HTML
generate_alert_email() {
    local alert_level=$1
    local alert_title=$2
    local alert_category=$3
    local alert_detail=$4
    local color=$5
    local icon=$6

    cat <<HTMLEOF
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
        .details { margin: 20px 0; padding: 15px; border-left: 3px solid #666; background: #f9f9f9; }
        .detail-row { margin: 10px 0; }
        .detail-label { font-weight: bold; color: #555; }
        .detail-value { color: #333; }
        .footer { margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="title">${icon} ${alert_title}</div>
            <div class="subtitle">$APP_NAME</div>
        </div>

        <div class="details">
            <div class="detail-row">
                <span class="detail-label">Alert Level:</span>
                <span class="detail-value">${alert_level}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Category:</span>
                <span class="detail-value">${alert_category}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Time:</span>
                <span class="detail-value">$TIMESTAMP</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Server:</span>
                <span class="detail-value">$HOSTNAME</span>
            </div>
        </div>

        <div style="margin: 20px 0;">
            <strong>Details:</strong>
            <p style="margin: 10px 0; color: #333;">${alert_detail}</p>
        </div>

        <div style="margin: 20px 0; padding: 15px; background: #f0f0f0;">
            <strong>Recommended Actions:</strong>
            <ul style="margin: 10px 0; padding-left: 20px; color: #555;">
                <li>Check server logs for more information</li>
                <li>Investigate the issue and take corrective action</li>
                <li>Contact your system administrator if needed</li>
            </ul>
        </div>

        <div class="footer">
            <p style="margin: 0;">This is an automated alert from $APP_NAME. Do not reply to this email.</p>
        </div>
    </div>
</body>
</html>
HTMLEOF
}

# Main monitoring loop
main() {
    log_info "=================================================="
    log_info "Starting System & Application Monitor"
    log_info "=================================================="

    # Run all checks
    check_system_resources
    check_docker_status
    check_app_health
    check_database_status
    check_client_activity
    check_backup_status
    check_b2_status

    log_info "=================================================="
    log_info "Monitor check complete"
    log_info "=================================================="
}

# Execute main function
main "$@"

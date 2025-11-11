#!/bin/bash
#
# Maps Tracker Application Status Report
# Performs comprehensive health checks and sends daily status report via email
#
# Usage: ./app-status-report.sh [--no-email]
#

# Configuration - Automatically detect the project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
LOG_DIR="${BASE_DIR}/logs"
STATUS_LOG="${LOG_DIR}/status-report.log"

# Load .env if it exists for environment variables
if [ -f "${BASE_DIR}/.env" ]; then
    set +a
    source "${BASE_DIR}/.env"
    set -a
fi

# Email configuration (from .env or defaults)
EMAIL_ENABLED="${BACKUP_EMAIL_ENABLED:-true}"
EMAIL_RECIPIENT="${BACKUP_EMAIL:-admin@example.com}"
EMAIL_SUBJECT_PREFIX="[Maps Tracker Status]"

# Check for --no-email flag
if [[ "$1" == "--no-email" ]]; then
    EMAIL_ENABLED=false
fi

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Variables to track status
REPORT_TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
HOSTNAME=$(hostname)
OVERALL_STATUS="OPERATIONAL"
ISSUES=()
WARNINGS=()

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "${STATUS_LOG}"
}

# Check Docker services
check_docker_services() {
    local services=("backend" "frontend" "mobile" "nominatim" "db")
    local service_status=()
    local all_healthy=true

    for service in "${services[@]}"; do
        local status=$(docker compose ps -q "$service" 2>/dev/null | xargs docker inspect -f '{{.State.Status}}' 2>/dev/null)

        if [ "$status" = "running" ]; then
            service_status+=("$service: ✓ RUNNING")
        else
            service_status+=("$service: ✗ ${status:-NOT FOUND}")
            ISSUES+=("Docker service '$service' is not running")
            all_healthy=false
            OVERALL_STATUS="CRITICAL"
        fi
    done

    echo "${service_status[@]}"
    return $([ "$all_healthy" = true ] && echo 0 || echo 1)
}

# Check Backend API
check_backend_api() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/check 2>/dev/null)

    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        echo "✓ RESPONSIVE (HTTP $response)"
        return 0
    else
        echo "✗ UNREACHABLE (HTTP ${response:-no response})"
        ISSUES+=("Backend API is unreachable")
        OVERALL_STATUS="CRITICAL"
        return 1
    fi
}

# Check Frontend
check_frontend() {
    # Frontend runs on port 80 (HTTP) and redirects to 443 (HTTPS)
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null)

    if [ "$response" = "200" ] || [ "$response" = "301" ] || [ "$response" = "302" ]; then
        echo "✓ RESPONSIVE"
        return 0
    else
        echo "✗ UNREACHABLE"
        ISSUES+=("Frontend is unreachable")
        OVERALL_STATUS="CRITICAL"
        return 1
    fi
}

# Check Mobile Interface
check_mobile() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null)

    if [ "$response" = "200" ] || [ "$response" = "301" ] || [ "$response" = "302" ]; then
        echo "✓ RESPONSIVE"
        return 0
    else
        echo "✗ UNREACHABLE"
        WARNINGS+=("Mobile interface is unreachable")
        [ "$OVERALL_STATUS" = "OPERATIONAL" ] && OVERALL_STATUS="DEGRADED"
        return 1
    fi
}

# Check Nominatim Service
check_nominatim() {
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/status 2>/dev/null)

    if [ "$response" = "200" ]; then
        echo "✓ RESPONSIVE"
        return 0
    else
        echo "✗ UNREACHABLE"
        WARNINGS+=("Nominatim geocoding service is unreachable")
        [ "$OVERALL_STATUS" = "OPERATIONAL" ] && OVERALL_STATUS="DEGRADED"
        return 1
    fi
}

# Check Database connectivity and get statistics
check_database() {
    local db_check=$(docker compose exec -T backend python -c "
from app.models import db, Vehicle, Location, User, PlaceOfInterest
from app.main import app
from datetime import datetime, timedelta
import json

try:
    with app.app_context():
        # Test connection
        db.session.execute(db.text('SELECT 1'))

        # Get statistics
        vehicle_count = Vehicle.query.count()
        user_count = User.query.count()
        poi_count = PlaceOfInterest.query.count()
        total_locations = Location.query.count()

        # Recent GPS updates (last 24 hours)
        yesterday = datetime.utcnow() - timedelta(hours=24)
        recent_updates = Location.query.filter(Location.timestamp >= yesterday).count()

        # Most recent location
        last_location = Location.query.order_by(Location.timestamp.desc()).first()
        last_update = last_location.timestamp.isoformat() if last_location else 'None'

        stats = {
            'status': 'OK',
            'vehicle_count': vehicle_count,
            'user_count': user_count,
            'poi_count': poi_count,
            'total_locations': total_locations,
            'recent_updates_24h': recent_updates,
            'last_update': last_update
        }
        print(json.dumps(stats))
except Exception as e:
    print(json.dumps({'status': 'ERROR', 'message': str(e)}))
" 2>&1)

    echo "$db_check"
}

# Check disk usage
check_disk_usage() {
    local usage=$(df -h "${BASE_DIR}" | awk 'NR==2 {print $5}' | sed 's/%//')
    local available=$(df -h "${BASE_DIR}" | awk 'NR==2 {print $4}')

    if [ "$usage" -lt 80 ]; then
        echo "✓ ${usage}% used (${available} available)"
    elif [ "$usage" -lt 90 ]; then
        echo "⚠ ${usage}% used (${available} available) - WARNING"
        WARNINGS+=("Disk usage is at ${usage}%")
        [ "$OVERALL_STATUS" = "OPERATIONAL" ] && OVERALL_STATUS="DEGRADED"
    else
        echo "✗ ${usage}% used (${available} available) - CRITICAL"
        ISSUES+=("Disk usage is critical at ${usage}%")
        OVERALL_STATUS="CRITICAL"
    fi
}

# Check backup status (new organized structure)
check_backup_status() {
    local backup_dir="${BASE_DIR}/backups"

    if [ -d "$backup_dir" ]; then
        # Count all backups in new structure (full + daily)
        local full_count=$(find "$backup_dir/full" -name "backup_full_*.sql*" -type f 2>/dev/null | wc -l)
        local daily_count=$(find "$backup_dir/daily" -name "backup_daily_*.sql*" -type f 2>/dev/null | wc -l)
        local total_count=$((full_count + daily_count))

        # Find latest backup from either full or daily
        local latest_backup=$(find "$backup_dir/full" "$backup_dir/daily" -name "backup_*.sql*" -type f -printf '%T+ %p\n' 2>/dev/null | sort -r | head -n1)

        if [ -n "$latest_backup" ]; then
            local backup_file=$(echo "$latest_backup" | awk '{print $2}')
            local backup_date=$(stat -c %y "$backup_file" 2>/dev/null | cut -d' ' -f1,2 | cut -d'.' -f1)
            local backup_size=$(du -h "$backup_file" | cut -f1)
            local backup_type="unknown"

            if [[ "$backup_file" == *"full"* ]]; then
                backup_type="FULL"
            elif [[ "$backup_file" == *"daily"* ]]; then
                backup_type="DAILY"
            fi

            echo "${total_count} backups (${full_count} full, ${daily_count} daily) | Latest: ${backup_type} ${backup_date} (${backup_size})"

            # Check if backup is older than 48 hours
            local backup_age=$(( ($(date +%s) - $(stat -c %Y "$backup_file")) / 3600 ))
            if [ $backup_age -gt 48 ]; then
                WARNINGS+=("Last backup is ${backup_age} hours old")
                [ "$OVERALL_STATUS" = "OPERATIONAL" ] && OVERALL_STATUS="DEGRADED"
            fi

            # Check backup index
            if [ -f "$backup_dir/index/backup_index.json" ]; then
                local index_age=$(( ($(date +%s) - $(stat -c %Y "$backup_dir/index/backup_index.json")) / 3600 ))
                if [ $index_age -gt 48 ]; then
                    WARNINGS+=("Backup index is ${index_age} hours old")
                fi
            else
                WARNINGS+=("Backup index file not found")
            fi
        else
            echo "⚠ No backups found"
            WARNINGS+=("No database backups found")
            [ "$OVERALL_STATUS" = "OPERATIONAL" ] && OVERALL_STATUS="DEGRADED"
        fi
    else
        echo "✗ Backup directory not found"
        WARNINGS+=("Backup directory not found")
        [ "$OVERALL_STATUS" = "OPERATIONAL" ] && OVERALL_STATUS="DEGRADED"
    fi
}

# Check recent errors in logs
check_log_errors() {
    local error_log="${LOG_DIR}/error.log"
    local app_log="${LOG_DIR}/app.log"

    local error_count_24h=0
    local error_samples=""

    # Count errors in last 24 hours
    if [ -f "$error_log" ]; then
        local yesterday=$(date -d '24 hours ago' '+%Y-%m-%d' 2>/dev/null || date -v-24H '+%Y-%m-%d' 2>/dev/null)
        error_count_24h=$(grep -c "ERROR" "$error_log" 2>/dev/null || echo 0)

        # Get last 3 errors
        if [ "$error_count_24h" -gt 0 ] 2>/dev/null; then
            error_samples=$(grep "ERROR" "$error_log" 2>/dev/null | tail -3 | sed 's/^/    /')
        fi
    fi

    if [ "$error_count_24h" -eq 0 ] 2>/dev/null; then
        echo "✓ No errors in last 24 hours"
    elif [ "$error_count_24h" -lt 10 ] 2>/dev/null; then
        echo "⚠ ${error_count_24h} errors in last 24 hours"
        WARNINGS+=("${error_count_24h} application errors logged")
    else
        echo "✗ ${error_count_24h} errors in last 24 hours"
        ISSUES+=("High error count: ${error_count_24h} errors logged")
        OVERALL_STATUS="DEGRADED"
    fi

    echo "$error_samples"
}

# Get log file sizes
get_log_sizes() {
    local log_info=""
    if [ -d "$LOG_DIR" ]; then
        while IFS= read -r logfile; do
            local size=$(du -h "$logfile" | cut -f1)
            local name=$(basename "$logfile")
            log_info+="$name: $size | "
        done < <(find "$LOG_DIR" -type f -name "*.log" -not -name "*.log.*")
    fi
    echo "${log_info% | }"
}

# Send email notification
send_email_notification() {
    if [ "$EMAIL_ENABLED" != "true" ]; then
        return 0
    fi

    # Email will be sent via send-email.sh or mail command

    # Determine subject based on status (without emojis for better email compatibility)
    local subject
    local status_emoji
    case "$OVERALL_STATUS" in
        "OPERATIONAL")
            subject="${EMAIL_SUBJECT_PREFIX} [MONITORING] All Systems Operational"
            status_emoji="✓"
            ;;
        "DEGRADED")
            subject="${EMAIL_SUBJECT_PREFIX} [MONITORING] System Degraded - Action Recommended"
            status_emoji="⚠"
            ;;
        "CRITICAL")
            subject="${EMAIL_SUBJECT_PREFIX} [MONITORING] Critical Issues Detected - Action Required"
            status_emoji="✗"
            ;;
    esac

    # Build email body (simplified formatting for better email compatibility)
    local email_body=$(cat <<EOF
${status_emoji} Maps Tracker Application Status Report
================================================

Report Time: ${REPORT_TIMESTAMP}
Server: ${HOSTNAME}
Overall Status: ${OVERALL_STATUS}

------------------------------------------------

DOCKER SERVICES
$(echo "$SERVICE_STATUS" | tr ' ' '\n' | sed 's/^/  /')

ENDPOINTS
  Backend API: $BACKEND_STATUS
  Frontend: $FRONTEND_STATUS
  Mobile Interface: $MOBILE_STATUS
  Nominatim: $NOMINATIM_STATUS

DATABASE & STATISTICS
$DB_STATS_FORMATTED

STORAGE
  Disk Usage: $DISK_STATUS
  Backups: $BACKUP_STATUS
  Log Files: $LOG_SIZES

ERROR MONITORING
  $ERROR_STATUS
$ERROR_SAMPLES

------------------------------------------------

$(if [ ${#ISSUES[@]} -gt 0 ]; then
    echo "CRITICAL ISSUES:"
    for issue in "${ISSUES[@]}"; do
        echo "  - $issue"
    done
    echo ""
fi)

$(if [ ${#WARNINGS[@]} -gt 0 ]; then
    echo "WARNINGS:"
    for warning in "${WARNINGS[@]}"; do
        echo "  - $warning"
    done
    echo ""
fi)

$(if [ ${#ISSUES[@]} -eq 0 ] && [ ${#WARNINGS[@]} -eq 0 ]; then
    echo "All systems operating normally"
    echo "No issues or warnings detected"
fi)

------------------------------------------------

LOG FILES
  Status Report: ${STATUS_LOG}
  Application: ${LOG_DIR}/app.log
  Errors: ${LOG_DIR}/error.log

QUICK COMMANDS
  View recent errors: tail -50 ${LOG_DIR}/error.log
  Check services: docker compose ps
  View app logs: tail -100 ${LOG_DIR}/app.log

================================================
This is an automated daily report from the Maps Tracker monitoring system.
EOF
)

    # Send email
    log "Sending status report to ${EMAIL_RECIPIENT}..."

    # Try using the SMTP relay script from scripts/email directory (primary)
    local SEND_EMAIL_SCRIPT="${BASE_DIR}/scripts/email/send-email.sh"
    if [ -f "${SEND_EMAIL_SCRIPT}" ]; then
        "${SEND_EMAIL_SCRIPT}" "$EMAIL_RECIPIENT" "$subject" "$email_body" 2>&1 | tee -a "${STATUS_LOG}"
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            log "Email notification sent successfully"
            return 0
        else
            log "Failed to send email notification"
            return 1
        fi
    fi

    # Fallback to parent directory for backward compatibility
    SEND_EMAIL_SCRIPT="$(dirname "${BASE_DIR}")/send-email.sh"
    if [ -f "${SEND_EMAIL_SCRIPT}" ]; then
        "${SEND_EMAIL_SCRIPT}" "$EMAIL_RECIPIENT" "$subject" "$email_body" 2>&1 | tee -a "${STATUS_LOG}"
        if [ ${PIPESTATUS[0]} -eq 0 ]; then
            log "Email notification sent successfully"
            return 0
        else
            log "Failed to send email notification"
            return 1
        fi
    fi

    # Fall back to mail command if available
    if command -v mail &> /dev/null || command -v mailx &> /dev/null; then
        local MAIL_CMD="mail"
        if command -v mailx &> /dev/null; then
            MAIL_CMD="mailx"
        fi
        echo "$email_body" | $MAIL_CMD -s "$subject" "$EMAIL_RECIPIENT" 2>&1 | tee -a "${STATUS_LOG}"
        if [ ${PIPESTATUS[1]} -eq 0 ]; then
            log "Email notification sent successfully"
            return 0
        fi
    fi

    log "Email notification skipped: no mail delivery method available"
    return 1
}

# Main execution
main() {
    log "=========================================="
    log "Starting Application Status Report"
    log "=========================================="

    # Perform all checks
    log "Checking Docker services..."
    SERVICE_STATUS=$(check_docker_services)

    log "Checking Backend API..."
    BACKEND_STATUS=$(check_backend_api)

    log "Checking Frontend..."
    FRONTEND_STATUS=$(check_frontend)

    log "Checking Mobile Interface..."
    MOBILE_STATUS=$(check_mobile)

    log "Checking Nominatim..."
    NOMINATIM_STATUS=$(check_nominatim)

    log "Checking Database and Statistics..."
    DB_STATS=$(check_database)

    # Parse database stats
    if echo "$DB_STATS" | grep -q '"status": "OK"'; then
        DB_STATUS="✓ CONNECTED"
        DB_VEHICLES=$(echo "$DB_STATS" | grep -o '"vehicle_count": [0-9]*' | cut -d' ' -f2)
        DB_USERS=$(echo "$DB_STATS" | grep -o '"user_count": [0-9]*' | cut -d' ' -f2)
        DB_POIS=$(echo "$DB_STATS" | grep -o '"poi_count": [0-9]*' | cut -d' ' -f2)
        DB_LOCATIONS=$(echo "$DB_STATS" | grep -o '"total_locations": [0-9]*' | cut -d' ' -f2)
        DB_RECENT=$(echo "$DB_STATS" | grep -o '"recent_updates_24h": [0-9]*' | cut -d' ' -f2)
        DB_LAST=$(echo "$DB_STATS" | grep -o '"last_update": "[^"]*"' | cut -d'"' -f4)

        DB_STATS_FORMATTED="  Status: $DB_STATUS
  Vehicles: ${DB_VEHICLES:-0} | Users: ${DB_USERS:-0} | Places: ${DB_POIS:-0}
  Total Locations: ${DB_LOCATIONS:-0} | Updates (24h): ${DB_RECENT:-0}
  Last Update: ${DB_LAST:-N/A}"

        # Check if no recent Maps updates
        if [ "${DB_RECENT:-0}" -eq 0 ]; then
            WARNINGS+=("No Maps updates received in the last 24 hours")
            [ "$OVERALL_STATUS" = "OPERATIONAL" ] && OVERALL_STATUS="DEGRADED"
        fi
    else
        DB_STATUS="✗ CONNECTION FAILED"
        DB_STATS_FORMATTED="  Status: $DB_STATUS"
        ISSUES+=("Database connection failed")
        OVERALL_STATUS="CRITICAL"
    fi

    log "Checking Disk Usage..."
    DISK_STATUS=$(check_disk_usage)

    log "Checking Backups..."
    BACKUP_STATUS=$(check_backup_status)

    log "Checking Error Logs..."
    ERROR_OUTPUT=$(check_log_errors)
    ERROR_STATUS=$(echo "$ERROR_OUTPUT" | head -1)
    ERROR_SAMPLES=$(echo "$ERROR_OUTPUT" | tail -n +2)

    log "Getting Log Sizes..."
    LOG_SIZES=$(get_log_sizes)

    # Log summary
    log "=========================================="
    log "Overall Status: $OVERALL_STATUS"
    log "Critical Issues: ${#ISSUES[@]}"
    log "Warnings: ${#WARNINGS[@]}"

    # Debug: Log actual warnings
    if [ ${#WARNINGS[@]} -gt 0 ]; then
        for warning in "${WARNINGS[@]}"; do
            log "  WARNING: $warning"
        done
    fi

    log "=========================================="

    # Send email report
    send_email_notification

    log "Status report completed"

    # Exit with appropriate code
    case "$OVERALL_STATUS" in
        "OPERATIONAL") exit 0 ;;
        "DEGRADED") exit 1 ;;
        "CRITICAL") exit 2 ;;
    esac
}

# Run main function
main "$@"

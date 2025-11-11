#!/bin/bash

# Health Check Script for Maps Tracker Application
# Checks status of all services and writes to log file

# Configuration - Automatically detect the project directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
LOG_DIR="${BASE_DIR}/logs"
LOG_FILE="$LOG_DIR/health-check.log"
MAX_LOG_SIZE=10485760  # 10MB in bytes

# Load .env if it exists for environment variables
if [ -f "${BASE_DIR}/.env" ]; then
    set +a
    source "${BASE_DIR}/.env"
    set -a
fi

# Email configuration (from .env or defaults)
EMAIL_ENABLED="${BACKUP_EMAIL_ENABLED:-false}"
EMAIL_RECIPIENT="${BACKUP_EMAIL:-admin@example.com}"
EMAIL_SUBJECT_PREFIX="[Maps Tracker Health Check]"

# Create logs directory if it doesn't exist
mkdir -p "$LOG_DIR"

# Rotate log if it exceeds max size
if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null) -gt $MAX_LOG_SIZE ]; then
    mv "$LOG_FILE" "$LOG_FILE.$(date +%Y%m%d-%H%M%S)"
    echo "Log rotated at $(date)" > "$LOG_FILE"
fi

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Send email notification (for critical status only)
send_health_notification() {
    local status=$1
    local details=$2

    if [ "$EMAIL_ENABLED" != "true" ]; then
        return 0
    fi

    local subject
    local status_emoji
    if [ "$status" == "critical" ]; then
        subject="${EMAIL_SUBJECT_PREFIX} [HEALTH-CHECK] Critical Alert - Immediate Action Required"
        status_emoji="✗"
    elif [ "$status" == "warning" ]; then
        subject="${EMAIL_SUBJECT_PREFIX} [HEALTH-CHECK] Operational With Minor Issues - FYI"
        status_emoji="⚠"
    elif [ "$status" == "degraded" ]; then
        subject="${EMAIL_SUBJECT_PREFIX} [HEALTH-CHECK] System Degraded - Action Recommended"
        status_emoji="⚠"
    else
        subject="${EMAIL_SUBJECT_PREFIX} [HEALTH-CHECK] All Systems Operational"
        status_emoji="✓"
    fi

    local status_upper=$(echo "$status" | tr '[:lower:]' '[:upper:]')

    local additional_info=""
    if [ "$status" != "operational" ]; then
        additional_info="Log File: ${LOG_FILE}
Check logs: tail -100 ${LOG_FILE} | grep ERROR"
    fi

    local email_body="Maps Tracker Health Check Report
════════════════════════════════════════════════════════════════

Status:     ${status_emoji} ${status_upper}
Timestamp:  $(date '+%Y-%m-%d %H:%M:%S')
Server:     $(hostname)

HEALTH CHECK DETAILS
──────────────────────────────────────────────────────────────────
${details}

ACTION REQUIRED (if degraded/critical)
──────────────────────────────────────────────────────────────────
Please review and take corrective action:
${additional_info}

════════════════════════════════════════════════════════════════
This is an automated notification from the Maps Tracker health check system."

    # Try using the SMTP relay script from scripts/email directory (use global BASE_DIR)
    local SEND_EMAIL_SCRIPT="${BASE_DIR}/scripts/email/send-email.sh"
    if [ -f "${SEND_EMAIL_SCRIPT}" ]; then
        "${SEND_EMAIL_SCRIPT}" "$EMAIL_RECIPIENT" "$subject" "$email_body" 2>&1
        return $?
    fi

    # Fallback to parent directory for backward compatibility
    SEND_EMAIL_SCRIPT="$(dirname "${BASE_DIR}")/send-email.sh"
    if [ -f "${SEND_EMAIL_SCRIPT}" ]; then
        "${SEND_EMAIL_SCRIPT}" "$EMAIL_RECIPIENT" "$subject" "$email_body" 2>&1
        return $?
    fi

    # Final fallback to mail command if available
    if command -v mail &> /dev/null || command -v mailx &> /dev/null; then
        local MAIL_CMD="mail"
        if command -v mailx &> /dev/null; then
            MAIL_CMD="mailx"
        fi
        echo "$email_body" | $MAIL_CMD -s "$subject" "$EMAIL_RECIPIENT" 2>&1
        return $?
    fi

    return 1
}

log "========== Health Check Started =========="

# Small warmup delay to ensure Docker is ready (helpful at startup times like 2 AM)
sleep 2

# Check if Docker Compose services are running
check_docker_services() {
    log "Checking Docker services..."

    services=("backend" "frontend" "mobile" "nominatim" "db")
    all_healthy=true

    # Try up to 3 times with small delays to handle startup scenarios
    for service in "${services[@]}"; do
        local retry_count=0
        local status=""

        while [ $retry_count -lt 3 ]; do
            status=$(docker compose ps -q "$service" 2>/dev/null | xargs docker inspect -f '{{.State.Status}}' 2>/dev/null)
            if [ "$status" = "running" ]; then
                break
            fi
            retry_count=$((retry_count + 1))
            if [ $retry_count -lt 3 ]; then
                sleep 1
            fi
        done

        if [ "$status" = "running" ]; then
            log "✓ $service: RUNNING"
        else
            log "✗ $service: NOT RUNNING (status: ${status:-not found})"
            all_healthy=false
        fi
    done

    return $([ "$all_healthy" = true ] && echo 0 || echo 1)
}

# Check Backend API
check_backend() {
    log "Checking Backend API..."

    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/api/auth/check 2>/dev/null)

    if [ "$response" = "200" ] || [ "$response" = "401" ]; then
        log "✓ Backend API: RESPONSIVE (HTTP $response)"
        return 0
    else
        log "✗ Backend API: UNREACHABLE (HTTP ${response:-no response})"
        return 1
    fi
}

# Check Frontend
check_frontend() {
    log "Checking Frontend..."

    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:80 2>/dev/null)

    # Accept 200 (OK) or 301/302 (redirect to HTTPS) as success
    if [ "$response" = "200" ] || [ "$response" = "301" ] || [ "$response" = "302" ]; then
        log "✓ Frontend: RESPONSIVE (HTTP $response)"
        return 0
    else
        log "✗ Frontend: UNREACHABLE (HTTP ${response:-no response})"
        return 1
    fi
}

# Check Mobile Interface
check_mobile() {
    log "Checking Mobile Interface..."

    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 2>/dev/null)

    # Accept 200 (OK) or 301/302 (redirect to HTTPS) as success
    if [ "$response" = "200" ] || [ "$response" = "301" ] || [ "$response" = "302" ]; then
        log "✓ Mobile Interface: RESPONSIVE (HTTP $response)"
        return 0
    else
        log "✗ Mobile Interface: UNREACHABLE (HTTP ${response:-no response})"
        return 1
    fi
}

# Check Nominatim Service
check_nominatim() {
    log "Checking Nominatim Service..."

    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/status 2>/dev/null)

    if [ "$response" = "200" ]; then
        log "✓ Nominatim: RESPONSIVE (HTTP $response)"
        return 0
    else
        log "✗ Nominatim: UNREACHABLE (HTTP ${response:-no response})"
        return 1
    fi
}

# Check Database connectivity
check_database() {
    log "Checking Database connectivity..."

    # Try multiple times with delays to handle startup scenarios
    local retry_count=0
    local max_retries=3
    local db_status=""

    while [ $retry_count -lt $max_retries ]; do
        db_status=$(docker compose exec -T backend python -c "
from app.models import db
from app.main import app
try:
    with app.app_context():
        result = db.session.execute(db.text('SELECT 1'))
        print('OK')
except Exception as e:
    print(f'ERROR: {e}')
" 2>&1)

        if [[ "$db_status" == *"OK"* ]]; then
            log "✓ Database: CONNECTED"
            return 0
        fi

        retry_count=$((retry_count + 1))
        if [ $retry_count -lt $max_retries ]; then
            sleep 2
        fi
    done

    log "✗ Database: CONNECTION FAILED ($db_status)"
    return 1
}

# Check disk usage
check_disk_usage() {
    log "Checking Disk Usage..."

    usage=$(df -h . | awk 'NR==2 {print $5}' | sed 's/%//')

    if [ "$usage" -lt 80 ]; then
        log "✓ Disk Usage: ${usage}% (OK)"
    elif [ "$usage" -lt 90 ]; then
        log "⚠ Disk Usage: ${usage}% (WARNING)"
    else
        log "✗ Disk Usage: ${usage}% (CRITICAL)"
    fi
}

# Check Docker volume sizes
check_volumes() {
    log "Checking Docker Volume Usage..."

    volumes=$(docker volume ls --format "{{.Name}}" | grep effective-guide)

    for vol in $volumes; do
        size=$(docker system df -v | grep "$vol" | awk '{print $3}')
        log "  - $vol: ${size:-unknown}"
    done
}

# Check log file sizes
check_log_sizes() {
    log "Checking Log File Sizes..."

    if [ -d "$LOG_DIR" ]; then
        find "$LOG_DIR" -type f -name "*.log" | while read logfile; do
            size=$(du -h "$logfile" | cut -f1)
            log "  - $(basename $logfile): $size"
        done
    fi
}

# Run all checks
check_docker_services
docker_status=$?

check_backend
backend_status=$?

check_frontend
frontend_status=$?

check_mobile
mobile_status=$?

check_nominatim
nominatim_status=$?

check_database
db_status=$?

check_disk_usage
check_volumes
check_log_sizes

# Summary - Categorize checks by criticality
log "---------- Summary ----------"

# CRITICAL checks: If any of these fail, system cannot function
# - Docker services
# - Backend API
# - Database
critical_checks=3
critical_passed=$((3 - docker_status - backend_status - db_status))

# NON-CRITICAL checks: If any of these fail, non-essential features affected
# - Frontend
# - Mobile Interface
# - Nominatim (geocoding)
non_critical_checks=3
non_critical_passed=$((3 - frontend_status - mobile_status - nominatim_status))

total_checks=$((critical_checks + non_critical_checks))
passed_checks=$((critical_passed + non_critical_passed))

# Prepare email body
email_details=""

# Status determination based on critical check failures
if [ $critical_passed -eq $critical_checks ]; then
    # All critical services are healthy
    if [ $non_critical_passed -eq $non_critical_checks ]; then
        # All checks passed
        log "Overall Status: ✓ ALL SYSTEMS OPERATIONAL ($passed_checks/$total_checks)"
        email_details="All systems are healthy and fully operational."
        exit_code=0
        email_status="ok"
    else
        # Critical services OK, but some non-critical features have issues
        log "Overall Status: ⚠ OPERATIONAL WITH MINOR ISSUES ($critical_passed/$critical_checks critical checks passed)"
        email_details="Core services are operational. Some non-critical features (frontend/geocoding) have minor issues but do not affect core functionality."
        exit_code=0
        email_status="warning"
    fi
else
    # One or more critical services are down
    log "Overall Status: ✗ CRITICAL ($critical_passed/$critical_checks critical checks passed)"
    email_details="CRITICAL: One or more essential services are unavailable. Immediate action may be required."
    exit_code=2
    email_status="critical"
fi

log "========== Health Check Completed =========="
log ""

# Send email notification for all statuses (ok, warning, or critical)
send_health_notification "$email_status" "$email_details"

exit $exit_code

#!/bin/bash

# Health Check Script for GPS Tracker Application
# Checks status of all services and writes to log file

# Configuration
LOG_DIR="./logs"
LOG_FILE="$LOG_DIR/health-check.log"
MAX_LOG_SIZE=10485760  # 10MB in bytes

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

log "========== Health Check Started =========="

# Check if Docker Compose services are running
check_docker_services() {
    log "Checking Docker services..."

    services=("backend" "frontend" "mobile" "nominatim" "db")
    all_healthy=true

    for service in "${services[@]}"; do
        status=$(docker compose ps -q "$service" 2>/dev/null | xargs docker inspect -f '{{.State.Status}}' 2>/dev/null)

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

    response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null)

    if [ "$response" = "200" ]; then
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

    if [ "$response" = "200" ]; then
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

    # Try to connect via backend container
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
    else
        log "✗ Database: CONNECTION FAILED ($db_status)"
        return 1
    fi
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

# Summary
log "---------- Summary ----------"
total_checks=6
passed_checks=$((6 - docker_status - backend_status - frontend_status - mobile_status - nominatim_status - db_status))

if [ $passed_checks -eq $total_checks ]; then
    log "Overall Status: ✓ ALL SYSTEMS OPERATIONAL ($passed_checks/$total_checks)"
    exit_code=0
elif [ $passed_checks -ge 4 ]; then
    log "Overall Status: ⚠ DEGRADED ($passed_checks/$total_checks checks passed)"
    exit_code=1
else
    log "Overall Status: ✗ CRITICAL ($passed_checks/$total_checks checks passed)"
    exit_code=2
fi

log "========== Health Check Completed =========="
log ""

exit $exit_code

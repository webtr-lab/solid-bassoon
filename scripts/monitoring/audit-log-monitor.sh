#!/bin/bash

################################################################################
# Maps Tracker Audit Log Monitor
#
# Monitors audit logs for suspicious activities and security events
# Usage: ./audit-log-monitor.sh [OPTIONS]
#
# Options:
#   --recent          Show recent activity (last 24 hours)
#   --failures        Show failed access attempts
#   --suspicious      Show suspicious patterns
#   --users           Show user management events
#   --report          Generate detailed report
#   --email ADDR      Send report to email address
#   --help            Show this help message
################################################################################

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DB_HOST="${DB_HOST:-db}"
DB_USER="${DB_USER:-mapsadmin}"
DB_NAME="${DB_NAME:-maps_tracker}"
REPORT_FILE="/tmp/audit_report_$(date +%Y%m%d_%H%M%S).txt"

# Function: Print colored output
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[OK]${NC} $1"
}

# Function: Check database connectivity
check_db_connection() {
  if docker compose exec -T db psql -U $DB_USER -d $DB_NAME -c "SELECT 1;" &>/dev/null; then
    log_success "Database connection established"
    return 0
  else
    log_error "Cannot connect to database"
    return 1
  fi
}

# Function: Show recent activity
show_recent_activity() {
  log_info "Recent Activity (Last 24 Hours)"
  echo ""

  docker compose exec -T db psql -U $DB_USER -d $DB_NAME << EOF
SELECT
    id,
    timestamp,
    user_id,
    action,
    resource,
    status,
    ip_address
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 50;
EOF
}

# Function: Show failed attempts
show_failed_attempts() {
  log_info "Failed Access Attempts"
  echo ""

  docker compose exec -T db psql -U $DB_USER -d $DB_NAME << EOF
SELECT
    COUNT(*) as attempt_count,
    ip_address,
    action,
    timestamp::date as date
FROM audit_logs
WHERE status = 'failure'
    AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY ip_address, action, timestamp::date
ORDER BY attempt_count DESC;
EOF
}

# Function: Show suspicious patterns
show_suspicious_patterns() {
  log_info "Suspicious Patterns Analysis"
  echo ""

  log_warning "1. Multiple failed login attempts from single IP:"
  docker compose exec -T db psql -U $DB_USER -d $DB_NAME << EOF
SELECT
    ip_address,
    COUNT(*) as failed_attempts,
    MIN(timestamp) as first_attempt,
    MAX(timestamp) as last_attempt
FROM audit_logs
WHERE status = 'failure'
    AND action = 'login'
    AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) >= 3
ORDER BY failed_attempts DESC;
EOF

  echo ""
  log_warning "2. User deletion/modification events:"
  docker compose exec -T db psql -U $DB_USER -d $DB_NAME << EOF
SELECT
    timestamp,
    user_id,
    action,
    resource,
    status,
    ip_address
FROM audit_logs
WHERE action IN ('user_delete', 'user_update', 'user_create')
    AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;
EOF

  echo ""
  log_warning "3. Unusual access times (outside business hours):"
  docker compose exec -T db psql -U $DB_USER -d $DB_NAME << EOF
SELECT
    timestamp AT TIME ZONE 'UTC' as time_utc,
    user_id,
    action,
    resource,
    ip_address
FROM audit_logs
WHERE EXTRACT(HOUR FROM timestamp) NOT BETWEEN 6 AND 22
    AND EXTRACT(DOW FROM timestamp) NOT IN (0, 6)  -- Exclude weekends
    AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC
LIMIT 20;
EOF
}

# Function: Show user management events
show_user_events() {
  log_info "User Management Events"
  echo ""

  docker compose exec -T db psql -U $DB_USER -d $DB_NAME << EOF
SELECT
    timestamp,
    user_id,
    action,
    resource,
    resource_id,
    status,
    ip_address
FROM audit_logs
WHERE resource = 'user'
    AND timestamp > NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC;
EOF
}

# Function: Generate detailed report
generate_report() {
  log_info "Generating detailed audit report..."

  {
    echo "================================================================================"
    echo "MAPS TRACKER - AUDIT LOG REPORT"
    echo "Generated: $(date)"
    echo "================================================================================"
    echo ""

    echo "1. SUMMARY STATISTICS"
    echo "================================================================================"

    docker compose exec -T db psql -U $DB_USER -d $DB_NAME << EOF
SELECT
    'Total Audit Entries' as metric,
    COUNT(*) as value
FROM audit_logs
UNION ALL
SELECT
    'Total Users',
    COUNT(DISTINCT user_id)::text
FROM audit_logs
UNION ALL
SELECT
    'Unique IP Addresses',
    COUNT(DISTINCT ip_address)::text
FROM audit_logs
UNION ALL
SELECT
    'Failed Login Attempts',
    COUNT(*)::text
FROM audit_logs
WHERE action = 'login' AND status = 'failure'
UNION ALL
SELECT
    'Successful Operations',
    COUNT(*)::text
FROM audit_logs
WHERE status = 'success';
EOF

    echo ""
    echo "2. RECENT ACTIVITY (Last 24 Hours)"
    echo "================================================================================"

    docker compose exec -T db psql -U $DB_USER -d $DB_NAME << EOF
SELECT
    timestamp,
    action,
    resource,
    status,
    ip_address
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 20;
EOF

    echo ""
    echo "3. FAILED ATTEMPTS"
    echo "================================================================================"

    docker compose exec -T db psql -U $DB_USER -d $DB_NAME << EOF
SELECT
    ip_address,
    COUNT(*) as count,
    MIN(timestamp) as first_time,
    MAX(timestamp) as last_time
FROM audit_logs
WHERE status = 'failure'
    AND timestamp > NOW() - INTERVAL '7 days'
GROUP BY ip_address
HAVING COUNT(*) > 2
ORDER BY count DESC;
EOF

    echo ""
    echo "4. PRIVILEGE CHANGES"
    echo "================================================================================"

    docker compose exec -T db psql -U $DB_USER -d $DB_NAME << EOF
SELECT
    timestamp,
    user_id,
    action,
    resource_id,
    status
FROM audit_logs
WHERE action IN ('user_delete', 'user_update', 'role_change')
    AND timestamp > NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC;
EOF

    echo ""
    echo "5. SYSTEM ALERTS"
    echo "================================================================================"

    # Check for alerts
    FAILED_COUNT=$(docker compose exec -T db psql -U $DB_USER -d $DB_NAME -t << EOF
SELECT COUNT(*)
FROM audit_logs
WHERE status = 'failure'
    AND timestamp > NOW() - INTERVAL '1 hour';
EOF
    )

    if [ "$FAILED_COUNT" -gt 10 ]; then
      echo "⚠️ ALERT: High number of failures in last hour ($FAILED_COUNT)"
    else
      echo "✅ Normal failure rate in last hour ($FAILED_COUNT failures)"
    fi

    echo ""
    echo "================================================================================"
    echo "Report generated at: $(date)"
    echo "================================================================================"

  } | tee "$REPORT_FILE"

  log_success "Report saved to: $REPORT_FILE"
}

# Function: Send report via email
send_report() {
  local EMAIL="$1"

  if [ -z "$EMAIL" ]; then
    log_error "Email address not specified"
    return 1
  fi

  if [ ! -f "$REPORT_FILE" ]; then
    log_error "Report file not found: $REPORT_FILE"
    return 1
  fi

  log_info "Sending report to: $EMAIL"

  if command -v mail &> /dev/null; then
    mail -s "Maps Tracker - Audit Log Report ($(date +%Y-%m-%d))" "$EMAIL" < "$REPORT_FILE"
    log_success "Report sent successfully"
  else
    log_warning "Mail command not found. Report is saved at: $REPORT_FILE"
  fi
}

# Function: Show help
show_help() {
  grep "^#" "$0" | head -20
}

# Main execution
main() {
  if [ $# -eq 0 ]; then
    show_help
    exit 0
  fi

  # Check database connection
  if ! check_db_connection; then
    exit 1
  fi

  echo ""

  # Process arguments
  case "$1" in
    --recent)
      show_recent_activity
      ;;
    --failures)
      show_failed_attempts
      ;;
    --suspicious)
      show_suspicious_patterns
      ;;
    --users)
      show_user_events
      ;;
    --report)
      generate_report
      ;;
    --email)
      generate_report
      send_report "$2"
      ;;
    --help)
      show_help
      ;;
    *)
      log_error "Unknown option: $1"
      show_help
      exit 1
      ;;
  esac
}

# Run main function with all arguments
main "$@"

#!/bin/bash
#
# Monthly Restore Test Script
# Performs comprehensive backup integrity testing by:
#   1. Selecting the most recent backup
#   2. Creating a temporary test database
#   3. Restoring the backup
#   4. Verifying data integrity
#   5. Running sample queries
#   6. Cleanup and reporting
#
# Usage: ./monthly-restore-test.sh
#
# Schedule: Run monthly via cron (e.g., 1st day of month at 3 AM)
#

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="/home/demo/effective-guide/backups"
LOG_FILE="/home/demo/effective-guide/logs/monthly-restore-test.log"
TEST_DB="monthly_restore_test_$(date +%Y%m)"

# Email configuration
EMAIL_ENABLED=true
EMAIL_RECIPIENT="demo@praxisnetworking.com"
EMAIL_SUBJECT_PREFIX="[GPS Tracker Monthly Restore Test]"

# Logging functions
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    log "INFO" "$@"
    echo -e "${GREEN}[INFO]${NC} $@"
}

log_error() {
    log "ERROR" "$@"
    echo -e "${RED}[ERROR]${NC} $@" >&2
}

log_warn() {
    log "WARN" "$@"
    echo -e "${YELLOW}[WARN]${NC} $@"
}

log_test() {
    log "TEST" "$@"
    echo -e "${BLUE}[TEST]${NC} $@"
}

# Send email notification
send_test_report() {
    local status=$1
    local details=$2

    if [ "$EMAIL_ENABLED" != "true" ]; then
        return 0
    fi

    if ! command -v mail &> /dev/null && ! command -v mailx &> /dev/null; then
        log_warn "Email notification skipped: mail command not available"
        return 1
    fi

    local MAIL_CMD="mail"
    if command -v mailx &> /dev/null; then
        MAIL_CMD="mailx"
    fi

    local subject
    local status_emoji
    if [ "$status" == "success" ]; then
        subject="${EMAIL_SUBJECT_PREFIX} SUCCESS - Monthly Restore Test Passed"
        status_emoji="✅"
    else
        subject="${EMAIL_SUBJECT_PREFIX} FAILURE - Monthly Restore Test Failed"
        status_emoji="❌"
    fi

    local email_body=$(cat <<EOF
${status_emoji} GPS Tracker Monthly Restore Test Report
==========================================

Status: ${status^^}
Timestamp: $(date '+%Y-%m-%d %H:%M:%S')
Month: $(date '+%B %Y')
Server: $(hostname)

${details}

Log File: ${LOG_FILE}

==========================================
This is an automated monthly backup integrity test.
EOF
)

    echo "$email_body" | $MAIL_CMD -s "$subject" "$EMAIL_RECIPIENT" 2>&1 | tee -a "${LOG_FILE}"

    if [ ${PIPESTATUS[1]} -eq 0 ]; then
        log_info "Email notification sent successfully"
    else
        log_error "Failed to send email notification"
    fi
}

# Cleanup function
cleanup() {
    log_info "Cleaning up test database..."
    docker compose exec -T db psql -U gpsadmin -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};" > /dev/null 2>&1 || true
    log_info "Cleanup completed"
}

# Set trap for cleanup on exit
trap cleanup EXIT

log_info "=========================================="
log_info "Monthly Restore Test - $(date '+%B %Y')"
log_info "=========================================="
log_info ""

# Track test results
TEST_PASSED=true
REPORT_DETAILS=""

# Step 1: Find most recent backup
log_info "Step 1: Finding most recent backup..."
LATEST_BACKUP=$(ls -t ${BACKUP_DIR}/backup_*.sql 2>/dev/null | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    log_error "No backup files found in ${BACKUP_DIR}"
    REPORT_DETAILS="${REPORT_DETAILS}\n❌ No backup files found"
    send_test_report "failure" "${REPORT_DETAILS}"
    exit 1
fi

BACKUP_FILENAME=$(basename "$LATEST_BACKUP")
BACKUP_SIZE=$(stat -c%s "$LATEST_BACKUP" 2>/dev/null || stat -f%z "$LATEST_BACKUP" 2>/dev/null)
BACKUP_SIZE_HUMAN=$(numfmt --to=iec-i --suffix=B $BACKUP_SIZE 2>/dev/null || echo "${BACKUP_SIZE} bytes")
BACKUP_DATE=$(stat -c%y "$LATEST_BACKUP" 2>/dev/null | cut -d' ' -f1 || stat -f%Sm -t "%Y-%m-%d" "$LATEST_BACKUP" 2>/dev/null)

log_info "Selected backup: ${BACKUP_FILENAME}"
log_info "  Size: ${BACKUP_SIZE_HUMAN}"
log_info "  Date: ${BACKUP_DATE}"
REPORT_DETAILS="${REPORT_DETAILS}\nBackup File: ${BACKUP_FILENAME}\nSize: ${BACKUP_SIZE_HUMAN}\nDate: ${BACKUP_DATE}"
log_info ""

# Step 2: Verify checksum
log_test "Step 2: Verifying backup checksum..."
CHECKSUM_FILE="${LATEST_BACKUP}.md5"

if [ -f "$CHECKSUM_FILE" ]; then
    cd "$BACKUP_DIR"
    if md5sum -c "$(basename $CHECKSUM_FILE)" > /dev/null 2>&1; then
        log_info "✓ Checksum verification passed"
        REPORT_DETAILS="${REPORT_DETAILS}\n✓ Checksum verified"
    else
        log_error "✗ Checksum verification failed"
        REPORT_DETAILS="${REPORT_DETAILS}\n❌ Checksum verification failed"
        TEST_PASSED=false
    fi
    cd - > /dev/null
else
    log_warn "No checksum file found (${CHECKSUM_FILE})"
    REPORT_DETAILS="${REPORT_DETAILS}\n⚠️  No checksum file found"
fi
log_info ""

# Step 3: Validate PostgreSQL format
log_test "Step 3: Validating PostgreSQL format..."
if docker compose exec -T db pg_restore --list "/backups/${BACKUP_FILENAME}" > /tmp/monthly_test_list.txt 2>&1; then
    TABLE_COUNT=$(grep -c "TABLE DATA" /tmp/monthly_test_list.txt)
    log_info "✓ PostgreSQL format is valid"
    log_info "  Contains ${TABLE_COUNT} tables"
    REPORT_DETAILS="${REPORT_DETAILS}\n✓ PostgreSQL format valid (${TABLE_COUNT} tables)"
    rm -f /tmp/monthly_test_list.txt
else
    log_error "✗ Invalid PostgreSQL format"
    REPORT_DETAILS="${REPORT_DETAILS}\n❌ Invalid PostgreSQL format"
    TEST_PASSED=false
fi
log_info ""

# Step 4: Create test database
log_test "Step 4: Creating test database..."
# Drop database if exists (run separately to avoid transaction block error)
docker compose exec -T db psql -U gpsadmin -d postgres -c "DROP DATABASE IF EXISTS ${TEST_DB};" > /dev/null 2>&1 || true

# Create test database
if docker compose exec -T db psql -U gpsadmin -d postgres -c "CREATE DATABASE ${TEST_DB};" > /dev/null 2>&1; then
    log_info "✓ Test database created: ${TEST_DB}"
    REPORT_DETAILS="${REPORT_DETAILS}\n✓ Test database created"
else
    log_error "✗ Failed to create test database"
    REPORT_DETAILS="${REPORT_DETAILS}\n❌ Failed to create test database"
    send_test_report "failure" "${REPORT_DETAILS}"
    exit 1
fi
log_info ""

# Step 5: Restore backup
log_test "Step 5: Restoring backup to test database..."
START_TIME=$(date +%s)

if docker compose exec -T db pg_restore \
    -U gpsadmin \
    -d "${TEST_DB}" \
    --clean \
    --if-exists \
    --verbose \
    "/backups/${BACKUP_FILENAME}" > /tmp/monthly_test_restore.log 2>&1; then

    END_TIME=$(date +%s)
    RESTORE_DURATION=$((END_TIME - START_TIME))
    log_info "✓ Restore completed in ${RESTORE_DURATION} seconds"
    REPORT_DETAILS="${REPORT_DETAILS}\n✓ Restore completed (${RESTORE_DURATION}s)"
else
    # Check if errors are fatal
    if grep -i "ERROR:" /tmp/monthly_test_restore.log | grep -v "does not exist, skipping" > /dev/null 2>&1; then
        log_error "✗ Restore encountered errors"
        cat /tmp/monthly_test_restore.log | grep -i "ERROR:" | head -10 | tee -a "${LOG_FILE}"
        REPORT_DETAILS="${REPORT_DETAILS}\n❌ Restore failed with errors"
        TEST_PASSED=false
    else
        log_warn "Restore completed with warnings (normal for clean operation)"
        REPORT_DETAILS="${REPORT_DETAILS}\n✓ Restore completed with warnings"
    fi
fi
rm -f /tmp/monthly_test_restore.log
log_info ""

# Step 6: Verify table structure
log_test "Step 6: Verifying table structure..."
EXPECTED_TABLES=("users" "vehicles" "locations" "saved_locations" "places_of_interest")
MISSING_TABLES=()

for table in "${EXPECTED_TABLES[@]}"; do
    EXISTS=$(docker compose exec -T db psql -U gpsadmin -d "${TEST_DB}" -t -c "
        SELECT COUNT(*) FROM information_schema.tables
        WHERE table_name = '${table}';
    " | tr -d ' ')

    if [ "$EXISTS" = "1" ]; then
        log_info "  ✓ Table '${table}' exists"
    else
        log_error "  ✗ Table '${table}' is missing"
        MISSING_TABLES+=("$table")
        TEST_PASSED=false
    fi
done

if [ ${#MISSING_TABLES[@]} -eq 0 ]; then
    log_info "✓ All expected tables present"
    REPORT_DETAILS="${REPORT_DETAILS}\n✓ All ${#EXPECTED_TABLES[@]} tables present"
else
    log_error "✗ Missing tables: ${MISSING_TABLES[*]}"
    REPORT_DETAILS="${REPORT_DETAILS}\n❌ Missing tables: ${MISSING_TABLES[*]}"
fi
log_info ""

# Step 7: Verify row counts
log_test "Step 7: Verifying data integrity..."
ROW_COUNTS=$(docker compose exec -T db psql -U gpsadmin -d "${TEST_DB}" -t -c "
    SELECT
        'Users: ' || COUNT(*) FROM users
    UNION ALL
    SELECT 'Vehicles: ' || COUNT(*) FROM vehicles
    UNION ALL
    SELECT 'Locations: ' || COUNT(*) FROM locations
    UNION ALL
    SELECT 'Saved Locations: ' || COUNT(*) FROM saved_locations
    UNION ALL
    SELECT 'Places: ' || COUNT(*) FROM places_of_interest;
" 2>/dev/null)

if [ -n "$ROW_COUNTS" ]; then
    log_info "✓ Data successfully restored:"
    echo "$ROW_COUNTS" | while read line; do
        log_info "    $line"
    done
    REPORT_DETAILS="${REPORT_DETAILS}\n✓ Data integrity verified\n$(echo "$ROW_COUNTS" | sed 's/^/  /')"
else
    log_error "✗ Unable to query restored data"
    REPORT_DETAILS="${REPORT_DETAILS}\n❌ Unable to query restored data"
    TEST_PASSED=false
fi
log_info ""

# Step 8: Test referential integrity
log_test "Step 8: Testing referential integrity..."
ORPHANED_LOCATIONS=$(docker compose exec -T db psql -U gpsadmin -d "${TEST_DB}" -t -c "
    SELECT COUNT(*) FROM locations l
    LEFT JOIN vehicles v ON l.vehicle_id = v.id
    WHERE v.id IS NULL;
" 2>/dev/null | tr -d ' ')

if [ "$ORPHANED_LOCATIONS" = "0" ]; then
    log_info "✓ No referential integrity violations"
    REPORT_DETAILS="${REPORT_DETAILS}\n✓ Referential integrity verified"
else
    log_error "✗ Found ${ORPHANED_LOCATIONS} orphaned location records"
    REPORT_DETAILS="${REPORT_DETAILS}\n❌ Found ${ORPHANED_LOCATIONS} orphaned records"
    TEST_PASSED=false
fi
log_info ""

# Step 9: Test sample queries
log_test "Step 9: Running sample queries..."
QUERY_FAILED=false

# Query 1: Get latest vehicle location
log_info "  Testing query: Latest vehicle locations..."
if docker compose exec -T db psql -U gpsadmin -d "${TEST_DB}" -c "
    SELECT v.name, l.latitude, l.longitude, l.timestamp
    FROM vehicles v
    LEFT JOIN locations l ON v.id = l.vehicle_id
    ORDER BY l.timestamp DESC
    LIMIT 5;
" > /dev/null 2>&1; then
    log_info "  ✓ Latest locations query successful"
else
    log_error "  ✗ Latest locations query failed"
    QUERY_FAILED=true
fi

# Query 2: Count locations per vehicle
log_info "  Testing query: Location counts per vehicle..."
if docker compose exec -T db psql -U gpsadmin -d "${TEST_DB}" -c "
    SELECT v.name, COUNT(l.id) as location_count
    FROM vehicles v
    LEFT JOIN locations l ON v.id = l.vehicle_id
    GROUP BY v.name;
" > /dev/null 2>&1; then
    log_info "  ✓ Location count query successful"
else
    log_error "  ✗ Location count query failed"
    QUERY_FAILED=true
fi

# Query 3: Get places of interest
log_info "  Testing query: Places of interest..."
if docker compose exec -T db psql -U gpsadmin -d "${TEST_DB}" -c "
    SELECT name, latitude, longitude FROM places_of_interest LIMIT 5;
" > /dev/null 2>&1; then
    log_info "  ✓ Places query successful"
else
    log_error "  ✗ Places query failed"
    QUERY_FAILED=true
fi

if [ "$QUERY_FAILED" = true ]; then
    log_error "✗ Some queries failed"
    REPORT_DETAILS="${REPORT_DETAILS}\n❌ Sample queries failed"
    TEST_PASSED=false
else
    log_info "✓ All sample queries successful"
    REPORT_DETAILS="${REPORT_DETAILS}\n✓ All sample queries passed"
fi
log_info ""

# Final summary
log_info "=========================================="
if [ "$TEST_PASSED" = true ]; then
    log_info "✅ MONTHLY RESTORE TEST PASSED"
    log_info "=========================================="
    log_info "All verification checks passed successfully"
    log_info "Backup: ${BACKUP_FILENAME}"
    log_info "Test database: ${TEST_DB} (will be cleaned up)"
    log_info "=========================================="

    send_test_report "success" "${REPORT_DETAILS}"
    exit 0
else
    log_error "❌ MONTHLY RESTORE TEST FAILED"
    log_error "=========================================="
    log_error "One or more verification checks failed"
    log_error "Backup: ${BACKUP_FILENAME}"
    log_error "Review the log for details: ${LOG_FILE}"
    log_error "=========================================="

    send_test_report "failure" "${REPORT_DETAILS}"
    exit 1
fi

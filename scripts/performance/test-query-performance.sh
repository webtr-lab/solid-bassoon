#!/bin/bash
#
# Database Query Performance Test Script
# Tests database query performance and index effectiveness
#
# Usage: ./scripts/performance/test-query-performance.sh
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Database Query Performance Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if database is running
if ! docker compose ps db | grep -q "running"; then
    echo -e "${RED}Database is not running${NC}"
    exit 1
fi

echo "Connecting to database..."
echo ""

# Function to run query and measure time
run_query() {
    local query="$1"
    local description="$2"

    echo -e "${BLUE}Test: ${description}${NC}"
    echo "Query: $query"

    # Run EXPLAIN ANALYZE to get actual execution time
    RESULT=$(docker compose exec -T db psql -U mapsadmin -d maps_tracker -c "EXPLAIN ANALYZE $query" 2>&1)

    # Extract execution time
    EXEC_TIME=$(echo "$RESULT" | grep "Execution Time" | awk '{print $3}')

    if [ -n "$EXEC_TIME" ]; then
        echo "  Execution time: ${EXEC_TIME}ms"

        # Check if using index
        if echo "$RESULT" | grep -q "Index Scan\|Index Only Scan"; then
            echo -e "  ${GREEN}✓ Using index${NC}"
        elif echo "$RESULT" | grep -q "Seq Scan"; then
            echo -e "  ${YELLOW}⚠ Using sequential scan (no index)${NC}"
        fi

        # Performance rating
        if (( $(echo "$EXEC_TIME < 50" | bc -l) )); then
            echo -e "  ${GREEN}✓ Excellent performance (<50ms)${NC}"
        elif (( $(echo "$EXEC_TIME < 100" | bc -l) )); then
            echo -e "  ${GREEN}○ Good performance (<100ms)${NC}"
        elif (( $(echo "$EXEC_TIME < 500" | bc -l) )); then
            echo -e "  ${YELLOW}○ Acceptable performance (<500ms)${NC}"
        else
            echo -e "  ${RED}✗ Slow query (>${EXEC_TIME}ms)${NC}"
        fi
    else
        echo -e "  ${RED}✗ Failed to get execution time${NC}"
    fi

    echo ""
}

# Test 1: Vehicle list query
run_query \
    "SELECT * FROM vehicles WHERE is_active = true ORDER BY name LIMIT 100;" \
    "Vehicle List (with active filter)"

# Test 2: Recent locations for a vehicle
run_query \
    "SELECT * FROM locations WHERE vehicle_id = 1 AND timestamp > NOW() - INTERVAL '24 hours' ORDER BY timestamp DESC LIMIT 1000;" \
    "Recent Locations (24 hours, with index)"

# Test 3: Saved locations for a vehicle
run_query \
    "SELECT * FROM saved_locations WHERE vehicle_id = 1 ORDER BY timestamp DESC LIMIT 100;" \
    "Saved Locations (vehicle, with index)"

# Test 4: Places by area
run_query \
    "SELECT * FROM places_of_interest WHERE area = 'Paramaribo' ORDER BY name LIMIT 100;" \
    "Places by Area (with index)"

# Test 5: Places by category
run_query \
    "SELECT * FROM places_of_interest WHERE category = 'Store' ORDER BY name LIMIT 100;" \
    "Places by Category (with index)"

# Test 6: Recent audit logs
run_query \
    "SELECT * FROM audit_logs WHERE timestamp > NOW() - INTERVAL '7 days' ORDER BY timestamp DESC LIMIT 100;" \
    "Recent Audit Logs (7 days)"

# Test 7: Failed login attempts
run_query \
    "SELECT * FROM audit_logs WHERE action = 'login' AND status = 'failed' AND timestamp > NOW() - INTERVAL '24 hours' ORDER BY timestamp DESC;" \
    "Failed Logins (with partial index)"

# Test 8: Join query (vehicle with latest location)
run_query \
    "SELECT v.id, v.name, l.latitude, l.longitude, l.timestamp FROM vehicles v LEFT JOIN LATERAL (SELECT latitude, longitude, timestamp FROM locations WHERE vehicle_id = v.id ORDER BY timestamp DESC LIMIT 1) l ON true WHERE v.is_active = true;" \
    "Vehicles with Latest Location (join)"

# Show index usage statistics
echo -e "${BLUE}=== Index Usage Statistics ===${NC}"
docker compose exec -T db psql -U mapsadmin -d maps_tracker -c "
SELECT
    schemaname || '.' || tablename AS table,
    indexname AS index,
    idx_scan AS scans,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM
    pg_stat_user_indexes
WHERE
    schemaname = 'public'
ORDER BY
    idx_scan DESC
LIMIT 20;
"

# Show unused indexes
echo ""
echo -e "${BLUE}=== Potentially Unused Indexes ===${NC}"
docker compose exec -T db psql -U mapsadmin -d maps_tracker -c "
SELECT
    schemaname || '.' || tablename AS table,
    indexname AS index,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size
FROM
    pg_stat_user_indexes
WHERE
    schemaname = 'public'
    AND idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'
ORDER BY
    pg_relation_size(indexrelid) DESC;
"

# Show table sizes
echo ""
echo -e "${BLUE}=== Table Sizes ===${NC}"
docker compose exec -T db psql -U mapsadmin -d maps_tracker -c "
SELECT
    schemaname || '.' || tablename AS table,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS indexes_size
FROM
    pg_tables
WHERE
    schemaname = 'public'
ORDER BY
    pg_total_relation_size(schemaname||'.'||tablename) DESC;
"

# Show slow query log (if available)
echo ""
echo -e "${BLUE}=== Recent Slow Queries (from application logs) ===${NC}"
if [ -f backend/logs/app.log ]; then
    grep "Slow query" backend/logs/app.log | tail -10 || echo "No slow queries logged"
else
    echo "Log file not found"
fi

echo ""
echo "Query performance test completed."
echo ""
echo "Recommendations:"
echo "  - Queries under 50ms: Excellent"
echo "  - Queries 50-100ms: Good"
echo "  - Queries 100-500ms: Acceptable, consider optimization"
echo "  - Queries over 500ms: Needs optimization"
echo ""
echo "If you see sequential scans, consider adding indexes with:"
echo "  psql -U mapsadmin -d maps_tracker -f backend/migrations/add_performance_indexes.sql"

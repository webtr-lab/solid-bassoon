#!/bin/bash
#
# Cache Performance Test Script
# Tests Redis cache performance and hit rates
#
# Usage: ./scripts/performance/test-cache-performance.sh
#

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Cache Performance Test${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Redis is running
if ! docker compose ps redis | grep -q "running"; then
    echo -e "${YELLOW}Redis is not running. Starting Redis...${NC}"
    docker compose up -d redis
    sleep 3
fi

# Check Redis connectivity
echo "Testing Redis connectivity..."
if docker compose exec -T redis redis-cli ping | grep -q "PONG"; then
    echo -e "${GREEN}✓ Redis is responding${NC}"
else
    echo -e "${RED}✗ Redis is not responding${NC}"
    exit 1
fi

echo ""
echo "=== Cache Statistics (Before Test) ==="
docker compose exec -T redis redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses|total_commands_processed"

echo ""
echo "=== Running Cache Performance Test ==="

# Test 1: Write performance
echo ""
echo -e "${BLUE}Test 1: Write Performance (1000 keys)${NC}"
START=$(date +%s%N)
for i in {1..1000}; do
    docker compose exec -T redis redis-cli SET "test:key:$i" "value$i" EX 300 > /dev/null
done
END=$(date +%s%N)
WRITE_TIME=$(( ($END - $START) / 1000000 ))
WRITE_OPS=$(( 1000000 / ($END - $START) * 1000 ))
echo "  Write time: ${WRITE_TIME}ms"
echo "  Write ops/sec: ${WRITE_OPS}"

# Test 2: Read performance (cache hits)
echo ""
echo -e "${BLUE}Test 2: Read Performance - Cache Hits (1000 reads)${NC}"
START=$(date +%s%N)
for i in {1..1000}; do
    docker compose exec -T redis redis-cli GET "test:key:$i" > /dev/null
done
END=$(date +%s%N)
READ_TIME=$(( ($END - $START) / 1000000 ))
READ_OPS=$(( 1000000 / ($END - $START) * 1000 ))
echo "  Read time: ${READ_TIME}ms"
echo "  Read ops/sec: ${READ_OPS}"

# Test 3: Read performance (cache misses)
echo ""
echo -e "${BLUE}Test 3: Read Performance - Cache Misses (1000 reads)${NC}"
START=$(date +%s%N)
for i in {1001..2000}; do
    docker compose exec -T redis redis-cli GET "test:key:$i" > /dev/null
done
END=$(date +%s%N)
MISS_TIME=$(( ($END - $START) / 1000000 ))
MISS_OPS=$(( 1000000 / ($END - $START) * 1000 ))
echo "  Read time: ${MISS_TIME}ms"
echo "  Read ops/sec: ${MISS_OPS}"

# Test 4: Pattern deletion performance
echo ""
echo -e "${BLUE}Test 4: Pattern Deletion (1000 keys)${NC}"
START=$(date +%s%N)
docker compose exec -T redis redis-cli --scan --pattern "test:key:*" | \
    xargs -L 100 docker compose exec -T redis redis-cli DEL > /dev/null 2>&1
END=$(date +%s%N)
DELETE_TIME=$(( ($END - $START) / 1000000 ))
echo "  Delete time: ${DELETE_TIME}ms"

# Get final statistics
echo ""
echo "=== Cache Statistics (After Test) ==="
docker compose exec -T redis redis-cli INFO stats | grep -E "keyspace_hits|keyspace_misses|total_commands_processed"

# Get memory info
echo ""
echo "=== Memory Usage ==="
docker compose exec -T redis redis-cli INFO memory | grep -E "used_memory_human|used_memory_peak_human|maxmemory_human"

# Calculate hit rate
STATS=$(docker compose exec -T redis redis-cli INFO stats)
HITS=$(echo "$STATS" | grep "keyspace_hits" | cut -d: -f2 | tr -d '\r')
MISSES=$(echo "$STATS" | grep "keyspace_misses" | cut -d: -f2 | tr -d '\r')
TOTAL=$((HITS + MISSES))

if [ "$TOTAL" -gt 0 ]; then
    HIT_RATE=$(echo "scale=2; $HITS * 100 / $TOTAL" | bc)
    echo ""
    echo "=== Cache Hit Rate ==="
    echo "  Hits: $HITS"
    echo "  Misses: $MISSES"
    echo "  Hit Rate: ${HIT_RATE}%"
fi

echo ""
echo "=== Test Summary ==="
echo "  Write performance: ${WRITE_OPS} ops/sec"
echo "  Read performance (hits): ${READ_OPS} ops/sec"
echo "  Read performance (misses): ${MISS_OPS} ops/sec"

# Performance evaluation
echo ""
if [ "$WRITE_OPS" -gt 5000 ] && [ "$READ_OPS" -gt 10000 ]; then
    echo -e "${GREEN}✓ Cache performance is excellent${NC}"
elif [ "$WRITE_OPS" -gt 2000 ] && [ "$READ_OPS" -gt 5000 ]; then
    echo -e "${YELLOW}○ Cache performance is acceptable${NC}"
else
    echo -e "${YELLOW}⚠ Cache performance may need optimization${NC}"
fi

echo ""
echo "Test completed."

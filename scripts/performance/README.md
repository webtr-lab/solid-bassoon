# Performance Testing Scripts

This directory contains scripts for testing and monitoring application performance.

## Scripts

### test-cache-performance.sh

**Purpose:** Test Redis cache performance and measure hit rates

**Usage:**
```bash
./scripts/performance/test-cache-performance.sh
```

**What it tests:**
- Write performance (1000 keys)
- Read performance with cache hits
- Read performance with cache misses
- Pattern deletion performance
- Cache hit rate calculation
- Memory usage

**Expected Results:**
- Write performance: >5000 ops/sec (excellent), >2000 ops/sec (acceptable)
- Read performance: >10000 ops/sec (excellent), >5000 ops/sec (acceptable)
- Cache hit rate: >80% (excellent), >60% (acceptable)

### test-query-performance.sh

**Purpose:** Test database query performance and index effectiveness

**Usage:**
```bash
./scripts/performance/test-query-performance.sh
```

**What it tests:**
- Vehicle list queries
- Recent location queries (24 hours)
- Saved location queries
- Places by area/category
- Audit log queries
- Failed login queries
- Join queries (vehicle with latest location)

**Analysis Provided:**
- Query execution times
- Index usage (index scan vs sequential scan)
- Index usage statistics
- Unused indexes
- Table sizes
- Recent slow queries from logs

**Performance Ratings:**
- <50ms: Excellent ✓
- 50-100ms: Good ○
- 100-500ms: Acceptable ○
- >500ms: Needs optimization ✗

## Performance Optimization Workflow

### 1. Baseline Measurement

```bash
# Measure current performance
./scripts/performance/test-query-performance.sh > baseline.txt
./scripts/performance/test-cache-performance.sh >> baseline.txt
```

### 2. Apply Optimizations

**Database Indexes:**
```bash
docker compose exec db psql -U mapsadmin -d maps_tracker -f backend/migrations/add_performance_indexes.sql
```

**Enable Redis Cache:**
```bash
# Start Redis if not running
docker compose up -d redis

# Restart backend to enable caching
docker compose restart backend
```

### 3. Re-test Performance

```bash
# Measure after optimization
./scripts/performance/test-query-performance.sh > optimized.txt
./scripts/performance/test-cache-performance.sh >> optimized.txt

# Compare results
diff baseline.txt optimized.txt
```

### 4. Monitor Ongoing Performance

```bash
# Weekly performance check
./scripts/performance/test-query-performance.sh

# Check cache effectiveness
./scripts/performance/test-cache-performance.sh
```

## Performance Targets

### Database Queries

| Query Type | Target | Acceptable | Critical |
|------------|--------|------------|----------|
| Simple SELECT | <20ms | <50ms | >100ms |
| JOIN queries | <50ms | <100ms | >200ms |
| Aggregations | <100ms | <200ms | >500ms |

### Cache Performance

| Metric | Target | Acceptable | Critical |
|--------|--------|------------|----------|
| Write ops/sec | >5000 | >2000 | <1000 |
| Read ops/sec | >10000 | >5000 | <2000 |
| Hit rate | >80% | >60% | <40% |
| Memory usage | <128MB | <256MB | >256MB |

### API Response Times

| Endpoint | Target | Acceptable | Critical |
|----------|--------|------------|----------|
| GET /api/vehicles | <100ms | <500ms | >1000ms |
| GET /api/places | <100ms | <500ms | >1000ms |
| GET /api/vehicles/:id/history | <200ms | <1000ms | >2000ms |

## Troubleshooting

### Slow Queries

**Symptoms:**
- Queries taking >500ms
- Sequential scans instead of index scans

**Solutions:**
```bash
# 1. Check if indexes exist
docker compose exec db psql -U mapsadmin -d maps_tracker -c "\di"

# 2. Apply performance indexes
docker compose exec db psql -U mapsadmin -d maps_tracker -f backend/migrations/add_performance_indexes.sql

# 3. Update table statistics
docker compose exec db psql -U mapsadmin -d maps_tracker -c "ANALYZE;"

# 4. Re-test
./scripts/performance/test-query-performance.sh
```

### Low Cache Hit Rate

**Symptoms:**
- Cache hit rate <60%
- High database load

**Solutions:**
```bash
# 1. Check Redis is running
docker compose ps redis

# 2. Check cache configuration
docker compose exec redis redis-cli INFO memory

# 3. Increase cache TTL in code if data changes infrequently

# 4. Review cache invalidation strategy
```

### High Memory Usage

**Symptoms:**
- Redis using >256MB
- Cache evictions happening frequently

**Solutions:**
```bash
# 1. Check memory usage
docker compose exec redis redis-cli INFO memory

# 2. Adjust max memory in docker-compose.yml
# Change: --maxmemory 256mb to --maxmemory 512mb

# 3. Review cached object sizes
docker compose exec redis redis-cli --bigkeys

# 4. Adjust eviction policy if needed
```

## Continuous Monitoring

### Automated Performance Testing

Add to cron for weekly testing:
```bash
# Edit crontab
crontab -e

# Add weekly performance test (Sundays at 2 AM)
0 2 * * 0 cd /home/devnan/maps-tracker-app1 && ./scripts/performance/test-query-performance.sh >> logs/performance-$(date +\%Y\%m\%d).log 2>&1
```

### Prometheus Metrics

Monitor performance via Prometheus:
- http://localhost:9090

**Key metrics:**
```
# API response times
http_request_duration_seconds{endpoint="/api/vehicles"}

# Slow queries
slow_database_queries_total

# Cache operations
cache_operations_total{operation="hit"}
cache_operations_total{operation="miss"}
```

### Grafana Dashboards

View performance dashboards:
- http://localhost:3001

**Performance panels:**
- API Response Times (p50, p95, p99)
- Database Query Times
- Cache Hit Rate
- Request Rate
- Error Rate

## Additional Resources

- [Performance Optimization Guide](../../docs/PERFORMANCE_OPTIMIZATION.md)
- [PostgreSQL Performance Tips](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Redis Performance Tips](https://redis.io/docs/manual/optimization/)

---

**Maintained By:** DevOps Team
**Last Updated:** 2025-12-09

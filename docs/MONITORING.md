# Monitoring and Alerting

This document describes the monitoring and alerting setup for the Maps Tracker application.

## Overview

The monitoring stack consists of:
- **Prometheus**: Metrics collection and alerting
- **Grafana**: Visualization and dashboards
- **prometheus-flask-exporter**: Automatic Flask metrics instrumentation

## Architecture

```
┌─────────────┐
│   Backend   │──► Exposes /metrics endpoint
└─────────────┘
       │
       │ (scrape every 10s)
       ▼
┌─────────────┐
│ Prometheus  │──► Collects and stores metrics
└─────────────┘    Evaluates alert rules
       │
       │ (queries)
       ▼
┌─────────────┐
│   Grafana   │──► Visualizes metrics
└─────────────┘    Displays dashboards
```

## Accessing Monitoring Tools

- **Prometheus**: http://localhost:9090 (localhost only)
- **Grafana**: http://localhost:3001 (localhost only)
  - Default credentials: admin / admin (change on first login)
  - Set via GRAFANA_ADMIN_USER and GRAFANA_ADMIN_PASSWORD in .env

## Metrics Collected

### Application Metrics

- **gps_submissions_total**: Total GPS data submissions (labeled by vehicle_id, status)
- **active_vehicles**: Number of vehicles that reported in last 24h
- **location_records_total**: Total location records in database
- **saved_location_records_total**: Total saved location records
- **audit_log_records_total**: Total audit log records
- **database_size_megabytes**: Database size in MB
- **failed_logins_total**: Total failed login attempts (labeled by username)
- **api_token_regenerations_total**: API token regenerations (labeled by vehicle_id)
- **data_cleanup_operations_total**: Data cleanup operations (labeled by operation_type, status)
- **records_deleted_total**: Records deleted by cleanup (labeled by record_type)

### System Metrics

- **system_cpu_usage_percent**: CPU usage percentage
- **system_memory_usage_percent**: Memory usage percentage
- **system_disk_usage_percent**: Disk usage percentage

### Flask Metrics (Auto-instrumented)

- **flask_http_request_total**: Total HTTP requests (labeled by method, status, endpoint)
- **flask_http_request_duration_seconds**: HTTP request latency histogram
- **flask_http_request_exceptions_total**: Total exceptions during request handling

## Alert Rules

The following alerts are configured in `monitoring/prometheus/alerts.yml`:

### Critical Alerts

- **BackendDown**: Backend service unreachable for >1 minute
- **HighDiskUsage**: Disk usage >90% for >5 minutes

### Warning Alerts

- **HighGPSFailureRate**: GPS submission failures >0.1/sec for >5 minutes
- **HighAPIResponseTime**: 95th percentile response time >2s for >5 minutes
- **HighFailedLoginRate**: Failed login attempts >0.5/sec for >5 minutes
- **DatabaseSizeGrowth**: Database size >5000MB for >1 hour
- **HighCPUUsage**: CPU usage >80% for >10 minutes
- **HighMemoryUsage**: Memory usage >85% for >10 minutes
- **DataCleanupFailures**: Data cleanup operations failing

### Info Alerts

- **NoActiveVehicles**: No vehicles reported in last 24 hours

## Grafana Dashboard

The main dashboard (`Maps Tracker - Production Monitoring`) includes:

1. **GPS Submissions Rate**: Real-time GPS data submission success/failure rate
2. **Active Vehicles**: Number of vehicles that reported in last 24h
3. **Failed Logins**: Failed login attempts in last hour
4. **Database Size**: Current database size in MB
5. **Total Records**: Sum of all database records
6. **API Response Time**: 50th and 95th percentile latencies by endpoint
7. **Database Records by Type**: Breakdown of locations, saved locations, audit logs
8. **System Resources**: CPU, Memory, Disk usage
9. **Data Cleanup Operations**: Success/failure rate of cleanup jobs
10. **Records Deleted**: Number of records deleted by cleanup
11. **HTTP Requests by Status**: 2xx, 4xx, 5xx request rates
12. **API Token Regenerations**: Token regeneration events by vehicle

## Metrics Update Frequency

- **Automatic metrics**: Updated on every HTTP request (Flask instrumentation)
- **Custom metrics**: Updated via recording functions when events occur
- **Database/System metrics**: Updated every 60 seconds via scheduled job

## Data Retention

- Prometheus retains metrics for **30 days**
- Adjust via `--storage.tsdb.retention.time` in docker-compose.yml

## Starting/Stopping Monitoring

```bash
# Start all services including monitoring
docker compose up -d

# Start only monitoring services
docker compose up -d prometheus grafana

# Stop monitoring services
docker compose stop prometheus grafana

# View Prometheus logs
docker compose logs -f prometheus

# View Grafana logs
docker compose logs -f grafana
```

## Troubleshooting

### Prometheus Not Scraping Backend

1. Check backend is exposing /metrics:
   ```bash
   curl http://localhost:5000/metrics
   ```

2. Check Prometheus targets:
   ```bash
   # Visit http://localhost:9090/targets
   # backend target should show "UP"
   ```

3. Check Prometheus logs:
   ```bash
   docker compose logs prometheus | grep -i error
   ```

### Grafana Dashboard Not Loading

1. Check Grafana provisioning:
   ```bash
   docker compose logs grafana | grep -i provision
   ```

2. Verify datasource connection:
   - Login to Grafana
   - Go to Configuration > Data Sources
   - Click "Test" on Prometheus datasource

3. Check dashboard provisioning:
   ```bash
   docker exec maps_grafana ls -la /etc/grafana/provisioning/dashboards/
   ```

### Missing Metrics

1. Verify metrics are being recorded:
   ```bash
   curl http://localhost:5000/metrics | grep gps_submissions
   ```

2. Check backend logs for errors:
   ```bash
   docker compose logs backend | grep -i prometheus
   ```

3. Restart backend to re-initialize metrics:
   ```bash
   docker compose restart backend
   ```

## Adding Custom Metrics

To add new metrics:

1. Define metric in `backend/app/monitoring.py`:
   ```python
   from prometheus_client import Counter

   my_metric = Counter(
       'my_metric_total',
       'Description of metric',
       ['label1', 'label2']
   )
   ```

2. Record metric in your code:
   ```python
   from app.monitoring import my_metric

   my_metric.labels(label1='value1', label2='value2').inc()
   ```

3. Metric will automatically be exposed at `/metrics`

4. Add to Grafana dashboard by editing JSON or via UI

## Security Considerations

- Prometheus and Grafana are bound to localhost only (127.0.0.1)
- Not exposed to external network by default
- To access remotely, use SSH tunnel:
  ```bash
  ssh -L 9090:localhost:9090 -L 3001:localhost:3001 user@server
  ```
- Change default Grafana credentials immediately
- Consider adding authentication to Prometheus (basic auth or reverse proxy)

## Production Recommendations

1. **External Alerting**: Configure Alertmanager to send alerts to email/Slack/PagerDuty
2. **Long-term Storage**: Export metrics to external storage (Thanos, Cortex) for >30 day retention
3. **High Availability**: Run multiple Prometheus instances with federation
4. **Backup Grafana**: Backup `/var/lib/grafana` volume regularly
5. **Custom Dashboards**: Create role-specific dashboards (operations, management, development)
6. **SLO Tracking**: Add Service Level Objective panels to track reliability targets

## References

- Prometheus Documentation: https://prometheus.io/docs/
- Grafana Documentation: https://grafana.com/docs/
- prometheus-flask-exporter: https://github.com/rycus86/prometheus_flask_exporter

"""
Application Monitoring and Metrics
Exposes Prometheus metrics for monitoring application health and performance
"""

from prometheus_flask_exporter import PrometheusMetrics
from prometheus_client import Counter, Gauge, Histogram, Info
from flask import request
import psutil
import time

# Custom metrics
gps_submissions = Counter(
    'gps_submissions_total',
    'Total GPS data submissions',
    ['vehicle_id', 'status']
)

active_vehicles = Gauge(
    'active_vehicles',
    'Number of vehicles currently reporting'
)

location_count = Gauge(
    'location_records_total',
    'Total number of location records in database'
)

saved_location_count = Gauge(
    'saved_location_records_total',
    'Total number of saved location records'
)

audit_log_count = Gauge(
    'audit_log_records_total',
    'Total number of audit log records'
)

database_size_mb = Gauge(
    'database_size_megabytes',
    'Database size in megabytes'
)

failed_logins = Counter(
    'failed_logins_total',
    'Total number of failed login attempts',
    ['username']
)

api_token_regenerations = Counter(
    'api_token_regenerations_total',
    'Total number of API token regenerations',
    ['vehicle_id']
)

cleanup_operations = Counter(
    'data_cleanup_operations_total',
    'Total number of data cleanup operations',
    ['operation_type', 'status']
)

records_deleted = Counter(
    'records_deleted_total',
    'Total number of records deleted by cleanup',
    ['record_type']
)

# Backup metrics
backup_last_success_timestamp = Gauge(
    'backup_last_success_timestamp',
    'Unix timestamp of last successful backup'
)

backup_operations = Counter(
    'backup_operations_total',
    'Total number of backup operations',
    ['operation_type', 'status']
)

# Security metrics
csrf_validation_failures = Counter(
    'csrf_validation_failures_total',
    'Total number of CSRF validation failures',
    ['endpoint']
)

rate_limit_exceeded = Counter(
    'rate_limit_exceeded_total',
    'Total number of rate limit violations',
    ['endpoint', 'limit']
)

# System metrics
system_cpu_usage = Gauge(
    'system_cpu_usage_percent',
    'System CPU usage percentage'
)

system_memory_usage = Gauge(
    'system_memory_usage_percent',
    'System memory usage percentage'
)

system_disk_usage = Gauge(
    'system_disk_usage_percent',
    'System disk usage percentage'
)


def init_metrics(app):
    """
    Initialize Prometheus metrics exporter for Flask application

    Args:
        app: Flask application instance
    """
    # Initialize PrometheusMetrics with automatic instrumentation
    metrics = PrometheusMetrics(
        app,
        defaults_prefix='flask',
        group_by='endpoint',
        buckets=(0.01, 0.05, 0.1, 0.5, 1.0, 2.5, 5.0, 10.0)
    )

    # Add application info
    app_info = Info('application', 'Application information')
    app_info.info({
        'app_name': 'maps_tracker',
        'version': '1.0.0',
        'environment': app.config.get('FLASK_ENV', 'production')
    })

    app.logger.info("Prometheus metrics initialized at /metrics")

    return metrics


def update_database_metrics():
    """
    Update database-related metrics
    Should be called periodically by a background job
    """
    from app.models import db, Location, SavedLocation, AuditLog, Vehicle
    from flask import current_app
    from sqlalchemy import text

    try:
        # Update record counts
        location_count.set(Location.query.count())
        saved_location_count.set(SavedLocation.query.count())
        audit_log_count.set(AuditLog.query.count())

        # Update active vehicles count (reported in last 24 hours)
        from datetime import datetime, timedelta
        cutoff = datetime.utcnow() - timedelta(hours=24)
        active_count = db.session.query(Location.vehicle_id).filter(
            Location.timestamp > cutoff
        ).distinct().count()
        active_vehicles.set(active_count)

        # Get database size (PostgreSQL specific)
        result = db.session.execute(
            text("SELECT pg_database_size(current_database()) / (1024.0 * 1024.0)")
        )
        db_size = result.scalar()
        database_size_mb.set(db_size)

    except Exception as e:
        current_app.logger.error(f"Error updating database metrics: {str(e)}")


def update_system_metrics():
    """
    Update system resource metrics
    Should be called periodically by a background job
    """
    from flask import current_app

    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        system_cpu_usage.set(cpu_percent)

        # Memory usage
        memory = psutil.virtual_memory()
        system_memory_usage.set(memory.percent)

        # Disk usage
        disk = psutil.disk_usage('/')
        system_disk_usage.set(disk.percent)

    except Exception as e:
        current_app.logger.error(f"Error updating system metrics: {str(e)}")


def record_gps_submission(vehicle_id, success=True):
    """Record a GPS data submission"""
    status = 'success' if success else 'failed'
    gps_submissions.labels(vehicle_id=str(vehicle_id), status=status).inc()


def record_failed_login(username):
    """Record a failed login attempt"""
    failed_logins.labels(username=username).inc()


def record_token_regeneration(vehicle_id):
    """Record an API token regeneration"""
    api_token_regenerations.labels(vehicle_id=str(vehicle_id)).inc()


def record_cleanup_operation(operation_type, success=True):
    """Record a data cleanup operation"""
    status = 'success' if success else 'failed'
    cleanup_operations.labels(operation_type=operation_type, status=status).inc()


def record_records_deleted(record_type, count):
    """Record number of records deleted in cleanup"""
    records_deleted.labels(record_type=record_type).inc(count)


def record_backup_operation(operation_type, success=True):
    """Record a backup operation"""
    import time
    status = 'success' if success else 'failed'
    backup_operations.labels(operation_type=operation_type, status=status).inc()
    if success:
        backup_last_success_timestamp.set(time.time())


def record_csrf_failure(endpoint):
    """Record a CSRF validation failure"""
    csrf_validation_failures.labels(endpoint=endpoint).inc()


def record_rate_limit_hit(endpoint, limit):
    """Record a rate limit violation"""
    rate_limit_exceeded.labels(endpoint=endpoint, limit=limit).inc()

"""
Performance Monitoring and Optimization Utilities
Tracks response times, query performance, and provides optimization helpers
"""

import time
import functools
from flask import g, request, current_app
from prometheus_client import Histogram, Counter
from sqlalchemy import event
from sqlalchemy.engine import Engine

# Prometheus metrics for performance monitoring
request_duration = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint', 'status']
)

slow_query_counter = Counter(
    'slow_database_queries_total',
    'Number of slow database queries (>100ms)',
    ['query_type']
)

cache_operations = Counter(
    'cache_operations_total',
    'Cache operation counts',
    ['operation', 'status']  # hit, miss, set, delete
)

# Track query performance
query_times = []
SLOW_QUERY_THRESHOLD = 0.1  # 100ms


@event.listens_for(Engine, "before_cursor_execute")
def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Record query start time"""
    conn.info.setdefault('query_start_time', []).append(time.time())


@event.listens_for(Engine, "after_cursor_execute")
def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
    """Record query execution time and log slow queries"""
    total_time = time.time() - conn.info['query_start_time'].pop(-1)

    # Log slow queries
    if total_time > SLOW_QUERY_THRESHOLD:
        query_type = statement.split()[0].upper()  # SELECT, INSERT, UPDATE, DELETE
        slow_query_counter.labels(query_type=query_type).inc()

        current_app.logger.warning(
            f"Slow query ({total_time:.3f}s): {statement[:200]}..."
        )

    # Store for analysis
    if hasattr(g, 'query_times'):
        g.query_times.append(total_time)


def track_performance(f):
    """
    Decorator to track endpoint performance

    Usage:
        @app.route('/api/vehicles')
        @track_performance
        def get_vehicles():
            return jsonify(vehicles)
    """
    @functools.wraps(f)
    def decorated_function(*args, **kwargs):
        start_time = time.time()
        g.query_times = []

        try:
            result = f(*args, **kwargs)
            status = 200  # Default success

            # Extract actual status from response if available
            if hasattr(result, 'status_code'):
                status = result.status_code
            elif isinstance(result, tuple) and len(result) > 1:
                status = result[1]

            return result
        except Exception as e:
            status = 500
            raise
        finally:
            duration = time.time() - start_time

            # Record metrics
            request_duration.labels(
                method=request.method,
                endpoint=request.endpoint or 'unknown',
                status=status
            ).observe(duration)

            # Log slow requests
            if duration > 1.0:  # 1 second threshold
                query_count = len(g.query_times) if hasattr(g, 'query_times') else 0
                total_query_time = sum(g.query_times) if hasattr(g, 'query_times') else 0

                current_app.logger.warning(
                    f"Slow request: {request.method} {request.path} "
                    f"- {duration:.3f}s total, {query_count} queries, "
                    f"{total_query_time:.3f}s in DB"
                )

    return decorated_function


class PerformanceAnalyzer:
    """
    Utility class for analyzing application performance
    """

    @staticmethod
    def get_request_stats():
        """Get request performance statistics"""
        # This would integrate with Prometheus metrics
        # For now, returns basic info
        return {
            'slow_requests_threshold': 1.0,
            'slow_query_threshold': SLOW_QUERY_THRESHOLD,
            'monitoring': 'enabled'
        }

    @staticmethod
    def get_query_stats():
        """Get database query statistics"""
        if not hasattr(g, 'query_times') or not g.query_times:
            return {
                'count': 0,
                'total_time': 0,
                'avg_time': 0,
                'max_time': 0
            }

        return {
            'count': len(g.query_times),
            'total_time': round(sum(g.query_times), 3),
            'avg_time': round(sum(g.query_times) / len(g.query_times), 3),
            'max_time': round(max(g.query_times), 3),
            'slow_queries': sum(1 for t in g.query_times if t > SLOW_QUERY_THRESHOLD)
        }

    @staticmethod
    def optimize_query(query):
        """
        Optimize SQLAlchemy query with common performance improvements

        Args:
            query: SQLAlchemy query object

        Returns:
            Optimized query with eager loading and options
        """
        # Add query optimization logic here
        # This is a placeholder for query-specific optimizations
        return query


def batch_process(items, batch_size=100):
    """
    Generator to process items in batches

    Usage:
        for batch in batch_process(large_list, batch_size=50):
            process_batch(batch)
    """
    for i in range(0, len(items), batch_size):
        yield items[i:i + batch_size]


def measure_time(label="Operation"):
    """
    Context manager to measure execution time

    Usage:
        with measure_time("Database query"):
            result = db.session.query(...).all()
    """
    class TimeMeasure:
        def __enter__(self):
            self.start = time.time()
            return self

        def __exit__(self, *args):
            duration = time.time() - self.start
            current_app.logger.info(f"{label}: {duration:.3f}s")

    return TimeMeasure()


# Performance optimization helpers

def optimize_location_query(query, hours=24):
    """
    Optimize location queries with proper indexing and filtering

    Args:
        query: Base query for locations
        hours: Time window in hours

    Returns:
        Optimized query
    """
    from datetime import datetime, timedelta
    from app.models import Location

    # Use indexed timestamp column for filtering
    since = datetime.utcnow() - timedelta(hours=hours)

    # Add index hints and optimize ordering
    return query.filter(
        Location.timestamp >= since
    ).order_by(
        Location.timestamp.desc()
    )


def paginate_query(query, page=1, per_page=100, max_per_page=1000):
    """
    Paginate query results efficiently

    Args:
        query: SQLAlchemy query
        page: Page number (1-indexed)
        per_page: Items per page
        max_per_page: Maximum items per page (safety limit)

    Returns:
        Tuple of (items, total_count, has_next, has_prev)
    """
    per_page = min(per_page, max_per_page)

    # Get total count efficiently
    total = query.count()

    # Calculate pagination
    has_prev = page > 1
    has_next = page * per_page < total

    # Get paginated items
    items = query.limit(per_page).offset((page - 1) * per_page).all()

    return items, total, has_next, has_prev

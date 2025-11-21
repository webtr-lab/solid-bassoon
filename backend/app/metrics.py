"""
Application metrics and monitoring
Tracks key performance indicators and business metrics
"""

from datetime import datetime, timedelta
from app.models import db, Vehicle, Location, SavedLocation
import time


class Metrics:
    """Singleton for tracking application metrics"""

    def __init__(self):
        self.start_time = datetime.utcnow()
        self.request_count = 0
        self.error_count = 0
        self.gps_submissions = 0
        self.locations_cached = {}

    def get_uptime(self):
        """Get uptime in seconds"""
        return (datetime.utcnow() - self.start_time).total_seconds()

    def get_health_status(self):
        """Get comprehensive health status"""
        return {
            'status': self.check_health(),
            'timestamp': datetime.utcnow().isoformat(),
            'uptime_seconds': self.get_uptime(),
            'uptime_readable': self._format_uptime(),
            'database': self.check_database_health(),
            'vehicles': self.get_vehicle_metrics(),
            'locations': self.get_location_metrics(),
            'system': self.get_system_metrics(),
        }

    def check_health(self):
        """Check if system is healthy"""
        try:
            # Test database connection
            db.session.execute(db.text('SELECT 1'))
            # Test vehicle count query
            Vehicle.query.first()
            return 'healthy'
        except Exception as e:
            return f'unhealthy: {str(e)}'

    def check_database_health(self):
        """Check database health and connection pool"""
        try:
            # Test connection
            result = db.session.execute(db.text('SELECT 1'))

            # Get connection pool stats
            pool = db.engine.pool

            return {
                'status': 'connected',
                'connection_pool': {
                    'size': pool.size() if hasattr(pool, 'size') else 'unknown',
                    'checked_in': pool.checkedin() if hasattr(pool, 'checkedin') else 'unknown',
                    'checked_out': pool.checkedout() if hasattr(pool, 'checkedout') else 'unknown',
                },
                'response_time_ms': 'quick'
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }

    def get_vehicle_metrics(self):
        """Get vehicle tracking metrics"""
        try:
            total_vehicles = Vehicle.query.count()
            active_vehicles = Vehicle.query.filter(
                Vehicle.status == 'active'
            ).count()

            # Get vehicles with recent activity (last hour)
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            active_recently = db.session.query(Vehicle).join(Location).filter(
                Location.timestamp > one_hour_ago
            ).distinct().count()

            return {
                'total': total_vehicles,
                'active': active_vehicles,
                'active_last_hour': active_recently,
                'inactive': total_vehicles - active_vehicles,
            }
        except Exception as e:
            return {'error': str(e)}

    def get_location_metrics(self):
        """Get location/GPS metrics"""
        try:
            # Total locations recorded
            total_locations = Location.query.count()

            # Locations in last hour
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            locations_last_hour = Location.query.filter(
                Location.timestamp > one_hour_ago
            ).count()

            # Saved locations (detected stops)
            saved_locations = SavedLocation.query.count()

            return {
                'total_recorded': total_locations,
                'last_hour': locations_last_hour,
                'saved_stops': saved_locations,
                'gps_submissions_total': self.gps_submissions,
            }
        except Exception as e:
            return {'error': str(e)}

    def get_system_metrics(self):
        """Get system-level metrics"""
        return {
            'requests_total': self.request_count,
            'errors_total': self.error_count,
            'error_rate': (self.error_count / max(self.request_count, 1)) * 100,
        }

    def _format_uptime(self):
        """Format uptime in human-readable form"""
        uptime = self.get_uptime()

        days = int(uptime // 86400)
        hours = int((uptime % 86400) // 3600)
        minutes = int((uptime % 3600) // 60)

        if days > 0:
            return f"{days}d {hours}h {minutes}m"
        elif hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"

    def record_request(self):
        """Record incoming request"""
        self.request_count += 1

    def record_error(self):
        """Record error"""
        self.error_count += 1

    def record_gps_submission(self):
        """Record GPS data submission"""
        self.gps_submissions += 1


# Global metrics instance
metrics = Metrics()

"""
Health check routes blueprint
Comprehensive health check and metrics endpoints
"""

from flask import Blueprint, jsonify, current_app
from app.models import db, Vehicle, Location, SavedLocation
from datetime import datetime, timedelta

health_bp = Blueprint('health', __name__, url_prefix='/api')


@health_bp.route('/health', methods=['GET'])
def health():
    """
    Basic health check endpoint
    Returns simple status
    """
    try:
        # Quick database test
        db.session.execute(db.text('SELECT 1'))
        return jsonify({
            'status': 'healthy',
            'message': 'Maps Tracker API is running',
            'timestamp': datetime.utcnow().isoformat(),
            'database': 'connected'
        }), 200
    except Exception as e:
        current_app.logger.error(f"Health check error: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat(),
        }), 503


@health_bp.route('/health/detailed', methods=['GET'])
def detailed_health():
    """
    Detailed health check with metrics
    Returns comprehensive system health status
    """
    try:
        return jsonify({
            'status': 'healthy',
            'timestamp': datetime.utcnow().isoformat(),
            'database': _get_database_health(),
            'vehicles': _get_vehicle_metrics(),
            'locations': _get_location_metrics(),
            'system': _get_system_metrics(),
        }), 200

    except Exception as e:
        current_app.logger.error(f"Detailed health check error: {str(e)}")
        return jsonify({
            'status': 'unhealthy',
            'error': str(e),
            'timestamp': datetime.utcnow().isoformat(),
        }), 503


@health_bp.route('/health/ready', methods=['GET'])
def readiness_check():
    """
    Kubernetes-style readiness probe
    Returns 200 if ready to serve traffic
    """
    try:
        db.session.execute(db.text('SELECT 1'))
        return jsonify({'ready': True, 'status': 'ready'}), 200
    except Exception as e:
        current_app.logger.error(f"Readiness check failed: {str(e)}")
        return jsonify({'ready': False, 'error': str(e)}), 503


@health_bp.route('/health/live', methods=['GET'])
def liveness_check():
    """
    Kubernetes-style liveness probe
    Returns 200 if process is alive
    """
    try:
        return jsonify({'alive': True, 'status': 'running'}), 200
    except Exception:
        return jsonify({'alive': False}), 503


def _get_database_health():
    """Check database connectivity and health"""
    try:
        db.session.execute(db.text('SELECT 1'))
        pool = db.engine.pool

        return {
            'status': 'connected',
            'response_time_ms': 'quick',
            'connection_pool': {
                'size': getattr(pool, 'size', 'unknown'),
                'checked_in': getattr(pool, 'checkedin', 'unknown'),
                'checked_out': getattr(pool, 'checkedout', 'unknown'),
            }
        }
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e)
        }


def _get_vehicle_metrics():
    """Get vehicle tracking metrics"""
    try:
        total_vehicles = Vehicle.query.count()
        active_vehicles = Vehicle.query.filter(
            Vehicle.status == 'active'
        ).count()

        # Vehicles with recent activity (last hour)
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        active_recently = db.session.query(Vehicle).join(Location).filter(
            Location.timestamp > one_hour_ago
        ).distinct().count()

        return {
            'total': total_vehicles,
            'active': active_vehicles,
            'active_last_hour': active_recently,
            'inactive': total_vehicles - active_vehicles,
            'percentage_active': round((active_vehicles / max(total_vehicles, 1)) * 100, 2)
        }
    except Exception as e:
        return {'error': str(e)}


def _get_location_metrics():
    """Get location/GPS metrics"""
    try:
        total_locations = Location.query.count()

        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        locations_last_hour = Location.query.filter(
            Location.timestamp > one_hour_ago
        ).count()

        one_day_ago = datetime.utcnow() - timedelta(days=1)
        locations_last_day = Location.query.filter(
            Location.timestamp > one_day_ago
        ).count()

        saved_locations = SavedLocation.query.count()

        return {
            'total_recorded': total_locations,
            'last_hour': locations_last_hour,
            'last_day': locations_last_day,
            'saved_stops': saved_locations,
            'avg_per_hour': locations_last_hour if locations_last_hour > 0 else 0,
        }
    except Exception as e:
        return {'error': str(e)}


def _get_system_metrics():
    """Get system-level metrics"""
    return {
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'maps-tracker-api',
        'version': '1.0.0',
    }

"""
Data Retention routes blueprint
Admin endpoints for managing data cleanup and retention policies
"""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required
from app.security import require_admin
from app.csrf_protection import require_csrf
from app.services.data_retention_service import (
    run_full_cleanup,
    cleanup_old_location_data,
    cleanup_old_saved_locations,
    cleanup_old_audit_logs,
    get_database_stats,
    DataRetentionPolicy
)
from app.monitoring import record_cleanup_operation, record_records_deleted

retention_bp = Blueprint('data_retention', __name__, url_prefix='/api/data-retention')


@retention_bp.route('/stats', methods=['GET'])
@login_required
@require_admin
def get_stats():
    """Get database statistics"""
    try:
        stats = get_database_stats()
        return jsonify({
            'stats': stats,
            'retention_policy': {
                'locations_days': DataRetentionPolicy.LOCATION_DATA_RETENTION_DAYS,
                'saved_locations_days': DataRetentionPolicy.SAVED_LOCATIONS_RETENTION_DAYS,
                'audit_logs_days': DataRetentionPolicy.AUDIT_LOGS_RETENTION_DAYS
            }
        })
    except Exception as e:
        current_app.logger.error(f"Error getting database stats: {str(e)}")
        return jsonify({'error': 'Failed to get statistics'}), 500


@retention_bp.route('/cleanup/preview', methods=['POST'])
@login_required
@require_admin
@require_csrf
def preview_cleanup():
    """Preview what would be deleted (dry run)"""
    try:
        results = run_full_cleanup(dry_run=True)
        return jsonify(results)
    except Exception as e:
        current_app.logger.error(f"Error previewing cleanup: {str(e)}")
        return jsonify({'error': 'Failed to preview cleanup'}), 500


@retention_bp.route('/cleanup/execute', methods=['POST'])
@login_required
@require_admin
@require_csrf
def execute_cleanup():
    """Execute data retention cleanup"""
    try:
        results = run_full_cleanup(dry_run=False)

        # Record metrics for monitoring
        record_cleanup_operation('full_cleanup', success=True)
        if results.get('locations', {}).get('locations_deleted', 0) > 0:
            record_records_deleted('locations', results['locations']['locations_deleted'])
        if results.get('saved_locations', {}).get('saved_locations_deleted', 0) > 0:
            record_records_deleted('saved_locations', results['saved_locations']['saved_locations_deleted'])
        if results.get('audit_logs', {}).get('audit_logs_deleted', 0) > 0:
            record_records_deleted('audit_logs', results['audit_logs']['audit_logs_deleted'])

        return jsonify(results)
    except Exception as e:
        current_app.logger.error(f"Error executing cleanup: {str(e)}")
        record_cleanup_operation('full_cleanup', success=False)
        return jsonify({'error': 'Failed to execute cleanup'}), 500


@retention_bp.route('/cleanup/locations', methods=['POST'])
@login_required
@require_admin
@require_csrf
def cleanup_locations():
    """Cleanup only location data"""
    try:
        dry_run = request.json.get('dry_run', False) if request.json else False
        results = cleanup_old_location_data(dry_run=dry_run)

        # Record metrics for monitoring (only for actual cleanup, not dry-run)
        if not dry_run:
            record_cleanup_operation('locations_cleanup', success=True)
            if results.get('locations_deleted', 0) > 0:
                record_records_deleted('locations', results['locations_deleted'])

        return jsonify(results)
    except Exception as e:
        current_app.logger.error(f"Error cleaning up locations: {str(e)}")
        if not (request.json and request.json.get('dry_run', False)):
            record_cleanup_operation('locations_cleanup', success=False)
        return jsonify({'error': 'Failed to cleanup locations'}), 500


@retention_bp.route('/cleanup/saved-locations', methods=['POST'])
@login_required
@require_admin
@require_csrf
def cleanup_saved():
    """Cleanup only saved locations"""
    try:
        dry_run = request.json.get('dry_run', False) if request.json else False
        results = cleanup_old_saved_locations(dry_run=dry_run)
        return jsonify(results)
    except Exception as e:
        current_app.logger.error(f"Error cleaning up saved locations: {str(e)}")
        return jsonify({'error': 'Failed to cleanup saved locations'}), 500


@retention_bp.route('/cleanup/audit-logs', methods=['POST'])
@login_required
@require_admin
@require_csrf
def cleanup_audit():
    """Cleanup only audit logs"""
    try:
        dry_run = request.json.get('dry_run', False) if request.json else False
        results = cleanup_old_audit_logs(dry_run=dry_run)
        return jsonify(results)
    except Exception as e:
        current_app.logger.error(f"Error cleaning up audit logs: {str(e)}")
        return jsonify({'error': 'Failed to cleanup audit logs'}), 500

"""
Backups routes blueprint
Handles database backup/restore operations and backup management
Admin-only operations for database integrity and disaster recovery
"""

from flask import Blueprint, request, jsonify, current_app, send_file
from flask_login import login_required, current_user
from app.security import require_admin, log_audit_event
from app.services.backup_service import (
    list_backups, create_backup, restore_backup, verify_backup, BACKUP_DIR
)
import os

backups_bp = Blueprint('backups', __name__, url_prefix='/api/backups')


def _validate_filename(filename):
    """
    Security validation for backup filenames to prevent path traversal

    Args:
        filename: Filename to validate

    Returns:
        True if valid, False otherwise
    """
    if not filename or '..' in filename or '/' in filename or '\\' in filename:
        return False
    return True


@backups_bp.route('', methods=['GET'])
@login_required
@require_admin
def list_all_backups():
    """List all available backups (admin only)"""
    try:
        backups = list_backups()
        return jsonify({'backups': backups})
    except Exception as e:
        current_app.logger.error(f"Error listing backups: {str(e)}")
        return jsonify({'error': str(e)}), 500


@backups_bp.route('/create', methods=['POST'])
@login_required
@require_admin
def create_new_backup():
    """Create a manual backup (admin only)"""
    try:
        data = request.get_json() or {}
        name = data.get('name', '')

        # Sanitize filename
        if name:
            name = ''.join(c for c in name if c.isalnum() or c in '._-')
            if not name.endswith('.sql'):
                name = f'{name}.sql'
            backup_name = f'manual_{name}'
        else:
            from datetime import datetime
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_name = f'manual_{timestamp}.sql'

        backup_info = create_backup(backup_name)

        log_audit_event(
            user_id=current_user.id,
            action='create',
            resource='backup',
            resource_id=backup_name,
            status='success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details=f'Created backup: {backup_name}'
        )

        return jsonify({
            'message': 'Backup created successfully',
            'backup': backup_info
        }), 201

    except Exception as e:
        current_app.logger.error(f"Error creating backup: {str(e)}")
        return jsonify({'error': str(e)}), 500


@backups_bp.route('/restore', methods=['POST'])
@login_required
@require_admin
def restore_from_backup():
    """Restore database from a backup (admin only)"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error': 'Request body required'}), 400

        filename = data.get('filename')

        if not filename:
            return jsonify({'error': 'Filename required'}), 400

        # Security validation
        if not _validate_filename(filename):
            return jsonify({'error': 'Invalid filename'}), 400

        restore_backup(filename)

        log_audit_event(
            user_id=current_user.id,
            action='restore',
            resource='backup',
            resource_id=filename,
            status='success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details=f'Restored from backup: {filename}'
        )

        return jsonify({'message': 'Database restored successfully'})

    except Exception as e:
        current_app.logger.error(f"Error restoring backup: {str(e)}")
        return jsonify({'error': str(e)}), 500


@backups_bp.route('/download/<filename>', methods=['GET'])
@login_required
@require_admin
def download_backup(filename):
    """Download a backup file (admin only)"""
    try:
        # Security validation
        if not _validate_filename(filename):
            return jsonify({'error': 'Invalid filename'}), 400

        backup_path = os.path.join(BACKUP_DIR, filename)

        if not os.path.exists(backup_path):
            return jsonify({'error': 'Backup not found'}), 404

        log_audit_event(
            user_id=current_user.id,
            action='download',
            resource='backup',
            resource_id=filename,
            status='success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details=f'Downloaded backup: {filename}'
        )

        return send_file(backup_path, as_attachment=True, download_name=filename)

    except Exception as e:
        current_app.logger.error(f"Error downloading backup: {str(e)}")
        return jsonify({'error': str(e)}), 500


@backups_bp.route('/delete/<filename>', methods=['DELETE'])
@login_required
@require_admin
def delete_backup(filename):
    """Delete a backup file (admin only)"""
    try:
        # Security validation
        if not _validate_filename(filename):
            return jsonify({'error': 'Invalid filename'}), 400

        backup_path = os.path.join(BACKUP_DIR, filename)

        if not os.path.exists(backup_path):
            return jsonify({'error': 'Backup not found'}), 404

        os.remove(backup_path)

        # Also delete checksum file if it exists
        checksum_file = f'{backup_path}.sha256'
        if os.path.exists(checksum_file):
            os.remove(checksum_file)

        log_audit_event(
            user_id=current_user.id,
            action='delete',
            resource='backup',
            resource_id=filename,
            status='success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details=f'Deleted backup: {filename}'
        )

        return jsonify({'message': 'Backup deleted successfully'})

    except Exception as e:
        current_app.logger.error(f"Error deleting backup: {str(e)}")
        return jsonify({'error': str(e)}), 500


@backups_bp.route('/verify/<filename>', methods=['POST'])
@login_required
@require_admin
def verify_backup_file(filename):
    """Verify a backup file (admin only)"""
    try:
        # Security validation
        if not _validate_filename(filename):
            return jsonify({'error': 'Invalid filename'}), 400

        result = verify_backup(filename)

        log_audit_event(
            user_id=current_user.id,
            action='verify',
            resource='backup',
            resource_id=filename,
            status='success' if result['valid'] else 'failed',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details=f"Verified backup: {filename} - Valid: {result['valid']}"
        )

        return jsonify(result)

    except Exception as e:
        current_app.logger.error(f"Error verifying backup: {str(e)}")
        return jsonify({'error': str(e)}), 500

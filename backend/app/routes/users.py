"""
Users routes blueprint
Handles user management operations (list, update, delete)
Admin-only operations for user account management
"""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from app.security import require_admin, PaginationParams, log_audit_event
from app.csrf_protection import require_csrf
from app.limiter import limiter
from app.services.user_service import (
    get_user_or_404, format_user, get_all_users, update_user, delete_user
)

users_bp = Blueprint('users', __name__, url_prefix='/api/users')


@users_bp.route('', methods=['GET'])
@login_required
@require_admin
def list_users():
    """List all users with pagination (admin only)"""
    try:
        # Parse pagination parameters
        pagination = PaginationParams.from_request(request)

        # Get users with pagination
        users, total_count = get_all_users(offset=pagination.offset, limit=pagination.limit)

        # Log audit event
        log_audit_event(
            user_id=current_user.id,
            action='list',
            resource='user',
            status='success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details=f'Listed users (limit={pagination.limit}, offset={pagination.offset})'
        )

        return jsonify({
            'data': [format_user(u) for u in users],
            'meta': pagination.response_meta(total_count)
        })
    except Exception as e:
        current_app.logger.error(f"Error listing users: {str(e)}")
        return jsonify({'error': 'Failed to list users'}), 500


@users_bp.route('/<int:user_id>', methods=['GET'])
@login_required
@require_admin
def get_user(user_id):
    """Get user details (admin only)"""
    user = get_user_or_404(user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify(format_user(user))


@users_bp.route('/<int:user_id>', methods=['PUT'])
@login_required
@require_admin
@require_csrf
@limiter.limit("60 per hour")  # Allow frequent user updates
def update_user_info(user_id):
    """Update user information (admin only)"""
    try:
        data = request.json

        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        # Attempt to update user
        try:
            user = update_user(
                user_id,
                username=data.get('username'),
                email=data.get('email'),
                password=data.get('password'),
                is_active=data.get('is_active'),
                role=data.get('role')
            )
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        if not user:
            return jsonify({'error': 'User not found'}), 404

        log_audit_event(
            user_id=current_user.id,
            action='update',
            resource='user',
            resource_id=user_id,
            status='success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details=f'Updated user: {user.username}'
        )

        return jsonify({'message': 'User updated successfully'})

    except Exception as e:
        current_app.logger.error(f"Error updating user: {str(e)}")
        return jsonify({'error': 'Failed to update user'}), 500


@users_bp.route('/<int:user_id>', methods=['DELETE'])
@login_required
@require_admin
@require_csrf
@limiter.limit("10 per hour")  # Strict limit to prevent accidental bulk deletion
def delete_user_by_id(user_id):
    """Delete a user (admin only)"""
    try:
        # Attempt to delete user
        try:
            username = delete_user(user_id, current_user_id=current_user.id)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400

        if not username:
            return jsonify({'error': 'User not found'}), 404

        log_audit_event(
            user_id=current_user.id,
            action='delete',
            resource='user',
            resource_id=user_id,
            status='success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details=f'Deleted user: {username}'
        )

        return jsonify({'message': 'User deleted successfully'})

    except Exception as e:
        current_app.logger.error(f"Error deleting user: {str(e)}")
        return jsonify({'error': 'Failed to delete user'}), 500

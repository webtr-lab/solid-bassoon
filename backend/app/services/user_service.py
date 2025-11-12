"""
User Service Module
Handles user management operations and account modifications
Business logic extracted from routes for reusability and testability
"""

from flask import current_app
from flask_bcrypt import Bcrypt
from app.models import db, User


def get_user_or_404(user_id):
    """
    Get a user by ID or return None

    Args:
        user_id: ID of the user

    Returns:
        User object or None if not found
    """
    return User.query.get(user_id)


def format_user(user):
    """Format user object for JSON response"""
    return {
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'is_active': user.is_active,
        'role': user.role,
        'created_at': user.created_at.isoformat()
    }


def get_all_users(offset=0, limit=10):
    """
    Get all users with pagination

    Args:
        offset: Number of records to skip
        limit: Maximum number of records to return

    Returns:
        Tuple of (users_list, total_count)
    """
    query = User.query
    total_count = query.count()
    users = query.offset(offset).limit(limit).all()
    return users, total_count


def username_exists(username, exclude_user_id=None):
    """
    Check if username already exists

    Args:
        username: Username to check
        exclude_user_id: User ID to exclude from check (for updates)

    Returns:
        True if username exists (excluding specified user), False otherwise
    """
    query = User.query.filter_by(username=username)
    if exclude_user_id:
        query = query.filter(User.id != exclude_user_id)
    return query.first() is not None


def email_exists(email, exclude_user_id=None):
    """
    Check if email already exists

    Args:
        email: Email to check
        exclude_user_id: User ID to exclude from check (for updates)

    Returns:
        True if email exists (excluding specified user), False otherwise
    """
    query = User.query.filter_by(email=email)
    if exclude_user_id:
        query = query.filter(User.id != exclude_user_id)
    return query.first() is not None


def update_user(user_id, username=None, email=None, password=None,
                is_active=None, role=None):
    """
    Update user information

    Args:
        user_id: ID of the user to update
        username: New username (optional)
        email: New email (optional)
        password: New password (optional, will be hashed)
        is_active: Active status (optional)
        role: User role (optional)

    Returns:
        Updated User object or None if not found

    Raises:
        ValueError: If username or email already exists
        Exception: For database errors
    """
    user = User.query.get(user_id)
    if not user:
        return None

    try:
        # Check username uniqueness
        if username is not None and username != user.username:
            if username_exists(username, exclude_user_id=user_id):
                raise ValueError('Username already exists')
            user.username = username

        # Check email uniqueness
        if email is not None and email != user.email:
            if email_exists(email, exclude_user_id=user_id):
                raise ValueError('Email already exists')
            user.email = email

        # Update password if provided
        if password is not None and password:
            bcrypt = Bcrypt(current_app)
            user.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')

        # Update other fields
        if is_active is not None:
            user.is_active = bool(is_active)

        if role is not None:
            user.role = role

        db.session.commit()
        current_app.logger.info(f"User updated: {user.username}")
        return user

    except ValueError as e:
        # Re-raise validation errors without logging as errors
        current_app.logger.warning(f"User update validation error: {str(e)}")
        raise
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating user: {str(e)}")
        raise


def delete_user(user_id, current_user_id=None):
    """
    Delete a user

    Args:
        user_id: ID of the user to delete
        current_user_id: ID of the user performing the deletion (for self-delete check)

    Returns:
        Username if successful, None if not found

    Raises:
        ValueError: If trying to delete own account
        Exception: For database errors
    """
    # Prevent self-deletion
    if current_user_id and user_id == current_user_id:
        raise ValueError('Cannot delete your own account')

    user = User.query.get(user_id)
    if not user:
        return None

    try:
        username = user.username
        db.session.delete(user)
        db.session.commit()
        current_app.logger.info(f"User deleted: {username}")
        return username
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting user: {str(e)}")
        raise

"""
Authentication routes blueprint
Handles user registration, login, logout, password changes, and auth checks
"""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, login_user, logout_user, current_user
from flask_bcrypt import Bcrypt
from app.models import db, User
from app.security import (
    ValidationError, validate_email, validate_password_strength,
    login_rate_limiter, log_audit_event
)
from app.limiter import limiter

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def get_bcrypt(app=None):
    """Get bcrypt instance from app"""
    if app is None:
        app = current_app
    return Bcrypt(app)


@auth_bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Maps Tracker API is running'})


@auth_bp.route('/register', methods=['POST'])
@limiter.limit("5 per hour")
def register():
    """Register a new user"""
    try:
        data = request.json

        # Validate required fields
        if not data.get('username') or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Username, email, and password are required'}), 400

        # Validate email format
        try:
            validate_email(data['email'])
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400

        # Validate password strength
        try:
            validate_password_strength(data['password'])
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400

        # Check username availability
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400

        # Check email availability
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400

        bcrypt = get_bcrypt()
        hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
        user = User(
            username=data['username'],
            email=data['email'],
            password_hash=hashed_password,
            role=data.get('role', 'viewer')
        )

        db.session.add(user)
        db.session.commit()

        current_app.logger.info(f"New user registered: {user.username} (role: {user.role})")
        return jsonify({'message': 'User registered successfully'}), 201

    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Registration error: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500


@auth_bp.route('/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    """Authenticate user and create session"""
    try:
        # Rate limiting: max 5 failed attempts per 15 minutes per IP
        client_ip = request.remote_addr

        if login_rate_limiter.is_rate_limited(client_ip):
            current_app.logger.warning(f"Login rate limit exceeded for IP: {client_ip}")
            remaining = login_rate_limiter.get_remaining_attempts(client_ip)
            return jsonify({
                'error': 'Too many login attempts. Please try again in 15 minutes.',
                'remaining_attempts': remaining
            }), 429  # Too Many Requests

        data = request.json
        user = User.query.filter_by(username=data['username']).first()

        bcrypt = get_bcrypt()
        if user and bcrypt.check_password_hash(user.password_hash, data['password']):
            # Reset rate limiter on successful login
            login_rate_limiter.attempts[client_ip] = []
            login_user(user, remember=True)
            current_app.logger.info(f"Successful login for user: {user.username}")
            return jsonify({
                'message': 'Login successful',
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'role': user.role,
                    'must_change_password': user.must_change_password
                }
            })

        # Record failed attempt
        login_rate_limiter.record_attempt(client_ip)
        remaining = login_rate_limiter.get_remaining_attempts(client_ip)
        current_app.logger.warning(f"Failed login attempt for IP: {client_ip} ({remaining} attempts remaining)")

        return jsonify({
            'error': 'Invalid username or password',
            'remaining_attempts': remaining
        }), 401

    except Exception as e:
        current_app.logger.error(f"Login error: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500


@auth_bp.route('/logout', methods=['POST'])
@login_required
def logout():
    """End user session"""
    logout_user()
    return jsonify({'message': 'Logged out successfully'})


@auth_bp.route('/check', methods=['GET'])
def check_auth():
    """Check authentication status and return current user info"""
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email,
                'role': current_user.role,
                'must_change_password': current_user.must_change_password
            }
        })
    return jsonify({'authenticated': False})


@auth_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    """Change user password"""
    try:
        data = request.json

        if not data.get('current_password') or not data.get('new_password'):
            return jsonify({'error': 'Current password and new password are required'}), 400

        # Verify current password
        bcrypt = get_bcrypt()
        if not bcrypt.check_password_hash(current_user.password_hash, data['current_password']):
            current_app.logger.warning(f"Failed password change attempt for user: {current_user.username}")
            log_audit_event(
                user_id=current_user.id,
                action='change_password',
                resource='user',
                status='failed',
                ip_address=request.remote_addr,
                user_agent=request.headers.get('User-Agent', ''),
                details='Invalid current password'
            )
            return jsonify({'error': 'Current password is incorrect'}), 401

        # Validate new password strength
        try:
            validate_password_strength(data['new_password'])
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400

        # Ensure new password is different from current password
        if bcrypt.check_password_hash(current_user.password_hash, data['new_password']):
            return jsonify({'error': 'New password must be different from current password'}), 400

        # Update password
        current_user.password_hash = bcrypt.generate_password_hash(data['new_password']).decode('utf-8')
        current_user.must_change_password = False
        db.session.commit()

        current_app.logger.info(f"Password changed successfully for user: {current_user.username}")

        log_audit_event(
            user_id=current_user.id,
            action='change_password',
            resource='user',
            status='success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details='Password changed'
        )

        return jsonify({'message': 'Password changed successfully'})

    except ValidationError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Password change error: {str(e)}")
        return jsonify({'error': 'Password change failed'}), 500

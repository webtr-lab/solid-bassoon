from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from flask_socketio import SocketIO
from app.config import Config
from app.models import db, Vehicle, Location, SavedLocation, User, PlaceOfInterest
from app.limiter import limiter
from app.logging_config import setup_logging
from app.sentry_config import init_sentry
from app.websocket_events import register_websocket_events
from app.security import (
    validate_gps_coordinates, ValidationError, require_admin, require_manager_or_admin,
    login_rate_limiter, validate_email, validate_password_strength, PaginationParams,
    log_audit_event, validate_url
)
from app.routes.health import health_bp
from app.routes.auth import auth_bp
from app.routes.locations import locations_bp
from app.routes.vehicles import vehicles_bp
from app.routes.places import places_bp
from app.routes.geocoding import geocoding_bp
from app.routes.reports import reports_bp
from app.routes.backups import backups_bp
from app.routes.users import users_bp
from app.services.backup_service import automatic_backup
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
import math
import os
import subprocess
import glob
import tempfile

app = Flask(__name__)
app.config.from_object(Config)

# Initialize error monitoring
init_sentry(app)

# Initialize logging system
access_logger = setup_logging(app)

# Get CORS origins from environment variable or use defaults
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')

CORS(app, 
     supports_credentials=True, 
     origins=cors_origins,
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

db.init_app(app)
migrate = Migrate(app, db)
bcrypt = Bcrypt(app)
limiter.init_app(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

# Initialize WebSocket support
socketio = SocketIO(
    app,
    cors_allowed_origins=cors_origins,
    async_mode='threading',
    ping_timeout=60,
    ping_interval=25,
    logger=False,
    engineio_logger=False
)
register_websocket_events(socketio)

# Register blueprints
app.register_blueprint(health_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(locations_bp)
app.register_blueprint(vehicles_bp)
app.register_blueprint(places_bp)
app.register_blueprint(geocoding_bp)
app.register_blueprint(reports_bp)
app.register_blueprint(backups_bp)
app.register_blueprint(users_bp)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# HTTP request logging middleware
@app.before_request
def log_request():
    """Log incoming HTTP requests"""
    access_logger.info(f"{request.method} {request.path} - IP: {request.remote_addr}")

@app.after_request
def add_security_headers(response):
    """Add security headers to all responses"""
    # Prevent clickjacking attacks
    response.headers['X-Frame-Options'] = 'DENY'

    # Prevent MIME type sniffing
    response.headers['X-Content-Type-Options'] = 'nosniff'

    # Enable XSS protection in older browsers
    response.headers['X-XSS-Protection'] = '1; mode=block'

    # Content Security Policy - restrict resources to same origin
    response.headers['Content-Security-Policy'] = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"

    # HTTP Strict Transport Security - force HTTPS for 1 year
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'

    # Don't expose server details
    response.headers['Server'] = 'MapsTracker'

    # Referrer policy
    response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'

    # Feature policy / Permissions policy
    response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'

    # Log response
    access_logger.info(f"{request.method} {request.path} - Status: {response.status_code}")
    return response

# Global error handlers
@app.errorhandler(400)
def bad_request(error):
    """Handle 400 Bad Request errors"""
    app.logger.warning(f"Bad request: {request.path} - {str(error)}")
    return jsonify({
        'error': 'Bad Request',
        'message': 'The request was invalid or malformed'
    }), 400

@app.errorhandler(401)
def unauthorized(error):
    """Handle 401 Unauthorized errors"""
    return jsonify({
        'error': 'Unauthorized',
        'message': 'Authentication required'
    }), 401

@app.errorhandler(403)
def forbidden(error):
    """Handle 403 Forbidden errors"""
    return jsonify({
        'error': 'Forbidden',
        'message': 'You do not have permission to access this resource'
    }), 403

@app.errorhandler(404)
def not_found(error):
    """Handle 404 Not Found errors"""
    app.logger.info(f"Resource not found: {request.path}")
    return jsonify({
        'error': 'Not Found',
        'message': f'The requested resource does not exist'
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 Method Not Allowed errors"""
    app.logger.warning(f"Method not allowed: {request.method} {request.path}")
    return jsonify({
        'error': 'Method Not Allowed',
        'message': f'The {request.method} method is not allowed on this resource'
    }), 405

@app.errorhandler(409)
def conflict(error):
    """Handle 409 Conflict errors"""
    return jsonify({
        'error': 'Conflict',
        'message': 'The request conflicts with the current state of the server'
    }), 409

@app.errorhandler(429)
def rate_limit_exceeded(error):
    """Handle 429 Too Many Requests errors"""
    app.logger.warning(f"Rate limit exceeded: {request.remote_addr} - {request.path}")
    return jsonify({
        'error': 'Too Many Requests',
        'message': 'You have exceeded the rate limit. Please try again later'
    }), 429

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 Internal Server errors"""
    app.logger.error(f"Internal server error: {str(error)}", exc_info=True)
    return jsonify({
        'error': 'Internal Server Error',
        'message': 'An unexpected error occurred on the server'
    }), 500

@app.errorhandler(503)
def service_unavailable(error):
    """Handle 503 Service Unavailable errors"""
    app.logger.error(f"Service unavailable: {str(error)}")
    return jsonify({
        'error': 'Service Unavailable',
        'message': 'The service is temporarily unavailable'
    }), 503

with app.app_context():
    db.create_all()
    
    if Vehicle.query.count() == 0:
        for i in range(1, 6):
            vehicle = Vehicle(name=f'Vehicle {i}', device_id=f'device_{i}')
            db.session.add(vehicle)
        db.session.commit()
        app.logger.info("Created 5 default vehicles")
    
    if User.query.count() == 0:
        # Create default admin user with randomly generated password
        from app.security import generate_secure_password

        # Generate random password on first run
        default_password = generate_secure_password()
        admin_password = bcrypt.generate_password_hash(default_password).decode('utf-8')
        admin_user = User(
            username='admin',
            email='admin@mapstracker.local',
            password_hash=admin_password,
            role='admin',
            must_change_password=True
        )
        db.session.add(admin_user)
        db.session.commit()

        # Log credentials to application logs
        app.logger.warning("=" * 80)
        app.logger.warning("INITIAL ADMIN CREDENTIALS GENERATED")
        app.logger.warning("=" * 80)
        app.logger.warning(f"Username: admin")
        app.logger.warning(f"Password: {default_password}")
        app.logger.warning("=" * 80)
        app.logger.warning("IMPORTANT: Change this password on first login")
        app.logger.warning("=" * 80)

        # Write credentials to secure temporary file as backup
        try:
            # Use secure temporary file with proper permissions
            with tempfile.NamedTemporaryFile(
                mode='w',
                prefix='INITIAL_ADMIN_',
                suffix='.txt',
                delete=False,
                dir=None  # Use system temp directory (secure)
            ) as f:
                credentials_file = f.name
                f.write(f"Initial Admin Credentials\n")
                f.write(f"========================\n")
                f.write(f"Username: admin\n")
                f.write(f"Password: {default_password}\n")
                f.write(f"Important: Change this password on first login\n")

            # Set restrictive permissions (read/write for owner only)
            os.chmod(credentials_file, 0o600)
            app.logger.warning(f"Credentials also saved to temporary file: {credentials_file}")
        except Exception as e:
            app.logger.error(f"Failed to write credentials file: {e}")

# Initialize scheduler for automatic backups
scheduler = BackgroundScheduler()
# Run automatic backup every day at 2 AM
scheduler.add_job(func=automatic_backup, trigger="cron", hour=2, minute=0)
scheduler.start()

if __name__ == '__main__':
    # Never use debug=True in production - exposes sensitive information
    debug_mode = app.config.get('FLASK_ENV') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0')

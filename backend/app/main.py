from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from app.config import Config
from app.models import db, Vehicle, User
from app.limiter import limiter
from app.logging_config import setup_logging
from app.sentry_config import init_sentry
from app.csrf_protection import init_csrf
from app.security import (
    validate_gps_coordinates, ValidationError, require_admin, require_manager_or_admin,
    validate_email, validate_password_strength, PaginationParams,
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
from app.routes.data_retention import retention_bp
from app.services.backup_service import automatic_backup
from app.services.email_service import init_email
from app.services.data_retention_service import run_full_cleanup
from app.monitoring import init_metrics, update_database_metrics, update_system_metrics
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
import os

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
     allow_headers=['Content-Type', 'Authorization', 'X-CSRF-Token'],
     expose_headers=['X-CSRF-Token'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

db.init_app(app)
migrate = Migrate(app, db)
bcrypt = Bcrypt(app)
limiter.init_app(app)
login_manager = LoginManager(app)
login_manager.login_view = 'auth.login'
init_email(app)
init_metrics(app)
init_csrf(app)


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
app.register_blueprint(retention_bp)

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
        # Create default admin user
        # Check for ADMIN_PASSWORD environment variable, otherwise use default
        default_password = os.getenv('ADMIN_PASSWORD', 'admin123')

        # Determine if password came from environment or default
        password_source = "environment variable" if os.getenv('ADMIN_PASSWORD') else "DEFAULT"

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
        app.logger.warning("INITIAL ADMIN CREDENTIALS CREATED")
        app.logger.warning("=" * 80)
        app.logger.warning(f"Username: admin")
        app.logger.warning(f"Password: {default_password}")
        app.logger.warning(f"Source: {password_source}")
        app.logger.warning("=" * 80)

        if password_source == "DEFAULT":
            app.logger.warning("⚠️  SECURITY WARNING: Using default password!")
            app.logger.warning("⚠️  Set ADMIN_PASSWORD environment variable for production")
            app.logger.warning("=" * 80)

        app.logger.warning("IMPORTANT: Change this password on first login")
        app.logger.warning("=" * 80)

        # Write credentials to a persistent file in the app directory
        try:
            credentials_file = os.path.join('/app', 'ADMIN_CREDENTIALS.txt')
            with open(credentials_file, 'w') as f:
                f.write("=" * 60 + "\n")
                f.write("MAPS TRACKER - INITIAL ADMIN CREDENTIALS\n")
                f.write("=" * 60 + "\n\n")
                f.write(f"Username: admin\n")
                f.write(f"Password: {default_password}\n")
                f.write(f"Source:   {password_source}\n\n")

                if password_source == "DEFAULT":
                    f.write("⚠️  SECURITY WARNING:\n")
                    f.write("This is the default password. For production use,\n")
                    f.write("set ADMIN_PASSWORD environment variable in .env file.\n\n")

                f.write("IMPORTANT: Change this password immediately after first login!\n")
                f.write("=" * 60 + "\n")

            # Set restrictive permissions (read/write for owner only)
            os.chmod(credentials_file, 0o600)
            app.logger.warning(f"📄 Credentials saved to: {credentials_file}")
            app.logger.warning(f"📄 Read with: docker exec maps_backend cat /app/ADMIN_CREDENTIALS.txt")
        except Exception as e:
            app.logger.error(f"Failed to write credentials file: {e}")

# Initialize scheduler for automatic backups and metrics updates
scheduler = BackgroundScheduler()

# Run automatic backup every day at 2 AM
scheduler.add_job(func=automatic_backup, trigger="cron", hour=2, minute=0)

# Run data retention cleanup every day at 3 AM (after backups)
def scheduled_data_cleanup():
    """Run data retention cleanup in app context"""
    with app.app_context():
        try:
            app.logger.info("Starting scheduled data retention cleanup")
            results = run_full_cleanup(dry_run=False)
            app.logger.info(
                f"Data retention cleanup completed: "
                f"{results.get('total_records_deleted', 0)} records deleted"
            )
        except Exception as e:
            app.logger.error(f"Scheduled data cleanup failed: {str(e)}")

scheduler.add_job(func=scheduled_data_cleanup, trigger="cron", hour=3, minute=0)

# Update metrics every 60 seconds
def update_metrics():
    with app.app_context():
        update_database_metrics()
        update_system_metrics()

scheduler.add_job(func=update_metrics, trigger="interval", seconds=60)
scheduler.start()

# Update metrics immediately on startup
with app.app_context():
    update_database_metrics()
    update_system_metrics()

if __name__ == '__main__':
    # Never use debug=True in production - exposes sensitive information
    debug_mode = app.config.get('FLASK_ENV') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0')

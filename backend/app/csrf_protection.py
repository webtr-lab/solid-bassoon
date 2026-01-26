"""
CSRF Protection for Flask API
Implements double-submit cookie pattern for CSRF protection
"""

from flask import request, jsonify, make_response
from flask_wtf.csrf import CSRFProtect, CSRFError
from functools import wraps
import logging

logger = logging.getLogger(__name__)

# Initialize CSRF protection
csrf = CSRFProtect()

def init_csrf(app):
    """
    Initialize CSRF protection for the Flask app

    Uses double-submit cookie pattern:
    1. Server generates CSRF token and sends it in response header
    2. Client stores token and includes it in subsequent requests
    3. Server validates token on state-changing requests
    """

    # Configure CSRF
    app.config['WTF_CSRF_ENABLED'] = True
    app.config['WTF_CSRF_CHECK_DEFAULT'] = False  # We'll manually protect routes
    app.config['WTF_CSRF_TIME_LIMIT'] = None  # Tokens don't expire (session-based)
    app.config['WTF_CSRF_SSL_STRICT'] = False  # Allow HTTP in development
    app.config['WTF_CSRF_METHODS'] = ['POST', 'PUT', 'PATCH', 'DELETE']

    # Initialize CSRF protection
    csrf.init_app(app)

    # Add CSRF token to all responses
    @app.after_request
    def add_csrf_token(response):
        """Add CSRF token to response headers"""
        if request.method == 'GET':
            try:
                from flask_wtf.csrf import generate_csrf
                token = generate_csrf()
                response.headers['X-CSRF-Token'] = token
            except Exception as e:
                logger.warning(f"Failed to generate CSRF token: {e}")
        return response

    # Handle CSRF errors
    @app.errorhandler(CSRFError)
    def handle_csrf_error(e):
        """Handle CSRF validation errors"""
        logger.warning(f"CSRF validation failed: {e.description}")
        from app.monitoring import record_csrf_failure
        record_csrf_failure(request.path)
        return jsonify({
            'error': 'CSRF validation failed. Please refresh the page and try again.',
            'code': 'csrf_error'
        }), 400

    logger.info("CSRF protection initialized")


def csrf_exempt(f):
    """
    Decorator to exempt a route from CSRF protection
    Use sparingly - only for public endpoints that don't modify data
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        return f(*args, **kwargs)

    # Mark function as CSRF exempt
    decorated_function._csrf_exempt = True
    return decorated_function


def require_csrf(f):
    """
    Decorator to require CSRF protection on a route
    Use on all state-changing endpoints (POST, PUT, DELETE)
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip CSRF check for GET, HEAD, OPTIONS
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return f(*args, **kwargs)

        # Validate CSRF token
        try:
            from flask_wtf.csrf import validate_csrf
            from app.monitoring import record_csrf_failure
            token = request.headers.get('X-CSRF-Token')
            if not token:
                logger.warning(f"CSRF token missing in request to {request.path}")
                record_csrf_failure(request.path)
                return jsonify({
                    'error': 'CSRF token missing. Please refresh the page.',
                    'code': 'csrf_missing'
                }), 400

            validate_csrf(token)
        except Exception as e:
            logger.warning(f"CSRF validation failed for {request.path}: {e}")
            from app.monitoring import record_csrf_failure
            record_csrf_failure(request.path)
            return jsonify({
                'error': 'CSRF validation failed. Please refresh the page and try again.',
                'code': 'csrf_invalid'
            }), 400

        return f(*args, **kwargs)

    return decorated_function

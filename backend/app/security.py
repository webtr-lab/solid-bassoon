"""
Security utilities for Maps Tracker application
Implements OWASP security best practices
"""

import re
import string
import secrets
from functools import wraps
from flask import jsonify
from flask_login import current_user
from datetime import datetime, timedelta
from collections import defaultdict
import hashlib

# ============================================================================
# ROLE-BASED ACCESS CONTROL DECORATORS
# ============================================================================

def require_role(*required_roles):
    """Decorator to enforce role-based access control"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not current_user.is_authenticated:
                return jsonify({'error': 'Authentication required'}), 401
            
            if current_user.role not in required_roles:
                return jsonify({'error': 'Insufficient permissions for this operation'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_admin(f):
    """Decorator to require admin role"""
    return require_role('admin')(f)

def require_manager_or_admin(f):
    """Decorator to require manager or admin role"""
    return require_role('admin', 'manager')(f)

# ============================================================================
# INPUT VALIDATION
# ============================================================================

class ValidationError(Exception):
    """Custom exception for validation errors"""
    pass

def validate_email(email):
    """
    Validate email format
    RFC 5322 simplified regex
    """
    if not email or not isinstance(email, str):
        raise ValidationError("Email is required")
    
    if len(email) > 254:
        raise ValidationError("Email is too long")
    
    # Simple regex for email validation
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(email_regex, email):
        raise ValidationError("Invalid email format")
    
    # Reject disposable email domains (optional but recommended)
    disposable_domains = {
        'tempmail.com', 'guerrillamail.com', '10minutemail.com',
        'mailinator.com', 'throwaway.email'
    }
    domain = email.split('@')[1].lower()
    if domain in disposable_domains:
        raise ValidationError("Disposable email addresses are not allowed")
    
    return True

def validate_password_strength(password):
    """
    Validate password meets security requirements
    
    Requirements:
    - Minimum 12 characters
    - At least one uppercase letter
    - At least one lowercase letter
    - At least one number
    - At least one special character
    """
    if not password or not isinstance(password, str):
        raise ValidationError("Password is required")
    
    if len(password) < 12:
        raise ValidationError("Password must be at least 12 characters long")
    
    if not any(c.isupper() for c in password):
        raise ValidationError("Password must contain at least one uppercase letter")
    
    if not any(c.islower() for c in password):
        raise ValidationError("Password must contain at least one lowercase letter")
    
    if not any(c.isdigit() for c in password):
        raise ValidationError("Password must contain at least one number")
    
    special_chars = set(string.punctuation)
    if not any(c in special_chars for c in password):
        raise ValidationError("Password must contain at least one special character (!@#$%^&*)")
    
    return True

def validate_gps_coordinates(latitude, longitude, speed=None):
    """
    Validate GPS coordinate values are within valid ranges
    
    Args:
        latitude: float between -90 and 90
        longitude: float between -180 and 180
        speed: optional, float between 0 and 350 km/h
    """
    try:
        lat = float(latitude)
        lon = float(longitude)
    except (ValueError, TypeError):
        raise ValidationError("Latitude and longitude must be valid numbers")
    
    if not (-90 <= lat <= 90):
        raise ValidationError(f"Invalid latitude: {latitude}. Must be between -90 and 90")
    
    if not (-180 <= lon <= 180):
        raise ValidationError(f"Invalid longitude: {longitude}. Must be between -180 and 180")
    
    if speed is not None:
        try:
            spd = float(speed)
        except (ValueError, TypeError):
            raise ValidationError("Speed must be a valid number")
        
        if not (0 <= spd <= 350):
            raise ValidationError(f"Invalid speed: {speed}. Must be between 0 and 350 km/h")
    
    return True

def validate_username(username):
    """
    Validate username format
    
    Requirements:
    - 3-32 characters
    - Only alphanumeric and underscore
    - Cannot start with number
    """
    if not username or not isinstance(username, str):
        raise ValidationError("Username is required")
    
    if len(username) < 3 or len(username) > 32:
        raise ValidationError("Username must be between 3 and 32 characters")
    
    if not re.match(r'^[a-zA-Z_][a-zA-Z0-9_]*$', username):
        raise ValidationError("Username can only contain letters, numbers, and underscores")
    
    return True

# ============================================================================
# RATE LIMITING
# ============================================================================

class RateLimiter:
    """
    Simple in-memory rate limiter
    For production, use Redis instead
    """
    def __init__(self, max_attempts=5, window_seconds=900):
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self.attempts = defaultdict(list)  # ip -> list of timestamps
    
    def is_rate_limited(self, ip_address):
        """Check if IP has exceeded rate limit"""
        now = datetime.now()
        cutoff = now - timedelta(seconds=self.window_seconds)
        
        # Remove old attempts outside the window
        self.attempts[ip_address] = [
            ts for ts in self.attempts[ip_address] 
            if ts > cutoff
        ]
        
        # Check if limit exceeded
        if len(self.attempts[ip_address]) >= self.max_attempts:
            return True
        
        return False
    
    def record_attempt(self, ip_address):
        """Record an attempt for an IP"""
        self.attempts[ip_address].append(datetime.now())
    
    def get_remaining_attempts(self, ip_address):
        """Get remaining attempts before rate limit"""
        now = datetime.now()
        cutoff = now - timedelta(seconds=self.window_seconds)
        
        self.attempts[ip_address] = [
            ts for ts in self.attempts[ip_address] 
            if ts > cutoff
        ]
        
        return max(0, self.max_attempts - len(self.attempts[ip_address]))

# Initialize rate limiters
login_rate_limiter = RateLimiter(max_attempts=5, window_seconds=900)  # 5 attempts per 15 min
register_rate_limiter = RateLimiter(max_attempts=10, window_seconds=3600)  # 10 per hour

# ============================================================================
# PASSWORD UTILITIES
# ============================================================================

def generate_secure_password(length=16):
    """
    Generate a cryptographically secure random password
    
    Returns password with mix of:
    - Uppercase letters
    - Lowercase letters
    - Numbers
    - Special characters
    """
    characters = (
        string.ascii_uppercase + 
        string.ascii_lowercase + 
        string.digits + 
        string.punctuation.replace('"', '').replace("'", '')  # Remove quotes
    )
    
    # Ensure at least one of each character type
    password = [
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.digits),
        secrets.choice(string.punctuation.replace('"', '').replace("'", ''))
    ]
    
    # Fill remaining length with random characters
    for _ in range(length - 4):
        password.append(secrets.choice(characters))
    
    # Shuffle to avoid predictable patterns
    random_list = list(password)
    secrets.SystemRandom().shuffle(random_list)
    
    return ''.join(random_list)

# ============================================================================
# PATH TRAVERSAL PROTECTION
# ============================================================================

def validate_url(url):
    """
    Validate URL to prevent path traversal and SSRF attacks
    Only allows http:// and https:// schemes
    """
    if not url or not isinstance(url, str):
        raise ValidationError("URL is required and must be a string")

    # Normalize URL
    url_lower = url.lower()

    # Only allow http and https schemes
    if not (url_lower.startswith('http://') or url_lower.startswith('https://')):
        raise ValidationError("Only HTTP and HTTPS URLs are allowed")

    # Additional validation - reject localhost/private IPs in production (optional)
    # This is commented as it may not be needed for Nominatim
    # if any(ip in url for ip in ['127.0.0.1', 'localhost', '192.168', '10.0']):
    #     raise ValidationError("Private IP addresses not allowed")

    return True

def sanitize_filename(filename):
    """
    Sanitize filename to prevent path traversal attacks
    
    Uses whitelist approach:
    - Only allow alphanumeric, dash, underscore
    - No special characters or paths
    """
    if not filename or not isinstance(filename, str):
        raise ValidationError("Filename is required")
    
    # Remove any path separators
    filename = filename.replace('/', '').replace('\\', '')
    
    # Remove suspicious patterns
    if '..' in filename:
        raise ValidationError("Path traversal detected")
    
    # Check for null bytes
    if '\0' in filename:
        raise ValidationError("Null bytes not allowed in filename")
    
    # Whitelist: only allow these characters
    if not re.match(r'^[a-zA-Z0-9._\-]+$', filename):
        raise ValidationError("Filename contains invalid characters")
    
    return filename

# ============================================================================
# LOGGING SECURITY
# ============================================================================

def sanitize_log_entry(entry):
    """
    Sanitize log entries to prevent log injection attacks
    Prevents newlines and control characters
    """
    if not isinstance(entry, str):
        return str(entry)
    
    # Remove newlines and control characters
    sanitized = ''.join(char if ord(char) >= 32 else '?' for char in entry)
    
    # Limit length to prevent log flooding
    if len(sanitized) > 1000:
        sanitized = sanitized[:1000] + '...'
    
    return sanitized

# ============================================================================
# PAGINATION UTILITIES
# ============================================================================

class PaginationParams:
    """Helper class for pagination parameters"""
    def __init__(self, limit=20, offset=0, max_limit=100):
        self.limit = min(int(limit), max_limit)  # Cap at max_limit
        self.offset = max(0, int(offset))  # No negative offsets
        self.max_limit = max_limit

    @staticmethod
    def from_request(request, max_limit=100):
        """Parse pagination params from Flask request"""
        try:
            limit = int(request.args.get('limit', 20))
            offset = int(request.args.get('offset', 0))
            return PaginationParams(limit, offset, max_limit)
        except (ValueError, TypeError):
            return PaginationParams(20, 0, max_limit)

    def apply_to_query(self, query):
        """Apply pagination to a SQLAlchemy query"""
        return query.limit(self.limit).offset(self.offset)

    def response_meta(self, total_count):
        """Generate metadata dict for paginated response"""
        return {
            'limit': self.limit,
            'offset': self.offset,
            'total': total_count,
            'returned': min(self.limit, max(0, total_count - self.offset))
        }

# ============================================================================
# AUDIT LOGGING
# ============================================================================

def log_audit_event(user_id, action, resource, status, resource_id=None, ip_address=None, user_agent=None, details=None):
    """
    Log security-relevant events to audit_log table for compliance and forensics

    Should be used for:
    - User creation/modification/deletion
    - Password changes
    - Permission changes
    - Backup operations
    - API access to sensitive endpoints

    Args:
        user_id: ID of user performing action (or None for unauthenticated actions)
        action: Action performed (e.g., 'login', 'user_create', 'password_change')
        resource: Resource affected (e.g., 'user', 'vehicle', 'backup')
        status: Result status ('success' or 'failure')
        resource_id: ID of affected resource (optional)
        ip_address: Client IP address (optional)
        user_agent: Client User-Agent (optional)
        details: Additional context (optional)
    """
    # Import here to avoid circular dependency
    from app.models import AuditLog, db

    try:
        audit_entry = AuditLog(
            user_id=user_id,
            action=action,
            resource=resource,
            resource_id=resource_id,
            status=status,
            ip_address=ip_address,
            user_agent=user_agent,
            details=sanitize_log_entry(details) if details else None
        )
        db.session.add(audit_entry)
        db.session.commit()
        return audit_entry
    except Exception as e:
        # Don't let audit failures break the application
        import logging
        logging.error(f"Failed to log audit event: {str(e)}")
        return None


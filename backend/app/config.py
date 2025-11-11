import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Security
    SECRET_KEY = os.getenv('SECRET_KEY', 'dev-secret-key')
    
    # Session Configuration
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')

    # Session security settings - configurable via environment
    # SESSION_COOKIE_SECURE should be True in production (HTTPS only)
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'false').lower() in ('true', '1', 'yes')

    # HttpOnly prevents JavaScript from accessing the session cookie (XSS protection)
    SESSION_COOKIE_HTTPONLY = True

    # SameSite prevents CSRF attacks - 'Strict' is more secure but may break some workflows
    # Use 'Strict' in production, 'Lax' for development with cross-origin requests
    _is_production = FLASK_ENV == 'production'
    SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', 'Lax' if not _is_production else 'Strict')

    # Session timeout - 1 hour for security (default 86400 = 24 hours was too long)
    PERMANENT_SESSION_LIFETIME = int(os.getenv('PERMANENT_SESSION_LIFETIME', '3600'))  # 3600 = 1 hour
    
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000')

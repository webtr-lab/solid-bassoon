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
    # Only require secure cookies if explicitly set, not based on FLASK_ENV
    # This allows local network HTTP access (e.g., 192.168.x.x) to work
    SESSION_COOKIE_SECURE = False  # Set to True only when using HTTPS
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'  # Lax allows cross-origin GET requests with credentials
    PERMANENT_SESSION_LIFETIME = 86400  # 24 hours
    
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000')

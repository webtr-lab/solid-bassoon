"""
Flask-Limiter configuration and initialization
"""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Initialize limiter - will be bound to app in main.py
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

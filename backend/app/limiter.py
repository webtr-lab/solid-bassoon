"""
Flask-Limiter configuration and initialization
"""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

# Initialize limiter - will be bound to app in main.py
# Increased limits to accommodate frontend polling:
# - Vehicles: every 5 seconds = 720/hour
# - Places: every 10 seconds = 360/hour
# - Total with other requests: ~3000/hour is reasonable
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["50000 per day", "3000 per hour"],
    storage_uri="memory://"
)

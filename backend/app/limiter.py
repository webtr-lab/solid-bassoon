"""
Flask-Limiter configuration and initialization
"""

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask import request


def _on_rate_limit_exceeded(limit):
    """Callback when rate limit is exceeded - record for monitoring"""
    try:
        from app.monitoring import record_rate_limit_hit
        endpoint = request.endpoint or request.path
        limit_str = str(limit.limit)
        record_rate_limit_hit(endpoint, limit_str)
    except Exception:
        # Don't fail the request if monitoring fails
        pass


# Initialize limiter - will be bound to app in main.py
# Increased limits to accommodate frontend polling:
# - Vehicles: every 5 seconds = 720/hour
# - Places: every 10 seconds = 360/hour
# - Total with other requests: ~3000/hour is reasonable
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["50000 per day", "3000 per hour"],
    storage_uri="memory://",
    on_breach=_on_rate_limit_exceeded
)

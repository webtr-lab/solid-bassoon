"""
Redis Caching Layer for Maps Tracker
Implements caching for frequently accessed data to reduce database load
"""

import os
import json
import functools
from datetime import timedelta
from flask import current_app

try:
    import redis
    from redis.exceptions import RedisError
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

class Cache:
    """
    Caching layer with Redis backend and graceful fallback
    """
    def __init__(self):
        self.redis_client = None
        self.enabled = False

    def init_app(self, app):
        """Initialize cache with Flask app"""
        if not REDIS_AVAILABLE:
            app.logger.warning("Redis not available - caching disabled")
            return

        redis_url = os.getenv('REDIS_URL', 'redis://redis:6379/0')

        try:
            self.redis_client = redis.from_url(
                redis_url,
                decode_responses=True,
                socket_connect_timeout=2,
                socket_timeout=2,
                retry_on_timeout=True
            )
            # Test connection
            self.redis_client.ping()
            self.enabled = True
            app.logger.info(f"Redis cache initialized: {redis_url}")
        except (RedisError, Exception) as e:
            app.logger.warning(f"Redis connection failed: {e} - caching disabled")
            self.enabled = False

    def get(self, key):
        """Get value from cache"""
        if not self.enabled:
            return None

        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value)
            return None
        except (RedisError, json.JSONDecodeError) as e:
            current_app.logger.error(f"Cache get error for key {key}: {e}")
            return None

    def set(self, key, value, timeout=300):
        """
        Set value in cache with expiration

        Args:
            key: Cache key
            value: Value to cache (must be JSON serializable)
            timeout: Expiration time in seconds (default: 5 minutes)
        """
        if not self.enabled:
            return False

        try:
            serialized = json.dumps(value)
            self.redis_client.setex(key, timeout, serialized)
            return True
        except (RedisError, TypeError, json.JSONEncodeError) as e:
            current_app.logger.error(f"Cache set error for key {key}: {e}")
            return False

    def delete(self, key):
        """Delete key from cache"""
        if not self.enabled:
            return False

        try:
            self.redis_client.delete(key)
            return True
        except RedisError as e:
            current_app.logger.error(f"Cache delete error for key {key}: {e}")
            return False

    def delete_pattern(self, pattern):
        """
        Delete all keys matching pattern
        Example: delete_pattern('vehicle:*')
        """
        if not self.enabled:
            return False

        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                self.redis_client.delete(*keys)
            return True
        except RedisError as e:
            current_app.logger.error(f"Cache delete pattern error for {pattern}: {e}")
            return False

    def clear(self):
        """Clear all cache entries"""
        if not self.enabled:
            return False

        try:
            self.redis_client.flushdb()
            return True
        except RedisError as e:
            current_app.logger.error(f"Cache clear error: {e}")
            return False

    def get_stats(self):
        """Get cache statistics"""
        if not self.enabled:
            return {'enabled': False}

        try:
            info = self.redis_client.info('stats')
            memory = self.redis_client.info('memory')

            return {
                'enabled': True,
                'total_keys': self.redis_client.dbsize(),
                'hits': info.get('keyspace_hits', 0),
                'misses': info.get('keyspace_misses', 0),
                'hit_rate': self._calculate_hit_rate(
                    info.get('keyspace_hits', 0),
                    info.get('keyspace_misses', 0)
                ),
                'memory_used_mb': round(memory.get('used_memory', 0) / 1024 / 1024, 2),
                'memory_peak_mb': round(memory.get('used_memory_peak', 0) / 1024 / 1024, 2)
            }
        except RedisError as e:
            current_app.logger.error(f"Cache stats error: {e}")
            return {'enabled': True, 'error': str(e)}

    @staticmethod
    def _calculate_hit_rate(hits, misses):
        """Calculate cache hit rate percentage"""
        total = hits + misses
        if total == 0:
            return 0.0
        return round((hits / total) * 100, 2)


# Global cache instance
cache = Cache()


def cached(timeout=300, key_prefix='view'):
    """
    Decorator to cache function results

    Args:
        timeout: Cache expiration in seconds (default: 5 minutes)
        key_prefix: Prefix for cache key

    Example:
        @cached(timeout=60, key_prefix='vehicles')
        def get_all_vehicles():
            return Vehicle.query.all()
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated_function(*args, **kwargs):
            # Build cache key from function name and arguments
            cache_key = f"{key_prefix}:{f.__name__}"
            if args:
                cache_key += f":{':'.join(str(arg) for arg in args)}"
            if kwargs:
                cache_key += f":{':'.join(f'{k}={v}' for k, v in sorted(kwargs.items()))}"

            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                current_app.logger.debug(f"Cache hit: {cache_key}")
                return cached_value

            # Cache miss - execute function
            current_app.logger.debug(f"Cache miss: {cache_key}")
            result = f(*args, **kwargs)

            # Store in cache
            cache.set(cache_key, result, timeout)

            return result

        return decorated_function
    return decorator


def invalidate_cache(key_prefix):
    """
    Invalidate all cache entries matching prefix

    Example:
        invalidate_cache('vehicles')  # Clear all vehicle cache
    """
    pattern = f"{key_prefix}:*"
    return cache.delete_pattern(pattern)

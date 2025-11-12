"""
Geocoding Service Module
Handles address lookup via Nominatim service with rate limiting and caching
"""

import time
import json
import urllib.parse
import urllib.request
import traceback
from flask import current_app
from app.security import ValidationError, validate_url

# Rate limiting for Nominatim (max 1 request per second)
_last_nominatim_request = 0
_nominatim_cache = {}


def rate_limit_nominatim():
    """Ensure we don't exceed 1 request per second to Nominatim"""
    global _last_nominatim_request
    current_time = time.time()
    time_since_last = current_time - _last_nominatim_request
    if time_since_last < 1.0:
        time.sleep(1.0 - time_since_last)
    _last_nominatim_request = time.time()


def clear_geocoding_cache():
    """Clear the address cache"""
    global _nominatim_cache
    _nominatim_cache = {}
    current_app.logger.info("Geocoding cache cleared")


def geocode_address(address, nominatim_url=None):
    """
    Geocode address using local or public Nominatim instance

    Args:
        address: Address string to geocode
        nominatim_url: Nominatim service URL (uses env var or default if None)

    Returns:
        List of result dictionaries with name, latitude, longitude, type, importance

    Raises:
        ValidationError: For invalid address or configuration
        Exception: For network or API errors
    """
    if not address or not address.strip():
        raise ValidationError("Address parameter is required")

    address = address.strip()

    # Check cache first
    if address in _nominatim_cache:
        current_app.logger.debug(f"[GEOCODE] Cache hit for: {address}")
        return _nominatim_cache[address]

    # Get Nominatim URL from parameter or environment
    if nominatim_url is None:
        import os
        nominatim_url = os.getenv('NOMINATIM_URL', 'http://nominatim:8080')

    try:
        # Validate Nominatim URL to prevent SSRF attacks
        validate_url(nominatim_url)
    except ValidationError as e:
        current_app.logger.error(f"[GEOCODE ERROR] Invalid Nominatim URL: {str(e)}")
        raise ValidationError("Invalid Nominatim configuration")

    # Only apply rate limiting for public Nominatim
    if 'nominatim.openstreetmap.org' in nominatim_url:
        rate_limit_nominatim()

    try:
        # Add Suriname to the search query for better results
        full_query = f"{address}, Suriname"
        encoded_query = urllib.parse.quote(full_query)

        # Suriname bounding box: roughly -58.1 to -53.9 longitude, 2.0 to 6.0 latitude
        # Paramaribo center: approximately 5.8520, -55.2038
        # viewbox format: left,top,right,bottom (lon_min,lat_max,lon_max,lat_min)
        viewbox = '-58.1,6.0,-53.9,2.0'

        # Build URL for local or public Nominatim
        url = (f'{nominatim_url}/search?'
               f'q={encoded_query}&'
               f'format=json&'
               f'limit=10&'
               f'viewbox={viewbox}&'
               f'bounded=0')  # Don't restrict to viewbox, just bias results

        current_app.logger.info(f"[GEOCODE] Requesting: {url}")

        req = urllib.request.Request(url)
        # Nominatim requires a valid User-Agent
        req.add_header('User-Agent', 'Maps-Tracker-Suriname/1.0 (Vehicle Tracking System)')
        req.add_header('Accept-Language', 'en')

        with urllib.request.urlopen(req, timeout=10) as response:
            response_text = response.read().decode()
            current_app.logger.info(f"[GEOCODE] Response status: {response.status}")
            data = json.loads(response_text)

        current_app.logger.info(f"[GEOCODE] Found {len(data)} results from {nominatim_url}")

        results = [{
            'name': item.get('display_name', ''),
            'latitude': float(item.get('lat', 0)),
            'longitude': float(item.get('lon', 0)),
            'type': item.get('type', ''),
            'importance': item.get('importance', 0)
        } for item in data]

        # Cache successful result
        _nominatim_cache[address] = results

        return results

    except urllib.error.HTTPError as e:
        error_msg = f"HTTP Error {e.code}: {e.reason}"
        current_app.logger.error(f"[GEOCODE ERROR] {error_msg}")
        if 'nominatim.openstreetmap.org' in nominatim_url:
            current_app.logger.error(
                "[GEOCODE ERROR] This usually means Nominatim is blocking requests. "
                "Consider using a local Nominatim instance."
            )
        raise Exception(error_msg)
    except urllib.error.URLError as e:
        error_msg = f"URL Error: {e.reason}"
        current_app.logger.error(f"[GEOCODE ERROR] {error_msg}")
        current_app.logger.error(
            "[GEOCODE ERROR] Is the Nominatim service running? "
            "Check: docker compose logs nominatim"
        )
        raise Exception(error_msg)
    except Exception as e:
        error_msg = str(e)
        current_app.logger.error(f"[GEOCODE ERROR] {error_msg}")
        current_app.logger.error(f"[GEOCODE ERROR] Traceback: {traceback.format_exc()}")
        raise Exception(error_msg)


def reverse_geocode(latitude, longitude, nominatim_url=None):
    """
    Reverse geocode coordinates to address using Nominatim

    Args:
        latitude: Location latitude
        longitude: Location longitude
        nominatim_url: Nominatim service URL (uses env var or default if None)

    Returns:
        Dictionary with address information

    Raises:
        Exception: For network or API errors
    """
    # Get Nominatim URL from parameter or environment
    if nominatim_url is None:
        import os
        nominatim_url = os.getenv('NOMINATIM_URL', 'http://nominatim:8080')

    try:
        # Validate Nominatim URL to prevent SSRF attacks
        validate_url(nominatim_url)
    except ValidationError as e:
        current_app.logger.error(f"[REVERSE GEOCODE ERROR] Invalid Nominatim URL: {str(e)}")
        raise ValidationError("Invalid Nominatim configuration")

    # Only apply rate limiting for public Nominatim
    if 'nominatim.openstreetmap.org' in nominatim_url:
        rate_limit_nominatim()

    try:
        url = (f'{nominatim_url}/reverse?'
               f'lat={latitude}&'
               f'lon={longitude}&'
               f'format=json')

        current_app.logger.info(f"[REVERSE GEOCODE] Requesting: {url}")

        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Maps-Tracker-Suriname/1.0 (Vehicle Tracking System)')
        req.add_header('Accept-Language', 'en')

        with urllib.request.urlopen(req, timeout=10) as response:
            response_text = response.read().decode()
            current_app.logger.info(f"[REVERSE GEOCODE] Response status: {response.status}")
            data = json.loads(response_text)

        return {
            'address': data.get('address', {}),
            'display_name': data.get('display_name', ''),
            'latitude': float(data.get('lat', latitude)),
            'longitude': float(data.get('lon', longitude)),
            'type': data.get('type', '')
        }

    except urllib.error.HTTPError as e:
        error_msg = f"HTTP Error {e.code}: {e.reason}"
        current_app.logger.error(f"[REVERSE GEOCODE ERROR] {error_msg}")
        raise Exception(error_msg)
    except urllib.error.URLError as e:
        error_msg = f"URL Error: {e.reason}"
        current_app.logger.error(f"[REVERSE GEOCODE ERROR] {error_msg}")
        raise Exception(error_msg)
    except Exception as e:
        error_msg = str(e)
        current_app.logger.error(f"[REVERSE GEOCODE ERROR] {error_msg}")
        raise Exception(error_msg)

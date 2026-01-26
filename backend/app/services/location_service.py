"""
Location Service Module
Handles GPS data processing, stop detection, and distance calculations
Business logic extracted from routes for reusability and testability
"""

import math
from datetime import datetime, timedelta
from flask import current_app
from app.models import db, Location, SavedLocation


def calculate_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two geographic points using Haversine formula
    Returns distance in kilometers
    """
    try:
        R = 6371  # Earth radius in kilometers
        lat1_rad = math.radians(lat1)
        lat2_rad = math.radians(lat2)
        delta_lat = math.radians(lat2 - lat1)
        delta_lon = math.radians(lon2 - lon1)

        a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c
    except Exception as e:
        current_app.logger.error(f"Error calculating distance: {str(e)}")
        raise


def save_location(vehicle_id, latitude, longitude, speed=0.0):
    """
    Save a GPS location for a vehicle

    Args:
        vehicle_id: ID of the vehicle
        latitude: Latitude coordinate
        longitude: Longitude coordinate
        speed: Speed in km/h (optional)

    Returns:
        Location object that was saved
    """
    try:
        location = Location(
            vehicle_id=vehicle_id,
            latitude=float(latitude),
            longitude=float(longitude),
            speed=float(speed),
            timestamp=datetime.utcnow()
        )
        db.session.add(location)

        return location
    except Exception as e:
        current_app.logger.error(f"Error saving location for vehicle_id={vehicle_id}: {str(e)}")
        raise

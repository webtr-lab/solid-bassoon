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


def detect_and_save_stops(vehicle_id, current_location):
    """
    Detect vehicle stops using a 5+ minute stationary period
    Uses database transaction to prevent race condition (duplicate stops)

    Args:
        vehicle_id: ID of the vehicle
        current_location: Location object with latest GPS data
    """
    try:
        time_window = datetime.utcnow() - timedelta(minutes=10)
        recent_locations = Location.query.filter(
            Location.vehicle_id == vehicle_id,
            Location.timestamp >= time_window
        ).order_by(Location.timestamp.desc()).all()

        if len(recent_locations) < 5:
            return

        first_loc = recent_locations[-1]
        distance = calculate_distance(
            first_loc.latitude, first_loc.longitude,
            current_location.latitude, current_location.longitude
        )

        # Check if vehicle has been stationary (within 50m) for 5+ minutes
        if distance < 0.05 and len(recent_locations) >= 5:
            time_diff = (current_location.timestamp - first_loc.timestamp).total_seconds() / 60

            if time_diff >= 5:
                # Use transaction to prevent race condition
                # Check if stop already exists for this vehicle/time
                existing_stop = SavedLocation.query.with_for_update().filter(
                    SavedLocation.vehicle_id == vehicle_id,
                    SavedLocation.timestamp >= time_window
                ).first()

                if not existing_stop:
                    saved_loc = SavedLocation(
                        vehicle_id=vehicle_id,
                        name='Auto-detected Stop',
                        latitude=current_location.latitude,
                        longitude=current_location.longitude,
                        stop_duration_minutes=int(time_diff),
                        visit_type='auto_detected',
                        timestamp=first_loc.timestamp
                    )
                    db.session.add(saved_loc)
                    current_app.logger.info(
                        f"Auto-detected stop for vehicle_id={vehicle_id}, "
                        f"duration={int(time_diff)}min, "
                        f"location=({current_location.latitude:.6f}, {current_location.longitude:.6f})"
                    )
    except Exception as e:
        current_app.logger.error(f"Error detecting stops for vehicle_id={vehicle_id}: {str(e)}")
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
        # NOTE: Automatic stop detection has been disabled per user request
        # Users can manually save stops via the SavedLocation interface

        return location
    except Exception as e:
        current_app.logger.error(f"Error saving location for vehicle_id={vehicle_id}: {str(e)}")
        raise

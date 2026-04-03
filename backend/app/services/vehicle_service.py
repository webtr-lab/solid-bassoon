"""
Vehicle Service Module
Handles vehicle operations, statistics, history, and data export
Business logic extracted from routes for reusability and testability
"""

import io
import csv
from datetime import datetime, timedelta
from flask import current_app
from app.models import db, Vehicle, Location, SavedLocation
from app.services.location_service import calculate_distance


def get_vehicle_or_404(vehicle_id):
    """
    Get a vehicle by ID or raise 404

    Args:
        vehicle_id: ID of the vehicle

    Returns:
        Vehicle object

    Raises:
        Returns None if not found (caller should handle 404)
    """
    return Vehicle.query.get(vehicle_id)


def format_vehicle(vehicle):
    """Format vehicle object for JSON response"""
    return {
        'id': vehicle.id,
        'name': vehicle.name,
        'device_id': vehicle.device_id,
        'api_token': vehicle.api_token,  # Include API token for admin management
        'is_active': vehicle.is_active,
        'entity_type': vehicle.entity_type
    }


def get_vehicle_current_location(vehicle_id):
    """
    Get the latest location for a vehicle

    Args:
        vehicle_id: ID of the vehicle

    Returns:
        dict with location data or None if no location found
    """
    location = Location.query.filter_by(vehicle_id=vehicle_id).order_by(
        Location.timestamp.desc()
    ).first()

    if not location:
        return None

    return {
        'latitude': location.latitude,
        'longitude': location.longitude,
        'speed': location.speed,
        'timestamp': location.timestamp.isoformat()
    }


def get_vehicle_history(vehicle_id, hours=24):
    """
    Get location history for a vehicle within specified time window

    Args:
        vehicle_id: ID of the vehicle
        hours: Number of hours to retrieve history for (default: 24)

    Returns:
        List of location dictionaries
    """
    time_window = datetime.utcnow() - timedelta(hours=hours)

    locations = Location.query.filter(
        Location.vehicle_id == vehicle_id,
        Location.timestamp >= time_window
    ).order_by(Location.timestamp.asc()).all()

    return [{
        'latitude': loc.latitude,
        'longitude': loc.longitude,
        'speed': loc.speed,
        'timestamp': loc.timestamp.isoformat()
    } for loc in locations]


def get_vehicle_stats(vehicle_id, hours=24):
    """
    Calculate statistics for a vehicle's movement

    Args:
        vehicle_id: ID of the vehicle
        hours: Number of hours to calculate stats for (default: 24)

    Returns:
        dict with statistics (total_points, avg_speed, max_speed, distance_km)
    """
    time_window = datetime.utcnow() - timedelta(hours=hours)

    locations = Location.query.filter(
        Location.vehicle_id == vehicle_id,
        Location.timestamp >= time_window
    ).all()

    if not locations:
        return {
            'total_points': 0,
            'avg_speed': 0,
            'max_speed': 0,
            'distance_km': 0,
            'time_period_hours': hours
        }

    speeds = [loc.speed for loc in locations]
    avg_speed = sum(speeds) / len(speeds) if speeds else 0
    max_speed = max(speeds) if speeds else 0

    # Calculate total distance traveled
    total_distance = 0
    for i in range(1, len(locations)):
        prev = locations[i-1]
        curr = locations[i]
        total_distance += calculate_distance(
            prev.latitude, prev.longitude,
            curr.latitude, curr.longitude
        )

    return {
        'total_points': len(locations),
        'avg_speed': round(avg_speed, 2),
        'max_speed': round(max_speed, 2),
        'distance_km': round(total_distance, 2),
        'time_period_hours': hours
    }


def export_vehicle_data(vehicle_id, format_type='json', hours=24):
    """
    Export vehicle location data in specified format

    Args:
        vehicle_id: ID of the vehicle
        format_type: 'json' or 'csv' (default: 'json')
        hours: Number of hours of data to export (default: 24)

    Returns:
        Tuple of (data, status_code, headers) for CSV
        or JSON data for 'json' format
    """
    time_window = datetime.utcnow() - timedelta(hours=hours)

    locations = Location.query.filter(
        Location.vehicle_id == vehicle_id,
        Location.timestamp >= time_window
    ).order_by(Location.timestamp.asc()).all()

    if format_type == 'csv':
        # Generate CSV format
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Timestamp', 'Latitude', 'Longitude', 'Speed'])

        for loc in locations:
            writer.writerow([
                loc.timestamp.isoformat(),
                loc.latitude,
                loc.longitude,
                loc.speed
            ])

        return output.getvalue(), 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': f'attachment; filename=vehicle_{vehicle_id}_data.csv'
        }

    # Default to JSON format
    return [{
        'timestamp': loc.timestamp.isoformat(),
        'latitude': loc.latitude,
        'longitude': loc.longitude,
        'speed': loc.speed
    } for loc in locations]


def create_vehicle(name, device_id, is_active=True, entity_type='vehicle'):
    """
    Create a new vehicle

    Args:
        name: Vehicle name
        device_id: Unique device identifier
        is_active: Whether vehicle is active (default: True)
        entity_type: Type of entity - 'vehicle' or 'sales_rep' (default: 'vehicle')

    Returns:
        Vehicle object or None if device_id already exists
    """
    # Check if device_id already exists
    existing = Vehicle.query.filter_by(device_id=device_id).first()
    if existing:
        return None

    vehicle = Vehicle(
        name=name.strip(),
        device_id=device_id.strip(),
        is_active=is_active,
        entity_type=entity_type
    )

    # Generate API token for GPS authentication
    vehicle.generate_api_token()

    try:
        db.session.add(vehicle)
        db.session.commit()
        current_app.logger.info(
            f"Vehicle created: {vehicle.name} (device_id={vehicle.device_id}, "
            f"api_token={vehicle.api_token})"
        )
        return vehicle
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating vehicle: {str(e)}")
        raise


def update_vehicle(vehicle_id, name=None, device_id=None, is_active=None, entity_type=None):
    """
    Update vehicle information

    Args:
        vehicle_id: ID of the vehicle to update
        name: New name (optional)
        device_id: New device ID (optional)
        is_active: New active status (optional)
        entity_type: New entity type - 'vehicle' or 'sales_rep' (optional)

    Returns:
        Updated Vehicle object or None if not found or device_id conflict
    """
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return None

    # Check device_id uniqueness if updating it
    if device_id and device_id != vehicle.device_id:
        existing = Vehicle.query.filter_by(device_id=device_id).first()
        if existing:
            return None  # Device ID already exists

    try:
        if name:
            vehicle.name = name.strip()
        if device_id:
            vehicle.device_id = device_id.strip()
        if is_active is not None:
            vehicle.is_active = bool(is_active)
        if entity_type:
            vehicle.entity_type = entity_type

        db.session.commit()
        current_app.logger.info(f"Vehicle updated: {vehicle.name}")
        return vehicle
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating vehicle: {str(e)}")
        raise


def delete_vehicle(vehicle_id):
    """
    Delete a vehicle

    Args:
        vehicle_id: ID of the vehicle to delete

    Returns:
        Vehicle name if successful, None if not found
    """
    vehicle = Vehicle.query.get(vehicle_id)
    if not vehicle:
        return None

    try:
        vehicle_name = vehicle.name
        db.session.delete(vehicle)
        db.session.commit()
        current_app.logger.info(f"Vehicle deleted: {vehicle_name}")
        return vehicle_name
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting vehicle: {str(e)}")
        raise

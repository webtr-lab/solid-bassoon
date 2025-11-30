"""
Locations routes blueprint
Handles GPS data reception and location management
"""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required
from app.models import db, Vehicle
from app.security import ValidationError, validate_gps_coordinates
from app.services.location_service import save_location
from app.websocket_events import broadcast_location_update

locations_bp = Blueprint('locations', __name__, url_prefix='/api')


@locations_bp.route('/gps', methods=['POST'])
def receive_gps():
    """
    Receive GPS data from mobile devices or trackers

    Expected JSON payload:
    {
        "device_id": "vehicle_device_id",
        "latitude": 5.8520,
        "longitude": -55.2038,
        "speed": 45.5
    }
    """
    try:
        data = request.json

        required_fields = ['device_id', 'latitude', 'longitude']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        vehicle = Vehicle.query.filter_by(device_id=data['device_id']).first()
        if not vehicle:
            return jsonify({'error': 'Vehicle not found'}), 404

        # Validate GPS coordinates are within valid ranges
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        speed = data.get('speed', 0.0)

        validate_gps_coordinates(latitude, longitude, speed)

        # Save location using service layer
        location = save_location(vehicle.id, latitude, longitude, speed)
        db.session.commit()

        current_app.logger.info(
            f"GPS data received for vehicle {vehicle.name} "
            f"at ({latitude:.6f}, {longitude:.6f}), speed: {speed} km/h"
        )

        # Broadcast location update via WebSocket for real-time tracking
        broadcast_location_update(vehicle.id, {
            'id': location.id,
            'latitude': location.latitude,
            'longitude': location.longitude,
            'speed': location.speed,
            'timestamp': location.timestamp.isoformat()
        })

        return jsonify({
            'message': 'Location data received',
            'vehicle': vehicle.name,
            'location_id': location.id
        }), 201

    except ValidationError as e:
        current_app.logger.warning(f"GPS validation error: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except (ValueError, TypeError) as e:
        current_app.logger.warning(f"GPS data type error: {str(e)}")
        return jsonify({'error': 'Invalid coordinate values'}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error processing GPS data: {str(e)}")
        return jsonify({'error': 'Failed to process GPS data'}), 500

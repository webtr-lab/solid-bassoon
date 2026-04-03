"""
Locations routes blueprint
Handles GPS data reception and location management
"""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required
from app.models import db, Vehicle
from app.security import ValidationError, validate_gps_coordinates
from app.csrf_protection import csrf_exempt
from app.services.location_service import save_location
from app.limiter import limiter
from app.monitoring import record_gps_submission

locations_bp = Blueprint('locations', __name__, url_prefix='/api')


@locations_bp.route('/gps', methods=['POST'])
@limiter.limit("10 per minute")  # Reasonable limit: GPS every 30s = 2/min, 10/min allows bursts/retries
@csrf_exempt
def receive_gps():
    """
    Receive GPS data from mobile devices or trackers (requires API token)

    Expected JSON payload:
    {
        "device_id": "vehicle_device_id",
        "api_token": "vehicle_api_token",
        "latitude": 5.8520,
        "longitude": -55.2038,
        "speed": 45.5
    }
    """
    try:
        data = request.json

        required_fields = ['device_id', 'api_token', 'latitude', 'longitude']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        # Authenticate: Validate device_id and API token
        vehicle = Vehicle.query.filter_by(device_id=data['device_id']).first()
        if not vehicle:
            current_app.logger.warning(f"GPS submission failed: Unknown device_id {data.get('device_id')}")
            record_gps_submission('unknown', success=False)
            return jsonify({'error': 'Authentication failed'}), 401

        if not vehicle.api_token or vehicle.api_token != data['api_token']:
            current_app.logger.warning(
                f"GPS submission failed: Invalid API token for vehicle {vehicle.name} "
                f"(device_id: {vehicle.device_id})"
            )
            record_gps_submission(vehicle.id, success=False)
            return jsonify({'error': 'Authentication failed'}), 401

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
        # Record successful GPS submission
        record_gps_submission(vehicle.id, success=True)

        return jsonify({
            'message': 'Location data received',
            'vehicle': vehicle.name,
            'location_id': location.id
        }), 201

    except ValidationError as e:
        current_app.logger.warning(f"GPS validation error: {str(e)}")
        # Try to get vehicle ID for metrics
        vehicle = Vehicle.query.filter_by(device_id=data.get('device_id')).first()
        record_gps_submission(vehicle.id if vehicle else 'unknown', success=False)
        return jsonify({'error': str(e)}), 400
    except (ValueError, TypeError) as e:
        current_app.logger.warning(f"GPS data type error: {str(e)}")
        vehicle = Vehicle.query.filter_by(device_id=data.get('device_id')).first()
        record_gps_submission(vehicle.id if vehicle else 'unknown', success=False)
        return jsonify({'error': 'Invalid coordinate values'}), 400
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error processing GPS data: {str(e)}")
        vehicle = Vehicle.query.filter_by(device_id=data.get('device_id')).first()
        record_gps_submission(vehicle.id if vehicle else 'unknown', success=False)
        return jsonify({'error': 'Failed to process GPS data'}), 500

"""
Geocoding routes blueprint
Handles address lookup and reverse geocoding via Nominatim service
"""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required
from app.security import ValidationError
from app.services.geocoding_service import geocode_address, reverse_geocode

geocoding_bp = Blueprint('geocoding', __name__, url_prefix='/api')


@geocoding_bp.route('/geocode', methods=['GET'])
@login_required
def geocode():
    """Geocode address using Nominatim service"""
    address = request.args.get('address', '').strip()

    if not address:
        return jsonify({'error': 'Address parameter required'}), 400

    try:
        results = geocode_address(address)
        return jsonify(results)
    except ValidationError as e:
        current_app.logger.error(f"Geocoding validation error: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Geocoding error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@geocoding_bp.route('/reverse-geocode', methods=['GET'])
@login_required
def reverse_geocode_endpoint():
    """Reverse geocode coordinates to address"""
    try:
        latitude = request.args.get('latitude', type=float)
        longitude = request.args.get('longitude', type=float)

        if latitude is None or longitude is None:
            return jsonify({'error': 'Latitude and longitude parameters required'}), 400

        result = reverse_geocode(latitude, longitude)
        return jsonify(result)
    except ValidationError as e:
        current_app.logger.error(f"Reverse geocoding validation error: {str(e)}")
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        current_app.logger.error(f"Reverse geocoding error: {str(e)}")
        return jsonify({'error': str(e)}), 500

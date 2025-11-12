"""
Vehicles routes blueprint
Handles vehicle CRUD operations, location history, saved locations, and data export
"""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from app.models import db, Vehicle, SavedLocation
from app.security import (
    ValidationError, validate_gps_coordinates, require_manager_or_admin,
    PaginationParams, log_audit_event
)
from app.services.vehicle_service import (
    get_vehicle_or_404, format_vehicle, get_vehicle_current_location,
    get_vehicle_history, get_vehicle_stats, export_vehicle_data,
    create_vehicle, update_vehicle, delete_vehicle
)

vehicles_bp = Blueprint('vehicles', __name__, url_prefix='/api/vehicles')


@vehicles_bp.route('', methods=['GET'])
@login_required
def list_vehicles():
    """List all vehicles with pagination"""
    try:
        # Parse pagination parameters
        pagination = PaginationParams.from_request(request)

        # Get total count before applying pagination
        query = Vehicle.query
        total_count = query.count()

        # Apply pagination
        vehicles = pagination.apply_to_query(query).all()

        return jsonify({
            'data': [format_vehicle(v) for v in vehicles],
            'meta': pagination.response_meta(total_count)
        })
    except Exception as e:
        current_app.logger.error(f"Error listing vehicles: {str(e)}")
        return jsonify({'error': 'Failed to list vehicles'}), 500


@vehicles_bp.route('', methods=['POST'])
@login_required
@require_manager_or_admin
def create_new_vehicle():
    """Create a new vehicle"""
    try:
        data = request.json

        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        # Validate required fields
        if not data.get('name') or not data.get('device_id'):
            return jsonify({'error': 'Vehicle name and device ID are required'}), 400

        vehicle = create_vehicle(
            name=data['name'],
            device_id=data['device_id'],
            is_active=data.get('is_active', True)
        )

        if not vehicle:
            return jsonify({'error': 'Device ID already exists'}), 400

        log_audit_event(
            user_id=current_user.id,
            action='create',
            resource='vehicle',
            resource_id=vehicle.id,
            status='success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details=f'Created vehicle: {vehicle.name}'
        )

        return jsonify({
            'message': 'Vehicle created successfully',
            'vehicle': format_vehicle(vehicle)
        }), 201

    except Exception as e:
        current_app.logger.error(f"Error creating vehicle: {str(e)}")
        return jsonify({'error': 'Failed to create vehicle'}), 500


@vehicles_bp.route('/<int:vehicle_id>', methods=['GET'])
@login_required
def get_vehicle(vehicle_id):
    """Get vehicle details"""
    vehicle = get_vehicle_or_404(vehicle_id)

    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404

    return jsonify(format_vehicle(vehicle))


@vehicles_bp.route('/<int:vehicle_id>', methods=['PUT'])
@login_required
@require_manager_or_admin
def update_vehicle_info(vehicle_id):
    """Update vehicle information"""
    try:
        data = request.json

        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        vehicle = update_vehicle(
            vehicle_id,
            name=data.get('name'),
            device_id=data.get('device_id'),
            is_active=data.get('is_active')
        )

        if not vehicle:
            # Check if it's not found or device_id conflict
            existing_vehicle = get_vehicle_or_404(vehicle_id)
            if not existing_vehicle:
                return jsonify({'error': 'Vehicle not found'}), 404
            else:
                return jsonify({'error': 'Device ID already exists'}), 400

        log_audit_event(
            user_id=current_user.id,
            action='update',
            resource='vehicle',
            resource_id=vehicle_id,
            status='success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details=f'Updated vehicle: {vehicle.name}'
        )

        return jsonify({'message': 'Vehicle updated successfully'})

    except Exception as e:
        current_app.logger.error(f"Error updating vehicle: {str(e)}")
        return jsonify({'error': 'Failed to update vehicle'}), 500


@vehicles_bp.route('/<int:vehicle_id>', methods=['DELETE'])
@login_required
@require_manager_or_admin
def delete_vehicle_by_id(vehicle_id):
    """Delete a vehicle"""
    try:
        vehicle_name = delete_vehicle(vehicle_id)

        if not vehicle_name:
            return jsonify({'error': 'Vehicle not found'}), 404

        log_audit_event(
            user_id=current_user.id,
            action='delete',
            resource='vehicle',
            resource_id=vehicle_id,
            status='success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details=f'Deleted vehicle: {vehicle_name}'
        )

        return jsonify({'message': 'Vehicle deleted successfully'})

    except Exception as e:
        current_app.logger.error(f"Error deleting vehicle: {str(e)}")
        return jsonify({'error': 'Failed to delete vehicle'}), 500


@vehicles_bp.route('/<int:vehicle_id>/location', methods=['GET'])
@login_required
def get_current_location(vehicle_id):
    """Get current location of a vehicle"""
    vehicle = get_vehicle_or_404(vehicle_id)

    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404

    location = get_vehicle_current_location(vehicle_id)

    if not location:
        return jsonify({'error': 'No location data'}), 404

    return jsonify(location)


@vehicles_bp.route('/<int:vehicle_id>/history', methods=['GET'])
@login_required
def get_location_history(vehicle_id):
    """Get vehicle location history"""
    hours = request.args.get('hours', default=24, type=int)

    vehicle = get_vehicle_or_404(vehicle_id)
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404

    history = get_vehicle_history(vehicle_id, hours)
    return jsonify(history)


@vehicles_bp.route('/<int:vehicle_id>/stats', methods=['GET'])
@login_required
def get_statistics(vehicle_id):
    """Get vehicle statistics (distance, speed, etc.)"""
    hours = request.args.get('hours', default=24, type=int)

    vehicle = get_vehicle_or_404(vehicle_id)
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404

    stats = get_vehicle_stats(vehicle_id, hours)
    return jsonify(stats)


@vehicles_bp.route('/<int:vehicle_id>/export', methods=['GET'])
@login_required
def export_data(vehicle_id):
    """Export vehicle location data"""
    format_type = request.args.get('format', 'json')
    hours = request.args.get('hours', default=24, type=int)

    vehicle = get_vehicle_or_404(vehicle_id)
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404

    result = export_vehicle_data(vehicle_id, format_type, hours)

    if format_type == 'csv':
        data, status, headers = result
        return data, status, headers

    return jsonify(result)


@vehicles_bp.route('/<int:vehicle_id>/saved-locations', methods=['GET'])
@login_required
def get_saved_locations(vehicle_id):
    """Get saved locations (stops) for a vehicle"""
    vehicle = get_vehicle_or_404(vehicle_id)
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404

    saved_locs = SavedLocation.query.filter_by(vehicle_id=vehicle_id).order_by(
        SavedLocation.timestamp.desc()
    ).all()

    return jsonify([{
        'id': sl.id,
        'name': sl.name,
        'latitude': sl.latitude,
        'longitude': sl.longitude,
        'stop_duration_minutes': sl.stop_duration_minutes,
        'visit_type': sl.visit_type,
        'timestamp': sl.timestamp.isoformat(),
        'notes': sl.notes
    } for sl in saved_locs])


@vehicles_bp.route('/<int:vehicle_id>/saved-locations', methods=['POST'])
@login_required
def save_location(vehicle_id):
    """Manually save a location for a vehicle"""
    try:
        data = request.json

        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        # Validate required fields
        if 'latitude' not in data or 'longitude' not in data:
            return jsonify({'error': 'Latitude and longitude are required'}), 400

        try:
            latitude = float(data['latitude'])
            longitude = float(data['longitude'])
            validate_gps_coordinates(latitude, longitude)
        except (ValueError, TypeError):
            return jsonify({'error': 'Invalid latitude/longitude values'}), 400
        except ValidationError as e:
            return jsonify({'error': str(e)}), 400

        # Verify vehicle exists
        vehicle = get_vehicle_or_404(vehicle_id)
        if not vehicle:
            return jsonify({'error': 'Vehicle not found'}), 404

        saved_loc = SavedLocation(
            vehicle_id=vehicle_id,
            name=data.get('name', 'Saved Location'),
            latitude=latitude,
            longitude=longitude,
            visit_type='manual',
            notes=data.get('notes', '')
        )
        db.session.add(saved_loc)
        db.session.commit()

        current_app.logger.info(f"Location saved for vehicle {vehicle_id}")

        return jsonify({'message': 'Location saved', 'id': saved_loc.id}), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error saving location: {str(e)}")
        return jsonify({'error': 'Failed to save location'}), 500


@vehicles_bp.route('/<int:vehicle_id>/saved-locations/<int:location_id>', methods=['PUT'])
@login_required
def update_saved_location(vehicle_id, location_id):
    """Update a saved location"""
    try:
        data = request.json
        saved_loc = SavedLocation.query.filter_by(
            id=location_id,
            vehicle_id=vehicle_id
        ).first()

        if not saved_loc:
            return jsonify({'error': 'Location not found'}), 404

        if 'name' in data:
            saved_loc.name = data['name']
        if 'notes' in data:
            saved_loc.notes = data['notes']

        db.session.commit()

        current_app.logger.info(f"Location {location_id} updated for vehicle {vehicle_id}")

        return jsonify({'message': 'Location updated', 'id': saved_loc.id})

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating location: {str(e)}")
        return jsonify({'error': 'Failed to update location'}), 500


@vehicles_bp.route('/<int:vehicle_id>/saved-locations/<int:location_id>', methods=['DELETE'])
@login_required
def delete_saved_location(vehicle_id, location_id):
    """Delete a saved location"""
    try:
        saved_loc = SavedLocation.query.filter_by(
            id=location_id,
            vehicle_id=vehicle_id
        ).first()

        if not saved_loc:
            return jsonify({'error': 'Location not found'}), 404

        db.session.delete(saved_loc)
        db.session.commit()

        current_app.logger.info(f"Location {location_id} deleted for vehicle {vehicle_id}")

        return jsonify({'message': 'Location deleted'})

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error deleting location: {str(e)}")
        return jsonify({'error': 'Failed to delete location'}), 500

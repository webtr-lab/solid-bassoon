"""
Places of Interest routes blueprint
Handles CRUD operations for places of interest (POI)
"""

from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from app.models import db, SavedLocation
from app.limiter import limiter
from app.csrf_protection import require_csrf
from app.security import (
    ValidationError, validate_gps_coordinates, require_manager_or_admin,
    PaginationParams, log_audit_event
)
from app.services.place_service import (
    get_place_or_404, format_place, search_places, create_place,
    update_place, delete_place
)
from datetime import datetime

places_bp = Blueprint('places', __name__, url_prefix='/api/places-of-interest')


@places_bp.route('', methods=['GET'])
@login_required
@limiter.limit("100 per minute")  # Prevent scraping while allowing normal pagination
def list_places():
    """List all places of interest with search, filter, and pagination"""
    try:
        # Get query parameters for search and filter
        search = request.args.get('search', '').strip()
        area_filter = request.args.get('area', '').strip()

        # Parse pagination parameters
        pagination = PaginationParams.from_request(request)

        # Search and filter
        query = search_places(search, area_filter)
        total_count = query.count()

        # Apply pagination
        places = pagination.apply_to_query(query).all()

        return jsonify({
            'data': [format_place(p) for p in places],
            'meta': pagination.response_meta(total_count)
        })
    except Exception as e:
        current_app.logger.error(f"Error listing places of interest: {str(e)}")
        return jsonify({'error': 'Failed to list places of interest'}), 500


@places_bp.route('/areas', methods=['GET'])
@login_required
def get_areas():
    """Get all unique areas from existing places of interest"""
    try:
        from app.models import PlaceOfInterest

        # Get all unique non-empty areas, sorted alphabetically
        areas = db.session.query(PlaceOfInterest.area).filter(
            PlaceOfInterest.area != '',
            PlaceOfInterest.area.isnot(None)
        ).distinct().order_by(PlaceOfInterest.area).all()

        # Extract areas from tuples and return as list
        area_list = sorted(list(set([row[0] for row in areas if row[0]])))

        return jsonify({
            'areas': area_list,
            'total': len(area_list)
        })
    except Exception as e:
        current_app.logger.error(f"Error fetching areas: {str(e)}")
        return jsonify({'error': 'Failed to fetch areas'}), 500


@places_bp.route('', methods=['POST'])
@login_required
@require_manager_or_admin
@limiter.limit("20 per hour")  # Prevent spam while allowing legitimate bulk creation
@require_csrf
def create_new_place():
    """Create a new place of interest"""
    try:
        data = request.json

        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        # Validate required fields
        if not data.get('name'):
            return jsonify({'error': 'Place name is required'}), 400

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

        place = create_place(
            name=data['name'],
            latitude=latitude,
            longitude=longitude,
            address=data.get('address', ''),
            area=data.get('area', ''),
            contact=data.get('contact', ''),
            telephone=data.get('telephone', ''),
            category=data.get('category', 'General'),
            description=data.get('description', ''),
            created_by=current_user.id
        )

        log_audit_event(
            user_id=current_user.id,
            action='create',
            resource='place_of_interest',
            resource_id=place.id,
            status='success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details=f'Created place: {place.name}'
        )

        return jsonify({
            'message': 'Place of interest created successfully',
            'place': format_place(place)
        }), 201

    except Exception as e:
        current_app.logger.error(f"Error creating place of interest: {str(e)}")
        return jsonify({'error': 'Failed to create place of interest'}), 500


@places_bp.route('/<int:place_id>', methods=['GET'])
@login_required
def get_place(place_id):
    """Get place of interest details"""
    place = get_place_or_404(place_id)

    if not place:
        return jsonify({'error': 'Place not found'}), 404

    return jsonify(format_place(place))


@places_bp.route('/<int:place_id>', methods=['PUT'])
@login_required
@require_manager_or_admin
@require_csrf
def update_place_info(place_id):
    """Update place of interest information"""
    try:
        place = get_place_or_404(place_id)

        if not place:
            return jsonify({'error': 'Place not found'}), 404

        data = request.json

        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        # Validate coordinates if provided
        if 'latitude' in data or 'longitude' in data:
            try:
                lat = float(data.get('latitude', place.latitude))
                lon = float(data.get('longitude', place.longitude))
                validate_gps_coordinates(lat, lon)
            except (ValueError, TypeError):
                return jsonify({'error': 'Invalid latitude/longitude values'}), 400
            except ValidationError as e:
                return jsonify({'error': str(e)}), 400

        place = update_place(
            place_id,
            name=data.get('name'),
            address=data.get('address'),
            area=data.get('area'),
            contact=data.get('contact'),
            telephone=data.get('telephone'),
            category=data.get('category'),
            description=data.get('description'),
            latitude=data.get('latitude'),
            longitude=data.get('longitude')
        )

        log_audit_event(
            user_id=current_user.id,
            action='update',
            resource='place_of_interest',
            resource_id=place_id,
            status='success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details=f'Updated place: {place.name}'
        )

        return jsonify({'message': 'Place updated successfully'})

    except Exception as e:
        current_app.logger.error(f"Error updating place of interest: {str(e)}")
        return jsonify({'error': 'Failed to update place of interest'}), 500


@places_bp.route('/<int:place_id>', methods=['DELETE'])
@login_required
@require_manager_or_admin
@require_csrf
def delete_place_by_id(place_id):
    """Delete a place of interest"""
    try:
        place_name = delete_place(place_id)

        if not place_name:
            return jsonify({'error': 'Place not found'}), 404

        log_audit_event(
            user_id=current_user.id,
            action='delete',
            resource='place_of_interest',
            resource_id=place_id,
            status='success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details=f'Deleted place: {place_name}'
        )

        return jsonify({'message': 'Place deleted successfully'})

    except Exception as e:
        current_app.logger.error(f"Error deleting place of interest: {str(e)}")
        return jsonify({'error': 'Failed to delete place of interest'}), 500


@places_bp.route('/<int:place_id>/visits', methods=['POST'])
@login_required
@limiter.limit("30 per hour")  # Allow reasonable visit recording, prevent spam
@require_csrf
def record_visit(place_id):
    """
    Record a user visit to a place of interest

    Expected JSON payload:
    {
        "latitude": 5.8520,
        "longitude": -55.2038,
        "notes": "Optional visit notes"
    }
    """
    try:
        place = get_place_or_404(place_id)

        if not place:
            return jsonify({'error': 'Place not found'}), 404

        data = request.json or {}

        # Get GPS coordinates (required)
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

        # Create visit record
        visit = SavedLocation(
            place_id=place_id,
            user_id=current_user.id,
            name=f"Visit to {place.name}",
            latitude=latitude,
            longitude=longitude,
            stop_duration_minutes=0,
            visit_type='manual_visit',
            timestamp=datetime.utcnow(),
            notes=data.get('notes', '')
        )

        db.session.add(visit)
        db.session.commit()

        current_app.logger.info(
            f"Visit recorded: user={current_user.username}, "
            f"place={place.name}, location=({latitude:.6f}, {longitude:.6f})"
        )

        log_audit_event(
            user_id=current_user.id,
            action='visit',
            resource='place_of_interest',
            resource_id=place_id,
            status='success',
            ip_address=request.remote_addr,
            user_agent=request.headers.get('User-Agent', ''),
            details=f'Recorded visit to {place.name}'
        )

        return jsonify({
            'message': 'Visit recorded successfully',
            'visit': {
                'id': visit.id,
                'place_name': place.name,
                'timestamp': visit.timestamp.isoformat(),
                'latitude': visit.latitude,
                'longitude': visit.longitude
            }
        }), 201

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error recording visit to place {place_id}: {str(e)}")
        return jsonify({'error': 'Failed to record visit'}), 500

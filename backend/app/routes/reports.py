"""
Reports routes blueprint
Handles analytics and reporting endpoints
"""

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required
from app.models import SavedLocation, PlaceOfInterest
from app.services.place_service import get_visit_analytics, find_place_for_coordinate
from app.limiter import limiter
import pytz

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')


def get_local_time():
    """Get current local server time instead of UTC"""
    return datetime.now()


def convert_utc_to_local(utc_dt):
    """Convert UTC datetime to local server timezone"""
    if utc_dt is None:
        return None
    # Get system local timezone
    local_tz = datetime.now().astimezone().tzinfo
    # Make UTC datetime timezone-aware and convert to local
    if utc_dt.tzinfo is None:
        utc_dt = utc_dt.replace(tzinfo=pytz.UTC)
    return utc_dt.astimezone(local_tz)


@reports_bp.route('/visits', methods=['GET'])
@login_required
@limiter.limit("60 per minute")  # Allow frequent report generation for dashboards
def report_visits():
    """
    Return places of interest visited in a date range with visit counts and vehicles involved

    Query params:
      - start: ISO date/time or date (optional, default 7 days ago)
      - end: ISO date/time or date (optional, default now)
      - area: filter by area (optional)
    """
    start_str = request.args.get('start')
    end_str = request.args.get('end')
    area_filter = request.args.get('area', '').strip()

    try:
        if start_str:
            start = datetime.fromisoformat(start_str)
        else:
            start = get_local_time() - timedelta(days=7)

        if end_str:
            end = datetime.fromisoformat(end_str)
        else:
            end = get_local_time()
    except ValueError:
        return jsonify({
            'error': 'Invalid date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)'
        }), 400

    try:
        # Load saved locations (visits) in time window
        visits = SavedLocation.query.filter(
            SavedLocation.timestamp >= start,
            SavedLocation.timestamp <= end
        ).all()

        # Get visit analytics (this filters by area internally if provided)
        results = get_visit_analytics(visits, threshold_km=0.2)

        # Filter by area if specified
        if area_filter:
            results = [r for r in results if area_filter.lower() in r['area'].lower()]

        return jsonify({
            'start': start.isoformat(),
            'end': end.isoformat(),
            'results': results
        })

    except Exception as e:
        current_app.logger.error(f"Error generating visit report: {str(e)}")
        return jsonify({'error': 'Failed to generate visit report'}), 500


@reports_bp.route('/check-ins', methods=['GET'])
@login_required
@limiter.limit("60 per minute")  # Allow frequent report generation for dashboards
def report_check_ins():
    """
    Return manual location check-ins (saved locations excluding auto-detected stops)

    Query params:
      - start: ISO date/time or date (optional, default 7 days ago)
      - end: ISO date/time or date (optional, default now)
      - vehicle_id: filter by vehicle (optional)
    """
    start_str = request.args.get('start')
    end_str = request.args.get('end')
    vehicle_id = request.args.get('vehicle_id', type=int)

    try:
        if start_str:
            start = datetime.fromisoformat(start_str)
        else:
            start = get_local_time() - timedelta(days=7)

        if end_str:
            end = datetime.fromisoformat(end_str)
        else:
            end = get_local_time()
    except ValueError:
        return jsonify({
            'error': 'Invalid date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)'
        }), 400

    try:
        # Load manual saved locations (excluding auto-detected stops)
        query = SavedLocation.query.filter(
            SavedLocation.timestamp >= start,
            SavedLocation.timestamp <= end,
            (SavedLocation.visit_type != 'auto_detected') | (SavedLocation.visit_type.is_(None))
        )

        # Filter by vehicle if specified
        if vehicle_id:
            query = query.filter(SavedLocation.vehicle_id == vehicle_id)

        check_ins = query.order_by(SavedLocation.timestamp.desc()).all()

        # Format results
        results = []
        for ci in check_ins:
            # Determine the visitor name: vehicle name if vehicle visit, username if manual visit
            if ci.vehicle:
                visitor_name = ci.vehicle.name
            elif ci.user:
                visitor_name = f"{ci.user.username} (manual)"
            else:
                visitor_name = 'Unknown'

            results.append({
                'id': ci.id,
                'vehicle_id': ci.vehicle_id,
                'vehicle_name': visitor_name,
                'name': ci.name,
                'latitude': ci.latitude,
                'longitude': ci.longitude,
                'timestamp': convert_utc_to_local(ci.timestamp).isoformat() if ci.timestamp else '',
                'notes': ci.notes,
                'visit_type': ci.visit_type or 'manual'
            })

        return jsonify({
            'start': start.isoformat(),
            'end': end.isoformat(),
            'count': len(results),
            'results': results
        })

    except Exception as e:
        current_app.logger.error(f"Error generating check-in report: {str(e)}")
        return jsonify({'error': 'Failed to generate check-in report'}), 500


@reports_bp.route('/visits-detailed', methods=['GET'])
@login_required
@limiter.limit("30 per minute")  # More expensive query, lower limit
def report_visits_detailed():
    """
    Return detailed visits report grouped by location with vehicle visit details

    Query params:
      - start: ISO date/time or date (optional, default 7 days ago)
      - end: ISO date/time or date (optional, default now)
      - area: filter by area (optional)
      - vehicle_id: filter by vehicle ID (optional)
      - place_id: filter by place of interest ID (optional)
    """
    start_str = request.args.get('start')
    end_str = request.args.get('end')
    area_filter = request.args.get('area', '').strip()
    vehicle_id = request.args.get('vehicle_id', type=int)
    place_id = request.args.get('place_id', type=int)

    try:
        if start_str:
            start = datetime.fromisoformat(start_str)
        else:
            start = get_local_time() - timedelta(days=7)

        if end_str:
            end = datetime.fromisoformat(end_str)
        else:
            end = get_local_time()
    except ValueError:
        return jsonify({
            'error': 'Invalid date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)'
        }), 400

    try:
        # Load saved locations (visits) in time window
        query = SavedLocation.query.filter(
            SavedLocation.timestamp >= start,
            SavedLocation.timestamp <= end
        )

        # Filter by vehicle if specified
        if vehicle_id:
            query = query.filter(SavedLocation.vehicle_id == vehicle_id)

        visits = query.all()

        # Load all places for matching
        places = PlaceOfInterest.query.all()

        # Group visits by location (name, lat, lon) with place matching for area info
        locations_dict = {}
        for visit in visits:
            # Group by place_id if available, otherwise by coordinates
            if visit.place_id:
                # Use place_id as key for visits linked to a specific place
                location_key = f"place_{visit.place_id}"
            else:
                # For unlinked visits, group by rounded coordinates
                lat_rounded = round(visit.latitude, 4)
                lon_rounded = round(visit.longitude, 4)
                location_key = f"coord_{lat_rounded},{lon_rounded}"

            if location_key not in locations_dict:
                # Get place information
                if visit.place_id and visit.place:
                    # Visit is linked to a place - use place details
                    matched_place = visit.place
                else:
                    # Try to match to a nearby place of interest
                    matched_place = find_place_for_coordinate(
                        visit.latitude, visit.longitude,
                        places=places,
                        threshold_km=0.2
                    )

                locations_dict[location_key] = {
                    'name': matched_place.name if matched_place else visit.name,
                    'latitude': matched_place.latitude if matched_place else visit.latitude,
                    'longitude': matched_place.longitude if matched_place else visit.longitude,
                    'area': matched_place.area if matched_place else '',
                    'place_id': matched_place.id if matched_place else None,
                    'visits': []
                }

            # Convert UTC timestamp to local timezone
            local_timestamp = convert_utc_to_local(visit.timestamp)

            # Determine the visitor name: vehicle name if vehicle visit, username if manual visit
            if visit.vehicle:
                visitor_name = visit.vehicle.name
            elif visit.user:
                visitor_name = f"{visit.user.username} (manual)"
            else:
                visitor_name = 'Unknown'

            locations_dict[location_key]['visits'].append({
                'vehicle_id': visit.vehicle_id,
                'vehicle_name': visitor_name,
                'timestamp': local_timestamp.isoformat() if local_timestamp else visit.timestamp.isoformat(),
                'notes': visit.notes or ''
            })

        # Convert to list and sort by visit count descending
        results = list(locations_dict.values())
        for location in results:
            location['visit_count'] = len(location['visits'])
            # Sort visits by timestamp descending (most recent first)
            location['visits'].sort(key=lambda v: v['timestamp'], reverse=True)

        # Filter by place if specified
        if place_id:
            results = [r for r in results if r.get('place_id') == place_id]

        # Filter by area if specified
        if area_filter:
            results = [r for r in results if r['area'] and area_filter.lower() in r['area'].lower()]

        # Sort by visit count descending
        results.sort(key=lambda x: x['visit_count'], reverse=True)

        return jsonify({
            'start': start.isoformat(),
            'end': end.isoformat(),
            'total_locations': len(results),
            'total_visits': sum(loc['visit_count'] for loc in results),
            'locations': results
        })

    except Exception as e:
        current_app.logger.error(f"Error generating detailed visits report: {str(e)}")
        return jsonify({'error': 'Failed to generate detailed visits report'}), 500

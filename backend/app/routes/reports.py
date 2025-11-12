"""
Reports routes blueprint
Handles analytics and reporting endpoints
"""

from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required
from app.models import SavedLocation
from app.services.place_service import get_visit_analytics

reports_bp = Blueprint('reports', __name__, url_prefix='/api/reports')


@reports_bp.route('/visits', methods=['GET'])
@login_required
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
            start = datetime.utcnow() - timedelta(days=7)

        if end_str:
            end = datetime.fromisoformat(end_str)
        else:
            end = datetime.utcnow()
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

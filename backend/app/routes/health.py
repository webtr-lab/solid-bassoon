"""
Health check routes blueprint
Simple endpoint to verify API is running
"""

from flask import Blueprint, jsonify

health_bp = Blueprint('health', __name__, url_prefix='/api')


@health_bp.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'message': 'Maps Tracker API is running'})

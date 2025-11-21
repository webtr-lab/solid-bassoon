"""
WebSocket event handlers for real-time updates
"""

from flask import request, current_app
from flask_socketio import emit, join_room, leave_room
from flask_login import current_user
from app.models import db, Vehicle, Location
from datetime import datetime


# Store active connections per vehicle
active_clients = {}


def register_websocket_events(socketio):
    """Register all WebSocket event handlers"""

    @socketio.on('connect')
    def handle_connect():
        """Handle client connection"""
        current_app.logger.info(f"Client connected: {request.sid}")
        emit('connection_response', {
            'message': 'Connected to live tracking',
            'timestamp': datetime.utcnow().isoformat()
        })

    @socketio.on('disconnect')
    def handle_disconnect():
        """Handle client disconnection"""
        current_app.logger.info(f"Client disconnected: {request.sid}")
        # Remove from all rooms
        for vehicle_id in list(active_clients.keys()):
            if request.sid in active_clients.get(vehicle_id, []):
                active_clients[vehicle_id].remove(request.sid)

    @socketio.on('subscribe_vehicle')
    def handle_subscribe_vehicle(data):
        """Subscribe to real-time updates for a specific vehicle"""
        if not current_user.is_authenticated:
            emit('error', {'message': 'Unauthorized'})
            return

        vehicle_id = data.get('vehicle_id')

        # Verify user has access to this vehicle
        vehicle = Vehicle.query.get(vehicle_id)
        if not vehicle:
            emit('error', {'message': 'Vehicle not found'})
            return

        # Track active connections
        if vehicle_id not in active_clients:
            active_clients[vehicle_id] = []
        active_clients[vehicle_id].append(request.sid)

        # Join room for this vehicle
        join_room(f'vehicle_{vehicle_id}')

        current_app.logger.info(
            f"User {current_user.username} subscribed to vehicle {vehicle_id}"
        )

        emit('subscribed', {
            'vehicle_id': vehicle_id,
            'message': f'Subscribed to {vehicle.name}'
        })

    @socketio.on('unsubscribe_vehicle')
    def handle_unsubscribe_vehicle(data):
        """Unsubscribe from real-time updates for a vehicle"""
        vehicle_id = data.get('vehicle_id')

        # Remove from tracking
        if vehicle_id in active_clients and request.sid in active_clients[vehicle_id]:
            active_clients[vehicle_id].remove(request.sid)

        # Leave room
        leave_room(f'vehicle_{vehicle_id}')

        current_app.logger.info(
            f"User {current_user.username} unsubscribed from vehicle {vehicle_id}"
        )

        emit('unsubscribed', {
            'vehicle_id': vehicle_id,
            'message': 'Unsubscribed'
        })

    @socketio.on('subscribe_vehicles')
    def handle_subscribe_vehicles():
        """Subscribe to real-time updates for all vehicles user has access to"""
        if not current_user.is_authenticated:
            emit('error', {'message': 'Unauthorized'})
            return

        # Subscribe to all vehicles room
        join_room('all_vehicles')

        current_app.logger.info(
            f"User {current_user.username} subscribed to all vehicles"
        )

        emit('subscribed_all', {
            'message': 'Subscribed to all vehicles'
        })

    @socketio.on('ping')
    def handle_ping():
        """Keep-alive ping"""
        emit('pong', {
            'timestamp': datetime.utcnow().isoformat()
        })


def broadcast_location_update(vehicle_id, location_data):
    """
    Broadcast location update to all connected clients
    This is called from the location submission endpoint
    """
    socketio = current_app.extensions.get('socketio')
    if not socketio:
        return

    # Broadcast to specific vehicle room
    socketio.emit('location_update', {
        'vehicle_id': vehicle_id,
        'location': {
            'id': location_data.get('id'),
            'latitude': location_data.get('latitude'),
            'longitude': location_data.get('longitude'),
            'speed': location_data.get('speed'),
            'heading': location_data.get('heading'),
            'accuracy': location_data.get('accuracy'),
            'timestamp': location_data.get('timestamp')
        }
    }, room=f'vehicle_{vehicle_id}')

    # Also broadcast to all_vehicles room
    socketio.emit('location_update', {
        'vehicle_id': vehicle_id,
        'location': location_data
    }, room='all_vehicles')


def broadcast_stop_detected(vehicle_id, stop_data):
    """Broadcast stop detection to connected clients"""
    socketio = current_app.extensions.get('socketio')
    if not socketio:
        return

    socketio.emit('stop_detected', {
        'vehicle_id': vehicle_id,
        'stop': {
            'id': stop_data.get('id'),
            'name': stop_data.get('name'),
            'latitude': stop_data.get('latitude'),
            'longitude': stop_data.get('longitude'),
            'address': stop_data.get('address'),
            'arrival_time': stop_data.get('arrival_time')
        }
    }, room=f'vehicle_{vehicle_id}')

    socketio.emit('stop_detected', {
        'vehicle_id': vehicle_id,
        'stop': stop_data
    }, room='all_vehicles')


def broadcast_vehicle_status(vehicle_id, status):
    """Broadcast vehicle status change"""
    socketio = current_app.extensions.get('socketio')
    if not socketio:
        return

    socketio.emit('vehicle_status', {
        'vehicle_id': vehicle_id,
        'status': status,
        'timestamp': datetime.utcnow().isoformat()
    }, room=f'vehicle_{vehicle_id}')

    socketio.emit('vehicle_status', {
        'vehicle_id': vehicle_id,
        'status': status
    }, room='all_vehicles')


def get_active_connections(vehicle_id):
    """Get number of active connections for a vehicle"""
    return len(active_clients.get(vehicle_id, []))

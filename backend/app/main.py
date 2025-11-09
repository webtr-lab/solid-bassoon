from flask import Flask, request, jsonify, session, send_file
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from flask_bcrypt import Bcrypt
from app.config import Config
from app.models import db, Vehicle, Location, SavedLocation, User, PlaceOfInterest
from app.logging_config import setup_logging
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
import math
import os
import subprocess
import glob

app = Flask(__name__)
app.config.from_object(Config)

# Initialize logging system
access_logger = setup_logging(app)

# Get CORS origins from environment variable or use defaults
cors_origins = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')

CORS(app, 
     supports_credentials=True, 
     origins=cors_origins,
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

db.init_app(app)
bcrypt = Bcrypt(app)
login_manager = LoginManager(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# HTTP request logging middleware
@app.before_request
def log_request():
    """Log incoming HTTP requests"""
    access_logger.info(f"{request.method} {request.path} - IP: {request.remote_addr}")

@app.after_request
def log_response(response):
    """Log HTTP responses"""
    access_logger.info(f"{request.method} {request.path} - Status: {response.status_code}")
    return response

with app.app_context():
    db.create_all()
    
    if Vehicle.query.count() == 0:
        for i in range(1, 6):
            vehicle = Vehicle(name=f'Vehicle {i}', device_id=f'device_{i}')
            db.session.add(vehicle)
        db.session.commit()
        app.logger.info("Created 5 default vehicles")
    
    if User.query.count() == 0:
        # Create default admin user with admin/admin123
        default_password = 'admin123'
        admin_password = bcrypt.generate_password_hash(default_password).decode('utf-8')
        admin_user = User(
            username='admin',
            email='admin@gpstracker.local',
            password_hash=admin_password,
            role='admin',
            must_change_password=True
        )
        db.session.add(admin_user)
        db.session.commit()
        app.logger.warning("="*60)
        app.logger.warning("IMPORTANT: Default admin user created")
        app.logger.warning(f"Username: admin")
        app.logger.warning(f"Password: {default_password}")
        app.logger.warning("This user will be prompted to change password on first login")
        app.logger.warning("="*60)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'message': 'GPS Tracker API is running'})

@app.route('/api/auth/default-credentials', methods=['GET'])
def check_default_credentials():
    """Check if default admin credentials should be displayed"""
    admin_user = User.query.filter_by(username='admin').first()

    if admin_user and admin_user.must_change_password:
        return jsonify({
            'show_default': True,
            'username': 'admin',
            'password': 'admin123'
        })

    return jsonify({'show_default': False})

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username already exists'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already exists'}), 400
    
    hashed_password = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    user = User(
        username=data['username'], 
        email=data['email'], 
        password_hash=hashed_password,
        role=data.get('role', 'viewer')
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User registered successfully'}), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()

    if user and bcrypt.check_password_hash(user.password_hash, data['password']):
        login_user(user, remember=True)
        return jsonify({
            'message': 'Login successful',
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'must_change_password': user.must_change_password
            }
        })

    return jsonify({'error': 'Invalid username or password'}), 401

@app.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/auth/check', methods=['GET'])
def check_auth():
    if current_user.is_authenticated:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': current_user.id,
                'username': current_user.username,
                'email': current_user.email,
                'role': current_user.role,
                'must_change_password': current_user.must_change_password
            }
        })
    return jsonify({'authenticated': False})

@app.route('/api/auth/change-password', methods=['POST'])
@login_required
def change_password():
    data = request.json

    if not data.get('current_password') or not data.get('new_password'):
        return jsonify({'error': 'Current password and new password are required'}), 400

    # Verify current password
    if not bcrypt.check_password_hash(current_user.password_hash, data['current_password']):
        return jsonify({'error': 'Current password is incorrect'}), 401

    # Update password
    current_user.password_hash = bcrypt.generate_password_hash(data['new_password']).decode('utf-8')
    current_user.must_change_password = False
    db.session.commit()

    return jsonify({'message': 'Password changed successfully'})

@app.route('/api/gps', methods=['POST'])
def receive_gps():
    data = request.json
    
    required_fields = ['device_id', 'latitude', 'longitude']
    if not all(field in data for field in required_fields):
        return jsonify({'error': 'Missing required fields'}), 400
    
    vehicle = Vehicle.query.filter_by(device_id=data['device_id']).first()
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404
    
    location = Location(
        vehicle_id=vehicle.id,
        latitude=float(data['latitude']),
        longitude=float(data['longitude']),
        speed=float(data.get('speed', 0.0)),
        timestamp=datetime.utcnow()
    )
    db.session.add(location)
    detect_and_save_stops(vehicle.id, location)
    db.session.commit()
    
    return jsonify({'message': 'GPS data received', 'vehicle': vehicle.name, 'location_id': location.id}), 201

def detect_and_save_stops(vehicle_id, current_location):
    time_window = datetime.utcnow() - timedelta(minutes=10)
    recent_locations = Location.query.filter(
        Location.vehicle_id == vehicle_id,
        Location.timestamp >= time_window
    ).order_by(Location.timestamp.desc()).all()
    
    if len(recent_locations) < 5:
        return
    
    first_loc = recent_locations[-1]
    distance = calculate_distance(
        first_loc.latitude, first_loc.longitude,
        current_location.latitude, current_location.longitude
    )
    
    if distance < 0.05 and len(recent_locations) >= 5:
        time_diff = (current_location.timestamp - first_loc.timestamp).total_seconds() / 60
        
        if time_diff >= 5:
            existing_stop = SavedLocation.query.filter(
                SavedLocation.vehicle_id == vehicle_id,
                SavedLocation.timestamp >= time_window
            ).first()
            
            if not existing_stop:
                saved_loc = SavedLocation(
                    vehicle_id=vehicle_id,
                    name='Auto-detected Stop',
                    latitude=current_location.latitude,
                    longitude=current_location.longitude,
                    stop_duration_minutes=int(time_diff),
                    visit_type='auto_detected',
                    timestamp=first_loc.timestamp
                )
                db.session.add(saved_loc)
                app.logger.info(f"Auto-detected stop for vehicle_id={vehicle_id}, duration={int(time_diff)}min, location=({current_location.latitude:.6f}, {current_location.longitude:.6f})")

def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371
    lat1_rad = math.radians(lat1)
    lat2_rad = math.radians(lat2)
    delta_lat = math.radians(lat2 - lat1)
    delta_lon = math.radians(lon2 - lon1)
    
    a = math.sin(delta_lat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

@app.route('/api/vehicles', methods=['GET'])
@login_required
def get_vehicles():
    vehicles = Vehicle.query.all()
    return jsonify([{
        'id': v.id,
        'name': v.name,
        'device_id': v.device_id,
        'is_active': v.is_active
    } for v in vehicles])

@app.route('/api/vehicles/<int:vehicle_id>/location', methods=['GET'])
@login_required
def get_vehicle_location(vehicle_id):
    location = Location.query.filter_by(vehicle_id=vehicle_id).order_by(Location.timestamp.desc()).first()
    
    if not location:
        return jsonify({'error': 'No location data'}), 404
    
    return jsonify({
        'latitude': location.latitude,
        'longitude': location.longitude,
        'speed': location.speed,
        'timestamp': location.timestamp.isoformat()
    })

@app.route('/api/vehicles/<int:vehicle_id>/history', methods=['GET'])
@login_required
def get_vehicle_history(vehicle_id):
    hours = request.args.get('hours', default=24, type=int)
    time_window = datetime.utcnow() - timedelta(hours=hours)
    
    locations = Location.query.filter(
        Location.vehicle_id == vehicle_id,
        Location.timestamp >= time_window
    ).order_by(Location.timestamp.asc()).all()
    
    return jsonify([{
        'latitude': loc.latitude,
        'longitude': loc.longitude,
        'speed': loc.speed,
        'timestamp': loc.timestamp.isoformat()
    } for loc in locations])

@app.route('/api/vehicles/<int:vehicle_id>/saved-locations', methods=['GET'])
@login_required
def get_saved_locations(vehicle_id):
    saved_locs = SavedLocation.query.filter_by(vehicle_id=vehicle_id).order_by(SavedLocation.timestamp.desc()).all()
    
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

@app.route('/api/vehicles/<int:vehicle_id>/saved-locations', methods=['POST'])
@login_required
def save_location(vehicle_id):
    data = request.json
    
    saved_loc = SavedLocation(
        vehicle_id=vehicle_id,
        name=data.get('name', 'Saved Location'),
        latitude=float(data['latitude']),
        longitude=float(data['longitude']),
        visit_type='manual',
        notes=data.get('notes', '')
    )
    db.session.add(saved_loc)
    db.session.commit()
    
    return jsonify({'message': 'Location saved', 'id': saved_loc.id}), 201

@app.route('/api/vehicles/<int:vehicle_id>/saved-locations/<int:location_id>', methods=['PUT'])
@login_required
def update_saved_location(vehicle_id, location_id):
    data = request.json
    saved_loc = SavedLocation.query.filter_by(id=location_id, vehicle_id=vehicle_id).first()
    
    if not saved_loc:
        return jsonify({'error': 'Location not found'}), 404
    
    if 'name' in data:
        saved_loc.name = data['name']
    if 'notes' in data:
        saved_loc.notes = data['notes']
    
    db.session.commit()
    return jsonify({'message': 'Location updated', 'id': saved_loc.id})

@app.route('/api/vehicles/<int:vehicle_id>/saved-locations/<int:location_id>', methods=['DELETE'])
@login_required
def delete_saved_location(vehicle_id, location_id):
    saved_loc = SavedLocation.query.filter_by(id=location_id, vehicle_id=vehicle_id).first()
    
    if not saved_loc:
        return jsonify({'error': 'Location not found'}), 404
    
    db.session.delete(saved_loc)
    db.session.commit()
    return jsonify({'message': 'Location deleted'})

@app.route('/api/vehicles/<int:vehicle_id>/export', methods=['GET'])
@login_required
def export_vehicle_data(vehicle_id):
    format_type = request.args.get('format', 'json')
    hours = request.args.get('hours', default=24, type=int)
    time_window = datetime.utcnow() - timedelta(hours=hours)
    
    locations = Location.query.filter(
        Location.vehicle_id == vehicle_id,
        Location.timestamp >= time_window
    ).order_by(Location.timestamp.asc()).all()
    
    if format_type == 'csv':
        import io
        import csv
        
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Timestamp', 'Latitude', 'Longitude', 'Speed'])
        
        for loc in locations:
            writer.writerow([loc.timestamp.isoformat(), loc.latitude, loc.longitude, loc.speed])
        
        return output.getvalue(), 200, {
            'Content-Type': 'text/csv',
            'Content-Disposition': f'attachment; filename=vehicle_{vehicle_id}_data.csv'
        }
    
    return jsonify([{
        'timestamp': loc.timestamp.isoformat(),
        'latitude': loc.latitude,
        'longitude': loc.longitude,
        'speed': loc.speed
    } for loc in locations])

@app.route('/api/vehicles/<int:vehicle_id>/stats', methods=['GET'])
@login_required
def get_vehicle_stats(vehicle_id):
    hours = request.args.get('hours', default=24, type=int)
    time_window = datetime.utcnow() - timedelta(hours=hours)
    
    locations = Location.query.filter(
        Location.vehicle_id == vehicle_id,
        Location.timestamp >= time_window
    ).all()
    
    if not locations:
        return jsonify({'total_points': 0, 'avg_speed': 0, 'max_speed': 0, 'distance_km': 0})
    
    speeds = [loc.speed for loc in locations]
    avg_speed = sum(speeds) / len(speeds) if speeds else 0
    max_speed = max(speeds) if speeds else 0
    
    total_distance = 0
    for i in range(1, len(locations)):
        prev = locations[i-1]
        curr = locations[i]
        total_distance += calculate_distance(prev.latitude, prev.longitude, curr.latitude, curr.longitude)
    
    return jsonify({
        'total_points': len(locations),
        'avg_speed': round(avg_speed, 2),
        'max_speed': round(max_speed, 2),
        'distance_km': round(total_distance, 2),
        'time_period_hours': hours
    })

@app.route('/api/users', methods=['GET'])
@login_required
def get_users():
    users = User.query.all()
    return jsonify([{
        'id': u.id,
        'username': u.username,
        'email': u.email,
        'is_active': u.is_active,
        'role': u.role,
        'created_at': u.created_at.isoformat()
    } for u in users])

@app.route('/api/users/<int:user_id>', methods=['PUT'])
@login_required
def update_user(user_id):
    data = request.json
    user = User.query.get(user_id)
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if 'username' in data:
        existing = User.query.filter_by(username=data['username']).first()
        if existing and existing.id != user_id:
            return jsonify({'error': 'Username already exists'}), 400
        user.username = data['username']
    
    if 'email' in data:
        existing = User.query.filter_by(email=data['email']).first()
        if existing and existing.id != user_id:
            return jsonify({'error': 'Email already exists'}), 400
        user.email = data['email']
    
    if 'password' in data and data['password']:
        user.password_hash = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    
    if 'is_active' in data:
        user.is_active = data['is_active']
    
    if 'role' in data:
        user.role = data['role']
    
    db.session.commit()
    return jsonify({'message': 'User updated successfully'})

@app.route('/api/users/<int:user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id):
    if user_id == current_user.id:
        return jsonify({'error': 'Cannot delete your own account'}), 400
    
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    db.session.delete(user)
    db.session.commit()
    return jsonify({'message': 'User deleted successfully'})

@app.route('/api/vehicles', methods=['POST'])
@login_required
def create_vehicle():
    data = request.json
    
    existing = Vehicle.query.filter_by(device_id=data['device_id']).first()
    if existing:
        return jsonify({'error': 'Device ID already exists'}), 400
    
    vehicle = Vehicle(
        name=data['name'],
        device_id=data['device_id'],
        is_active=data.get('is_active', True)
    )
    
    db.session.add(vehicle)
    db.session.commit()
    
    return jsonify({
        'message': 'Vehicle created successfully',
        'vehicle': {
            'id': vehicle.id,
            'name': vehicle.name,
            'device_id': vehicle.device_id,
            'is_active': vehicle.is_active
        }
    }), 201

@app.route('/api/vehicles/<int:vehicle_id>', methods=['PUT'])
@login_required
def update_vehicle(vehicle_id):
    data = request.json
    vehicle = Vehicle.query.get(vehicle_id)
    
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404
    
    if 'name' in data:
        vehicle.name = data['name']
    
    if 'device_id' in data:
        existing = Vehicle.query.filter_by(device_id=data['device_id']).first()
        if existing and existing.id != vehicle_id:
            return jsonify({'error': 'Device ID already exists'}), 400
        vehicle.device_id = data['device_id']
    
    if 'is_active' in data:
        vehicle.is_active = data['is_active']
    
    db.session.commit()
    return jsonify({'message': 'Vehicle updated successfully'})

@app.route('/api/vehicles/<int:vehicle_id>', methods=['DELETE'])
@login_required
def delete_vehicle(vehicle_id):
    vehicle = Vehicle.query.get(vehicle_id)
    
    if not vehicle:
        return jsonify({'error': 'Vehicle not found'}), 404
    
    db.session.delete(vehicle)
    db.session.commit()
    return jsonify({'message': 'Vehicle deleted successfully'})

@app.route('/api/places-of-interest', methods=['GET'])
@login_required
def get_places_of_interest():
    from app.models import PlaceOfInterest

    # Get query parameters for search and filter
    search = request.args.get('search', '').strip()
    area_filter = request.args.get('area', '').strip()

    # Start with base query
    query = PlaceOfInterest.query

    # Apply search filter (search by name)
    if search:
        query = query.filter(PlaceOfInterest.name.ilike(f'%{search}%'))

    # Apply area filter
    if area_filter:
        query = query.filter(PlaceOfInterest.area.ilike(f'%{area_filter}%'))

    places = query.order_by(PlaceOfInterest.created_at.desc()).all()

    return jsonify([{
        'id': p.id,
        'name': p.name,
        'address': p.address,
        'area': p.area,
        'contact': p.contact,
        'telephone': p.telephone,
        'latitude': p.latitude,
        'longitude': p.longitude,
        'category': p.category,
        'description': p.description,
        'created_at': p.created_at.isoformat(),
        'created_by': p.creator.username if p.creator else None
    } for p in places])

@app.route('/api/places-of-interest', methods=['POST'])
@login_required
def create_place_of_interest():
    from app.models import PlaceOfInterest
    data = request.json
    
    place = PlaceOfInterest(
        name=data['name'],
        address=data.get('address', ''),
        area=data.get('area', ''),
        contact=data.get('contact', ''),
        telephone=data.get('telephone', ''),
        latitude=float(data['latitude']),
        longitude=float(data['longitude']),
        category=data.get('category', 'General'),
        description=data.get('description', ''),
        created_by=current_user.id
    )
    
    db.session.add(place)
    db.session.commit()
    
    return jsonify({
        'message': 'Place of interest created successfully',
        'place': {
            'id': place.id,
            'name': place.name,
            'latitude': place.latitude,
            'longitude': place.longitude
        }
    }), 201

@app.route('/api/places-of-interest/<int:place_id>', methods=['PUT'])
@login_required
def update_place_of_interest(place_id):
    from app.models import PlaceOfInterest
    place = PlaceOfInterest.query.get(place_id)
    
    if not place:
        return jsonify({'error': 'Place not found'}), 404
    
    data = request.json
    
    if 'name' in data:
        place.name = data['name']
    if 'address' in data:
        place.address = data['address']
    if 'area' in data:
        place.area = data['area']
    if 'contact' in data:
        place.contact = data['contact']
    if 'telephone' in data:
        place.telephone = data['telephone']
    if 'latitude' in data:
        place.latitude = float(data['latitude'])
    if 'longitude' in data:
        place.longitude = float(data['longitude'])
    if 'category' in data:
        place.category = data['category']
    if 'description' in data:
        place.description = data['description']
    
    db.session.commit()
    return jsonify({'message': 'Place updated successfully'})


@app.route('/api/reports/visits', methods=['GET'])
@login_required
def report_visits():
    """Return places of interest visited in a date range, visit counts and vehicles involved.
    Query params:
      - start: ISO date/time or date (optional, default 7 days ago)
      - end: ISO date/time or date (optional, default now)
      - area: filter by area (optional)
    """
    from app.models import PlaceOfInterest
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
    except Exception:
        return jsonify({'error': 'Invalid date format. Use ISO format (YYYY-MM-DD or YYYY-MM-DDTHH:MM:SS)'}), 400

    # Load saved locations (visits) in time window
    visits = SavedLocation.query.filter(SavedLocation.timestamp >= start, SavedLocation.timestamp <= end).all()

    # Load places to match against, optionally filtered by area
    query = PlaceOfInterest.query
    if area_filter:
        query = query.filter(PlaceOfInterest.area.ilike(f'%{area_filter}%'))
    places = query.all()

    # Helper to find matching place within threshold (km)
    threshold_km = 0.2

    def find_place_for_coord(lat, lon):
        best = None
        best_dist = None
        for p in places:
            d = calculate_distance(lat, lon, p.latitude, p.longitude)
            if best is None or d < best_dist:
                best = p
                best_dist = d
        if best and best_dist is not None and best_dist <= threshold_km:
            return best
        return None

    report = {}

    for v in visits:
        p = find_place_for_coord(v.latitude, v.longitude)
        if not p:
            continue

        if p.id not in report:
            report[p.id] = {
                'place_id': p.id,
                'name': p.name,
                'address': p.address,
                'area': p.area,
                'contact': p.contact,
                'telephone': p.telephone,
                'latitude': p.latitude,
                'longitude': p.longitude,
                'visits': 0,
                'vehicles': {},
                'last_visited': None
            }

        rec = report[p.id]
        rec['visits'] += 1
        rec['last_visited'] = max(rec['last_visited'], v.timestamp.isoformat()) if rec['last_visited'] else v.timestamp.isoformat()

        veh = Vehicle.query.get(v.vehicle_id)
        if veh:
            if veh.id not in rec['vehicles']:
                rec['vehicles'][veh.id] = {'id': veh.id, 'name': veh.name, 'count': 0}
            rec['vehicles'][veh.id]['count'] += 1

    # Prepare list
    out = []
    for pid, r in report.items():
        vehicles_list = list(r['vehicles'].values())
        out.append({
            'place_id': r['place_id'],
            'name': r['name'],
            'address': r['address'],
            'contact': r.get('contact'),
            'telephone': r.get('telephone'),
            'latitude': r['latitude'],
            'longitude': r['longitude'],
            'visits': r['visits'],
            'vehicles': vehicles_list,
            'last_visited': r['last_visited']
        })

    # sort by visits desc
    out.sort(key=lambda x: x['visits'], reverse=True)

    return jsonify({'start': start.isoformat(), 'end': end.isoformat(), 'results': out})

@app.route('/api/places-of-interest/<int:place_id>', methods=['DELETE'])
@login_required
def delete_place_of_interest(place_id):
    from app.models import PlaceOfInterest
    place = PlaceOfInterest.query.get(place_id)
    
    if not place:
        return jsonify({'error': 'Place not found'}), 404
    
    db.session.delete(place)
    db.session.commit()
    return jsonify({'message': 'Place deleted successfully'})

import time
from functools import wraps

# Rate limiting for Nominatim (max 1 request per second per Nominatim usage policy)
_last_nominatim_request = 0
_nominatim_lock = None

def rate_limit_nominatim():
    """Ensure we don't exceed 1 request per second to Nominatim"""
    global _last_nominatim_request
    current_time = time.time()
    time_since_last = current_time - _last_nominatim_request
    if time_since_last < 1.0:
        time.sleep(1.0 - time_since_last)
    _last_nominatim_request = time.time()

@app.route('/api/geocode', methods=['GET'])
@login_required
def geocode_address():
    """Geocode address using local Nominatim instance"""
    address = request.args.get('address', '')

    if not address:
        return jsonify({'error': 'Address parameter required'}), 400

    import urllib.parse
    import urllib.request
    import json
    import traceback

    # Get Nominatim URL from environment or use local instance
    nominatim_url = os.getenv('NOMINATIM_URL', 'http://nominatim:8080')

    # Only apply rate limiting for public Nominatim
    if 'nominatim.openstreetmap.org' in nominatim_url:
        rate_limit_nominatim()

    try:
        # Add Suriname to the search query for better results
        full_query = f"{address}, Suriname"
        encoded_query = urllib.parse.quote(full_query)

        # Suriname bounding box: roughly -58.1 to -53.9 longitude, 2.0 to 6.0 latitude
        # Paramaribo center: approximately 5.8520, -55.2038
        # viewbox format: left,top,right,bottom (lon_min,lat_max,lon_max,lat_min)
        viewbox = '-58.1,6.0,-53.9,2.0'

        # Build URL for local or public Nominatim
        url = (f'{nominatim_url}/search?'
               f'q={encoded_query}&'
               f'format=json&'
               f'limit=10&'
               f'viewbox={viewbox}&'
               f'bounded=0')  # Don't restrict to viewbox, just bias results

        app.logger.info(f"[GEOCODE] Requesting: {url}")

        req = urllib.request.Request(url)
        # Nominatim requires a valid User-Agent
        req.add_header('User-Agent', 'GPS-Tracker-Suriname/1.0 (Vehicle Tracking System)')
        # Note: Don't set Accept header - Nominatim returns format based on 'format=' param
        req.add_header('Accept-Language', 'en')

        with urllib.request.urlopen(req, timeout=10) as response:
            response_text = response.read().decode()
            app.logger.info(f"[GEOCODE] Response status: {response.status}")
            data = json.loads(response_text)

        app.logger.info(f"[GEOCODE] Found {len(data)} results from {nominatim_url}")

        results = [{
            'name': item.get('display_name', ''),
            'latitude': float(item.get('lat', 0)),
            'longitude': float(item.get('lon', 0)),
            'type': item.get('type', ''),
            'importance': item.get('importance', 0)
        } for item in data]

        return jsonify(results)

    except urllib.error.HTTPError as e:
        error_msg = f"HTTP Error {e.code}: {e.reason}"
        app.logger.error(f"[GEOCODE ERROR] {error_msg}")
        if 'nominatim.openstreetmap.org' in nominatim_url:
            app.logger.error(f"[GEOCODE ERROR] This usually means Nominatim is blocking requests. Consider using a local Nominatim instance.")
        return jsonify({'error': error_msg}), 500
    except urllib.error.URLError as e:
        error_msg = f"URL Error: {e.reason}"
        app.logger.error(f"[GEOCODE ERROR] {error_msg}")
        app.logger.error(f"[GEOCODE ERROR] Is the Nominatim service running? Check: docker compose logs nominatim")
        return jsonify({'error': error_msg}), 500
    except Exception as e:
        error_msg = str(e)
        app.logger.error(f"[GEOCODE ERROR] {error_msg}")
        app.logger.error(f"[GEOCODE ERROR] Traceback: {traceback.format_exc()}")
        return jsonify({'error': error_msg}), 500

# Backup/Restore functionality
BACKUP_DIR = '/app/backups'
os.makedirs(BACKUP_DIR, exist_ok=True)

def verify_backup(backup_filename):
    """Verify backup integrity using multiple checks"""
    try:
        backup_path = os.path.join(BACKUP_DIR, backup_filename)

        # Check 1: File exists and has reasonable size
        if not os.path.exists(backup_path):
            return {'valid': False, 'error': 'Backup file not found'}

        size = os.path.getsize(backup_path)
        if size < 10240:  # Less than 10KB
            return {'valid': False, 'error': f'Backup file too small: {size} bytes'}

        # Check 2: Validate PostgreSQL format using pg_restore --list
        db_url = app.config['SQLALCHEMY_DATABASE_URI']
        import urllib.parse
        parsed = urllib.parse.urlparse(db_url)

        env = os.environ.copy()
        env['PGPASSWORD'] = urllib.parse.unquote(parsed.password)

        cmd = [
            'pg_restore',
            '--list',
            backup_path
        ]

        result = subprocess.run(cmd, env=env, capture_output=True, text=True)

        if result.returncode != 0:
            return {'valid': False, 'error': f'Invalid PostgreSQL format: {result.stderr[:200]}'}

        # Check 3: Verify table count
        table_count = result.stdout.count('TABLE DATA')
        if table_count < 5:  # Expect at least 5 tables
            return {'valid': False, 'error': f'Only {table_count} tables found (expected 5+)'}

        # Check 4: Generate and store MD5 checksum
        import hashlib
        md5_hash = hashlib.md5()
        with open(backup_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                md5_hash.update(chunk)
        checksum = md5_hash.hexdigest()

        # Save checksum to file
        checksum_file = f'{backup_path}.md5'
        with open(checksum_file, 'w') as f:
            f.write(f'{checksum}  {backup_filename}\n')

        app.logger.info(f"Backup verification passed: {backup_filename}")
        app.logger.info(f"  Size: {size} bytes, Tables: {table_count}, Checksum: {checksum}")

        return {
            'valid': True,
            'size': size,
            'table_count': table_count,
            'checksum': checksum
        }

    except Exception as e:
        app.logger.error(f"Backup verification error: {str(e)}")
        return {'valid': False, 'error': str(e)}

def create_backup(backup_name=None):
    """Create a database backup using pg_dump"""
    try:
        if not backup_name:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_name = f'backup_{timestamp}.sql'

        backup_path = os.path.join(BACKUP_DIR, backup_name)

        # Get database connection details from DATABASE_URL
        db_url = app.config['SQLALCHEMY_DATABASE_URI']
        # Parse postgresql://user:pass@host:port/dbname
        import urllib.parse
        parsed = urllib.parse.urlparse(db_url)

        # Set environment variables for pg_dump
        env = os.environ.copy()
        # URL-decode the password (handles %2F, %3D, etc.)
        env['PGPASSWORD'] = urllib.parse.unquote(parsed.password)

        # Run pg_dump
        cmd = [
            'pg_dump',
            '-h', parsed.hostname,
            '-p', str(parsed.port or 5432),
            '-U', parsed.username,
            '-d', parsed.path[1:],  # Remove leading /
            '-F', 'c',  # Custom format for better compression
            '-f', backup_path
        ]

        result = subprocess.run(cmd, env=env, capture_output=True, text=True)

        if result.returncode != 0:
            raise Exception(f"pg_dump failed: {result.stderr}")

        # Get file size
        size = os.path.getsize(backup_path)

        # Verify backup integrity immediately after creation
        app.logger.info(f"Verifying backup integrity: {backup_name}")
        verification = verify_backup(backup_name)

        if not verification['valid']:
            error_msg = f"Backup verification failed: {verification['error']}"
            app.logger.error(error_msg)
            # Delete invalid backup
            if os.path.exists(backup_path):
                os.remove(backup_path)
            raise Exception(error_msg)

        app.logger.info(f"Backup created and verified successfully: {backup_name}")

        return {
            'filename': backup_name,
            'path': backup_path,
            'size': size,
            'created_at': datetime.now().isoformat(),
            'verified': True,
            'checksum': verification.get('checksum')
        }
    except Exception as e:
        app.logger.error(f"Backup error: {str(e)}")
        raise

def restore_backup(backup_filename):
    """Restore database from backup using pg_restore"""
    try:
        backup_path = os.path.join(BACKUP_DIR, backup_filename)

        if not os.path.exists(backup_path):
            raise Exception(f"Backup file not found: {backup_filename}")

        # Get database connection details
        db_url = app.config['SQLALCHEMY_DATABASE_URI']
        import urllib.parse
        parsed = urllib.parse.urlparse(db_url)

        env = os.environ.copy()
        # URL-decode the password (handles %2F, %3D, etc.)
        env['PGPASSWORD'] = urllib.parse.unquote(parsed.password)

        # Close all database connections before restore
        with app.app_context():
            try:
                db.session.remove()
                db.engine.dispose()
            except:
                pass

        app.logger.info(f"Starting restore from {backup_filename}...")

        # Run pg_restore with clean option and verbose output
        cmd = [
            'pg_restore',
            '-h', parsed.hostname,
            '-p', str(parsed.port or 5432),
            '-U', parsed.username,
            '-d', parsed.path[1:],
            '-c',  # Clean (drop) database objects before recreating
            '--if-exists',  # Don't error if objects don't exist
            '-v',  # Verbose mode
            backup_path
        ]

        result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=300)

        # Log output for debugging
        if result.stdout:
            app.logger.info(f"pg_restore output: {result.stdout[:500]}")
        if result.stderr:
            # pg_restore outputs warnings to stderr even on success
            app.logger.info(f"pg_restore stderr: {result.stderr[:500]}")

        # Check for actual errors (not warnings)
        if result.returncode != 0:
            # pg_restore may return 1 for warnings, check for actual ERRORs
            if 'FATAL' in result.stderr or 'could not connect' in result.stderr.lower():
                raise Exception(f"pg_restore failed with critical error: {result.stderr}")
            else:
                app.logger.warning(f"pg_restore completed with warnings (return code {result.returncode})")

        app.logger.info("Restore completed successfully")
        return True
    except subprocess.TimeoutExpired:
        app.logger.error("Restore operation timed out after 300 seconds")
        raise Exception("Restore operation timed out. The backup file may be too large.")
    except Exception as e:
        error_msg = str(e)
        app.logger.error(f"Restore error: {error_msg}")
        raise Exception(f"Restore failed: {error_msg}")

def automatic_backup():
    """Scheduled automatic backup using new organized backup structure"""
    try:
        app.logger.info("Running automatic backup with new backup manager...")

        # Use the new backup-manager.sh script for organized backups
        # This creates full backups on Sundays, daily backups on other days
        # Organized in YYYY/MM/DD folder structure with 180-day retention
        script_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'backup-manager.sh')

        result = subprocess.run(
            [script_path, '--auto'],
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout
        )

        if result.returncode == 0:
            app.logger.info("Automatic backup completed successfully")
            app.logger.info(f"Backup output: {result.stdout}")

            # Run cleanup to enforce 180-day retention policy
            cleanup_result = subprocess.run(
                [script_path, '--cleanup'],
                capture_output=True,
                text=True,
                timeout=300
            )

            if cleanup_result.returncode == 0:
                app.logger.info("Backup cleanup completed")
            else:
                app.logger.warning(f"Backup cleanup had issues: {cleanup_result.stderr}")

            # Run archiving for backups >30 days old
            archive_result = subprocess.run(
                [script_path, '--archive'],
                capture_output=True,
                text=True,
                timeout=600
            )

            if archive_result.returncode == 0:
                app.logger.info("Backup archiving completed")
            else:
                app.logger.warning(f"Backup archiving had issues: {archive_result.stderr}")

        else:
            app.logger.error(f"Automatic backup failed: {result.stderr}")
            raise Exception(f"Backup script failed: {result.stderr}")

    except subprocess.TimeoutExpired:
        app.logger.error("Automatic backup timed out")
    except Exception as e:
        app.logger.error(f"Automatic backup failed: {str(e)}")

@app.route('/api/backups', methods=['GET'])
@login_required
def list_backups():
    """List all available backups from organized structure"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    try:
        backups = []

        # Try to read from backup index first (faster)
        index_file = os.path.join(BACKUP_DIR, 'index', 'backup_index.json')
        if os.path.exists(index_file):
            try:
                import json
                with open(index_file, 'r') as f:
                    index_data = json.load(f)
                    return jsonify({'backups': index_data.get('backups', [])})
            except Exception as e:
                app.logger.warning(f"Could not read backup index: {e}")

        # Fallback: scan directories directly
        # Scan full backups
        for backup_file in glob.glob(os.path.join(BACKUP_DIR, 'full', '*', '*', '*', 'backup_full_*.sql*')):
            filename = os.path.basename(backup_file)
            stat_info = os.stat(backup_file)
            relative_path = os.path.relpath(backup_file, BACKUP_DIR)

            # Check for metadata
            metadata_file = backup_file.replace('.sql.gz', '.sql.metadata.json').replace('.sql', '.metadata.json')
            metadata = {}
            if os.path.exists(metadata_file):
                try:
                    import json
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                except:
                    pass

            backups.append({
                'filename': filename,
                'relative_path': relative_path,
                'backup_type': 'full',
                'size': stat_info.st_size,
                'created_at': metadata.get('created_at', datetime.fromtimestamp(stat_info.st_mtime).isoformat()),
                'compressed': filename.endswith('.gz'),
                'verified': metadata.get('verified', False),
                'checksum_md5': metadata.get('checksum_md5', ''),
                'table_count': metadata.get('table_count', 0)
            })

        # Scan daily backups
        for backup_file in glob.glob(os.path.join(BACKUP_DIR, 'daily', '*', '*', '*', 'backup_daily_*.sql*')):
            filename = os.path.basename(backup_file)
            stat_info = os.stat(backup_file)
            relative_path = os.path.relpath(backup_file, BACKUP_DIR)

            # Check for metadata
            metadata_file = backup_file.replace('.sql.gz', '.sql.metadata.json').replace('.sql', '.metadata.json')
            metadata = {}
            if os.path.exists(metadata_file):
                try:
                    import json
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                except:
                    pass

            backups.append({
                'filename': filename,
                'relative_path': relative_path,
                'backup_type': 'daily',
                'size': stat_info.st_size,
                'created_at': metadata.get('created_at', datetime.fromtimestamp(stat_info.st_mtime).isoformat()),
                'compressed': filename.endswith('.gz'),
                'verified': metadata.get('verified', False),
                'checksum_md5': metadata.get('checksum_md5', ''),
                'table_count': metadata.get('table_count', 0)
            })

        # Sort by creation time, newest first
        backups.sort(key=lambda x: x['created_at'], reverse=True)

        return jsonify({'backups': backups})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/backups/create', methods=['POST'])
@login_required
def create_manual_backup():
    """Create a manual backup"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    try:
        data = request.get_json() or {}
        name = data.get('name', '')

        # Sanitize filename
        if name:
            name = ''.join(c for c in name if c.isalnum() or c in '._-')
            if not name.endswith('.sql'):
                name = f'{name}.sql'
            backup_name = f'manual_{name}'
        else:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_name = f'manual_{timestamp}.sql'

        backup_info = create_backup(backup_name)

        return jsonify({
            'message': 'Backup created successfully',
            'backup': backup_info
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/backups/restore', methods=['POST'])
@login_required
def restore_from_backup():
    """Restore database from a backup"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    try:
        data = request.get_json()
        filename = data.get('filename')

        if not filename:
            return jsonify({'error': 'Filename required'}), 400

        # Security: ensure filename doesn't contain path traversal
        if '..' in filename or '/' in filename:
            return jsonify({'error': 'Invalid filename'}), 400

        restore_backup(filename)

        return jsonify({'message': 'Database restored successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/backups/download/<filename>', methods=['GET'])
@login_required
def download_backup(filename):
    """Download a backup file"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    try:
        # Security check
        if '..' in filename or '/' in filename:
            return jsonify({'error': 'Invalid filename'}), 400

        backup_path = os.path.join(BACKUP_DIR, filename)

        if not os.path.exists(backup_path):
            return jsonify({'error': 'Backup not found'}), 404

        return send_file(backup_path, as_attachment=True, download_name=filename)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/backups/delete/<filename>', methods=['DELETE'])
@login_required
def delete_backup(filename):
    """Delete a backup file"""
    if current_user.role != 'admin':
        return jsonify({'error': 'Admin access required'}), 403

    try:
        # Security check
        if '..' in filename or '/' in filename:
            return jsonify({'error': 'Invalid filename'}), 400

        backup_path = os.path.join(BACKUP_DIR, filename)

        if not os.path.exists(backup_path):
            return jsonify({'error': 'Backup not found'}), 404

        os.remove(backup_path)

        return jsonify({'message': 'Backup deleted successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Initialize scheduler for automatic backups
scheduler = BackgroundScheduler()
# Run automatic backup every day at 2 AM
scheduler.add_job(func=automatic_backup, trigger="cron", hour=2, minute=0)
scheduler.start()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')

"""
Pytest configuration and fixtures for backend tests
Provides comprehensive test fixtures for all models and authentication scenarios
"""
import os
# Set test database URL before importing the app to ensure proper initialization
os.environ.setdefault('DATABASE_URL', 'sqlite:///:memory:')
os.environ.setdefault('SECRET_KEY', 'test-secret-key-for-pytest')

import pytest
from datetime import datetime, timedelta
from app.main import app, db
from app.models import User, Vehicle, Location, SavedLocation, PlaceOfInterest, AuditLog
from flask_bcrypt import Bcrypt


@pytest.fixture(scope='session')
def app_config():
    """Configure Flask app for testing"""
    app.config['TESTING'] = True
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    app.config['WTF_CSRF_ENABLED'] = False
    return app


@pytest.fixture(scope='session')
def _app(app_config):
    """Create application for test session"""
    with app_config.app_context():
        db.create_all()
        yield app_config
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(_app):
    """Flask test client"""
    return _app.test_client()


@pytest.fixture
def app_context(_app):
    """Application context for tests"""
    with _app.app_context():
        yield _app


@pytest.fixture
def admin_user(app_context):
    """Create a test admin user"""
    bcrypt = Bcrypt(app)
    user = User(
        username='admin_test',
        email='admin@test.local',
        password_hash=bcrypt.generate_password_hash('TestPassword123!').decode('utf-8'),
        role='admin'
    )
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def manager_user(app_context):
    """Create a test manager user"""
    bcrypt = Bcrypt(app)
    user = User(
        username='manager_test',
        email='manager@test.local',
        password_hash=bcrypt.generate_password_hash('TestPassword123!').decode('utf-8'),
        role='manager'
    )
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def viewer_user(app_context):
    """Create a test viewer user"""
    bcrypt = Bcrypt(app)
    user = User(
        username='viewer_test',
        email='viewer@test.local',
        password_hash=bcrypt.generate_password_hash('TestPassword123!').decode('utf-8'),
        role='viewer'
    )
    db.session.add(user)
    db.session.commit()
    return user


@pytest.fixture
def test_vehicle(app_context):
    """Create a test vehicle"""
    vehicle = Vehicle(name='Test Vehicle', device_id='test_device_001')
    db.session.add(vehicle)
    db.session.commit()
    return vehicle


@pytest.fixture
def auth_headers(client, admin_user):
    """Create auth headers for a test user"""
    response = client.post('/api/auth/login', json={
        'username': 'admin_test',
        'password': 'TestPassword123!'
    })
    # Note: In a real test, you'd extract session cookies or tokens
    return {}


@pytest.fixture
def test_locations(app_context, test_vehicle):
    """Create multiple test locations for location history testing"""
    locations = []
    now = datetime.utcnow()
    for i in range(10):
        location = Location(
            vehicle_id=test_vehicle.id,
            latitude=5.8520 + (i * 0.001),
            longitude=-55.2038 + (i * 0.001),
            speed=40 + (i * 2),
            timestamp=now - timedelta(minutes=(10-i)*5)
        )
        locations.append(location)
    db.session.add_all(locations)
    db.session.commit()
    return locations


@pytest.fixture
def test_saved_location(app_context, test_vehicle):
    """Create test saved location (detected stop)"""
    location = SavedLocation(
        vehicle_id=test_vehicle.id,
        name='Test Stop Location',
        latitude=5.8520,
        longitude=-55.2038,
        stop_duration_minutes=15,
        visit_type='delivery',
        notes='Test delivery stop',
        timestamp=datetime.utcnow()
    )
    db.session.add(location)
    db.session.commit()
    return location


@pytest.fixture
def test_place_of_interest(app_context, admin_user):
    """Create test place of interest"""
    place = PlaceOfInterest(
        name='Test Warehouse',
        address='123 Main St, Paramaribo',
        area='Downtown',
        contact='John Doe',
        telephone='+597-123-4567',
        latitude=5.8520,
        longitude=-55.2038,
        category='Warehouse',
        description='Test warehouse location',
        created_by=admin_user.id
    )
    db.session.add(place)
    db.session.commit()
    return place


@pytest.fixture
def test_places(app_context, admin_user):
    """Create multiple test places of interest"""
    places = []
    for i in range(5):
        place = PlaceOfInterest(
            name=f'Test Location {i+1}',
            address=f'{100+i} Street {i+1}',
            area='Test Area',
            category='test',
            latitude=5.8520 + (i * 0.01),
            longitude=-55.2038 + (i * 0.01),
            created_by=admin_user.id
        )
        places.append(place)
    db.session.add_all(places)
    db.session.commit()
    return places


@pytest.fixture
def authenticated_client(client, admin_user):
    """Create authenticated test client with admin user session"""
    # Login the user
    response = client.post('/api/auth/login', json={
        'username': 'admin_test',
        'password': 'TestPassword123!'
    })
    assert response.status_code == 200
    return client


@pytest.fixture(autouse=True)
def clean_db(app_context):
    """Clean database after each test"""
    yield
    db.session.rollback()
    for table in reversed(db.metadata.sorted_tables):
        db.session.execute(table.delete())
    db.session.commit()

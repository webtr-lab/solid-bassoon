"""
Vehicle API endpoint tests
"""
import pytest
from app.models import Vehicle, Location


@pytest.mark.api
class TestVehicleAPI:
    """Test vehicle endpoints"""

    def test_get_vehicles_not_authenticated(self, client):
        """Test getting vehicles without authentication"""
        response = client.get('/api/vehicles')
        assert response.status_code == 401

    def test_get_vehicles_authenticated(self, client, admin_user, test_vehicle):
        """Test getting vehicles with authentication"""
        client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPassword123!'
        })

        response = client.get('/api/vehicles')
        assert response.status_code == 200
        data = response.get_json()
        assert 'data' in data
        assert 'meta' in data
        assert len(data['data']) > 0

    def test_create_vehicle_as_admin(self, client, admin_user):
        """Test creating a vehicle as admin"""
        client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPassword123!'
        })

        response = client.post('/api/vehicles', json={
            'name': 'New Vehicle',
            'device_id': 'new_device_001'
        })
        assert response.status_code == 201
        data = response.get_json()
        assert data['vehicle']['name'] == 'New Vehicle'
        assert data['vehicle']['device_id'] == 'new_device_001'

    def test_create_vehicle_as_viewer(self, client, viewer_user):
        """Test creating a vehicle as viewer (should fail)"""
        client.post('/api/auth/login', json={
            'username': 'viewer_test',
            'password': 'TestPassword123!'
        })

        response = client.post('/api/vehicles', json={
            'name': 'New Vehicle',
            'device_id': 'new_device_001'
        })
        assert response.status_code == 403

    def test_create_vehicle_duplicate_device_id(self, client, admin_user, test_vehicle):
        """Test creating vehicle with duplicate device_id"""
        client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPassword123!'
        })

        response = client.post('/api/vehicles', json={
            'name': 'Another Vehicle',
            'device_id': 'test_device_001'  # Already exists
        })
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_create_vehicle_missing_fields(self, client, admin_user):
        """Test creating vehicle with missing required fields"""
        client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPassword123!'
        })

        response = client.post('/api/vehicles', json={
            'name': 'New Vehicle'
            # Missing device_id
        })
        assert response.status_code == 400

    def test_update_vehicle(self, client, admin_user, test_vehicle):
        """Test updating a vehicle"""
        client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPassword123!'
        })

        response = client.put(f'/api/vehicles/{test_vehicle.id}', json={
            'name': 'Updated Vehicle Name'
        })
        assert response.status_code == 200

        # Verify update
        vehicle = Vehicle.query.get(test_vehicle.id)
        assert vehicle.name == 'Updated Vehicle Name'

    def test_update_nonexistent_vehicle(self, client, admin_user):
        """Test updating a nonexistent vehicle"""
        client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPassword123!'
        })

        response = client.put('/api/vehicles/99999', json={
            'name': 'Updated Name'
        })
        assert response.status_code == 404

    def test_delete_vehicle(self, client, admin_user, test_vehicle):
        """Test deleting a vehicle"""
        client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPassword123!'
        })

        vehicle_id = test_vehicle.id
        response = client.delete(f'/api/vehicles/{vehicle_id}')
        assert response.status_code == 200

        # Verify deletion
        vehicle = Vehicle.query.get(vehicle_id)
        assert vehicle is None

    def test_delete_nonexistent_vehicle(self, client, admin_user):
        """Test deleting a nonexistent vehicle"""
        client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPassword123!'
        })

        response = client.delete('/api/vehicles/99999')
        assert response.status_code == 404

    def test_get_vehicle_location(self, client, admin_user, test_vehicle, app_context):
        """Test getting vehicle location"""
        from app.models import db
        from datetime import datetime

        # Add a location
        location = Location(
            vehicle_id=test_vehicle.id,
            latitude=5.8520,
            longitude=-55.2038,
            speed=50.0,
            timestamp=datetime.utcnow()
        )
        db.session.add(location)
        db.session.commit()

        client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPassword123!'
        })

        response = client.get(f'/api/vehicles/{test_vehicle.id}/location')
        assert response.status_code == 200
        data = response.get_json()
        assert data['latitude'] == 5.8520
        assert data['longitude'] == -55.2038

    def test_get_vehicle_location_not_found(self, client, admin_user, test_vehicle):
        """Test getting location for vehicle with no location data"""
        client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPassword123!'
        })

        response = client.get(f'/api/vehicles/{test_vehicle.id}/location')
        assert response.status_code == 404

"""
Tests for location/GPS endpoints
Tests GPS data submission, history retrieval, and stop detection
"""

import pytest
from datetime import datetime, timedelta
from app.models import Location, SavedLocation


class TestGPSEndpoint:
    """Tests for POST /api/gps endpoint - GPS data submission from devices"""

    def test_gps_submit_valid_location(self, client, test_vehicle):
        """Test submitting valid GPS location data"""
        response = client.post('/api/gps', json={
            'device_id': test_vehicle.device_id,
            'latitude': 5.8520,
            'longitude': -55.2038,
            'speed': 45.5
        })

        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'Location recorded'

        # Verify location was saved
        location = Location.query.filter_by(vehicle_id=test_vehicle.id).first()
        assert location is not None
        assert location.latitude == 5.8520
        assert location.longitude == -55.2038
        assert location.speed == 45.5

    def test_gps_submit_invalid_latitude(self, client, test_vehicle):
        """Test submitting GPS with invalid latitude"""
        response = client.post('/api/gps', json={
            'device_id': test_vehicle.device_id,
            'latitude': 95.0,  # Invalid: > 90
            'longitude': -55.2038,
            'speed': 45.5
        })

        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_gps_submit_invalid_longitude(self, client, test_vehicle):
        """Test submitting GPS with invalid longitude"""
        response = client.post('/api/gps', json={
            'device_id': test_vehicle.device_id,
            'latitude': 5.8520,
            'longitude': 185.0,  # Invalid: > 180
            'speed': 45.5
        })

        assert response.status_code == 400

    def test_gps_submit_invalid_speed(self, client, test_vehicle):
        """Test submitting GPS with invalid speed"""
        response = client.post('/api/gps', json={
            'device_id': test_vehicle.device_id,
            'latitude': 5.8520,
            'longitude': -55.2038,
            'speed': 400  # Invalid: > 350
        })

        assert response.status_code == 400

    def test_gps_submit_missing_device_id(self, client):
        """Test GPS submission without device_id"""
        response = client.post('/api/gps', json={
            'latitude': 5.8520,
            'longitude': -55.2038,
            'speed': 45.5
        })

        assert response.status_code == 400

    def test_gps_submit_missing_coordinates(self, client, test_vehicle):
        """Test GPS submission with missing coordinates"""
        response = client.post('/api/gps', json={
            'device_id': test_vehicle.device_id,
            'speed': 45.5
        })

        assert response.status_code == 400

    def test_gps_submit_nonexistent_device(self, client):
        """Test GPS submission for non-existent device"""
        response = client.post('/api/gps', json={
            'device_id': 'nonexistent_device',
            'latitude': 5.8520,
            'longitude': -55.2038,
            'speed': 45.5
        })

        # Should either fail or create new vehicle (depending on implementation)
        assert response.status_code in [200, 400, 404]


class TestVehicleLocationEndpoint:
    """Tests for GET /api/vehicles/:id/location - Latest vehicle location"""

    def test_get_latest_location(self, authenticated_client, test_vehicle, test_location):
        """Test retrieving latest vehicle location"""
        response = authenticated_client.get(f'/api/vehicles/{test_vehicle.id}/location')

        assert response.status_code == 200
        data = response.get_json()
        assert data['latitude'] == test_location.latitude
        assert data['longitude'] == test_location.longitude

    def test_get_latest_location_no_data(self, authenticated_client, app_context):
        """Test getting location for vehicle with no history"""
        from app.models import Vehicle, db
        vehicle = Vehicle(name='Empty Vehicle', device_id='empty_001')
        db.session.add(vehicle)
        db.session.commit()

        response = authenticated_client.get(f'/api/vehicles/{vehicle.id}/location')

        assert response.status_code == 404

    def test_get_latest_location_nonexistent_vehicle(self, authenticated_client):
        """Test getting location for non-existent vehicle"""
        response = authenticated_client.get('/api/vehicles/9999/location')

        assert response.status_code == 404


class TestVehicleHistoryEndpoint:
    """Tests for GET /api/vehicles/:id/history - Vehicle location history"""

    def test_get_history_24_hours(self, authenticated_client, test_vehicle, test_locations):
        """Test retrieving 24-hour location history"""
        response = authenticated_client.get(
            f'/api/vehicles/{test_vehicle.id}/history?hours=24'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 10  # We created 10 test locations
        # Should be ordered by timestamp descending
        assert data[0]['timestamp'] > data[-1]['timestamp']

    def test_get_history_default_hours(self, authenticated_client, test_vehicle, test_locations):
        """Test retrieving history with default hours (24)"""
        response = authenticated_client.get(f'/api/vehicles/{test_vehicle.id}/history')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) > 0

    def test_get_history_various_timeframes(self, authenticated_client, test_vehicle, test_locations):
        """Test history with different hour parameters"""
        for hours in [1, 6, 24, 72, 168]:
            response = authenticated_client.get(
                f'/api/vehicles/{test_vehicle.id}/history?hours={hours}'
            )
            assert response.status_code == 200
            data = response.get_json()
            assert isinstance(data, list)

    def test_get_history_pagination(self, authenticated_client, test_vehicle, test_locations):
        """Test history pagination with limit and offset"""
        response = authenticated_client.get(
            f'/api/vehicles/{test_vehicle.id}/history?hours=24&limit=5&offset=0'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) <= 5

    def test_get_history_nonexistent_vehicle(self, authenticated_client):
        """Test history for non-existent vehicle"""
        response = authenticated_client.get('/api/vehicles/9999/history?hours=24')

        assert response.status_code == 404


class TestSavedLocationsEndpoint:
    """Tests for saved locations (detected stops)"""

    def test_get_saved_locations(self, authenticated_client, test_vehicle, test_saved_location):
        """Test retrieving saved locations for a vehicle"""
        response = authenticated_client.get(
            f'/api/vehicles/{test_vehicle.id}/saved-locations'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert len(data) == 1
        assert data[0]['name'] == 'Test Stop Location'
        assert data[0]['stop_duration_minutes'] == 15

    def test_create_saved_location(self, authenticated_client, test_vehicle):
        """Test creating a new saved location"""
        response = authenticated_client.post(
            f'/api/vehicles/{test_vehicle.id}/saved-locations',
            json={
                'name': 'New Stop',
                'latitude': 5.85,
                'longitude': -55.20,
                'stop_duration_minutes': 30,
                'visit_type': 'pickup',
                'notes': 'Package pickup'
            }
        )

        assert response.status_code == 201
        data = response.get_json()
        assert data['name'] == 'New Stop'

    def test_update_saved_location(self, authenticated_client, test_vehicle, test_saved_location):
        """Test updating a saved location"""
        response = authenticated_client.put(
            f'/api/vehicles/{test_vehicle.id}/saved-locations/{test_saved_location.id}',
            json={
                'name': 'Updated Stop Name',
                'notes': 'Updated notes'
            }
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['name'] == 'Updated Stop Name'

    def test_delete_saved_location(self, authenticated_client, test_vehicle, test_saved_location):
        """Test deleting a saved location"""
        response = authenticated_client.delete(
            f'/api/vehicles/{test_vehicle.id}/saved-locations/{test_saved_location.id}'
        )

        assert response.status_code == 200

        # Verify it was deleted
        location = SavedLocation.query.get(test_saved_location.id)
        assert location is None


class TestVehicleStatsEndpoint:
    """Tests for GET /api/vehicles/:id/stats - Distance and speed statistics"""

    def test_get_stats_24_hours(self, authenticated_client, test_vehicle, test_locations):
        """Test retrieving vehicle statistics"""
        response = authenticated_client.get(
            f'/api/vehicles/{test_vehicle.id}/stats?hours=24'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert 'distance_km' in data
        assert 'average_speed' in data
        assert 'max_speed' in data
        assert 'total_stops' in data

    def test_stats_values_reasonable(self, authenticated_client, test_vehicle, test_locations):
        """Test that statistics values are reasonable"""
        response = authenticated_client.get(
            f'/api/vehicles/{test_vehicle.id}/stats?hours=24'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['average_speed'] >= 0
        assert data['max_speed'] >= data['average_speed']
        assert data['distance_km'] >= 0


class TestExportEndpoint:
    """Tests for GET /api/vehicles/:id/export - Data export functionality"""

    def test_export_csv_format(self, authenticated_client, test_vehicle, test_locations):
        """Test exporting location data as CSV"""
        response = authenticated_client.get(
            f'/api/vehicles/{test_vehicle.id}/export?format=csv&hours=24'
        )

        assert response.status_code == 200
        assert 'text/csv' in response.content_type

    def test_export_json_format(self, authenticated_client, test_vehicle, test_locations):
        """Test exporting location data as JSON"""
        response = authenticated_client.get(
            f'/api/vehicles/{test_vehicle.id}/export?format=json&hours=24'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)

    def test_export_invalid_format(self, authenticated_client, test_vehicle):
        """Test export with invalid format"""
        response = authenticated_client.get(
            f'/api/vehicles/{test_vehicle.id}/export?format=invalid&hours=24'
        )

        assert response.status_code == 400


class TestGeocodingEndpoint:
    """Tests for GET /api/geocode - Address geocoding with Nominatim"""

    def test_geocode_search(self, authenticated_client):
        """Test geocoding address search"""
        response = authenticated_client.get('/api/geocode?address=Paramaribo')

        # Should succeed even if Nominatim is not available (depends on setup)
        assert response.status_code in [200, 503]

    def test_geocode_without_address(self, authenticated_client):
        """Test geocoding without address parameter"""
        response = authenticated_client.get('/api/geocode')

        assert response.status_code == 400

    def test_geocode_empty_address(self, authenticated_client):
        """Test geocoding with empty address"""
        response = authenticated_client.get('/api/geocode?address=')

        assert response.status_code == 400

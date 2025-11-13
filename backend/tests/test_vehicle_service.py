"""
Unit tests for vehicle_service module
Tests vehicle CRUD, statistics, history, and export functionality
"""
import pytest
from datetime import datetime, timedelta
from app.models import Vehicle, Location, SavedLocation
from app.services.vehicle_service import (
    get_vehicle_or_404, format_vehicle, get_vehicle_current_location,
    get_vehicle_history, get_vehicle_stats, export_vehicle_data,
    create_vehicle, update_vehicle, delete_vehicle
)


@pytest.mark.unit
class TestGetVehicleOr404:
    """Test get_vehicle_or_404 function"""

    def test_get_existing_vehicle(self, app_context, test_vehicle):
        """Test retrieving an existing vehicle"""
        vehicle = get_vehicle_or_404(test_vehicle.id)
        assert vehicle is not None
        assert vehicle.id == test_vehicle.id
        assert vehicle.name == test_vehicle.name

    def test_get_nonexistent_vehicle(self, app_context):
        """Test retrieving a nonexistent vehicle"""
        vehicle = get_vehicle_or_404(99999)
        assert vehicle is None


@pytest.mark.unit
class TestFormatVehicle:
    """Test format_vehicle function"""

    def test_format_vehicle_structure(self, app_context, test_vehicle):
        """Test vehicle formatting for JSON response"""
        formatted = format_vehicle(test_vehicle)

        assert 'id' in formatted
        assert 'name' in formatted
        assert 'device_id' in formatted
        assert 'is_active' in formatted
        assert formatted['id'] == test_vehicle.id
        assert formatted['name'] == test_vehicle.name

    def test_format_vehicle_values(self, app_context, test_vehicle):
        """Test that formatted values are correct"""
        formatted = format_vehicle(test_vehicle)

        assert formatted['device_id'] == 'test_device_001'
        assert formatted['is_active'] is True


@pytest.mark.unit
class TestCreateVehicle:
    """Test create_vehicle function"""

    def test_create_vehicle_success(self, app_context):
        """Test successful vehicle creation"""
        vehicle = create_vehicle(
            name='New Test Vehicle',
            device_id='unique_device_123'
        )

        assert vehicle is not None
        assert vehicle.name == 'New Test Vehicle'
        assert vehicle.device_id == 'unique_device_123'
        assert vehicle.is_active is True

    def test_create_vehicle_with_inactive(self, app_context):
        """Test creating inactive vehicle"""
        vehicle = create_vehicle(
            name='Inactive Vehicle',
            device_id='inactive_001',
            is_active=False
        )

        assert vehicle.is_active is False

    def test_create_vehicle_duplicate_device_id(self, app_context, test_vehicle):
        """Test creating vehicle with duplicate device_id"""
        vehicle = create_vehicle(
            name='Another Vehicle',
            device_id=test_vehicle.device_id  # Duplicate
        )

        assert vehicle is None

    def test_create_vehicle_strips_whitespace(self, app_context):
        """Test that create_vehicle strips whitespace"""
        vehicle = create_vehicle(
            name='  Vehicle Name  ',
            device_id='  device_123  '
        )

        assert vehicle.name == 'Vehicle Name'
        assert vehicle.device_id == 'device_123'


@pytest.mark.unit
class TestUpdateVehicle:
    """Test update_vehicle function"""

    def test_update_vehicle_name(self, app_context, test_vehicle):
        """Test updating vehicle name"""
        vehicle = update_vehicle(
            test_vehicle.id,
            name='Updated Name'
        )

        assert vehicle is not None
        assert vehicle.name == 'Updated Name'

    def test_update_vehicle_device_id(self, app_context, test_vehicle):
        """Test updating device_id"""
        vehicle = update_vehicle(
            test_vehicle.id,
            device_id='new_device_999'
        )

        assert vehicle.device_id == 'new_device_999'

    def test_update_vehicle_active_status(self, app_context, test_vehicle):
        """Test updating active status"""
        vehicle = update_vehicle(
            test_vehicle.id,
            is_active=False
        )

        assert vehicle.is_active is False

    def test_update_nonexistent_vehicle(self, app_context):
        """Test updating nonexistent vehicle"""
        vehicle = update_vehicle(99999, name='New Name')
        assert vehicle is None

    def test_update_vehicle_duplicate_device_id(self, app_context, test_vehicle):
        """Test updating to duplicate device_id"""
        from app.models import db

        # Create another vehicle
        vehicle2 = Vehicle(name='Vehicle 2', device_id='device_002')
        db.session.add(vehicle2)
        db.session.commit()

        # Try to update first vehicle with duplicate device_id
        result = update_vehicle(test_vehicle.id, device_id='device_002')
        assert result is None

    def test_update_vehicle_multiple_fields(self, app_context, test_vehicle):
        """Test updating multiple fields at once"""
        vehicle = update_vehicle(
            test_vehicle.id,
            name='New Name',
            is_active=False
        )

        assert vehicle.name == 'New Name'
        assert vehicle.is_active is False


@pytest.mark.unit
class TestDeleteVehicle:
    """Test delete_vehicle function"""

    def test_delete_vehicle_success(self, app_context, test_vehicle):
        """Test successful vehicle deletion"""
        vehicle_id = test_vehicle.id
        vehicle_name = test_vehicle.name

        deleted_name = delete_vehicle(vehicle_id)

        assert deleted_name == vehicle_name
        assert Vehicle.query.get(vehicle_id) is None

    def test_delete_nonexistent_vehicle(self, app_context):
        """Test deleting nonexistent vehicle"""
        result = delete_vehicle(99999)
        assert result is None


@pytest.mark.unit
class TestGetVehicleCurrentLocation:
    """Test get_vehicle_current_location function"""

    def test_get_current_location_exists(self, app_context, test_vehicle):
        """Test getting current location when it exists"""
        from app.models import db

        location = Location(
            vehicle_id=test_vehicle.id,
            latitude=5.8520,
            longitude=-55.2038,
            speed=50.0,
            timestamp=datetime.utcnow()
        )
        db.session.add(location)
        db.session.commit()

        current = get_vehicle_current_location(test_vehicle.id)

        assert current is not None
        assert current['latitude'] == 5.8520
        assert current['longitude'] == -55.2038
        assert current['speed'] == 50.0

    def test_get_current_location_not_found(self, app_context, test_vehicle):
        """Test getting current location when none exists"""
        current = get_vehicle_current_location(test_vehicle.id)
        assert current is None

    def test_get_current_location_returns_latest(self, app_context, test_vehicle):
        """Test that only the latest location is returned"""
        from app.models import db

        now = datetime.utcnow()
        # Create multiple locations
        for i in range(3):
            location = Location(
                vehicle_id=test_vehicle.id,
                latitude=5.8520 + (i * 0.001),
                longitude=-55.2038 + (i * 0.001),
                speed=40 + (i * 10),
                timestamp=now - timedelta(hours=(3-i))
            )
            db.session.add(location)
        db.session.commit()

        current = get_vehicle_current_location(test_vehicle.id)

        # Should be the most recent one
        assert current['latitude'] == pytest.approx(5.8520 + (2 * 0.001))
        assert current['speed'] == 60


@pytest.mark.unit
class TestGetVehicleHistory:
    """Test get_vehicle_history function"""

    def test_get_history_returns_list(self, app_context, test_vehicle, test_locations):
        """Test that history returns a list of locations"""
        history = get_vehicle_history(test_vehicle.id)

        assert isinstance(history, list)
        assert len(history) > 0

    def test_get_history_with_hours_filter(self, app_context, test_vehicle):
        """Test history with hour filter"""
        from app.models import db

        now = datetime.utcnow()
        # Create locations at different times
        for i in range(5):
            location = Location(
                vehicle_id=test_vehicle.id,
                latitude=5.8520,
                longitude=-55.2038,
                speed=50,
                timestamp=now - timedelta(hours=i)
            )
            db.session.add(location)
        db.session.commit()

        # Get last 2 hours
        history = get_vehicle_history(test_vehicle.id, hours=2)

        # Should have 2-3 entries (depending on exact timing)
        assert len(history) <= 3

    def test_get_history_empty(self, app_context, test_vehicle):
        """Test history for vehicle with no locations"""
        history = get_vehicle_history(test_vehicle.id)
        assert history == []

    def test_get_history_ordered_by_time(self, app_context, test_vehicle, test_locations):
        """Test that history is ordered by timestamp"""
        history = get_vehicle_history(test_vehicle.id)

        # Verify chronological order
        for i in range(len(history) - 1):
            timestamp1 = datetime.fromisoformat(history[i]['timestamp'])
            timestamp2 = datetime.fromisoformat(history[i+1]['timestamp'])
            assert timestamp1 <= timestamp2


@pytest.mark.unit
class TestGetVehicleStats:
    """Test get_vehicle_stats function"""

    def test_get_stats_structure(self, app_context, test_vehicle, test_locations):
        """Test stats return structure"""
        stats = get_vehicle_stats(test_vehicle.id)

        assert 'total_points' in stats
        assert 'avg_speed' in stats
        assert 'max_speed' in stats
        assert 'distance_km' in stats
        assert 'time_period_hours' in stats

    def test_get_stats_calculations(self, app_context, test_vehicle, test_locations):
        """Test that stats are calculated correctly"""
        stats = get_vehicle_stats(test_vehicle.id)

        assert stats['total_points'] == 10
        assert stats['avg_speed'] > 0
        assert stats['max_speed'] >= stats['avg_speed']
        assert stats['distance_km'] >= 0

    def test_get_stats_no_data(self, app_context, test_vehicle):
        """Test stats for vehicle with no location data"""
        stats = get_vehicle_stats(test_vehicle.id)

        assert stats['total_points'] == 0
        assert stats['avg_speed'] == 0
        assert stats['max_speed'] == 0
        assert stats['distance_km'] == 0

    def test_get_stats_with_hour_filter(self, app_context, test_vehicle):
        """Test stats with hour filter"""
        from app.models import db

        now = datetime.utcnow()
        for i in range(10):
            location = Location(
                vehicle_id=test_vehicle.id,
                latitude=5.8520 + (i * 0.001),
                longitude=-55.2038 + (i * 0.001),
                speed=50 + i,
                timestamp=now - timedelta(hours=i)
            )
            db.session.add(location)
        db.session.commit()

        # Get stats for last 5 hours
        stats = get_vehicle_stats(test_vehicle.id, hours=5)

        assert stats['total_points'] <= 6


@pytest.mark.unit
class TestExportVehicleData:
    """Test export_vehicle_data function"""

    def test_export_json_format(self, app_context, test_vehicle, test_locations):
        """Test exporting data in JSON format"""
        result = export_vehicle_data(test_vehicle.id, format_type='json')

        assert isinstance(result, list)
        assert len(result) > 0
        assert 'timestamp' in result[0]
        assert 'latitude' in result[0]
        assert 'longitude' in result[0]
        assert 'speed' in result[0]

    def test_export_csv_format(self, app_context, test_vehicle, test_locations):
        """Test exporting data in CSV format"""
        result = export_vehicle_data(test_vehicle.id, format_type='csv')

        assert isinstance(result, tuple)
        assert len(result) == 3  # (data, status, headers)

        data, status, headers = result
        assert status == 200
        assert 'Content-Type' in headers
        assert 'text/csv' in headers['Content-Type']
        assert 'Timestamp,Latitude,Longitude,Speed' in data

    def test_export_with_hours_filter(self, app_context, test_vehicle):
        """Test export with hour filter"""
        from app.models import db

        now = datetime.utcnow()
        for i in range(10):
            location = Location(
                vehicle_id=test_vehicle.id,
                latitude=5.8520,
                longitude=-55.2038,
                speed=50,
                timestamp=now - timedelta(hours=i)
            )
            db.session.add(location)
        db.session.commit()

        result = export_vehicle_data(test_vehicle.id, format_type='json', hours=5)

        assert len(result) <= 6

    def test_export_empty_data(self, app_context, test_vehicle):
        """Test export with no data"""
        result = export_vehicle_data(test_vehicle.id, format_type='json')
        assert result == []

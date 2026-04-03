"""
Unit tests for location_service module
Tests GPS data handling, distance calculations, and stop detection
"""
import pytest
import math
from datetime import datetime, timedelta
from app.models import Vehicle, Location, SavedLocation
from app.services.location_service import (
    calculate_distance, save_location
)


@pytest.mark.unit
class TestCalculateDistance:
    """Test Haversine distance calculation"""

    def test_distance_same_point(self):
        """Test distance from point to itself"""
        distance = calculate_distance(5.8520, -55.2038, 5.8520, -55.2038)
        assert distance < 0.0001  # Should be essentially zero

    def test_distance_known_points(self):
        """Test distance calculation between known points"""
        # Paramaribo to nearby location
        distance = calculate_distance(5.8520, -55.2038, 5.8600, -55.2100)
        assert 8 < distance < 12  # Should be roughly 10km

    def test_distance_positive(self):
        """Test that distance is always positive"""
        distance = calculate_distance(0, 0, 10, 10)
        assert distance > 0

    def test_distance_symmetry(self):
        """Test that distance(A,B) == distance(B,A)"""
        lat1, lon1 = 5.8520, -55.2038
        lat2, lon2 = 5.9000, -55.1500

        dist_ab = calculate_distance(lat1, lon1, lat2, lon2)
        dist_ba = calculate_distance(lat2, lon2, lat1, lon1)

        assert abs(dist_ab - dist_ba) < 0.0001

    def test_distance_equator_crossing(self):
        """Test distance calculation across equator"""
        distance = calculate_distance(0, 0, 1, 0)
        assert 110 < distance < 112  # Roughly 111km per degree at equator


@pytest.mark.unit
class TestSaveLocation:
    """Test save_location function"""

    def test_save_location_creates_location(self, app_context, test_vehicle):
        """Test that save_location creates a new location"""
        initial_count = Location.query.count()

        location = save_location(test_vehicle.id, 5.8520, -55.2038, 50.0)

        assert location is not None
        assert location.vehicle_id == test_vehicle.id
        assert location.latitude == 5.8520
        assert location.longitude == -55.2038
        assert location.speed == 50.0
        assert Location.query.count() == initial_count + 1

    def test_save_location_default_speed(self, app_context, test_vehicle):
        """Test save_location with default speed"""
        location = save_location(test_vehicle.id, 5.8520, -55.2038)

        assert location.speed == 0.0

    def test_save_location_sets_timestamp(self, app_context, test_vehicle):
        """Test that save_location sets timestamp"""
        before = datetime.utcnow()
        location = save_location(test_vehicle.id, 5.8520, -55.2038)
        after = datetime.utcnow()

        assert before <= location.timestamp <= after

    def test_save_location_multiple(self, app_context, test_vehicle):
        """Test saving multiple locations for same vehicle"""
        locations = []
        for i in range(3):
            loc = save_location(
                test_vehicle.id,
                5.8520 + (i * 0.001),
                -55.2038 + (i * 0.001),
                40 + (i * 10)
            )
            locations.append(loc)

        assert len(locations) == 3
        for i, loc in enumerate(locations):
            assert loc.vehicle_id == test_vehicle.id


@pytest.mark.unit
class TestLocationIntegration:
    """Integration tests for location operations"""

    def test_location_sequence(self, app_context, test_vehicle):
        """Test a realistic sequence of location updates"""
        # Simulate vehicle traveling
        locations = []
        now = datetime.utcnow()

        for i in range(10):
            loc = save_location(
                test_vehicle.id,
                5.8520 + (i * 0.001),
                -55.2038 + (i * 0.001),
                30 + (i * 5)
            )
            locations.append(loc)

        # Verify all locations saved
        query_locations = Location.query.filter_by(vehicle_id=test_vehicle.id).all()
        assert len(query_locations) == 10

        # Verify chronological order
        for i, loc in enumerate(query_locations[:-1]):
            assert loc.timestamp <= query_locations[i+1].timestamp

    def test_distance_calculation_realistic(self):
        """Test realistic distance calculation for vehicle movement"""
        # Paramaribo to Lelydorp (roughly 50km)
        dist = calculate_distance(5.8520, -55.2038, 4.8350, -56.0130)
        assert 45 < dist < 55  # Should be roughly 50km

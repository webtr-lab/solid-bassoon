"""
Unit tests for place_service module
Tests place CRUD, search, and visit analytics functionality
"""
import pytest
from datetime import datetime, timedelta
from app.models import PlaceOfInterest, SavedLocation, Vehicle
from app.services.place_service import (
    format_place, get_place_or_404, find_place_for_coordinate,
    search_places, create_place, update_place, delete_place,
    get_visit_analytics
)


@pytest.mark.unit
class TestFormatPlace:
    """Test format_place function"""

    def test_format_place_structure(self, app_context, test_place_of_interest):
        """Test place formatting for JSON response"""
        formatted = format_place(test_place_of_interest)

        assert 'id' in formatted
        assert 'name' in formatted
        assert 'address' in formatted
        assert 'area' in formatted
        assert 'latitude' in formatted
        assert 'longitude' in formatted
        assert 'created_at' in formatted
        assert 'created_by' in formatted

    def test_format_place_values(self, app_context, test_place_of_interest):
        """Test formatted values are correct"""
        formatted = format_place(test_place_of_interest)

        assert formatted['name'] == 'Test Warehouse'
        assert formatted['area'] == 'Downtown'
        assert formatted['latitude'] == 5.8520
        assert formatted['longitude'] == -55.2038


@pytest.mark.unit
class TestGetPlaceOr404:
    """Test get_place_or_404 function"""

    def test_get_existing_place(self, app_context, test_place_of_interest):
        """Test retrieving an existing place"""
        place = get_place_or_404(test_place_of_interest.id)
        assert place is not None
        assert place.id == test_place_of_interest.id

    def test_get_nonexistent_place(self, app_context):
        """Test retrieving a nonexistent place"""
        place = get_place_or_404(99999)
        assert place is None


@pytest.mark.unit
class TestFindPlaceForCoordinate:
    """Test find_place_for_coordinate function"""

    def test_find_place_exact_location(self, app_context, test_place_of_interest):
        """Test finding place at exact coordinates"""
        place = find_place_for_coordinate(
            test_place_of_interest.latitude,
            test_place_of_interest.longitude,
            places=[test_place_of_interest]
        )

        assert place is not None
        assert place.id == test_place_of_interest.id

    def test_find_place_within_threshold(self, app_context, test_place_of_interest):
        """Test finding place within distance threshold"""
        # 0.001 degrees ≈ 111 meters
        nearby_lat = test_place_of_interest.latitude + 0.0005
        nearby_lon = test_place_of_interest.longitude + 0.0005

        place = find_place_for_coordinate(
            nearby_lat,
            nearby_lon,
            places=[test_place_of_interest],
            threshold_km=0.2
        )

        assert place is not None

    def test_find_place_beyond_threshold(self, app_context, test_place_of_interest):
        """Test that place beyond threshold is not returned"""
        far_lat = test_place_of_interest.latitude + 1
        far_lon = test_place_of_interest.longitude + 1

        place = find_place_for_coordinate(
            far_lat,
            far_lon,
            places=[test_place_of_interest],
            threshold_km=0.2
        )

        assert place is None

    def test_find_closest_place_of_multiple(self, app_context, test_places):
        """Test that closest place is returned when multiple exist"""
        # Test location near first place
        place = find_place_for_coordinate(
            test_places[0].latitude + 0.0001,
            test_places[0].longitude + 0.0001,
            places=test_places,
            threshold_km=0.2
        )

        assert place is not None
        assert place.id == test_places[0].id


@pytest.mark.unit
class TestSearchPlaces:
    """Test search_places function"""

    def test_search_by_name(self, app_context, test_places):
        """Test searching places by name"""
        query = search_places(search_term='Location 1')
        results = query.all()

        assert len(results) == 1
        assert results[0].name == 'Test Location 1'

    def test_search_case_insensitive(self, app_context, test_places):
        """Test that search is case insensitive"""
        query = search_places(search_term='location')
        results = query.all()

        assert len(results) == 5  # All test places

    def test_search_by_area(self, app_context, test_places):
        """Test filtering by area"""
        query = search_places(area_filter='Test Area')
        results = query.all()

        assert len(results) == 5
        for place in results:
            assert place.area == 'Test Area'

    def test_search_combined_filters(self, app_context, test_places):
        """Test combined search and area filters"""
        query = search_places(search_term='Location 1', area_filter='Test Area')
        results = query.all()

        assert len(results) == 1

    def test_search_no_results(self, app_context, test_places):
        """Test search with no matching results"""
        query = search_places(search_term='Nonexistent')
        results = query.all()

        assert len(results) == 0


@pytest.mark.unit
class TestCreatePlace:
    """Test create_place function"""

    def test_create_place_success(self, app_context, admin_user):
        """Test successful place creation"""
        place = create_place(
            name='New Place',
            latitude=5.8500,
            longitude=-55.2000,
            address='123 Street',
            area='Test Area',
            category='Warehouse',
            created_by=admin_user.id
        )

        assert place is not None
        assert place.name == 'New Place'
        assert place.latitude == 5.8500
        assert place.created_by == admin_user.id

    def test_create_place_minimal_fields(self, app_context):
        """Test creating place with only required fields"""
        place = create_place(
            name='Minimal Place',
            latitude=5.8520,
            longitude=-55.2038
        )

        assert place is not None
        assert place.name == 'Minimal Place'
        assert place.address == ''
        assert place.category == 'General'

    def test_create_place_strips_whitespace(self, app_context):
        """Test that whitespace is stripped from fields"""
        place = create_place(
            name='  Test Place  ',
            latitude=5.8520,
            longitude=-55.2038,
            address='  123 Street  ',
            area='  Downtown  '
        )

        assert place.name == 'Test Place'
        assert place.address == '123 Street'
        assert place.area == 'Downtown'


@pytest.mark.unit
class TestUpdatePlace:
    """Test update_place function"""

    def test_update_place_name(self, app_context, test_place_of_interest):
        """Test updating place name"""
        place = update_place(test_place_of_interest.id, name='Updated Name')

        assert place is not None
        assert place.name == 'Updated Name'

    def test_update_place_coordinates(self, app_context, test_place_of_interest):
        """Test updating coordinates"""
        place = update_place(
            test_place_of_interest.id,
            latitude=5.9000,
            longitude=-55.1500
        )

        assert place.latitude == 5.9000
        assert place.longitude == -55.1500

    def test_update_place_all_fields(self, app_context, test_place_of_interest):
        """Test updating multiple fields"""
        place = update_place(
            test_place_of_interest.id,
            name='New Name',
            address='456 Avenue',
            area='New Area',
            category='Office'
        )

        assert place.name == 'New Name'
        assert place.address == '456 Avenue'
        assert place.area == 'New Area'
        assert place.category == 'Office'

    def test_update_nonexistent_place(self, app_context):
        """Test updating nonexistent place"""
        place = update_place(99999, name='New Name')
        assert place is None

    def test_update_place_partial(self, app_context, test_place_of_interest):
        """Test updating only some fields"""
        original_address = test_place_of_interest.address
        place = update_place(test_place_of_interest.id, name='New Name')

        assert place.name == 'New Name'
        assert place.address == original_address  # Should remain unchanged


@pytest.mark.unit
class TestDeletePlace:
    """Test delete_place function"""

    def test_delete_place_success(self, app_context, test_place_of_interest):
        """Test successful place deletion"""
        place_id = test_place_of_interest.id
        place_name = test_place_of_interest.name

        result = delete_place(place_id)

        assert result == place_name
        assert PlaceOfInterest.query.get(place_id) is None

    def test_delete_nonexistent_place(self, app_context):
        """Test deleting nonexistent place"""
        result = delete_place(99999)
        assert result is None


@pytest.mark.unit
class TestGetVisitAnalytics:
    """Test get_visit_analytics function"""

    def test_analytics_structure(self, app_context, test_vehicle, test_place_of_interest, app_context):
        """Test analytics return structure"""
        from app.models import db

        # Create a saved location near the place
        saved_loc = SavedLocation(
            vehicle_id=test_vehicle.id,
            name='Test Stop',
            latitude=test_place_of_interest.latitude,
            longitude=test_place_of_interest.longitude,
            stop_duration_minutes=30,
            visit_type='delivery',
            timestamp=datetime.utcnow()
        )
        db.session.add(saved_loc)
        db.session.commit()

        analytics = get_visit_analytics([saved_loc], [test_place_of_interest])

        assert isinstance(analytics, list)
        if analytics:
            item = analytics[0]
            assert 'place_id' in item
            assert 'name' in item
            assert 'visits' in item
            assert 'vehicles' in item
            assert 'last_visited' in item

    def test_analytics_matches_visits(self, app_context, test_vehicle, test_place_of_interest, app_context):
        """Test that analytics correctly matches visits to places"""
        from app.models import db

        # Create multiple saved locations at same place
        for i in range(3):
            saved_loc = SavedLocation(
                vehicle_id=test_vehicle.id,
                name=f'Stop {i}',
                latitude=test_place_of_interest.latitude,
                longitude=test_place_of_interest.longitude,
                timestamp=datetime.utcnow() - timedelta(hours=i)
            )
            db.session.add(saved_loc)
        db.session.commit()

        visits = SavedLocation.query.filter_by(vehicle_id=test_vehicle.id).all()
        analytics = get_visit_analytics(visits, [test_place_of_interest])

        assert len(analytics) == 1
        assert analytics[0]['place_id'] == test_place_of_interest.id
        assert analytics[0]['visits'] == 3

    def test_analytics_empty_visits(self, app_context, test_place_of_interest):
        """Test analytics with no visits"""
        analytics = get_visit_analytics([], [test_place_of_interest])
        assert analytics == []

    def test_analytics_sorted_by_visits(self, app_context, test_vehicle, test_places, app_context):
        """Test that analytics are sorted by visit count"""
        from app.models import db

        # Create different number of visits for each place
        for i, place in enumerate(test_places[:3]):
            for j in range(i + 1):
                saved_loc = SavedLocation(
                    vehicle_id=test_vehicle.id,
                    name=f'Stop {i}-{j}',
                    latitude=place.latitude,
                    longitude=place.longitude,
                    timestamp=datetime.utcnow() - timedelta(hours=j)
                )
                db.session.add(saved_loc)
        db.session.commit()

        visits = SavedLocation.query.filter_by(vehicle_id=test_vehicle.id).all()
        analytics = get_visit_analytics(visits, test_places)

        # Should be sorted by visits descending
        for i in range(len(analytics) - 1):
            assert analytics[i]['visits'] >= analytics[i+1]['visits']

    def test_analytics_tracks_vehicles(self, app_context, test_vehicle, test_place_of_interest, app_context):
        """Test that analytics tracks which vehicles visited"""
        from app.models import db

        # Create saved location
        saved_loc = SavedLocation(
            vehicle_id=test_vehicle.id,
            name='Test Stop',
            latitude=test_place_of_interest.latitude,
            longitude=test_place_of_interest.longitude,
            timestamp=datetime.utcnow()
        )
        db.session.add(saved_loc)
        db.session.commit()

        analytics = get_visit_analytics([saved_loc], [test_place_of_interest])

        assert len(analytics) == 1
        assert len(analytics[0]['vehicles']) == 1
        assert analytics[0]['vehicles'][0]['id'] == test_vehicle.id

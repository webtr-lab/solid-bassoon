"""
Tests for places of interest endpoints
Tests CRUD operations and search functionality
"""

import pytest


class TestPlacesOfInterestEndpoints:
    """Tests for GET /api/places-of-interest and related endpoints"""

    def test_get_all_places(self, authenticated_client, test_places):
        """Test retrieving all places of interest"""
        response = authenticated_client.get('/api/places-of-interest')

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['data']) == 5

    def test_create_place(self, authenticated_client, admin_user):
        """Test creating a new place of interest"""
        response = authenticated_client.post('/api/places-of-interest', json={
            'name': 'New Warehouse',
            'address': '456 Oak St, Paramaribo',
            'area': 'Uptown',
            'contact': 'Jane Smith',
            'telephone': '+597-987-6543',
            'latitude': 5.86,
            'longitude': -55.20,
            'category': 'Warehouse',
            'description': 'Distribution warehouse'
        })

        assert response.status_code == 201
        data = response.get_json()
        assert data['name'] == 'New Warehouse'

    def test_create_place_missing_required_fields(self, authenticated_client):
        """Test creating place with missing required fields"""
        response = authenticated_client.post('/api/places-of-interest', json={
            'address': '456 Oak St'
            # Missing name, coordinates
        })

        assert response.status_code == 400

    def test_create_place_invalid_coordinates(self, authenticated_client):
        """Test creating place with invalid coordinates"""
        response = authenticated_client.post('/api/places-of-interest', json={
            'name': 'Invalid Place',
            'latitude': 95.0,  # Invalid
            'longitude': -55.20,
            'category': 'test'
        })

        assert response.status_code == 400

    def test_get_place_by_id(self, authenticated_client, test_place_of_interest):
        """Test retrieving a specific place"""
        response = authenticated_client.get(
            f'/api/places-of-interest/{test_place_of_interest.id}'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['name'] == 'Test Warehouse'

    def test_update_place(self, authenticated_client, test_place_of_interest):
        """Test updating a place of interest"""
        response = authenticated_client.put(
            f'/api/places-of-interest/{test_place_of_interest.id}',
            json={
                'name': 'Updated Warehouse Name',
                'contact': 'Updated Contact'
            }
        )

        assert response.status_code == 200
        data = response.get_json()
        assert data['name'] == 'Updated Warehouse Name'

    def test_delete_place(self, authenticated_client, test_place_of_interest):
        """Test deleting a place of interest"""
        place_id = test_place_of_interest.id

        response = authenticated_client.delete(
            f'/api/places-of-interest/{place_id}'
        )

        assert response.status_code == 200

        # Verify it was deleted
        from app.models import PlaceOfInterest
        place = PlaceOfInterest.query.get(place_id)
        assert place is None

    def test_search_places_by_area(self, authenticated_client, test_places):
        """Test searching places by area"""
        response = authenticated_client.get(
            '/api/places-of-interest?area=Test+Area'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['data']) > 0

    def test_search_places_by_category(self, authenticated_client, test_places):
        """Test searching places by category"""
        response = authenticated_client.get(
            '/api/places-of-interest?category=test'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['data']) > 0

    def test_pagination(self, authenticated_client, test_places):
        """Test place listing pagination"""
        response = authenticated_client.get(
            '/api/places-of-interest?limit=2&offset=0'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert len(data['data']) <= 2

    def test_place_not_found(self, authenticated_client):
        """Test retrieving non-existent place"""
        response = authenticated_client.get('/api/places-of-interest/9999')

        assert response.status_code == 404


class TestPlacePermissions:
    """Tests for place of interest permission checks"""

    def test_viewer_can_read_places(self, client, viewer_user):
        """Test that viewers can read places"""
        client.post('/api/auth/login', json={
            'username': 'viewer_test',
            'password': 'TestPassword123!'
        })

        response = client.get('/api/places-of-interest')
        assert response.status_code == 200

    def test_viewer_cannot_create_places(self, client, viewer_user):
        """Test that viewers cannot create places"""
        client.post('/api/auth/login', json={
            'username': 'viewer_test',
            'password': 'TestPassword123!'
        })

        response = client.post('/api/places-of-interest', json={
            'name': 'Unauthorized Place',
            'latitude': 5.85,
            'longitude': -55.20
        })

        # Should be 403 Forbidden
        assert response.status_code == 403

    def test_manager_can_create_places(self, client, manager_user):
        """Test that managers can create places"""
        client.post('/api/auth/login', json={
            'username': 'manager_test',
            'password': 'TestPassword123!'
        })

        response = client.post('/api/places-of-interest', json={
            'name': 'Manager Place',
            'latitude': 5.85,
            'longitude': -55.20,
            'category': 'test'
        })

        assert response.status_code == 201

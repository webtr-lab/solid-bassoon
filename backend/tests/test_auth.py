"""
Authentication endpoint tests
"""
import pytest
from app.models import User


@pytest.mark.auth
class TestAuthentication:
    """Test authentication endpoints"""

    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get('/api/health')
        assert response.status_code == 200
        data = response.get_json()
        assert data['status'] == 'healthy'

    def test_login_success(self, client, admin_user):
        """Test successful login"""
        response = client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPassword123!'
        })
        assert response.status_code == 200
        data = response.get_json()
        assert data['message'] == 'Login successful'
        assert data['user']['username'] == 'admin_test'
        assert data['user']['role'] == 'admin'

    def test_login_invalid_username(self, client):
        """Test login with invalid username"""
        response = client.post('/api/auth/login', json={
            'username': 'nonexistent',
            'password': 'password'
        })
        assert response.status_code == 401
        data = response.get_json()
        assert 'error' in data

    def test_login_invalid_password(self, client, admin_user):
        """Test login with invalid password"""
        response = client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'WrongPassword'
        })
        assert response.status_code == 401
        data = response.get_json()
        assert 'error' in data

    def test_login_missing_credentials(self, client):
        """Test login with missing credentials"""
        response = client.post('/api/auth/login', json={})
        # Should fail with 401 or 400
        assert response.status_code in [400, 401]

    def test_register_success(self, client):
        """Test successful user registration"""
        response = client.post('/api/auth/register', json={
            'username': 'newuser',
            'email': 'newuser@test.local',
            'password': 'SecurePassword123!',
            'role': 'viewer'
        })
        assert response.status_code == 201
        data = response.get_json()
        assert 'message' in data

        # Verify user was created
        user = User.query.filter_by(username='newuser').first()
        assert user is not None
        assert user.email == 'newuser@test.local'

    def test_register_duplicate_username(self, client, admin_user):
        """Test registration with duplicate username"""
        response = client.post('/api/auth/register', json={
            'username': 'admin_test',  # Already exists
            'email': 'different@test.local',
            'password': 'SecurePassword123!'
        })
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_register_invalid_email(self, client):
        """Test registration with invalid email"""
        response = client.post('/api/auth/register', json={
            'username': 'newuser',
            'email': 'invalid_email',  # Invalid email format
            'password': 'SecurePassword123!'
        })
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_register_weak_password(self, client):
        """Test registration with weak password"""
        response = client.post('/api/auth/register', json={
            'username': 'newuser',
            'email': 'newuser@test.local',
            'password': 'weak'  # Too weak
        })
        assert response.status_code == 400
        data = response.get_json()
        assert 'error' in data

    def test_check_auth_not_authenticated(self, client):
        """Test auth check when not authenticated"""
        response = client.get('/api/auth/check')
        assert response.status_code == 200
        data = response.get_json()
        assert data['authenticated'] is False

    def test_check_auth_authenticated(self, client, admin_user):
        """Test auth check when authenticated"""
        # First login
        client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPassword123!'
        })

        # Then check auth
        response = client.get('/api/auth/check')
        assert response.status_code == 200
        data = response.get_json()
        assert data['authenticated'] is True
        assert data['user']['username'] == 'admin_test'

    def test_logout(self, client, admin_user):
        """Test logout"""
        # Login first
        client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPassword123!'
        })

        # Then logout
        response = client.post('/api/auth/logout')
        assert response.status_code == 200

        # Verify user is logged out
        check_response = client.get('/api/auth/check')
        check_data = check_response.get_json()
        assert check_data['authenticated'] is False

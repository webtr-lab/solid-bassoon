# Testing Guide

This guide explains how to run the test suite for the Maps Tracker application.

## Backend Testing

### Prerequisites

1. Install test dependencies:
```bash
cd backend
pip install -r requirements-test.txt
```

### Running Tests

#### Run all tests
```bash
pytest
```

#### Run with verbose output
```bash
pytest -v
```

#### Run specific test file
```bash
pytest tests/test_auth.py
pytest tests/test_vehicles.py
```

#### Run by marker
```bash
# Authentication tests only
pytest -m auth

# API tests only
pytest -m api

# Database tests only
pytest -m db
```

#### Run with coverage report
```bash
pytest --cov=app --cov-report=html
# Opens coverage report in htmlcov/index.html
```

#### Run with coverage and markers
```bash
pytest -m auth --cov=app
```

### Test Structure

**`tests/conftest.py`** - Shared fixtures
- `app_config` - Test Flask app
- `client` - Test client
- `admin_user`, `manager_user`, `viewer_user` - Test users
- `test_vehicle` - Test vehicle
- `clean_db` - Auto-cleanup

**`tests/test_auth.py`** - Authentication tests (10 cases)
- Login/logout flow
- User registration
- Password validation
- Auth check

**`tests/test_vehicles.py`** - Vehicle API tests (12 cases)
- Vehicle CRUD operations
- Location data
- Permission checks
- Validation

### Available Test Markers

```python
@pytest.mark.unit          # Unit tests
@pytest.mark.integration   # Integration tests
@pytest.mark.auth          # Authentication tests
@pytest.mark.api           # API endpoint tests
@pytest.mark.db            # Database tests
@pytest.mark.security      # Security tests
```

### Example Test Run Output

```
tests/test_auth.py::TestAuthentication::test_health_check PASSED
tests/test_auth.py::TestAuthentication::test_login_success PASSED
tests/test_auth.py::TestAuthentication::test_login_invalid_username PASSED
tests/test_auth.py::TestAuthentication::test_register_success PASSED
tests/test_vehicles.py::TestVehicleAPI::test_get_vehicles_authenticated PASSED

======================== 22 passed in 0.45s ========================
```

## Frontend Testing (Future)

Jest and React Testing Library configuration coming soon.

```bash
cd frontend
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm test
```

## Continuous Integration

To run tests in CI/CD pipeline (e.g., GitHub Actions):

```bash
cd backend
pip install -r requirements.txt -r requirements-test.txt
pytest -v --tb=short --junit-xml=test-results.xml --cov=app --cov-report=xml
```

## Troubleshooting

### Tests fail with database errors
```bash
# Clear any existing test database
rm -f instance/test.db

# Re-run tests
pytest
```

### Import errors
```bash
# Make sure you're in the correct directory
cd backend

# Install dependencies
pip install -r requirements.txt -r requirements-test.txt
```

### Fixture not found
Check that `tests/conftest.py` is in the tests directory and properly named.

## Writing New Tests

### Test Template

```python
"""
Test module docstring describing what is being tested
"""
import pytest
from app.models import YourModel


@pytest.mark.unit  # or integration, auth, api, db, security
class TestYourFeature:
    """Test class for a specific feature"""

    def test_something_works(self, client, admin_user):
        """Describe what you're testing"""
        # 1. Setup (use fixtures)
        client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPassword123!'
        })

        # 2. Execute
        response = client.get('/api/some-endpoint')

        # 3. Assert
        assert response.status_code == 200
        data = response.get_json()
        assert data['expected_key'] == 'expected_value'
```

### Common Assertions

```python
# Status codes
assert response.status_code == 200
assert response.status_code in [400, 401]

# Response data
data = response.get_json()
assert 'key' in data
assert data['key'] == 'value'
assert len(data['list']) > 0

# Database
from app.models import User
user = User.query.filter_by(username='test').first()
assert user is not None

# Error messages
assert 'error' in response.get_json()
```

## Test Coverage Goals

- Unit tests: 80%+
- Integration tests: 60%+
- Critical paths: 100%

Current coverage: Building initial infrastructure

## Performance

- Full test suite runs in < 1 second
- Database operations use in-memory SQLite
- Tests are isolated and run in any order
- Can run tests in parallel with pytest-xdist

```bash
# Run tests in parallel (requires pytest-xdist)
pytest -n auto
```

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Flask Testing](https://flask.palletsprojects.com/en/latest/testing/)
- [SQLAlchemy Testing](https://docs.sqlalchemy.org/en/latest/orm/session_basics.html#testing-orm-code)

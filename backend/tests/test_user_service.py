"""
Unit tests for user_service module
Tests user CRUD and account management functionality
"""
import pytest
from app.models import User
from app.services.user_service import (
    get_user_or_404, format_user, get_all_users,
    username_exists, email_exists, update_user, delete_user
)


@pytest.mark.unit
class TestGetUserOr404:
    """Test get_user_or_404 function"""

    def test_get_existing_user(self, app_context, admin_user):
        """Test retrieving an existing user"""
        user = get_user_or_404(admin_user.id)
        assert user is not None
        assert user.id == admin_user.id
        assert user.username == 'admin_test'

    def test_get_nonexistent_user(self, app_context):
        """Test retrieving a nonexistent user"""
        user = get_user_or_404(99999)
        assert user is None


@pytest.mark.unit
class TestFormatUser:
    """Test format_user function"""

    def test_format_user_structure(self, app_context, admin_user):
        """Test user formatting for JSON response"""
        formatted = format_user(admin_user)

        assert 'id' in formatted
        assert 'username' in formatted
        assert 'email' in formatted
        assert 'is_active' in formatted
        assert 'role' in formatted
        assert 'created_at' in formatted

    def test_format_user_values(self, app_context, admin_user):
        """Test that formatted values are correct"""
        formatted = format_user(admin_user)

        assert formatted['id'] == admin_user.id
        assert formatted['username'] == 'admin_test'
        assert formatted['email'] == 'admin@test.local'
        assert formatted['role'] == 'admin'

    def test_format_user_no_password(self, app_context, admin_user):
        """Test that password_hash is not included in format"""
        formatted = format_user(admin_user)
        assert 'password_hash' not in formatted
        assert 'password' not in formatted


@pytest.mark.unit
class TestGetAllUsers:
    """Test get_all_users function"""

    def test_get_all_users(self, app_context, admin_user, manager_user, viewer_user):
        """Test retrieving all users"""
        users, total_count = get_all_users(offset=0, limit=100)

        assert total_count == 3
        assert len(users) == 3
        usernames = {u.username for u in users}
        assert 'admin_test' in usernames
        assert 'manager_test' in usernames
        assert 'viewer_test' in usernames

    def test_get_all_users_pagination(self, app_context, admin_user, manager_user, viewer_user):
        """Test pagination of user listing"""
        users, total_count = get_all_users(offset=0, limit=2)

        assert total_count == 3
        assert len(users) == 2

        # Test offset
        users_page2, _ = get_all_users(offset=2, limit=2)
        assert len(users_page2) == 1

    def test_get_all_users_empty(self, app_context):
        """Test getting users when database is empty"""
        # Clean database
        from app.models import db
        db.session.query(User).delete()
        db.session.commit()

        users, total_count = get_all_users()

        assert total_count == 0
        assert len(users) == 0


@pytest.mark.unit
class TestUsernameExists:
    """Test username_exists function"""

    def test_username_exists(self, app_context, admin_user):
        """Test checking for existing username"""
        exists = username_exists('admin_test')
        assert exists is True

    def test_username_not_exists(self, app_context):
        """Test checking for nonexistent username"""
        exists = username_exists('nonexistent_user')
        assert exists is False

    def test_username_exists_exclude_user(self, app_context, admin_user):
        """Test excluding user from check"""
        # Should not exist when excluding the admin user
        exists = username_exists('admin_test', exclude_user_id=admin_user.id)
        assert exists is False

    def test_username_exists_case_sensitive(self, app_context, admin_user):
        """Test that username check is case sensitive"""
        exists = username_exists('ADMIN_TEST')
        assert exists is False


@pytest.mark.unit
class TestEmailExists:
    """Test email_exists function"""

    def test_email_exists(self, app_context, admin_user):
        """Test checking for existing email"""
        exists = email_exists('admin@test.local')
        assert exists is True

    def test_email_not_exists(self, app_context):
        """Test checking for nonexistent email"""
        exists = email_exists('nonexistent@test.local')
        assert exists is False

    def test_email_exists_exclude_user(self, app_context, admin_user):
        """Test excluding user from check"""
        exists = email_exists('admin@test.local', exclude_user_id=admin_user.id)
        assert exists is False

    def test_email_exists_case_insensitive(self, app_context, admin_user):
        """Test that email check is case insensitive"""
        exists = email_exists('ADMIN@TEST.LOCAL')
        assert exists is True


@pytest.mark.unit
class TestUpdateUser:
    """Test update_user function"""

    def test_update_user_username(self, app_context, admin_user):
        """Test updating username"""
        user = update_user(admin_user.id, username='new_admin')

        assert user is not None
        assert user.username == 'new_admin'

    def test_update_user_email(self, app_context, admin_user):
        """Test updating email"""
        user = update_user(admin_user.id, email='newemail@test.local')

        assert user.email == 'newemail@test.local'

    def test_update_user_is_active(self, app_context, admin_user):
        """Test updating active status"""
        user = update_user(admin_user.id, is_active=False)

        assert user.is_active is False

    def test_update_user_role(self, app_context, admin_user):
        """Test updating role"""
        user = update_user(admin_user.id, role='manager')

        assert user.role == 'manager'

    def test_update_user_password(self, app_context, admin_user):
        """Test updating password"""
        original_hash = admin_user.password_hash
        user = update_user(admin_user.id, password='NewPassword123!')

        assert user.password_hash != original_hash

    def test_update_user_multiple_fields(self, app_context, admin_user):
        """Test updating multiple fields at once"""
        user = update_user(
            admin_user.id,
            username='updated_admin',
            email='updated@test.local',
            is_active=False
        )

        assert user.username == 'updated_admin'
        assert user.email == 'updated@test.local'
        assert user.is_active is False

    def test_update_user_nonexistent(self, app_context):
        """Test updating nonexistent user"""
        user = update_user(99999, username='new_name')
        assert user is None

    def test_update_user_duplicate_username(self, app_context, admin_user, manager_user):
        """Test that duplicate username raises ValueError"""
        with pytest.raises(ValueError):
            update_user(admin_user.id, username='manager_test')

    def test_update_user_duplicate_email(self, app_context, admin_user, manager_user):
        """Test that duplicate email raises ValueError"""
        with pytest.raises(ValueError):
            update_user(admin_user.id, email='manager@test.local')

    def test_update_user_same_username(self, app_context, admin_user):
        """Test updating to same username is allowed"""
        user = update_user(admin_user.id, username='admin_test')
        assert user is not None
        assert user.username == 'admin_test'


@pytest.mark.unit
class TestDeleteUser:
    """Test delete_user function"""

    def test_delete_user_success(self, app_context, admin_user):
        """Test successful user deletion"""
        user_id = admin_user.id
        username = admin_user.username

        result = delete_user(user_id)

        assert result == username
        assert User.query.get(user_id) is None

    def test_delete_nonexistent_user(self, app_context):
        """Test deleting nonexistent user"""
        result = delete_user(99999)
        assert result is None

    def test_delete_own_account_prevented(self, app_context, admin_user):
        """Test that user cannot delete own account"""
        with pytest.raises(ValueError):
            delete_user(admin_user.id, current_user_id=admin_user.id)

    def test_delete_other_user_as_admin(self, app_context, admin_user, manager_user):
        """Test that admin can delete other users"""
        result = delete_user(manager_user.id, current_user_id=admin_user.id)

        assert result == 'manager_test'
        assert User.query.get(manager_user.id) is None


@pytest.mark.unit
class TestUserServiceIntegration:
    """Integration tests for user service operations"""

    def test_create_and_retrieve_user(self, app_context, admin_user):
        """Test creating and retrieving a user"""
        user = get_user_or_404(admin_user.id)

        assert user is not None
        formatted = format_user(user)
        assert formatted['username'] == 'admin_test'

    def test_user_lifecycle(self, app_context):
        """Test complete user lifecycle"""
        from app.models import db
        from flask_bcrypt import Bcrypt

        # Create user
        bcrypt = Bcrypt()
        new_user = User(
            username='lifecycle_user',
            email='lifecycle@test.local',
            password_hash=bcrypt.generate_password_hash('Password123!').decode('utf-8'),
            role='viewer'
        )
        db.session.add(new_user)
        db.session.commit()

        user_id = new_user.id

        # Verify creation
        assert get_user_or_404(user_id) is not None
        assert username_exists('lifecycle_user')

        # Update user
        updated_user = update_user(user_id, role='manager', is_active=False)
        assert updated_user.role == 'manager'
        assert updated_user.is_active is False

        # Delete user
        result = delete_user(user_id)
        assert result == 'lifecycle_user'
        assert get_user_or_404(user_id) is None
        assert not username_exists('lifecycle_user')

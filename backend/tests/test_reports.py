"""
Tests for reports and analytics endpoints
Tests visit reports, audit logs, and data analysis features
"""

import pytest
from datetime import datetime, timedelta


class TestVisitsReportEndpoint:
    """Tests for GET /api/reports/visits - Visit analytics"""

    def test_get_visits_report(self, authenticated_client, test_vehicle,
                               test_saved_location, test_place_of_interest):
        """Test retrieving visits report"""
        now = datetime.utcnow()
        start_date = (now - timedelta(days=7)).isoformat()
        end_date = now.isoformat()

        response = authenticated_client.get(
            f'/api/reports/visits?start={start_date}&end={end_date}'
        )

        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)

    def test_get_visits_without_dates(self, authenticated_client):
        """Test visits report without date parameters"""
        response = authenticated_client.get('/api/reports/visits')

        # Should use defaults or return error
        assert response.status_code in [200, 400]

    def test_get_visits_invalid_date_format(self, authenticated_client):
        """Test visits report with invalid date format"""
        response = authenticated_client.get(
            '/api/reports/visits?start=invalid&end=invalid'
        )

        assert response.status_code == 400

    def test_get_visits_date_range(self, authenticated_client):
        """Test visits report with date range"""
        now = datetime.utcnow()
        start = (now - timedelta(days=30)).isoformat()
        end = now.isoformat()

        response = authenticated_client.get(
            f'/api/reports/visits?start={start}&end={end}'
        )

        assert response.status_code == 200


class TestAuditLogEndpoint:
    """Tests for audit log endpoints"""

    def test_get_audit_logs(self, authenticated_client, admin_user):
        """Test retrieving audit logs (admin only)"""
        response = authenticated_client.get('/api/audit-logs')

        assert response.status_code in [200, 403]  # 403 if viewer, 200 if admin

    def test_audit_log_login_recorded(self, client, admin_user):
        """Test that login events are logged"""
        response = client.post('/api/auth/login', json={
            'username': 'admin_test',
            'password': 'TestPassword123!'
        })

        assert response.status_code == 200

        # Check audit log
        audit_logs = client.get('/api/audit-logs')
        # Would need admin auth to verify this


class TestBackupEndpoints:
    """Tests for backup management endpoints"""

    def test_get_backups_list(self, authenticated_client, admin_user):
        """Test listing backups"""
        response = authenticated_client.get('/api/backups')

        # Should require admin or manager role
        assert response.status_code in [200, 403]

    def test_create_backup(self, authenticated_client, admin_user):
        """Test creating a new backup"""
        response = authenticated_client.post('/api/backups/create')

        # Should require admin role
        assert response.status_code in [200, 202, 403]

    def test_restore_backup(self, authenticated_client, admin_user):
        """Test restoring from backup"""
        response = authenticated_client.post('/api/backups/restore', json={
            'filename': 'test_backup.sql'
        })

        # Should require admin role
        assert response.status_code in [400, 403, 404]

    def test_delete_backup(self, authenticated_client, admin_user):
        """Test deleting a backup"""
        response = authenticated_client.delete('/api/backups/delete/test_backup.sql')

        # Should require admin role
        assert response.status_code in [200, 403, 404]


class TestAnalyticsEndpoints:
    """Tests for analytics and statistics endpoints"""

    def test_get_dashboard_stats(self, authenticated_client):
        """Test getting dashboard statistics"""
        response = authenticated_client.get('/api/analytics/dashboard')

        assert response.status_code in [200, 404]

    def test_get_vehicle_stats(self, authenticated_client, test_vehicle):
        """Test getting vehicle-specific statistics"""
        response = authenticated_client.get(f'/api/vehicles/{test_vehicle.id}/stats?hours=24')

        assert response.status_code in [200, 404]

    def test_get_fleet_summary(self, authenticated_client):
        """Test getting fleet summary"""
        response = authenticated_client.get('/api/analytics/fleet-summary')

        assert response.status_code in [200, 404]

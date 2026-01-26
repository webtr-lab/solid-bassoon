"""Add performance indexes for query optimization

Revision ID: f8a2c3d4e5b6
Revises: 211704bace94
Create Date: 2025-12-11 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'f8a2c3d4e5b6'
down_revision = '211704bace94'
branch_labels = None
depends_on = None


def upgrade():
    """
    Add performance indexes for common query patterns.
    These indexes significantly improve query performance for:
    - Recent location queries
    - Vehicle history queries
    - Saved locations and visits
    - Place searches
    - Audit log queries
    """

    # =============================================================================
    # LOCATIONS TABLE INDEXES
    # =============================================================================

    # Composite index for vehicle location queries (vehicle_id + timestamp DESC)
    # Used by: GET /api/vehicles/:id/location, GET /api/vehicles/:id/history
    op.create_index(
        'idx_locations_vehicle_timestamp_desc',
        'locations',
        ['vehicle_id', sa.text('timestamp DESC')],
        unique=False
    )

    # Partial index for recent locations (last 30 days)
    # Improves performance for current tracking queries
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_locations_recent
        ON locations (vehicle_id, timestamp DESC)
        WHERE timestamp > NOW() - INTERVAL '30 days'
    """)

    # =============================================================================
    # SAVED_LOCATIONS TABLE INDEXES
    # =============================================================================

    # Composite index for vehicle saved locations
    # Used by: GET /api/vehicles/:id/saved-locations
    op.create_index(
        'idx_saved_locations_vehicle_timestamp',
        'saved_locations',
        ['vehicle_id', sa.text('timestamp DESC')],
        unique=False
    )

    # Index for place visits
    # Used by: GET /api/places-of-interest/:id/visits
    op.create_index(
        'idx_saved_locations_place_timestamp',
        'saved_locations',
        ['place_id', sa.text('timestamp DESC')],
        unique=False
    )

    # Index for user visits
    # Used by: User activity tracking
    op.create_index(
        'idx_saved_locations_user_timestamp',
        'saved_locations',
        ['user_id', sa.text('timestamp DESC')],
        unique=False
    )

    # Partial index for recent visits (last 90 days)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_saved_locations_recent_visits
        ON saved_locations (place_id, timestamp DESC)
        WHERE timestamp > NOW() - INTERVAL '90 days'
    """)

    # =============================================================================
    # PLACES_OF_INTEREST TABLE INDEXES
    # =============================================================================

    # Composite index for area-based searches
    op.create_index(
        'idx_places_area_name',
        'places_of_interest',
        ['area', 'name'],
        unique=False
    )

    # Composite index for category-based searches
    op.create_index(
        'idx_places_category_name',
        'places_of_interest',
        ['category', 'name'],
        unique=False
    )

    # Text search index for name and address (full-text search)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_places_search_text
        ON places_of_interest USING gin(to_tsvector('english', name || ' ' || COALESCE(address, '')))
    """)

    # =============================================================================
    # AUDIT_LOGS TABLE INDEXES
    # =============================================================================

    # Composite index for user audit logs
    # Used by: Security auditing, user activity tracking
    op.create_index(
        'idx_audit_logs_user_timestamp',
        'audit_logs',
        ['user_id', sa.text('timestamp DESC')],
        unique=False
    )

    # Composite index for action-based queries
    # Used by: Security monitoring (failed logins, etc.)
    op.create_index(
        'idx_audit_logs_action_status',
        'audit_logs',
        ['action', 'status', sa.text('timestamp DESC')],
        unique=False
    )

    # Index for resource auditing
    # Used by: Tracking changes to specific resources
    op.create_index(
        'idx_audit_logs_resource',
        'audit_logs',
        ['resource', 'resource_id', sa.text('timestamp DESC')],
        unique=False
    )

    # Partial index for failed actions only (security monitoring)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_audit_logs_failures
        ON audit_logs (action, timestamp DESC)
        WHERE status = 'failed'
    """)

    # Partial index for recent audit logs (last 90 days)
    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_audit_logs_recent
        ON audit_logs (timestamp DESC)
        WHERE timestamp > NOW() - INTERVAL '90 days'
    """)

    # =============================================================================
    # USERS TABLE INDEXES
    # =============================================================================

    # Index for active users
    # Used by: User listing, authentication
    op.create_index(
        'idx_users_active',
        'users',
        ['is_active', 'username'],
        unique=False
    )

    # Index for role-based queries
    # Used by: Permission checks
    op.create_index(
        'idx_users_role_active',
        'users',
        ['role', 'is_active'],
        unique=False
    )

    # =============================================================================
    # VEHICLES TABLE INDEXES
    # =============================================================================

    # Index for active vehicles
    # Used by: Vehicle listing
    op.create_index(
        'idx_vehicles_active',
        'vehicles',
        ['is_active', 'name'],
        unique=False
    )

    # Update table statistics for query optimizer
    op.execute("ANALYZE locations")
    op.execute("ANALYZE saved_locations")
    op.execute("ANALYZE places_of_interest")
    op.execute("ANALYZE audit_logs")
    op.execute("ANALYZE users")
    op.execute("ANALYZE vehicles")


def downgrade():
    """
    Remove performance indexes.
    """

    # Drop indexes in reverse order

    # VEHICLES
    op.drop_index('idx_vehicles_active', table_name='vehicles')

    # USERS
    op.drop_index('idx_users_role_active', table_name='users')
    op.drop_index('idx_users_active', table_name='users')

    # AUDIT_LOGS
    op.execute("DROP INDEX IF EXISTS idx_audit_logs_recent")
    op.execute("DROP INDEX IF EXISTS idx_audit_logs_failures")
    op.drop_index('idx_audit_logs_resource', table_name='audit_logs')
    op.drop_index('idx_audit_logs_action_status', table_name='audit_logs')
    op.drop_index('idx_audit_logs_user_timestamp', table_name='audit_logs')

    # PLACES_OF_INTEREST
    op.execute("DROP INDEX IF EXISTS idx_places_search_text")
    op.drop_index('idx_places_category_name', table_name='places_of_interest')
    op.drop_index('idx_places_area_name', table_name='places_of_interest')

    # SAVED_LOCATIONS
    op.execute("DROP INDEX IF EXISTS idx_saved_locations_recent_visits")
    op.drop_index('idx_saved_locations_user_timestamp', table_name='saved_locations')
    op.drop_index('idx_saved_locations_place_timestamp', table_name='saved_locations')
    op.drop_index('idx_saved_locations_vehicle_timestamp', table_name='saved_locations')

    # LOCATIONS
    op.execute("DROP INDEX IF EXISTS idx_locations_recent")
    op.drop_index('idx_locations_vehicle_timestamp_desc', table_name='locations')

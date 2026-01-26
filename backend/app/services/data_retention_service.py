"""
Data Retention Service
Manages cleanup of old location data to prevent unbounded database growth
"""

from datetime import datetime, timedelta
from flask import current_app
from app.models import db, Location, SavedLocation, AuditLog
from sqlalchemy import func


class DataRetentionPolicy:
    """Configurable data retention policies"""

    # Retention periods (days)
    LOCATION_DATA_RETENTION_DAYS = 90  # Raw GPS locations
    SAVED_LOCATIONS_RETENTION_DAYS = 365  # Detected stops/visits
    AUDIT_LOGS_RETENTION_DAYS = 180  # Security audit logs

    # Cleanup batch size (prevent long-running transactions)
    BATCH_SIZE = 1000


def cleanup_old_location_data(dry_run=False):
    """
    Delete old location data based on retention policy

    Args:
        dry_run: If True, only count records without deleting

    Returns:
        dict: Statistics about cleanup operation
    """
    cutoff_date = datetime.utcnow() - timedelta(days=DataRetentionPolicy.LOCATION_DATA_RETENTION_DAYS)

    # Count records to delete
    old_locations_count = Location.query.filter(Location.timestamp < cutoff_date).count()

    if dry_run:
        current_app.logger.info(
            f"[DRY RUN] Would delete {old_locations_count} location records "
            f"older than {cutoff_date.date()}"
        )
        return {
            'dry_run': True,
            'locations_deleted': 0,
            'locations_to_delete': old_locations_count,
            'cutoff_date': cutoff_date.isoformat()
        }

    deleted_count = 0
    batch_count = 0

    try:
        while True:
            # Delete in batches to avoid long transactions
            batch = Location.query.filter(
                Location.timestamp < cutoff_date
            ).limit(DataRetentionPolicy.BATCH_SIZE).all()

            if not batch:
                break

            for location in batch:
                db.session.delete(location)

            db.session.commit()
            deleted_count += len(batch)
            batch_count += 1

            current_app.logger.info(
                f"Deleted batch {batch_count}: {len(batch)} records "
                f"(total: {deleted_count}/{old_locations_count})"
            )

        current_app.logger.info(
            f"Cleanup complete: Deleted {deleted_count} location records "
            f"older than {cutoff_date.date()}"
        )

        return {
            'dry_run': False,
            'locations_deleted': deleted_count,
            'cutoff_date': cutoff_date.isoformat(),
            'batches': batch_count
        }

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error during location cleanup: {str(e)}")
        raise


def cleanup_old_saved_locations(dry_run=False):
    """
    Delete old saved locations (detected stops/visits)

    Args:
        dry_run: If True, only count records without deleting

    Returns:
        dict: Statistics about cleanup operation
    """
    cutoff_date = datetime.utcnow() - timedelta(days=DataRetentionPolicy.SAVED_LOCATIONS_RETENTION_DAYS)

    old_saved_count = SavedLocation.query.filter(SavedLocation.timestamp < cutoff_date).count()

    if dry_run:
        current_app.logger.info(
            f"[DRY RUN] Would delete {old_saved_count} saved location records "
            f"older than {cutoff_date.date()}"
        )
        return {
            'dry_run': True,
            'saved_locations_deleted': 0,
            'saved_locations_to_delete': old_saved_count,
            'cutoff_date': cutoff_date.isoformat()
        }

    deleted_count = 0

    try:
        # Saved locations are less numerous, can delete in one transaction
        old_saved = SavedLocation.query.filter(SavedLocation.timestamp < cutoff_date).all()

        for location in old_saved:
            db.session.delete(location)

        db.session.commit()
        deleted_count = len(old_saved)

        current_app.logger.info(
            f"Cleanup complete: Deleted {deleted_count} saved location records "
            f"older than {cutoff_date.date()}"
        )

        return {
            'dry_run': False,
            'saved_locations_deleted': deleted_count,
            'cutoff_date': cutoff_date.isoformat()
        }

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error during saved location cleanup: {str(e)}")
        raise


def cleanup_old_audit_logs(dry_run=False):
    """
    Delete old audit logs (security/compliance)

    Args:
        dry_run: If True, only count records without deleting

    Returns:
        dict: Statistics about cleanup operation
    """
    cutoff_date = datetime.utcnow() - timedelta(days=DataRetentionPolicy.AUDIT_LOGS_RETENTION_DAYS)

    old_logs_count = AuditLog.query.filter(AuditLog.timestamp < cutoff_date).count()

    if dry_run:
        current_app.logger.info(
            f"[DRY RUN] Would delete {old_logs_count} audit log records "
            f"older than {cutoff_date.date()}"
        )
        return {
            'dry_run': True,
            'audit_logs_deleted': 0,
            'audit_logs_to_delete': old_logs_count,
            'cutoff_date': cutoff_date.isoformat()
        }

    deleted_count = 0
    batch_count = 0

    try:
        while True:
            batch = AuditLog.query.filter(
                AuditLog.timestamp < cutoff_date
            ).limit(DataRetentionPolicy.BATCH_SIZE).all()

            if not batch:
                break

            for log in batch:
                db.session.delete(log)

            db.session.commit()
            deleted_count += len(batch)
            batch_count += 1

            current_app.logger.info(
                f"Deleted batch {batch_count}: {len(batch)} audit records "
                f"(total: {deleted_count}/{old_logs_count})"
            )

        current_app.logger.info(
            f"Cleanup complete: Deleted {deleted_count} audit log records "
            f"older than {cutoff_date.date()}"
        )

        return {
            'dry_run': False,
            'audit_logs_deleted': deleted_count,
            'cutoff_date': cutoff_date.isoformat(),
            'batches': batch_count
        }

    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error during audit log cleanup: {str(e)}")
        raise


def run_full_cleanup(dry_run=False):
    """
    Run complete data retention cleanup

    Args:
        dry_run: If True, only show what would be deleted

    Returns:
        dict: Combined statistics from all cleanup operations
    """
    current_app.logger.info(
        f"Starting data retention cleanup (dry_run={dry_run})"
    )

    results = {
        'timestamp': datetime.utcnow().isoformat(),
        'dry_run': dry_run,
        'locations': cleanup_old_location_data(dry_run),
        'saved_locations': cleanup_old_saved_locations(dry_run),
        'audit_logs': cleanup_old_audit_logs(dry_run)
    }

    total_deleted = (
        results['locations'].get('locations_deleted', 0) +
        results['saved_locations'].get('saved_locations_deleted', 0) +
        results['audit_logs'].get('audit_logs_deleted', 0)
    )

    results['total_records_deleted'] = total_deleted

    current_app.logger.info(
        f"Data retention cleanup complete: {total_deleted} total records deleted"
    )

    return results


def get_database_stats():
    """
    Get current database size statistics

    Returns:
        dict: Database statistics
    """
    try:
        return {
            'locations': {
                'total': Location.query.count(),
                'oldest': db.session.query(func.min(Location.timestamp)).scalar(),
                'newest': db.session.query(func.max(Location.timestamp)).scalar()
            },
            'saved_locations': {
                'total': SavedLocation.query.count(),
                'oldest': db.session.query(func.min(SavedLocation.timestamp)).scalar(),
                'newest': db.session.query(func.max(SavedLocation.timestamp)).scalar()
            },
            'audit_logs': {
                'total': AuditLog.query.count(),
                'oldest': db.session.query(func.min(AuditLog.timestamp)).scalar(),
                'newest': db.session.query(func.max(AuditLog.timestamp)).scalar()
            }
        }
    except Exception as e:
        current_app.logger.error(f"Error getting database stats: {str(e)}")
        return {}

#!/usr/bin/env python3
"""
Manual Data Retention Cleanup Script

Run this script to manually trigger data retention cleanup.
Can be used for testing or emergency cleanup.

Usage:
    # Dry run (see what would be deleted):
    python cleanup_old_data.py --dry-run

    # Actually delete old data:
    python cleanup_old_data.py

    # View database stats:
    python cleanup_old_data.py --stats
"""

import sys
import argparse
from app.main import app
from app.services.data_retention_service import run_full_cleanup, get_database_stats, DataRetentionPolicy


def print_stats():
    """Print current database statistics"""
    with app.app_context():
        stats = get_database_stats()

        print("\n" + "=" * 60)
        print("DATABASE STATISTICS")
        print("=" * 60)

        for data_type, info in stats.items():
            print(f"\n{data_type.upper().replace('_', ' ')}:")
            print(f"  Total records: {info.get('total', 0):,}")
            if info.get('oldest'):
                print(f"  Oldest: {info['oldest']}")
            if info.get('newest'):
                print(f"  Newest: {info['newest']}")

        print("\n" + "=" * 60)
        print("RETENTION POLICIES")
        print("=" * 60)
        print(f"  Location data: {DataRetentionPolicy.LOCATION_DATA_RETENTION_DAYS} days")
        print(f"  Saved locations: {DataRetentionPolicy.SAVED_LOCATIONS_RETENTION_DAYS} days")
        print(f"  Audit logs: {DataRetentionPolicy.AUDIT_LOGS_RETENTION_DAYS} days")
        print("=" * 60 + "\n")


def run_cleanup(dry_run=False):
    """Run data retention cleanup"""
    with app.app_context():
        print("\n" + "=" * 60)
        if dry_run:
            print("DATA RETENTION CLEANUP - DRY RUN")
        else:
            print("DATA RETENTION CLEANUP - EXECUTING")
        print("=" * 60 + "\n")

        results = run_full_cleanup(dry_run=dry_run)

        # Print results
        print(f"Timestamp: {results['timestamp']}")
        print(f"Dry Run: {results['dry_run']}")
        print("\nRESULTS:")

        locations = results.get('locations', {})
        saved_locations = results.get('saved_locations', {})
        audit_logs = results.get('audit_logs', {})

        if dry_run:
            print(f"\nLocations:")
            print(f"  Would delete: {locations.get('locations_to_delete', 0):,} records")
            print(f"  Cutoff date: {locations.get('cutoff_date', 'N/A')}")

            print(f"\nSaved Locations:")
            print(f"  Would delete: {saved_locations.get('saved_locations_to_delete', 0):,} records")
            print(f"  Cutoff date: {saved_locations.get('cutoff_date', 'N/A')}")

            print(f"\nAudit Logs:")
            print(f"  Would delete: {audit_logs.get('audit_logs_to_delete', 0):,} records")
            print(f"  Cutoff date: {audit_logs.get('cutoff_date', 'N/A')}")

            total = (
                locations.get('locations_to_delete', 0) +
                saved_locations.get('saved_locations_to_delete', 0) +
                audit_logs.get('audit_logs_to_delete', 0)
            )
            print(f"\nTOTAL RECORDS TO DELETE: {total:,}")
        else:
            print(f"\nLocations:")
            print(f"  Deleted: {locations.get('locations_deleted', 0):,} records")
            print(f"  Batches: {locations.get('batches', 0)}")
            print(f"  Cutoff date: {locations.get('cutoff_date', 'N/A')}")

            print(f"\nSaved Locations:")
            print(f"  Deleted: {saved_locations.get('saved_locations_deleted', 0):,} records")
            print(f"  Cutoff date: {saved_locations.get('cutoff_date', 'N/A')}")

            print(f"\nAudit Logs:")
            print(f"  Deleted: {audit_logs.get('audit_logs_deleted', 0):,} records")
            print(f"  Batches: {audit_logs.get('batches', 0)}")
            print(f"  Cutoff date: {audit_logs.get('cutoff_date', 'N/A')}")

            print(f"\nTOTAL RECORDS DELETED: {results.get('total_records_deleted', 0):,}")

        print("\n" + "=" * 60 + "\n")


def main():
    parser = argparse.ArgumentParser(
        description="Manual data retention cleanup for Maps Tracker"
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help="Show what would be deleted without actually deleting"
    )
    parser.add_argument(
        '--stats',
        action='store_true',
        help="Show database statistics only"
    )

    args = parser.parse_args()

    if args.stats:
        print_stats()
    else:
        run_cleanup(dry_run=args.dry_run)


if __name__ == '__main__':
    main()

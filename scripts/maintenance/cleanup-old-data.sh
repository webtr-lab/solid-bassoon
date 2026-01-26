#!/bin/bash
#
# Data Retention Cleanup Script
# Runs automated cleanup of old location data
#
# Usage:
#   ./cleanup-old-data.sh [--dry-run]
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DRY_RUN=""
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN="--dry-run"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting data retention cleanup ${DRY_RUN}"

# Run cleanup via Python script
docker exec maps_backend python - <<EOF
import sys
sys.path.insert(0, '/app')

from app.main import app
from app.services.data_retention_service import run_full_cleanup

dry_run = "$DRY_RUN" == "--dry-run"

with app.app_context():
    results = run_full_cleanup(dry_run=dry_run)

    print("\n=== Data Retention Cleanup Results ===")
    print(f"Timestamp: {results['timestamp']}")
    print(f"Dry Run: {results['dry_run']}")
    print(f"\nLocations deleted: {results['locations'].get('locations_deleted', 0)}")
    print(f"Saved locations deleted: {results['saved_locations'].get('saved_locations_deleted', 0)}")
    print(f"Audit logs deleted: {results['audit_logs'].get('audit_logs_deleted', 0)}")
    print(f"\nTotal records deleted: {results['total_records_deleted']}")
EOF

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleanup completed successfully"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Cleanup failed with exit code $EXIT_CODE"
    exit $EXIT_CODE
fi

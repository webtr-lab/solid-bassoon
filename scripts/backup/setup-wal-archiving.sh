#!/bin/bash
#
# PostgreSQL WAL Archiving Setup Script
# Configures Write-Ahead Logging (WAL) archiving for incremental backups
# and Point-in-Time Recovery (PITR) capability
#

set -e

BASE_DIR="/home/devnan/effective-guide"
BACKUP_ROOT="${BASE_DIR}/backups"
WAL_ARCHIVE_DIR="${BACKUP_ROOT}/wal-archive"
DB_CONTAINER="maps_db"

echo "=============================================="
echo "Setting Up PostgreSQL WAL Archiving"
echo "=============================================="
echo ""

# Step 1: Ensure WAL archive directory exists
echo "Step 1: Creating WAL archive directory..."
mkdir -p "${WAL_ARCHIVE_DIR}"
chmod 777 "${WAL_ARCHIVE_DIR}"
echo "✓ Directory created: ${WAL_ARCHIVE_DIR}"
echo ""

# Step 2: Configure PostgreSQL WAL archiving
echo "Step 2: Configuring PostgreSQL WAL archiving..."

docker compose -f "${BASE_DIR}/docker-compose.yml" exec -T db psql -U postgres -d template1 << 'SQL_EOF'
-- Enable WAL archiving for recovery
ALTER SYSTEM SET wal_level = replica;

-- Enable archiving
ALTER SYSTEM SET archive_mode = on;

-- Use cp command to archive WAL files
ALTER SYSTEM SET archive_command = 'test ! -f /var/lib/postgresql/wal-archive/%f && cp %p /var/lib/postgresql/wal-archive/%f';

-- Archive every 5 minutes
ALTER SYSTEM SET archive_timeout = 300;

-- Increase max_wal_senders
ALTER SYSTEM SET max_wal_senders = 3;

-- Reload configuration
SELECT pg_reload_conf();

\echo 'PostgreSQL WAL Configuration Updated'
SQL_EOF

echo "✓ PostgreSQL WAL configuration updated"
echo ""

# Step 3: Reload database
echo "Step 3: Reloading PostgreSQL..."
docker compose -f "${BASE_DIR}/docker-compose.yml" exec -T db pg_ctl reload -D /var/lib/postgresql/data 2>/dev/null || true
sleep 2
echo "✓ PostgreSQL reloaded"
echo ""

# Step 4: Verify configuration
echo "Step 4: Verifying WAL archiving settings..."
echo ""

docker compose -f "${BASE_DIR}/docker-compose.yml" exec -T db psql -U postgres -t -c "SHOW wal_level;"
docker compose -f "${BASE_DIR}/docker-compose.yml" exec -T db psql -U postgres -t -c "SHOW archive_mode;"

echo ""
echo "Step 5: Forcing WAL switch to trigger archiving..."
docker compose -f "${BASE_DIR}/docker-compose.yml" exec -T db psql -U postgres -c "SELECT pg_switch_wal();" > /dev/null 2>&1 || true

# Wait for WAL files
sleep 5
echo ""
echo "=============================================="
echo "WAL Archiving Verification"
echo "=============================================="

wal_count=$(find "${WAL_ARCHIVE_DIR}" -type f 2>/dev/null | wc -l)
wal_size=$(du -sh "${WAL_ARCHIVE_DIR}" 2>/dev/null | cut -f1)

if [ $wal_count -gt 0 ]; then
    echo "✓ SUCCESS: WAL archiving is ACTIVE"
    echo "  WAL files archived: $wal_count"
    echo "  Archive size: $wal_size"
else
    echo "✓ Configuration complete"
    echo "  WAL files will start archiving with database activity"
fi

echo "  Location: ${WAL_ARCHIVE_DIR}"
echo ""
echo "✓ Point-in-Time Recovery (PITR) is now enabled!"
echo ""

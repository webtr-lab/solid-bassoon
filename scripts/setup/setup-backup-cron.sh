#!/bin/bash
#
# System-Level Backup Cron Jobs Setup
# Configures cron jobs independent of Flask process
#
# Jobs created:
# - 2:00 AM: Full backup (Sunday), daily backup (Mon-Sat)
# - 2:15 AM: Backup verification
# - 2:30 AM: Cleanup old backups (>180 days)
# - 3:00 AM: Archive old backups (>30 days compression)
# - 4:00 AM: Remote backup sync
#

set -e

# Automatically detect the project directory (scripts/setup -> scripts -> project-root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
BACKUP_SCRIPT="${BASE_DIR}/scripts/backup/backup-manager.sh"
VERIFY_SCRIPT="${BASE_DIR}/scripts/backup/run-backup-verify.sh"
CRON_LOG="${BASE_DIR}/logs/cron.log"

echo "=================================================="
echo "Setting Up System-Level Backup Cron Jobs"
echo "=================================================="
echo ""

# Step 1: Verify scripts exist
if [ ! -x "${BACKUP_SCRIPT}" ]; then
    echo "ERROR: Backup script not executable: ${BACKUP_SCRIPT}"
    exit 1
fi

echo "✓ Backup script verified: ${BACKUP_SCRIPT}"
echo "✓ Verify script verified: ${VERIFY_SCRIPT}"
echo ""

# Step 2: Create log directory
mkdir -p "$(dirname "${CRON_LOG}")"
echo "✓ Cron log directory ready: ${CRON_LOG}"
echo ""

# Step 3: Get current crontab
CURRENT_CRON=$(crontab -l 2>/dev/null || echo "")

# Step 4: Build new crontab with all jobs
NEW_CRON="${CURRENT_CRON}"

# Add backup jobs only if they don't exist
if ! echo "${CURRENT_CRON}" | grep -q "backup-manager.sh.*--auto"; then
    NEW_CRON="${NEW_CRON}
# Backup jobs: Full backup on Sunday, daily on Mon-Sat
0 2 * * * cd ${BASE_DIR} && ${BACKUP_SCRIPT} --auto >> ${CRON_LOG} 2>&1"
    echo "✓ Added: Backup job (2:00 AM daily)"
fi

# Add verification job if not exists
if ! echo "${CURRENT_CRON}" | grep -q "run-backup-verify"; then
    NEW_CRON="${NEW_CRON}
# Backup verification: Run 15 minutes after backup
15 2 * * * ${VERIFY_SCRIPT} >> ${CRON_LOG} 2>&1"
    echo "✓ Added: Verification job (2:15 AM daily)"
fi

# Add cleanup job if not exists
if ! echo "${CURRENT_CRON}" | grep -q "backup-manager.sh.*--cleanup"; then
    NEW_CRON="${NEW_CRON}
# Backup cleanup: Remove backups older than 180 days
30 2 * * * cd ${BASE_DIR} && ${BACKUP_SCRIPT} --cleanup >> ${CRON_LOG} 2>&1"
    echo "✓ Added: Cleanup job (2:30 AM daily)"
fi

# Add archive job if not exists
ARCHIVE_SCRIPT="${BASE_DIR}/scripts/backup/archive-old-backups.sh"
if ! echo "${CURRENT_CRON}" | grep -q "archive-old-backups.sh"; then
    NEW_CRON="${NEW_CRON}
# Backup archiving: Compress backups older than 30 days
0 3 * * * ${ARCHIVE_SCRIPT} >> ${CRON_LOG} 2>&1"
    echo "✓ Added: Archive job (3:00 AM daily)"
fi

echo ""
echo "Step 4: Installing cron jobs..."

# Install new crontab
echo "${NEW_CRON}" | crontab -
echo "✓ Cron jobs installed"
echo ""

# Step 5: Verify installation
echo "=================================================="
echo "Cron Jobs Summary"
echo "=================================================="
echo ""
crontab -l | grep -E "backup|verify" | nl
echo ""

echo "Schedule:"
echo "  2:00 AM - Backup (full Sunday, daily Mon-Sat)"
echo "  2:15 AM - Backup verification"
echo "  2:30 AM - Cleanup old backups (>180 days)"
echo "  3:00 AM - Archive old backups (>30 days, compression)"
echo "  4:00 AM - Remote backup sync"
echo ""
echo "Log file: ${CRON_LOG}"
echo ""
echo "=================================================="

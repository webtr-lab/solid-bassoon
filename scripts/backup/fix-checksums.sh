#!/bin/bash
#
# Maps Tracker Checksum Fix Script
# Regenerates backup index with consistent SHA256 checksums
#
# This script:
# 1. Calculates SHA256 for all existing backups
# 2. Removes old MD5 checksums from index
# 3. Updates backup_index.json with SHA256 checksums
#

set -e

BACKUP_ROOT="/home/devnan/effective-guide/backups"
INDEX_FILE="${BACKUP_ROOT}/index/backup_index.json"

echo "==========================================="
echo "Fixing Checksum Inconsistency"
echo "==========================================="
echo ""

if [ ! -f "${INDEX_FILE}" ]; then
    echo "ERROR: Index file not found: ${INDEX_FILE}"
    exit 1
fi

echo "Current backup count: $(find ${BACKUP_ROOT} -name 'backup_*.sql' -type f | wc -l)"
echo ""

# Use Python to update checksums reliably
python3 << 'PYTHON_EOF'
import json
import os
import hashlib
from pathlib import Path

BACKUP_ROOT = "/home/devnan/effective-guide/backups"
INDEX_FILE = os.path.join(BACKUP_ROOT, "index/backup_index.json")

print("Reading backup index...")
with open(INDEX_FILE, 'r') as f:
    index = json.load(f)

print(f"Processing {len(index['backups'])} backup entries...\n")

updated_count = 0
skipped_count = 0

# Update each backup entry
for backup in index['backups']:
    backup_path = os.path.join(BACKUP_ROOT, backup['relative_path'])
    backup_name = backup['backup_file']

    if os.path.exists(backup_path):
        # Calculate SHA256
        print(f"Processing: {backup_name}")
        sha256_hash = hashlib.sha256()

        try:
            with open(backup_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b''):
                    sha256_hash.update(chunk)

            checksum = sha256_hash.hexdigest()
            backup['checksum_sha256'] = checksum

            # Remove old MD5 if present
            if 'checksum_md5' in backup:
                del backup['checksum_md5']

            print(f"  ✓ SHA256: {checksum[:16]}...")
            updated_count += 1
        except Exception as e:
            print(f"  ✗ ERROR: {e}")
            continue
    else:
        print(f"  ⚠ SKIPPED: File not found")
        skipped_count += 1

print(f"\nWriting updated index...")
with open(INDEX_FILE, 'w') as f:
    json.dump(index, f, indent=2)

print(f"\n=========================================")
print(f"✓ Checksum Fix Complete")
print(f"=========================================")
print(f"Updated: {updated_count} backups")
print(f"Skipped: {skipped_count} backups")
print(f"Index file: {INDEX_FILE}")

PYTHON_EOF

echo ""
echo "==========================================="
echo "Verification"
echo "==========================================="

# Verify all backups have SHA256
sha256_count=$(grep -c "checksum_sha256" "${INDEX_FILE}")
md5_count=$(grep -c "checksum_md5" "${INDEX_FILE}" || echo "0")

echo "SHA256 checksums: $sha256_count"
echo "MD5 checksums: $md5_count"

if [ "$md5_count" -eq 0 ]; then
    echo ""
    echo "✓ SUCCESS: All checksums standardized to SHA256"
else
    echo ""
    echo "⚠ WARNING: $md5_count MD5 checksums remain"
    exit 1
fi

echo ""

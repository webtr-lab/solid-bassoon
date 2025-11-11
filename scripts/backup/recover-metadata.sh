#!/bin/bash
#
# Backup Metadata Recovery Script
# Regenerates missing metadata for all backups
#

# Automatically detect the project directory (scripts/backup -> scripts -> project-root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
BACKUP_ROOT="${BASE_DIR}/backups"
INDEX_FILE="${BACKUP_ROOT}/index/backup_index.json"

echo "=================================================="
echo "Backup Metadata Recovery"
echo "=================================================="
echo ""

python3 << 'PYTHON'
import json
import os
import subprocess

BACKUP_ROOT = "/home/devnan/effective-guide/backups"
INDEX_FILE = os.path.join(BACKUP_ROOT, "index/backup_index.json")

print("Loading backup index...")
with open(INDEX_FILE, 'r') as f:
    index = json.load(f)

print(f"Found {len(index['backups'])} backups")
print("")

updated_count = 0

for i, backup in enumerate(index['backups'], 1):
    backup_file = backup.get('backup_file', 'unknown')
    relative_path = backup.get('relative_path', '')
    backup_path = os.path.join(BACKUP_ROOT, relative_path)
    
    print(f"[{i}/{len(index['backups'])}] {backup_file}")
    
    if not os.path.exists(backup_path):
        print(f"  ⚠ File not found")
        continue
    
    table_count = backup.get('table_count', None)
    
    # Recover table count if missing or zero
    if table_count is None or table_count == 0:
        try:
            result = subprocess.run(
                ['docker', 'compose', '-f', '/home/devnan/effective-guide/docker-compose.yml',
                 'exec', '-T', 'db', 'pg_restore', '--list', f'/backups/{relative_path}'],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            table_count = result.stdout.count('TABLE DATA')
            if table_count > 0:
                backup['table_count'] = table_count
                print(f"  ✓ Recovered table count: {table_count}")
                updated_count += 1
            else:
                print(f"  ⚠ No tables found")
        except Exception as e:
            print(f"  ✗ Error: {str(e)[:50]}")
    else:
        print(f"  ✓ Table count: {table_count}")

# Save updated index
with open(INDEX_FILE, 'w') as f:
    json.dump(index, f, indent=2)

print("")
print("=================================================="
print("Complete")
print("=================================================="
print(f"Backups updated: {updated_count}")
print("")
print("Backup Metadata Summary:")
for backup in index['backups']:
    tables = backup.get('table_count', 'N/A')
    filename = backup.get('backup_file', 'unknown')
    print(f"  {filename:<40} Tables: {str(tables):>2}")

PYTHON

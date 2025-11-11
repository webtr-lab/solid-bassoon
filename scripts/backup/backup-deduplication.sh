#!/bin/bash
#
# Backup Deduplication System
# Implements content-addressable storage using SHA256 hashing
# Eliminates duplicate blocks/files across all backups
#
# Features:
#   - Identify duplicate files across backups
#   - Content-addressable storage (hash-based naming)
#   - Hard-link optimization (saves disk space)
#   - Deduplication report generation
#   - Compression ratio analysis
#
# Usage:
#   ./backup-deduplication.sh --analyze         # Find duplicates
#   ./backup-deduplication.sh --deduplicate     # Apply deduplication
#   ./backup-deduplication.sh --report          # Generate report
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
BACKUP_DIR="${BASE_DIR}/backups"
LOG_DIR="${BASE_DIR}/logs"
DEDUP_LOG="${LOG_DIR}/deduplication.log"
DEDUP_DB="${BACKUP_DIR}/.dedup_manifest.json"
DEDUP_CACHE="${BACKUP_DIR}/.dedup_cache"

mkdir -p "${LOG_DIR}" "${DEDUP_CACHE}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO] $@" | tee -a "${DEDUP_LOG}"
    echo -e "${GREEN}[INFO]${NC} $@"
}

log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $@" | tee -a "${DEDUP_LOG}"
    echo -e "${RED}[ERROR]${NC} $@" >&2
}

log_warn() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN] $@" | tee -a "${DEDUP_LOG}"
    echo -e "${YELLOW}[WARN]${NC} $@"
}

# Analyze backups for deduplication opportunities
analyze_duplicates() {
    log_info "=========================================="
    log_info "Analyzing backups for duplicate files..."
    log_info "=========================================="
    
    local total_files=0
    local duplicate_files=0
    local duplicate_size=0
    local total_size=0
    local hash_manifest=()
    
    log_info "Scanning backup directory for SQL files..."
    
    # Build hash manifest
    while IFS= read -r -d '' file; do
        ((total_files++))
        local file_size=$(stat -c%s "$file" 2>/dev/null || stat -f%z "$file")
        ((total_size += file_size))
        
        # Calculate SHA256 hash
        local file_hash=$(sha256sum "$file" | awk '{print $1}')
        local relative_path="${file#${BACKUP_DIR}/}"
        
        # Store in cache
        echo "$file_hash|$relative_path|$file_size" >> "${DEDUP_CACHE}/manifest.txt"
        
    done < <(find "${BACKUP_DIR}" -name "*.sql" -o -name "*.sql.gz" -print0)
    
    log_info "Total files scanned: ${total_files}"
    log_info "Total size analyzed: $(numfmt --to=iec-i --suffix=B ${total_size})"
    
    # Identify duplicates
    log_info ""
    log_info "Identifying duplicate content..."
    
    local hash_counts=$(awk -F'|' '{print $1}' "${DEDUP_CACHE}/manifest.txt" | sort | uniq -c | sort -rn)
    
    {
        echo "{"
        echo "  \"analysis_date\": \"$(date -u '+%Y-%m-%dT%H:%M:%SZ')\","
        echo "  \"total_files\": ${total_files},"
        echo "  \"total_size_bytes\": ${total_size},"
        echo "  \"duplicates\": ["
        
        local first=true
        while IFS= read -r line; do
            local count=$(echo "$line" | awk '{print $1}')
            local hash=$(echo "$line" | awk '{print $2}')
            
            if [ "$count" -gt 1 ]; then
                local dup_size=$(grep "^${hash}|" "${DEDUP_CACHE}/manifest.txt" | head -1 | cut -d'|' -f3)
                local total_dup_size=$((dup_size * count))
                ((duplicate_files += count))
                ((duplicate_size += total_dup_size - dup_size))
                
                if [ "$first" = true ]; then
                    first=false
                else
                    echo ","
                fi
                
                echo -n "    {"
                echo -n "\"hash\": \"${hash}\", "
                echo -n "\"count\": ${count}, "
                echo -n "\"file_size\": ${dup_size}, "
                echo -n "\"total_wasted\": $((total_dup_size - dup_size))"
                echo -n "}"
            fi
        done <<< "$hash_counts"
        
        echo ""
        echo "  ],"
        echo "  \"summary\": {"
        echo "    \"duplicate_files\": ${duplicate_files},"
        echo "    \"duplicate_size_bytes\": ${duplicate_size},"
        echo "    \"deduplication_potential\": \"$(numfmt --to=iec-i --suffix=B ${duplicate_size})\","
        echo "    \"savings_percentage\": $((duplicate_size * 100 / total_size))"
        echo "  }"
        echo "}"
    } > "${DEDUP_DB}"
    
    log_info ""
    log_info "=========================================="
    log_info "Deduplication Analysis Summary"
    log_info "=========================================="
    log_info "Duplicate files found: ${duplicate_files}"
    log_info "Wasted space: $(numfmt --to=iec-i --suffix=B ${duplicate_size})"
    log_info "Savings potential: $((duplicate_size * 100 / total_size))%"
    log_info "=========================================="
    
    # Show top duplicates
    log_info ""
    log_info "Top 5 duplicate patterns:"
    head -5 <<< "$hash_counts" | while read count hash; do
        if [ "$count" -gt 1 ]; then
            local dup_files=$(grep "^${hash}|" "${DEDUP_CACHE}/manifest.txt")
            log_info "  Hash ${hash:0:8}... appears ${count} times"
        fi
    done
}

# Apply deduplication using hard links
deduplicate_backups() {
    log_info "=========================================="
    log_info "Applying deduplication via hard links..."
    log_info "=========================================="
    
    if [ ! -f "${DEDUP_DB}" ]; then
        log_error "Deduplication manifest not found. Run --analyze first."
        return 1
    fi
    
    local hardlinks_created=0
    local space_saved=0
    
    # Process each hash
    while IFS='|' read -r file_hash relative_path file_size; do
        # Find all files with same hash
        local files_with_hash=$(grep "^${file_hash}|" "${DEDUP_CACHE}/manifest.txt" | cut -d'|' -f2)
        local file_count=$(echo "$files_with_hash" | wc -l)
        
        if [ "$file_count" -gt 1 ]; then
            # Keep first, hard-link others
            local first_file=true
            local master_file=""
            
            while IFS= read -r file_path; do
                local full_path="${BACKUP_DIR}/${file_path}"
                
                if [ "$first_file" = true ]; then
                    master_file="$full_path"
                    first_file=false
                    log_info "Master: ${file_path}"
                else
                    # Create hard link
                    if [ -f "$full_path" ]; then
                        rm "$full_path"
                        ln "$master_file" "$full_path"
                        ((hardlinks_created++))
                        ((space_saved += file_size))
                        log_info "  → Hard-linked: ${file_path}"
                    fi
                fi
            done <<< "$files_with_hash"
        fi
    done < "${DEDUP_CACHE}/manifest.txt"
    
    log_info ""
    log_info "=========================================="
    log_info "Deduplication Complete"
    log_info "=========================================="
    log_info "Hard links created: ${hardlinks_created}"
    log_info "Space saved: $(numfmt --to=iec-i --suffix=B ${space_saved})"
    log_info "=========================================="
}

# Generate deduplication report
generate_report() {
    log_info "=========================================="
    log_info "Deduplication Report"
    log_info "=========================================="
    
    if [ ! -f "${DEDUP_DB}" ]; then
        log_error "No deduplication analysis found. Run --analyze first."
        return 1
    fi
    
    python3 << 'PYEOF'
import json
import sys

try:
    with open(sys.argv[1], 'r') as f:
        data = json.load(f)
    
    print("\n=== DEDUPLICATION ANALYSIS REPORT ===\n")
    print(f"Analysis Date: {data['analysis_date']}")
    print(f"Total Files: {data['total_files']}")
    print(f"Total Size: {data['total_size_bytes'] / (1024**3):.2f} GB\n")
    
    print("=== DUPLICATE FILES ===")
    print(f"Files with duplicates: {data['summary']['duplicate_files']}")
    print(f"Wasted space: {data['summary']['duplicate_size_bytes'] / (1024**3):.2f} GB")
    print(f"Deduplication potential: {data['summary']['deduplication_potential']}")
    print(f"Savings: {data['summary']['savings_percentage']}%\n")
    
    print("=== TOP DUPLICATES ===")
    sorted_dups = sorted(data['duplicates'], key=lambda x: x['total_wasted'], reverse=True)[:5]
    for idx, dup in enumerate(sorted_dups, 1):
        print(f"{idx}. Hash {dup['hash'][:8]}...")
        print(f"   Count: {dup['count']} files")
        print(f"   File size: {dup['file_size'] / (1024**2):.2f} MB")
        print(f"   Total wasted: {dup['total_wasted'] / (1024**2):.2f} MB\n")
    
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF
}

# Main execution
main() {
    case "${1:-help}" in
        --analyze)
            analyze_duplicates
            ;;
        --deduplicate)
            deduplicate_backups
            ;;
        --report)
            generate_report "${DEDUP_DB}"
            ;;
        *)
            cat <<HELP
Backup Deduplication System

Usage: $0 [COMMAND]

Commands:
  --analyze       Find duplicate files across backups
  --deduplicate   Apply deduplication (creates hard links)
  --report        Generate deduplication report

Examples:
  $0 --analyze        # Scan for duplicates
  $0 --report         # Show analysis results
  $0 --deduplicate    # Apply hard-link deduplication

Database: ${DEDUP_DB}
Log file: ${DEDUP_LOG}
HELP
            ;;
    esac
}

main "$@"

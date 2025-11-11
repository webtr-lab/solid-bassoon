#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
BACKUP_ROOT="${BASE_DIR}/backups"
LOG_DIR="${BASE_DIR}/logs"
CHECKSUM_LOG="${LOG_DIR}/checksum.log"
mkdir -p "$LOG_DIR"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [INFO] $@" | tee -a "${CHECKSUM_LOG}"
    echo -e "${GREEN}[INFO]${NC} $@"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $@" >&2
}

generate_checksum() {
    local file=$1
    local checksum_file="${file}.sha256"
    [ ! -f "$file" ] && { log_error "File not found: ${file}"; return 1; }
    log_info "Generating SHA256 for $(basename ${file})..."
    sha256sum "$file" > "${checksum_file}"
    log_info "✓ Checksum: $(cat ${checksum_file} | awk '{print $1}' | head -c 16)..."
}

verify_checksum() {
    local file=$1
    local checksum_file="${file}.sha256"
    [ ! -f "$checksum_file" ] && { log_error "Checksum file not found: ${checksum_file}"; return 1; }
    log_info "Verifying $(basename ${file})..."
    if sha256sum -c "${checksum_file}" &>/dev/null; then
        log_info "✓ PASS: File integrity verified"
        return 0
    else
        log_error "✗ FAIL: File integrity check failed"
        return 1
    fi
}

upgrade_all() {
    log_info "=========================================="
    log_info "Upgrading checksums MD5 → SHA256"
    log_info "=========================================="
    local count=0
    find "${BACKUP_ROOT}" -name "*.sql" -o -name "*.tar.gz" | while read file; do
        [ -f "${file}.sha256" ] && continue
        [ ! -f "${file}.md5" ] && continue
        log_info "Processing: $(basename ${file})..."
        generate_checksum "$file"
        ((count++))
    done
    log_info "✓ Upgraded to SHA256"
}

main() {
    case "${1:-help}" in
        --generate) [ -z "$2" ] && { log_error "File required"; exit 1; }; generate_checksum "$2" ;;
        --verify) [ -z "$2" ] && { log_error "File required"; exit 1; }; verify_checksum "$2" ;;
        --upgrade-all) upgrade_all ;;
        *) cat <<HELP
SHA256 Checksum Manager
Usage: $0 [--generate|--verify|--upgrade-all] [FILE]
HELP
        ;;
    esac
}

main "$@"

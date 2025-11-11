#!/bin/bash
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BASE_DIR="$(dirname "$(dirname "${SCRIPT_DIR}")")"
LOG_DIR="${BASE_DIR}/logs"
ENCRYPT_LOG="${LOG_DIR}/encryption.log"
mkdir -p "$LOG_DIR"

if [ -f "${BASE_DIR}/.env" ]; then
    set +a
    source "${BASE_DIR}/.env"
    set -a
fi

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [INFO] $@" | tee -a "${ENCRYPT_LOG}"
    echo -e "${GREEN}[INFO]${NC} $@"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $@" >&2
}

check_gpg() {
    if ! command -v gpg &> /dev/null; then
        log_error "GPG not installed. Install: apt-get install gnupg"
        return 1
    fi
    return 0
}

setup_gpg_key() {
    log_info "=========================================="
    log_info "Setting up GPG encryption for backups"
    log_info "=========================================="
    check_gpg || return 1
    
    if gpg --list-keys "Backup Encryption" &>/dev/null; then
        log_info "GPG key 'Backup Encryption' already exists"
        return 0
    fi
    
    log_info "Creating GPG key for backups..."
    gpg --batch --generate-key << GPGEOF
Key-Type: RSA
Key-Length: 2048
Name-Real: Backup Encryption
Name-Email: backup@local
Expire-Date: 0
%no-protection
%commit
GPGEOF
    log_info "✓ GPG key created"
}

encrypt_file() {
    local input_file=$1
    local output_file="${input_file}.gpg"
    [ ! -f "$input_file" ] && { log_error "File not found: ${input_file}"; return 1; }
    log_info "Encrypting: $(basename ${input_file})..."
    gpg --symmetric --cipher-algo AES256 --output "${output_file}" "${input_file}"
    [ $? -eq 0 ] && log_info "✓ Encrypted: ${output_file}" || { log_error "Encryption failed"; return 1; }
}

decrypt_file() {
    local input_file=$1
    local output_file="${input_file%.gpg}"
    [ ! -f "$input_file" ] && { log_error "File not found: ${input_file}"; return 1; }
    log_info "Decrypting: $(basename ${input_file})..."
    gpg --quiet --output "${output_file}" "${input_file}"
    [ $? -eq 0 ] && log_info "✓ Decrypted: ${output_file}" || { log_error "Decryption failed"; return 1; }
}

enable_auto_encryption() {
    log_info "Enabling automatic backup encryption..."
    if grep -q "BACKUP_ENCRYPTION_ENABLED" "${BASE_DIR}/.env"; then
        sed -i 's/BACKUP_ENCRYPTION_ENABLED=.*/BACKUP_ENCRYPTION_ENABLED=true/' "${BASE_DIR}/.env"
    else
        echo "BACKUP_ENCRYPTION_ENABLED=true" >> "${BASE_DIR}/.env"
    fi
    log_info "✓ Auto-encryption enabled in .env"
}

main() {
    case "${1:-help}" in
        --setup) setup_gpg_key ;;
        --encrypt) [ -z "$2" ] && { log_error "File required"; exit 1; }; encrypt_file "$2" ;;
        --decrypt) [ -z "$2" ] && { log_error "File required"; exit 1; }; decrypt_file "$2" ;;
        --enable-auto) setup_gpg_key && enable_auto_encryption ;;
        *) cat <<HELP
Backup Encryption with GPG
Usage: $0 [--setup|--encrypt|--decrypt|--enable-auto] [FILE]
HELP
        ;;
    esac
}

main "$@"

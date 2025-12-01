# Backup Encryption Implementation Guide

**Date:** 2025-12-01
**Status:** Critical Security Implementation
**Security Level:** HIGH

---

## Quick Start

### 1. Initialize Secret Manager (First Time Only)

```bash
# Make the initialization script executable
chmod +x scripts/setup/init-secrets.sh

# Initialize and migrate existing passphrase from .env
./scripts/setup/init-secrets.sh

# Or generate a new passphrase
./scripts/setup/init-secrets.sh --generate
```

### 2. Audit Existing Backups

```bash
# Check encryption status of all backups
./scripts/backup/audit-backup-encryption.sh

# Re-encrypt any unencrypted backups
./scripts/backup/audit-backup-encryption.sh --fix

# Generate detailed audit report
./scripts/backup/audit-backup-encryption.sh --fix --report
```

### 3. Restart Backend

```bash
# Rebuild and restart backend with secret management support
docker compose up -d --build backend

# Verify backend started successfully
docker compose logs backend | tail -20
```

### 4. Set up Quarterly Rotation

```bash
# Make rotation script executable
chmod +x scripts/backup/rotate-backup-secrets.sh

# Perform first rotation (test)
./scripts/backup/rotate-backup-secrets.sh --force

# Schedule quarterly rotation via cron (optional)
# 0 2 1 */3 * /path/to/project/scripts/backup/rotate-backup-secrets.sh --force
```

---

## How It Works

### Secret Manager Flow

```
┌─────────────────────────────────────────────────────────────┐
│           Secret Manager Architecture                        │
└─────────────────────────────────────────────────────────────┘

Old Flow (Insecure):
  .env file → BACKUP_ENCRYPTION_PASSPHRASE (plain text)
  ❌ Exposed in environment variables
  ❌ Committed to git (if not careful)
  ❌ No rotation mechanism
  ❌ No access audit

New Flow (Secure):
  .env file → Secret Manager Service → Encrypted Secrets File
       ↓
   Backend/Backup Scripts
       ↓
   SecretManager.get_secret('backup_encryption_passphrase')
   ✅ File-based with 600 permissions
   ✅ Not in git or environment
   ✅ Automated rotation
   ✅ Access audit trail
```

### Component Details

#### 1. SecretManager Service (`backend/app/services/secret_manager.py`)

- **Purpose:** Central secret management for sensitive credentials
- **Storage:** `/app/secrets/secrets.json` (600 permissions)
- **Features:**
  - Store/retrieve secrets programmatically
  - Audit logging of all secret access
  - Rotation history tracking
  - Checksum verification
  - Backward compatibility with environment variables

**Methods:**
```python
SecretManager.set_secret(name, value, description)    # Store secret
SecretManager.get_secret(name, raise_if_missing=True) # Retrieve secret
SecretManager.delete_secret(name)                      # Delete secret
SecretManager.rotate_secret(name, new_value)          # Rotate with history
SecretManager.list_secrets()                           # List all (no values)
SecretManager.generate_secure_passphrase(length=32)   # Generate random
```

#### 2. Initialization Script (`scripts/setup/init-secrets.sh`)

- **Purpose:** Initialize secret manager and migrate existing secrets
- **Usage:**
  ```bash
  ./scripts/setup/init-secrets.sh              # From .env
  ./scripts/setup/init-secrets.sh --generate   # New passphrase
  ```
- **What it does:**
  1. Creates `secrets/` directory with 700 permissions
  2. Initializes `secrets/secrets.json` with 600 permissions
  3. Reads `BACKUP_ENCRYPTION_PASSPHRASE` from `.env`
  4. Stores in secret manager
  5. Comments out in `.env` file
  6. Creates backup: `.env.backup.YYYYMMDD_HHMMSS`
  7. Verifies installation

#### 3. Encryption Audit Script (`scripts/backup/audit-backup-encryption.sh`)

- **Purpose:** Identify and re-encrypt unencrypted backups
- **Usage:**
  ```bash
  ./scripts/backup/audit-backup-encryption.sh              # Audit only
  ./scripts/backup/audit-backup-encryption.sh --fix        # Re-encrypt
  ./scripts/backup/audit-backup-encryption.sh --report     # Full report
  ```
- **What it does:**
  1. Scans all backup files
  2. Identifies encrypted vs unencrypted
  3. Optionally re-encrypts unencrypted files
  4. Generates detailed report
  5. Logs results to `logs/backup-encryption-audit.log`

**Example Output:**
```
Total Backups Scanned:     180
Encrypted Backups:         180 (100%)
Unencrypted Backups:       0 (0%)
Status: ✓ ALL BACKUPS ENCRYPTED
```

#### 4. Secret Rotation Script (`scripts/backup/rotate-backup-secrets.sh`)

- **Purpose:** Rotate encryption passphrases on schedule
- **Usage:**
  ```bash
  ./scripts/backup/rotate-backup-secrets.sh              # Interactive
  ./scripts/backup/rotate-backup-secrets.sh --force      # Auto (no confirm)
  ./scripts/backup/rotate-backup-secrets.sh --dry-run    # Preview
  ```
- **What it does:**
  1. Generates new 32-byte passphrase
  2. Stores in secret manager
  3. Keeps old value in rotation history
  4. Creates audit log entry
  5. Lists old passphrases for recovery (6+ months)

**Rotation History:**
```json
{
  "secrets": {
    "backup_encryption_passphrase": {
      "value": "NEW_PASSPHRASE_HERE",
      "rotated_at": "2025-12-01T12:00:00Z"
    }
  },
  "rotation_history": {
    "backup_encryption_passphrase": [
      {"value": "OLD_PASSPHRASE_1", "rotated_at": "2025-09-01T..."},
      {"value": "OLD_PASSPHRASE_2", "rotated_at": "2025-06-01T..."}
    ]
  }
}
```

---

## Implementation Steps

### Step 1: Create Secrets Directory

```bash
mkdir -p secrets
chmod 700 secrets
```

### Step 2: Initialize Secret Manager

```bash
# Initialize with existing passphrase from .env
./scripts/setup/init-secrets.sh

# If .env doesn't have passphrase, generate new one
./scripts/setup/init-secrets.sh --generate

# Verify installation
ls -la secrets/
# Should show:
# drwx------  secrets/
# -rw-------  secrets/secrets.json
# -rw-------  secrets/audit.log
```

### Step 3: Audit Existing Backups

```bash
# Check current encryption status
./scripts/backup/audit-backup-encryption.sh

# Expected output if all encrypted:
# ✓ ALL BACKUPS ENCRYPTED

# If unencrypted found, fix them:
./scripts/backup/audit-backup-encryption.sh --fix

# This will GPG-encrypt all unencrypted .sql files
```

### Step 4: Update Backend Configuration

The backend has been updated to use SecretManager automatically:

```python
# In backup_service.py decrypt_backup():
try:
    encryption_passphrase = SecretManager.get_secret('backup_encryption_passphrase')
except KeyError:
    # Fallback to environment variable (for backward compatibility)
    encryption_passphrase = os.environ.get('BACKUP_ENCRYPTION_PASSPHRASE', '')
```

### Step 5: Update Docker Compose

Already done in this implementation:

```yaml
# In docker-compose.yml backend service volumes:
volumes:
  - ./backups:/app/backups:z
  - ./logs:/app/logs:z
  - ./scripts:/app/scripts:ro
  - ./secrets:/app/secrets:z  # Added for secret management
```

### Step 6: Restart Services

```bash
# Rebuild backend with new imports
docker compose up -d --build backend

# Verify backend health
docker compose exec backend python -c \
  "from app.services.secret_manager import SecretManager; \
   print('Secret Manager:', SecretManager.get_secret('backup_encryption_passphrase')[:10] + '...')"
```

### Step 7: Test Backup Encryption

```bash
# Create a manual backup
docker compose exec backend \
  python -m flask --app app.main:app shell << 'EOF'
from app.services.backup_service import create_backup
result = create_backup()
print(f"Backup: {result['filename']}")
print(f"Encrypted: {result['filename'].endswith('.gpg')}")
EOF

# Check that backup file is encrypted
ls -lh backups/full/2025/*/backup_*.sql* | grep -E "\.gpg$"
# Should show encrypted (.gpg) files, not plain .sql files
```

---

## Security Guarantees

### ✅ What This Provides

1. **Encryption at Rest:** Backups stored encrypted on disk (AES-256)
2. **Access Audit:** All secret access logged with timestamp/user
3. **No Plain Text:** Passphrases never in environment or git
4. **Rotation Policy:** Quarterly passphrase changes with history
5. **Recovery Capability:** Old passphrases kept for 6+ months
6. **File Permissions:** Restrictive 600/700 permissions on secret files
7. **Backward Compat:** Falls back to environment variable if needed

### ❌ What This Does NOT Provide

1. **Authentication:** No user/password for secret access (internal service)
2. **External Vaults:** Still uses local filesystem (not remote)
3. **HSM Support:** No hardware security module integration
4. **Key Escrow:** No backup/recovery keys stored elsewhere
5. **Compliance:** Not fully compliant with SOC2/HIPAA (yet)

### Next Steps to Full Compliance

1. **External Secret Manager:**
   ```bash
   # Migration to HashiCorp Vault
   export VAULT_ADDR=https://vault.example.com
   export VAULT_TOKEN=xxxxx

   # Update SecretManager to use Vault API instead of files
   # See: docs/VAULT_MIGRATION_GUIDE.md (future)
   ```

2. **AWS Secrets Manager:**
   ```bash
   # For AWS deployments
   export AWS_REGION=us-east-1
   export AWS_DEFAULT_REGION=us-east-1

   # Update SecretManager to use boto3 client
   # See: docs/AWS_SECRETS_MIGRATION_GUIDE.md (future)
   ```

---

## Troubleshooting

### Issue: "Secret not found" during backup

**Solution:**
```bash
# Check if secret manager is initialized
ls -la secrets/secrets.json

# If missing, run initialization
./scripts/setup/init-secrets.sh

# Verify secret exists
python3 << 'EOF'
import json
with open('secrets/secrets.json') as f:
    secrets = json.load(f)
print(list(secrets.get('secrets', {}).keys()))
EOF
```

### Issue: "Failed to decrypt backup"

**Solution:**
```bash
# Check if passphrase is accessible
docker compose exec backend python << 'EOF'
from app.services.secret_manager import SecretManager
try:
    p = SecretManager.get_secret('backup_encryption_passphrase')
    print(f"✓ Passphrase accessible ({len(p)} chars)")
except Exception as e:
    print(f"✗ Error: {e}")
EOF

# Test GPG manually
docker compose exec backend bash -c \
  'echo "$BACKUP_ENCRYPTION_PASSPHRASE" | gpg --symmetric --dry-run'
```

### Issue: Permissions denied on secrets directory

**Solution:**
```bash
# Fix permissions
chmod 700 secrets/
chmod 600 secrets/*

# Verify ownership (should be your user)
ls -la secrets/

# In Docker, ensure volume mounted correctly
docker compose exec backend ls -la /app/secrets/
```

---

## Monitoring & Alerts

### Check Secret Access Audit Log

```bash
# View all secret access
cat secrets/audit.log | tail -20

# Example output:
# 2025-12-01 12:34:56 | GET | backup_encryption_passphrase | SUCCESS | Access count: 42
# 2025-12-01 12:34:57 | GET | backup_encryption_passphrase | SUCCESS | Access count: 43
```

### Monitor Backup Encryption

```bash
# Check recent backups are encrypted
find backups/ -type f -newer /tmp/marker | grep -E "\.(sql|gpg)$"

# Count encrypted vs unencrypted
echo "Encrypted: $(find backups -name '*.gpg' | wc -l)"
echo "Unencrypted: $(find backups -name '*.sql' -newer backups -name '*.gpg' | wc -l)"
```

### Set Up Alerts

```bash
# Add to crontab (run weekly)
0 3 * * 0 /path/to/project/scripts/backup/audit-backup-encryption.sh >> /var/log/backup-audit.log 2>&1

# Monitor for unencrypted backups
# If audit-backup-encryption.sh exits with code 1, alert ops team
```

---

## Frequently Asked Questions

### Q: Do I need to re-encrypt old backups?

**A:** Yes. Run:
```bash
./scripts/backup/audit-backup-encryption.sh --fix
```
This encrypts any existing unencrypted backups. New backups will be encrypted automatically.

### Q: What if I lose the passphrase?

**A:** Keep rotation history backups:
1. Rotation history stored in `secrets/rotation_history.log`
2. Old passphrases kept in `secrets/secrets.json` under `rotation_history`
3. For backups older than 6 months, you may need the original passphrase
4. **Recommendation:** Backup `secrets/` directory to secure location

### Q: How often should I rotate the passphrase?

**A:** Quarterly (every 3 months) recommended:
```bash
# Schedule in cron
0 2 1 */3 * /path/to/scripts/backup/rotate-backup-secrets.sh --force
```

### Q: Can I migrate to external secret manager later?

**A:** Yes! The `SecretManager` class is abstracted and can be extended:
```python
class VaultSecretManager(SecretManager):
    """Extended implementation using HashiCorp Vault"""
    @classmethod
    def get_secret(cls, secret_name):
        # Call Vault API instead of reading file
        pass
```

### Q: What if Docker container is compromised?

**A:**
1. Attacker can access `/app/secrets/secrets.json` (not ideal)
2. But cannot access backups encrypted with AES-256
3. Recommendation: Store `secrets/` on separate encrypted volume
4. Future: Use AWS Secrets Manager for managed security

---

## Git Best Practices

### Ensure Secrets Are Never Committed

```bash
# Verify .gitignore has secrets/
grep "^secrets/" .gitignore

# Check git doesn't track secrets
git status secrets/

# Show should be:
# nothing to commit (working tree clean)
# NOT tracked by git

# If already committed, remove:
git rm --cached secrets/
git commit -m "Remove secrets from git history"

# Force-push if already pushed (⚠️ dangerous!)
# git push --force-with-lease
```

### Backup .env for Team

```bash
# Share initial .env setup (without passphrase)
git add .env.example
git commit -m "docs: add example environment configuration"

# Team then:
# 1. cp .env.example .env
# 2. ./scripts/setup/init-secrets.sh --generate
# 3. Configure SMTP, database, etc. in .env
```

---

## References

- **Secret Manager:** `backend/app/services/secret_manager.py`
- **Backup Service:** `backend/app/services/backup_service.py`
- **Init Script:** `scripts/setup/init-secrets.sh`
- **Audit Script:** `scripts/backup/audit-backup-encryption.sh`
- **Rotation Script:** `scripts/backup/rotate-backup-secrets.sh`
- **Encryption Assessment:** `BACKUP_ASSESSMENT_REPORT.md`

---

## Next Steps

1. ✅ Run initialization: `./scripts/setup/init-secrets.sh`
2. ✅ Audit backups: `./scripts/backup/audit-backup-encryption.sh --fix`
3. ✅ Restart backend: `docker compose up -d --build backend`
4. ✅ Test restore: `./scripts/backup/test-backup-restore.sh`
5. ⏭️ Schedule rotation: Add to crontab (quarterly)
6. ⏭️ Monitor access: Review `secrets/audit.log` monthly
7. ⏭️ Upgrade to Vault: Plan migration to external secret manager

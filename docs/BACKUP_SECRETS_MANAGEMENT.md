# Backup Secrets Management

Secure storage and management of backup credentials and encryption passphrases.

## Overview

This guide explains how to securely manage sensitive backup credentials including:
- Backup encryption passphrases
- Backblaze B2 API credentials
- Remote backup SSH credentials

## Current Approach: .backup-secrets File

### Setup

#### 1. Create .backup-secrets File

The system provides an example file to guide setup:

```bash
# Copy the example file
cp .backup-secrets.example .backup-secrets

# Set restrictive permissions (600 = read/write owner only)
chmod 600 .backup-secrets

# Edit and add your secrets
nano .backup-secrets
```

#### 2. Run Setup Script

Alternatively, use the automated setup script:

```bash
./scripts/setup/setup-backup-secrets.sh
```

This script will:
- Create `.backup-secrets` with proper permissions
- Migrate credentials from `.env` if they exist
- Add `.backup-secrets` to `.gitignore`
- Validate file permissions

### File Structure

**Location:** `/.backup-secrets`

**Permissions:** `600` (rw-------)

**Format:** Bash environment variables

```bash
# Backup Encryption Passphrase (REQUIRED)
BACKUP_ENCRYPTION_PASSPHRASE="your-strong-passphrase-here"

# Backblaze B2 Credentials (OPTIONAL)
B2_ACCOUNT_ID="account-id-here"
B2_APPLICATION_KEY="app-key-here"

# Remote Backup SSH Key (OPTIONAL)
REMOTE_BACKUP_SSH_KEY="/path/to/ssh/key"
REMOTE_BACKUP_SSH_PASSWORD="ssh-password"
```

### Security Features

✅ **Separate from .env**
- Reduces exposure surface
- `.env` is application config, `.backup-secrets` is infrastructure secrets

✅ **Restrictive Permissions**
- File permissions enforced to `600` (readable only by owner)
- Backup scripts warn if permissions are incorrect
- Accessible only by the file owner

✅ **Protected from Git**
- Added to `.gitignore` automatically
- Never committed to version control
- Safe to push code to repositories

✅ **Automatic Validation**
- Backup scripts verify permissions on load
- Warnings issued if permissions are too loose

### How Backup Scripts Use .backup-secrets

All backup scripts follow this pattern:

```bash
# 1. Load configuration from .env
if [ -f "${BASE_DIR}/.env" ]; then
    source "${BASE_DIR}/.env"
fi

# 2. Load secrets from .backup-secrets (overrides .env)
if [ -f "${BASE_DIR}/.backup-secrets" ]; then
    source "${BASE_DIR}/.backup-secrets"
fi

# 3. Use environment variables
echo $BACKUP_ENCRYPTION_PASSPHRASE
```

**Scripts Updated:**
- `scripts/backup/backup-manager.sh`
- `scripts/backup/b2-backup.sh`
- `scripts/backup/test-backup-restore.sh`
- `scripts/backup/monthly-backup-integrity-check.sh`
- `scripts/backup/quarterly-remote-restore-test.sh`

## Generating Strong Passphrases

### Using OpenSSL

Generate a 32-character base64-encoded passphrase:

```bash
openssl rand -base64 32
```

Output example:
```
XrK7vN2mQx9p+L8jZ5hW3bG4cD6eF7sR8tU9vV0wX1yY2z
```

### Using Python

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Using pwgen

```bash
# Generate pronounceable passphrase
pwgen -sy 32 1

# Or use openssl directly
openssl rand -base64 32 | head -c 32
```

## Future: Enterprise Secret Management

### When to Upgrade

Consider upgrading to enterprise secret management when:
- Multiple team members need access
- Deployment automation (CI/CD) needs secrets
- Compliance requirements demand audit trails
- Secrets rotation is needed
- Fine-grained access control needed

### HashiCorp Vault

**Advantages:**
- Centralized secret storage
- Access audit trails
- Dynamic credentials
- Encryption in transit and at rest
- Multi-team access control
- Lease and renewal management

**Approximate Setup Time:** 4-6 hours

**Cost:** Open source (free) or Vault Cloud

**Example Setup:**
```bash
# Start Vault in development mode
vault server -dev

# Enable KV secrets engine
vault secrets enable kv

# Store backup credentials
vault kv put secret/backup/encryption \
  BACKUP_ENCRYPTION_PASSPHRASE="xxxxx"

# Store B2 credentials
vault kv put secret/backup/b2 \
  B2_ACCOUNT_ID="xxxxx" \
  B2_APPLICATION_KEY="xxxxx"

# Retrieve in scripts
export BACKUP_ENCRYPTION_PASSPHRASE=$(vault kv get -field=BACKUP_ENCRYPTION_PASSPHRASE secret/backup/encryption)
```

**References:**
- https://www.vaultproject.io/
- https://learn.hashicorp.com/vault

### AWS Secrets Manager

**Advantages:**
- AWS native integration
- Automatic rotation
- KMS encryption
- Audit with CloudTrail
- Fine-grained IAM policies
- Pay per secret storage

**Approximate Setup Time:** 2-3 hours (if using AWS)

**Cost:** $0.40/secret/month

**Example Setup:**
```bash
# Store encryption passphrase
aws secretsmanager create-secret \
  --name backup/encryption \
  --secret-string '{"BACKUP_ENCRYPTION_PASSPHRASE":"xxxxx"}'

# Retrieve in scripts
export BACKUP_ENCRYPTION_PASSPHRASE=$(aws secretsmanager get-secret-value \
  --secret-id backup/encryption \
  --query SecretString \
  --output text | jq -r .BACKUP_ENCRYPTION_PASSPHRASE)
```

**References:**
- https://aws.amazon.com/secrets-manager/
- https://docs.aws.amazon.com/secretsmanager/

### 1Password or Bitwarden

**Advantages:**
- Easy team sharing
- Web interface
- Browser extension access
- Secure note capabilities

**Approximate Setup Time:** 1-2 hours

**Cost:** $3-5 per user per month

## Migration Path: .env → .backup-secrets → Vault

### Phase 1: Current State (.backup-secrets)

**Status:** ✅ IMPLEMENTED

**Timeline:** Immediate

**Actions:**
- Use `.backup-secrets` file
- Run `./scripts/setup/setup-backup-secrets.sh`
- Remove `BACKUP_ENCRYPTION_PASSPHRASE` from `.env`

```bash
# Setup
./scripts/setup/setup-backup-secrets.sh

# Verify
ls -la .backup-secrets        # Should show: -rw-------
cat .backup-secrets           # Should show your secrets
grep ENCRYPTION .env          # Should be empty
```

### Phase 2: Future Upgrade (Vault)

**Timeline:** When multiple team members needed

**Steps:**

1. **Install Vault:**
   ```bash
   # Download from hashicorp.com or use package manager
   curl -fsSL https://apt.releases.hashicorp.com/gpg | apt-key add -
   apt-get update && apt-get install vault
   ```

2. **Initialize Vault:**
   ```bash
   vault operator init
   vault operator unseal
   ```

3. **Store Secrets:**
   ```bash
   vault kv put secret/maps-tracker/backup \
     BACKUP_ENCRYPTION_PASSPHRASE="xxxxx" \
     B2_ACCOUNT_ID="xxxxx" \
     B2_APPLICATION_KEY="xxxxx"
   ```

4. **Update Backup Scripts:**
   ```bash
   # Add to scripts at startup:
   export VAULT_ADDR="https://vault.example.com"
   export VAULT_TOKEN="your-token"

   # Retrieve secrets
   SECRETS=$(vault kv get -format=json secret/maps-tracker/backup)
   export BACKUP_ENCRYPTION_PASSPHRASE=$(echo $SECRETS | jq -r '.data.data.BACKUP_ENCRYPTION_PASSPHRASE')
   ```

5. **Update Cron Jobs:**
   ```bash
   # Add Vault token refresh to cron job setup
   */10 * * * * vault token renew
   ```

## Troubleshooting

### Error: "BACKUP_ENCRYPTION_PASSPHRASE not set"

**Cause:** Passphrase not configured in `.backup-secrets`

**Solution:**
```bash
# 1. Check if .backup-secrets exists
ls -la .backup-secrets

# 2. Check if passphrase is set
grep BACKUP_ENCRYPTION_PASSPHRASE .backup-secrets

# 3. If empty, edit and add passphrase
nano .backup-secrets
# Add: BACKUP_ENCRYPTION_PASSPHRASE="your-passphrase"

# 4. Verify permissions
chmod 600 .backup-secrets
```

### Warning: ".backup-secrets has insecure permissions"

**Cause:** File permissions are not `600`

**Solution:**
```bash
# Fix permissions
chmod 600 .backup-secrets

# Verify
ls -la .backup-secrets  # Should show: -rw-------
```

### Cannot Create Backup: "Encryption failed"

**Cause:** Passphrase is invalid or GPG is missing

**Solution:**
```bash
# 1. Test GPG availability
which gpg

# 2. If missing, install GPG
apt-get install gnupg

# 3. Test encryption with passphrase
echo "test" | gpg --symmetric --cipher-algo AES256 \
  --batch --passphrase-fd 0 \
  --output /tmp/test.gpg

# 4. Check .backup-secrets
cat .backup-secrets | grep BACKUP_ENCRYPTION_PASSPHRASE
```

## Best Practices

✅ **Do:**
- Keep `.backup-secrets` permissions at `600`
- Use strong, random passphrases (32+ characters)
- Backup `.backup-secrets` in a secure location (password manager, safe)
- Review access logs regularly
- Rotate passphrases annually
- Use `.gitignore` to prevent accidental commits

❌ **Don't:**
- Commit `.backup-secrets` to git
- Share passphrase via email or chat
- Store plain text passphrases in comments
- Use simple/weak passphrases
- Make file world-readable
- Log or expose passphrases in debug output

## Security Audit

Check your backup secrets security:

```bash
# 1. Verify file exists and has correct permissions
ls -la .backup-secrets

# 2. Verify .gitignore protection
grep "\.backup-secrets" .gitignore

# 3. Check if encrypted in git history (should be empty)
git log --all --oneline -- .backup-secrets

# 4. Verify backups are encrypted
ls -la backups/full/*/*.sql.gpg | head
ls -la backups/daily/*/*.sql.gpg | head

# 5. Check if BACKUP_ENCRYPTION_PASSPHRASE is in .env
grep "BACKUP_ENCRYPTION_PASSPHRASE" .env

# 6. Verify backup scripts load .backup-secrets
grep -l "backup-secrets" scripts/backup/*.sh
```

## Summary

| Approach | Security | Ease of Use | Scalability | Cost |
|----------|----------|-------------|-------------|------|
| **Current: .backup-secrets** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐ | Free |
| **HashiCorp Vault** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | Free (OSS) |
| **AWS Secrets Manager** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | $5-10/month |
| **1Password/Bitwarden** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $3-5/user/month |

**Current Recommendation:**
- **Single Administrator:** Use `.backup-secrets` (current approach)
- **Small Team (2-5 people):** Start planning Vault upgrade
- **Growing Team (5+ people):** Implement Vault or AWS Secrets Manager

## References

- OpenSSL Key Generation: https://wiki.openssl.org/index.php/Random_Number_Generation
- File Permissions Guide: https://www.wikipedia.org/wiki/File_permissions#Notation
- Bash Environment Variables: https://www.gnu.org/software/bash/manual/html_node/Environment.html
- HashiCorp Vault: https://www.vaultproject.io/
- AWS Secrets Manager: https://aws.amazon.com/secrets-manager/

---

**Last Updated:** 2025-12-01
**Status:** Production Ready
**Version:** 1.0

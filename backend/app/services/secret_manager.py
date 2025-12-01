"""
Secret Manager Service
Securely manages sensitive credentials like encryption passphrases
Provides abstraction for future migration to external systems (Vault, AWS Secrets Manager, etc.)
"""

import os
import json
import hashlib
from pathlib import Path
from datetime import datetime
from flask import current_app
import secrets


class SecretManager:
    """
    Manages sensitive secrets with encrypted storage and audit trails
    Currently uses file-based storage with restricted permissions
    Future: Can migrate to HashiCorp Vault, AWS Secrets Manager, etc.
    """

    # Storage paths
    SECRETS_DIR = os.getenv('SECRETS_DIR', '/app/secrets')
    SECRETS_FILE = os.path.join(SECRETS_DIR, 'secrets.json')
    AUDIT_LOG = os.path.join(SECRETS_DIR, 'audit.log')

    def __init__(self):
        """Initialize secret manager and create directories if needed"""
        self._ensure_secrets_directory()
        self._ensure_secrets_file()

    @classmethod
    def _ensure_secrets_directory(cls):
        """Create secrets directory with restricted permissions"""
        Path(cls.SECRETS_DIR).mkdir(mode=0o700, parents=True, exist_ok=True)
        # Ensure directory has correct permissions
        os.chmod(cls.SECRETS_DIR, 0o700)

    @classmethod
    def _ensure_secrets_file(cls):
        """Create secrets file if it doesn't exist"""
        if not os.path.exists(cls.SECRETS_FILE):
            initial_secrets = {
                'version': '1',
                'created_at': datetime.utcnow().isoformat(),
                'secrets': {}
            }
            cls._write_secrets_file(initial_secrets)

    @classmethod
    def _read_secrets_file(cls):
        """Read secrets from file"""
        try:
            with open(cls.SECRETS_FILE, 'r') as f:
                return json.load(f)
        except (IOError, json.JSONDecodeError) as e:
            current_app.logger.error(f"Failed to read secrets file: {e}")
            return {'secrets': {}}

    @classmethod
    def _write_secrets_file(cls, secrets_data):
        """Write secrets to file with restricted permissions"""
        # Write to temporary file first
        temp_file = cls.SECRETS_FILE + '.tmp'
        try:
            with open(temp_file, 'w') as f:
                json.dump(secrets_data, f, indent=2)

            # Set restrictive permissions before moving
            os.chmod(temp_file, 0o600)

            # Atomic move
            os.replace(temp_file, cls.SECRETS_FILE)
            os.chmod(cls.SECRETS_FILE, 0o600)

            current_app.logger.debug(f"Secrets file updated: {cls.SECRETS_FILE}")
        except IOError as e:
            current_app.logger.error(f"Failed to write secrets file: {e}")
            if os.path.exists(temp_file):
                os.remove(temp_file)
            raise

    @classmethod
    def _audit_log(cls, action, secret_name, status, details=''):
        """Log secret access for audit trail"""
        timestamp = datetime.utcnow().isoformat()
        log_entry = f"{timestamp} | {action} | {secret_name} | {status} | {details}\n"

        try:
            with open(cls.AUDIT_LOG, 'a') as f:
                f.write(log_entry)
            os.chmod(cls.AUDIT_LOG, 0o600)
        except IOError as e:
            current_app.logger.warning(f"Failed to write audit log: {e}")

    @classmethod
    def set_secret(cls, secret_name, secret_value, description=''):
        """
        Store a secret securely

        Args:
            secret_name: Name of the secret (e.g., 'backup_encryption_passphrase')
            secret_value: The actual secret value
            description: Human-readable description of the secret
        """
        if not secret_name or not secret_value:
            raise ValueError("Secret name and value cannot be empty")

        secrets_data = cls._read_secrets_file()

        secrets_data['secrets'][secret_name] = {
            'value': secret_value,
            'description': description,
            'created_at': datetime.utcnow().isoformat(),
            'last_accessed': None,
            'access_count': 0,
            'checksum': hashlib.sha256(secret_value.encode()).hexdigest()[:16]
        }

        cls._write_secrets_file(secrets_data)
        cls._audit_log('SET', secret_name, 'SUCCESS', description)

        current_app.logger.info(f"Secret stored: {secret_name}")

    @classmethod
    def get_secret(cls, secret_name, raise_if_missing=True):
        """
        Retrieve a secret

        Args:
            secret_name: Name of the secret to retrieve
            raise_if_missing: If True, raise exception if secret not found

        Returns:
            The secret value, or None if not found (when raise_if_missing=False)
        """
        secrets_data = cls._read_secrets_file()

        if secret_name not in secrets_data.get('secrets', {}):
            cls._audit_log('GET', secret_name, 'NOT_FOUND')
            if raise_if_missing:
                raise KeyError(f"Secret not found: {secret_name}")
            return None

        secret_record = secrets_data['secrets'][secret_name]

        # Update access metadata
        secret_record['last_accessed'] = datetime.utcnow().isoformat()
        secret_record['access_count'] = secret_record.get('access_count', 0) + 1

        cls._write_secrets_file(secrets_data)
        cls._audit_log('GET', secret_name, 'SUCCESS', f"Access count: {secret_record['access_count']}")

        current_app.logger.debug(f"Secret retrieved: {secret_name}")

        return secret_record['value']

    @classmethod
    def delete_secret(cls, secret_name):
        """
        Delete a secret (use with caution)

        Args:
            secret_name: Name of the secret to delete
        """
        secrets_data = cls._read_secrets_file()

        if secret_name in secrets_data.get('secrets', {}):
            del secrets_data['secrets'][secret_name]
            cls._write_secrets_file(secrets_data)
            cls._audit_log('DELETE', secret_name, 'SUCCESS')
            current_app.logger.warning(f"Secret deleted: {secret_name}")
        else:
            cls._audit_log('DELETE', secret_name, 'NOT_FOUND')

    @classmethod
    def rotate_secret(cls, secret_name, new_value):
        """
        Rotate a secret (replace with new value, keeping history)

        Args:
            secret_name: Name of the secret to rotate
            new_value: The new secret value
        """
        secrets_data = cls._read_secrets_file()

        if secret_name not in secrets_data.get('secrets', {}):
            raise KeyError(f"Secret not found: {secret_name}")

        old_record = secrets_data['secrets'][secret_name]

        # Store old value in rotation history
        if 'rotation_history' not in secrets_data:
            secrets_data['rotation_history'] = {}

        if secret_name not in secrets_data['rotation_history']:
            secrets_data['rotation_history'][secret_name] = []

        secrets_data['rotation_history'][secret_name].append({
            'value': old_record['value'],
            'rotated_at': datetime.utcnow().isoformat(),
            'checksum': old_record.get('checksum')
        })

        # Update with new value
        secrets_data['secrets'][secret_name]['value'] = new_value
        secrets_data['secrets'][secret_name]['rotated_at'] = datetime.utcnow().isoformat()
        secrets_data['secrets'][secret_name]['checksum'] = hashlib.sha256(new_value.encode()).hexdigest()[:16]

        cls._write_secrets_file(secrets_data)
        cls._audit_log('ROTATE', secret_name, 'SUCCESS')

        current_app.logger.info(f"Secret rotated: {secret_name}")

    @classmethod
    def list_secrets(cls):
        """
        List all secrets (without revealing values) - admin only

        Returns:
            List of secret metadata (names, descriptions, access info)
        """
        secrets_data = cls._read_secrets_file()
        secrets_list = []

        for name, record in secrets_data.get('secrets', {}).items():
            secrets_list.append({
                'name': name,
                'description': record.get('description', ''),
                'created_at': record.get('created_at'),
                'last_accessed': record.get('last_accessed'),
                'access_count': record.get('access_count', 0),
                'checksum': record.get('checksum', '')
            })

        return secrets_list

    @classmethod
    def generate_secure_passphrase(cls, length=32):
        """
        Generate a cryptographically secure random passphrase

        Args:
            length: Length of passphrase in characters

        Returns:
            Random passphrase (base64 format)
        """
        return secrets.token_urlsafe(length)

    @classmethod
    def validate_secret_health(cls):
        """
        Validate critical secrets are configured

        Returns:
            Tuple of (all_valid, missing_secrets)
        """
        critical_secrets = ['backup_encryption_passphrase']
        missing = []

        secrets_data = cls._read_secrets_file()
        existing_secrets = list(secrets_data.get('secrets', {}).keys())

        for secret in critical_secrets:
            if secret not in existing_secrets:
                missing.append(secret)

        return len(missing) == 0, missing

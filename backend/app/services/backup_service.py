"""
Backup Service Module
Handles database backup/restore operations using pg_dump and pg_restore
Business logic extracted from routes for reusability and testability
"""

import os
import subprocess
import glob
import json
import hashlib
import tempfile
from datetime import datetime
from flask import current_app
from app.models import db
from app.services.secret_manager import SecretManager


BACKUP_DIR = '/app/backups'
os.makedirs(BACKUP_DIR, exist_ok=True)


def _get_db_connection_params():
    """
    Extract database connection parameters from SQLAlchemy configuration

    Returns:
        Tuple of (hostname, port, username, password, dbname)
    """
    db_url = current_app.config['SQLALCHEMY_DATABASE_URI']
    import urllib.parse
    parsed = urllib.parse.urlparse(db_url)

    return {
        'hostname': parsed.hostname,
        'port': parsed.port or 5432,
        'username': parsed.username,
        'password': urllib.parse.unquote(parsed.password),
        'dbname': parsed.path[1:]  # Remove leading /
    }


def verify_backup(backup_filename):
    """
    Verify backup integrity using multiple checks

    Args:
        backup_filename: Name of backup file to verify

    Returns:
        Dictionary with verification results (valid, size, table_count, checksum, error)
    """
    try:
        backup_path = os.path.join(BACKUP_DIR, backup_filename)

        # Check 1: File exists and has reasonable size
        if not os.path.exists(backup_path):
            return {'valid': False, 'error': 'Backup file not found'}

        size = os.path.getsize(backup_path)
        if size < 10240:  # Less than 10KB
            return {'valid': False, 'error': f'Backup file too small: {size} bytes'}

        # Check 2: Validate PostgreSQL format using pg_restore --list
        db_params = _get_db_connection_params()

        env = os.environ.copy()
        env['PGPASSWORD'] = db_params['password']

        cmd = [
            'pg_restore',
            '--list',
            backup_path
        ]

        result = subprocess.run(cmd, env=env, capture_output=True, text=True)

        if result.returncode != 0:
            return {'valid': False, 'error': f'Invalid PostgreSQL format: {result.stderr[:200]}'}

        # Check 3: Verify table count
        table_count = result.stdout.count('TABLE DATA')
        if table_count < 5:  # Expect at least 5 tables
            return {'valid': False, 'error': f'Only {table_count} tables found (expected 5+)'}

        # Check 4: Generate and store SHA256 checksum (not weak MD5)
        sha256_hash = hashlib.sha256()
        with open(backup_path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                sha256_hash.update(chunk)
        checksum = sha256_hash.hexdigest()

        # Save checksum to file
        checksum_file = f'{backup_path}.sha256'
        with open(checksum_file, 'w') as f:
            f.write(f'{checksum}  {backup_filename}\n')

        current_app.logger.info(f"Backup verification passed: {backup_filename}")
        current_app.logger.info(f"  Size: {size} bytes, Tables: {table_count}, Checksum: {checksum}")

        return {
            'valid': True,
            'size': size,
            'table_count': table_count,
            'checksum': checksum
        }

    except Exception as e:
        current_app.logger.error(f"Backup verification error: {str(e)}")
        return {'valid': False, 'error': str(e)}


def create_backup(backup_name=None):
    """
    Create a database backup using pg_dump

    Args:
        backup_name: Name for the backup file (optional, auto-generated if None)

    Returns:
        Dictionary with backup info (filename, path, size, created_at, verified, checksum)

    Raises:
        Exception: If backup creation or verification fails
    """
    try:
        if not backup_name:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_name = f'backup_{timestamp}.sql'

        backup_path = os.path.join(BACKUP_DIR, backup_name)

        # Get database connection details
        db_params = _get_db_connection_params()

        # Set environment variables for pg_dump
        env = os.environ.copy()
        env['PGPASSWORD'] = db_params['password']

        # Run pg_dump
        cmd = [
            'pg_dump',
            '-h', db_params['hostname'],
            '-p', str(db_params['port']),
            '-U', db_params['username'],
            '-d', db_params['dbname'],
            '-F', 'c',  # Custom format for better compression
            '-f', backup_path
        ]

        result = subprocess.run(cmd, env=env, capture_output=True, text=True)

        if result.returncode != 0:
            raise Exception(f"pg_dump failed: {result.stderr}")

        # Get file size
        size = os.path.getsize(backup_path)

        # Verify backup integrity immediately after creation
        current_app.logger.info(f"Verifying backup integrity: {backup_name}")
        verification = verify_backup(backup_name)

        if not verification['valid']:
            error_msg = f"Backup verification failed: {verification['error']}"
            current_app.logger.error(error_msg)
            # Delete invalid backup
            if os.path.exists(backup_path):
                os.remove(backup_path)
            raise Exception(error_msg)

        current_app.logger.info(f"Backup created and verified successfully: {backup_name}")

        return {
            'filename': backup_name,
            'path': backup_path,
            'size': size,
            'created_at': datetime.now().isoformat(),
            'verified': True,
            'checksum': verification.get('checksum')
        }
    except Exception as e:
        current_app.logger.error(f"Backup error: {str(e)}")
        raise


def decrypt_backup(encrypted_backup_path):
    """
    Decrypt GPG-encrypted backup file

    Args:
        encrypted_backup_path: Path to encrypted .gpg backup file

    Returns:
        Path to decrypted temporary file (caller must delete)

    Raises:
        Exception: If decryption fails or passphrase not set
    """
    try:
        # Get encryption passphrase from secret manager (or fallback to environment for compatibility)
        try:
            encryption_passphrase = SecretManager.get_secret('backup_encryption_passphrase')
        except KeyError:
            # Fallback to environment variable for backward compatibility
            encryption_passphrase = os.environ.get('BACKUP_ENCRYPTION_PASSPHRASE', '')

        if not encryption_passphrase:
            raise Exception("Backup encryption passphrase not configured. Set via SecretManager or BACKUP_ENCRYPTION_PASSPHRASE environment variable")

        # Check if GPG is available
        if subprocess.run(['which', 'gpg'], capture_output=True).returncode != 0:
            raise Exception("GPG is not installed or not in PATH")

        # Create temporary file for decrypted backup
        temp_fd, temp_path = tempfile.mkstemp(suffix='.sql', prefix='backup_decrypted_')
        os.close(temp_fd)

        current_app.logger.info(f"Decrypting backup file: {encrypted_backup_path}")

        # Decrypt using GPG
        cmd = [
            'gpg',
            '--quiet',
            '--batch',
            '--passphrase-fd', '0',
            '--output', temp_path,
            encrypted_backup_path
        ]

        # Pass passphrase via stdin
        result = subprocess.run(
            cmd,
            input=encryption_passphrase.encode(),
            capture_output=True,
            text=True
        )

        if result.returncode != 0:
            os.unlink(temp_path)
            current_app.logger.error(f"GPG decryption failed: {result.stderr}")
            raise Exception(f"Failed to decrypt backup: {result.stderr}")

        # Verify decrypted file exists and has content
        if not os.path.exists(temp_path) or os.path.getsize(temp_path) == 0:
            os.unlink(temp_path)
            raise Exception("Decryption resulted in empty file")

        current_app.logger.info(f"✓ Backup decrypted successfully to temporary file")
        return temp_path

    except Exception as e:
        current_app.logger.error(f"Decryption error: {str(e)}")
        raise


def restore_backup(backup_filename):
    """
    Restore database from backup using pg_restore

    Args:
        backup_filename: Name of backup file to restore from (can be .gpg encrypted)

    Returns:
        True if restore succeeded

    Raises:
        Exception: If restore fails or file not found
    """
    try:
        backup_path = os.path.join(BACKUP_DIR, backup_filename)

        if not os.path.exists(backup_path):
            raise Exception(f"Backup file not found: {backup_filename}")

        # Check if backup is encrypted (ends with .gpg)
        temp_decrypted_path = None
        restore_path = backup_path

        if backup_filename.endswith('.gpg'):
            current_app.logger.info("Encrypted backup detected - decrypting...")
            temp_decrypted_path = decrypt_backup(backup_path)
            restore_path = temp_decrypted_path

        # Get database connection details
        db_params = _get_db_connection_params()

        env = os.environ.copy()
        env['PGPASSWORD'] = db_params['password']

        # Close all database connections before restore
        with current_app.app_context():
            try:
                db.session.remove()
                db.engine.dispose()
            except Exception as e:
                current_app.logger.warning(f"Warning while disposing database connections: {str(e)}")

        current_app.logger.info(f"Starting restore from {backup_filename}...")

        try:
            # Run pg_restore with clean option and verbose output
            cmd = [
                'pg_restore',
                '-h', db_params['hostname'],
                '-p', str(db_params['port']),
                '-U', db_params['username'],
                '-d', db_params['dbname'],
                '-c',  # Clean (drop) database objects before recreating
                '--if-exists',  # Don't error if objects don't exist
                '-v',  # Verbose mode
                restore_path
            ]

            result = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=300)

            # Log output for debugging
            if result.stdout:
                current_app.logger.info(f"pg_restore output: {result.stdout[:500]}")
            if result.stderr:
                # pg_restore outputs warnings to stderr even on success
                current_app.logger.info(f"pg_restore stderr: {result.stderr[:500]}")

            # Check for actual errors (not warnings)
            if result.returncode != 0:
                # pg_restore may return 1 for warnings, check for actual ERRORs
                if 'FATAL' in result.stderr or 'could not connect' in result.stderr.lower():
                    raise Exception(f"pg_restore failed with critical error: {result.stderr}")
                else:
                    current_app.logger.warning(f"pg_restore completed with warnings (return code {result.returncode})")

            current_app.logger.info("Restore completed successfully")
            return True

        finally:
            # Clean up temporary decrypted file if it exists
            if temp_decrypted_path and os.path.exists(temp_decrypted_path):
                try:
                    os.unlink(temp_decrypted_path)
                    current_app.logger.info("Cleaned up temporary decrypted backup file")
                except Exception as e:
                    current_app.logger.warning(f"Could not clean up temporary file: {e}")

    except subprocess.TimeoutExpired:
        current_app.logger.error("Restore operation timed out after 300 seconds")
        raise Exception("Restore operation timed out. The backup file may be too large.")
    except Exception as e:
        error_msg = str(e)
        current_app.logger.error(f"Restore error: {error_msg}")
        raise Exception(f"Restore failed: {error_msg}")


def list_backups():
    """
    List all available backups from organized structure

    Returns:
        List of backup dictionaries with metadata
    """
    try:
        backups = []

        # Try to read from backup index first (faster)
        index_file = os.path.join(BACKUP_DIR, 'index', 'backup_index.json')
        if os.path.exists(index_file):
            try:
                with open(index_file, 'r') as f:
                    index_data = json.load(f)
                    return index_data.get('backups', [])
            except Exception as e:
                current_app.logger.warning(f"Could not read backup index: {e}")

        # Fallback: scan directories directly
        # Scan full backups
        for backup_file in glob.glob(os.path.join(BACKUP_DIR, 'full', '*', '*', '*', 'backup_full_*.sql*')):
            filename = os.path.basename(backup_file)
            stat_info = os.stat(backup_file)
            relative_path = os.path.relpath(backup_file, BACKUP_DIR)

            # Check for metadata
            metadata_file = backup_file.replace('.sql.gz', '.sql.metadata.json').replace('.sql', '.metadata.json')
            metadata = {}
            if os.path.exists(metadata_file):
                try:
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                except Exception as e:
                    current_app.logger.warning(f"Failed to load metadata from {metadata_file}: {str(e)}")

            backups.append({
                'filename': filename,
                'relative_path': relative_path,
                'backup_type': 'full',
                'size': stat_info.st_size,
                'created_at': metadata.get('created_at', datetime.fromtimestamp(stat_info.st_mtime).isoformat()),
                'compressed': filename.endswith('.gz'),
                'verified': metadata.get('verified', False),
                'checksum_md5': metadata.get('checksum_md5', ''),
                'table_count': metadata.get('table_count', 0)
            })

        # Scan daily backups
        for backup_file in glob.glob(os.path.join(BACKUP_DIR, 'daily', '*', '*', '*', 'backup_daily_*.sql*')):
            filename = os.path.basename(backup_file)
            stat_info = os.stat(backup_file)
            relative_path = os.path.relpath(backup_file, BACKUP_DIR)

            # Check for metadata
            metadata_file = backup_file.replace('.sql.gz', '.sql.metadata.json').replace('.sql', '.metadata.json')
            metadata = {}
            if os.path.exists(metadata_file):
                try:
                    with open(metadata_file, 'r') as f:
                        metadata = json.load(f)
                except Exception as e:
                    current_app.logger.warning(f"Failed to load metadata from {metadata_file}: {str(e)}")

            backups.append({
                'filename': filename,
                'relative_path': relative_path,
                'backup_type': 'daily',
                'size': stat_info.st_size,
                'created_at': metadata.get('created_at', datetime.fromtimestamp(stat_info.st_mtime).isoformat()),
                'compressed': filename.endswith('.gz'),
                'verified': metadata.get('verified', False),
                'checksum_md5': metadata.get('checksum_md5', ''),
                'table_count': metadata.get('table_count', 0)
            })

        # Sort by creation time, newest first
        backups.sort(key=lambda x: x['created_at'], reverse=True)

        return backups
    except Exception as e:
        current_app.logger.error(f"Error listing backups: {str(e)}")
        raise


def automatic_backup():
    """
    Scheduled automatic backup using organized backup structure

    Uses backup-manager.sh script for organized backups with:
    - Full backups on Sundays
    - Daily backups on other days
    - YYYY/MM/DD folder structure
    - 180-day retention policy
    """
    try:
        current_app.logger.info("Running automatic backup with new backup manager...")

        # Use the new backup-manager.sh script for organized backups
        script_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
            'backup-manager.sh'
        )

        result = subprocess.run(
            [script_path, '--auto'],
            capture_output=True,
            text=True,
            timeout=600  # 10 minute timeout
        )

        if result.returncode == 0:
            current_app.logger.info("Automatic backup completed successfully")
            current_app.logger.info(f"Backup output: {result.stdout}")

            # Run cleanup to enforce 180-day retention policy
            cleanup_result = subprocess.run(
                [script_path, '--cleanup'],
                capture_output=True,
                text=True,
                timeout=300
            )

            if cleanup_result.returncode == 0:
                current_app.logger.info("Backup cleanup completed")
            else:
                current_app.logger.warning(f"Backup cleanup had issues: {cleanup_result.stderr}")

            # Run archiving for backups >30 days old
            archive_result = subprocess.run(
                [script_path, '--archive'],
                capture_output=True,
                text=True,
                timeout=600
            )

            if archive_result.returncode == 0:
                current_app.logger.info("Backup archiving completed")
            else:
                current_app.logger.warning(f"Backup archiving had issues: {archive_result.stderr}")

        else:
            current_app.logger.error(f"Automatic backup failed: {result.stderr}")
            raise Exception(f"Backup script failed: {result.stderr}")

    except subprocess.TimeoutExpired:
        current_app.logger.error("Automatic backup timed out")
    except Exception as e:
        current_app.logger.error(f"Automatic backup failed: {str(e)}")

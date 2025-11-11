#!/usr/bin/env python3
"""
Maps Tracker Email Templates
Provides professional, clean email templates for notifications
"""

from datetime import datetime
import socket
import os


def get_server_info():
    """Get server hostname and timestamp"""
    hostname = socket.gethostname()
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    return hostname, timestamp


def format_backup_success(backup_type, backup_file, backup_size, duration=None):
    """Format a successful backup notification email"""
    hostname, timestamp = get_server_info()

    body = f"""MAPS TRACKER - BACKUP SUCCESS NOTIFICATION
════════════════════════════════════════════════════════════════

Status:     ✓ SUCCESSFUL
Date:       {timestamp}
Server:     {hostname}

BACKUP DETAILS
──────────────────────────────────────────────────────────────────
Backup Type:     {backup_type}
Filename:        {os.path.basename(backup_file) if backup_file else 'N/A'}
File Size:       {backup_size}
"""

    if duration:
        body += f"Duration:        {duration}\n"

    body += """
STATUS
──────────────────────────────────────────────────────────────────
✓ Database dump completed successfully
✓ Backup file verified and validated
✓ Checksum generated and stored
✓ Metadata created and indexed

NEXT STEPS
──────────────────────────────────────────────────────────────────
• Backup is automatically stored in the organized archive
• Weekly full backups: Every Sunday at 2:00 AM
• Daily backups: Every day at 2:00 AM
• 6-month retention policy maintained automatically

════════════════════════════════════════════════════════════════
This is an automated notification from the Maps Tracker Backup System.
No action required. All backups are stored securely.
"""
    return body


def format_backup_failure(backup_type, error_message, duration=None):
    """Format a failed backup notification email"""
    hostname, timestamp = get_server_info()

    body = f"""MAPS TRACKER - BACKUP FAILURE NOTIFICATION
════════════════════════════════════════════════════════════════

Status:     ✗ FAILED
Date:       {timestamp}
Server:     {hostname}

BACKUP DETAILS
──────────────────────────────────────────────────────────────────
Backup Type:     {backup_type}
Error:           {error_message}
"""

    if duration:
        body += f"Duration:        {duration}\n"

    body += """
ACTION REQUIRED
──────────────────────────────────────────────────────────────────
⚠ A backup operation failed and requires immediate attention.

Please check the following:
1. Database service is running (docker compose ps)
2. Sufficient disk space available (df -h)
3. Backup directory permissions (ls -la backups/)
4. Recent logs for error details (tail -100 logs/backup-manager.log)

TROUBLESHOOTING
──────────────────────────────────────────────────────────────────
To view detailed error logs:
  tail -50 logs/backup-manager.log | grep ERROR

To check database status:
  docker compose exec db pg_isready

To verify backup directory:
  ls -lh backups/full/ backups/daily/

════════════════════════════════════════════════════════════════
Please resolve the issue and verify the next scheduled backup succeeds.
For support, check logs/backup-manager.log for detailed error information.
"""
    return body


def format_restore_success(restore_file, restore_duration, rows_restored=None):
    """Format a successful restore notification email"""
    hostname, timestamp = get_server_info()

    body = f"""MAPS TRACKER - DATABASE RESTORE SUCCESS NOTIFICATION
════════════════════════════════════════════════════════════════

Status:     ✓ SUCCESSFUL
Date:       {timestamp}
Server:     {hostname}

RESTORE DETAILS
──────────────────────────────────────────────────────────────────
Backup File:     {os.path.basename(restore_file) if restore_file else 'N/A'}
Duration:        {restore_duration}
"""

    if rows_restored:
        body += f"Rows Restored:   {rows_restored}\n"

    body += """
VERIFICATION COMPLETED
──────────────────────────────────────────────────────────────────
✓ Backup file integrity verified
✓ Pre-restore safety backup created
✓ Database restore completed successfully
✓ All tables and indexes restored
✓ Data consistency validated

POST-RESTORE STATUS
──────────────────────────────────────────────────────────────────
• Database is now online with restored data
• All services are operational
• Original data backed up as safety backup
• System ready for production use

════════════════════════════════════════════════════════════════
This is an automated notification from the Maps Tracker Restore System.
Your data has been successfully restored and is ready for use.
"""
    return body


def format_restore_failure(restore_file, error_message):
    """Format a failed restore notification email"""
    hostname, timestamp = get_server_info()

    body = f"""MAPS TRACKER - DATABASE RESTORE FAILURE NOTIFICATION
════════════════════════════════════════════════════════════════

Status:     ✗ FAILED
Date:       {timestamp}
Server:     {hostname}

RESTORE DETAILS
──────────────────────────────────────────────────────────────────
Backup File:     {os.path.basename(restore_file) if restore_file else 'N/A'}
Error:           {error_message}

ACTION REQUIRED
──────────────────────────────────────────────────────────────────
⚠ The restore operation failed. The database has NOT been modified.

A safety backup was created before the restore attempt.
Original database data remains intact.

Please verify:
1. Database service is running and healthy
2. Backup file is valid and accessible
3. Sufficient disk space for restore operation
4. Database user has proper permissions

NEXT STEPS
──────────────────────────────────────────────────────────────────
1. Check detailed error logs:
   tail -50 logs/restore-backup.log | grep ERROR

2. Verify database health:
   docker compose exec db pg_isready

3. Check backup file integrity:
   file backups/full/*/backup_*.sql

4. Retry restore with correct parameters:
   ./scripts/backup/restore-backup.sh --latest

════════════════════════════════════════════════════════════════
Please review the error logs and correct the issue before retrying.
For support, contact your system administrator.
"""
    return body


def format_remote_sync_success(backup_count, total_size, duration, remote_host):
    """Format a successful remote backup sync notification email"""
    hostname, timestamp = get_server_info()

    body = f"""MAPS TRACKER - REMOTE BACKUP SYNC SUCCESS NOTIFICATION
════════════════════════════════════════════════════════════════

Status:     ✓ SUCCESSFUL
Date:       {timestamp}
Server:     {hostname}

SYNC DETAILS
──────────────────────────────────────────────────────────────────
Remote Host:     {remote_host}
Backups Synced:  {backup_count}
Total Size:      {total_size}
Duration:        {duration}

VERIFICATION
──────────────────────────────────────────────────────────────────
✓ SSH connection successful
✓ Remote directories created/verified
✓ All backup files synced successfully
✓ File integrity verified with checksums
✓ Remote storage updated

REMOTE BACKUP STATUS
──────────────────────────────────────────────────────────────────
• Backups are now replicated to the remote server
• Offsite backup protection active
• Disaster recovery capability enabled
• All checksums verified for integrity

SCHEDULE
──────────────────────────────────────────────────────────────────
Remote backups are automatically synced:
• After each full backup (Sundays at 2:00 AM)
• After each daily backup (Daily at 2:00 AM)
• Before any scheduled maintenance

════════════════════════════════════════════════════════════════
Your data is now protected at multiple locations.
This is an automated notification from the Maps Tracker Backup System.
"""
    return body


def format_remote_sync_failure(error_message, remote_host):
    """Format a failed remote backup sync notification email"""
    hostname, timestamp = get_server_info()

    body = f"""MAPS TRACKER - REMOTE BACKUP SYNC FAILURE NOTIFICATION
════════════════════════════════════════════════════════════════

Status:     ✗ FAILED
Date:       {timestamp}
Server:     {hostname}

SYNC DETAILS
──────────────────────────────────────────────────────────────────
Remote Host:     {remote_host}
Error:           {error_message}

ACTION REQUIRED
──────────────────────────────────────────────────────────────────
⚠ Remote backup synchronization failed. Local backups are safe.
The remote location is NOT up-to-date with recent backups.

Please verify:
1. Remote host is reachable (ping {remote_host})
2. SSH connection is working (check SSH keys)
3. Remote storage has sufficient space (df on remote)
4. Network connectivity to remote host
5. Remote user credentials are valid

TROUBLESHOOTING
──────────────────────────────────────────────────────────────────
Test SSH connection:
  ssh -v {remote_host} echo "SSH connection test"

Check rsync connectivity:
  rsync --list-only {remote_host}:~/maps-tracker-backup/

View detailed error log:
  tail -50 logs/rsync-backup.log | grep ERROR

BACKUP STATUS
──────────────────────────────────────────────────────────────────
✓ Local backups: Still being created and stored locally
✓ Remote backups: Out of sync (last successful sync unknown)
⚠ Offsite protection: Currently unavailable

════════════════════════════════════════════════════════════════
Please resolve the connectivity issue to restore remote backup protection.
For support, review logs/rsync-backup.log for detailed error information.
"""
    return body


def format_monthly_restore_test_success(backup_used, test_duration, rows_verified):
    """Format a successful monthly restore test notification email"""
    hostname, timestamp = get_server_info()

    body = f"""MAPS TRACKER - MONTHLY RESTORE TEST SUCCESS NOTIFICATION
════════════════════════════════════════════════════════════════

Status:     ✓ SUCCESSFUL
Date:       {timestamp}
Server:     {hostname}

TEST SUMMARY
──────────────────────────────────────────────────────────────────
Backup Used:     {os.path.basename(backup_used) if backup_used else 'Latest'}
Test Duration:   {test_duration}
Rows Verified:   {rows_verified}

VERIFICATION RESULTS
──────────────────────────────────────────────────────────────────
✓ Backup file selected and validated
✓ Test database created successfully
✓ Database restore completed without errors
✓ All tables and indexes verified
✓ Data integrity checks passed
✓ Sample queries executed successfully:
  - Vehicle location retrieval
  - Location count aggregation
  - Places of interest query
  - User data consistency
✓ Test database cleaned up

DISASTER RECOVERY STATUS
──────────────────────────────────────────────────────────────────
✓ Backups are valid and restorable
✓ Recovery procedures verified and working
✓ RTO (Recovery Time Objective): Confirmed achievable
✓ Database integrity: Confirmed
✓ Data completeness: Confirmed

MONTHLY TEST CONCLUSION
──────────────────────────────────────────────────────────────────
All monthly restore tests have passed successfully.
Your backup and recovery procedures are fully operational.
Data restoration capability is verified and ready.

════════════════════════════════════════════════════════════════
This is a routine automated test confirming system reliability.
Your data protection and recovery procedures are working correctly.
"""
    return body


def format_monthly_restore_test_failure(error_message, backup_attempted):
    """Format a failed monthly restore test notification email"""
    hostname, timestamp = get_server_info()

    body = f"""MAPS TRACKER - MONTHLY RESTORE TEST FAILURE NOTIFICATION
════════════════════════════════════════════════════════════════

Status:     ✗ FAILED
Date:       {timestamp}
Server:     {hostname}

TEST DETAILS
──────────────────────────────────────────────────────────────────
Backup Attempted:     {os.path.basename(backup_attempted) if backup_attempted else 'Latest'}
Error:                {error_message}

ISSUE IDENTIFIED
──────────────────────────────────────────────────────────────────
⚠ The monthly restore test failed. This indicates a potential problem
with disaster recovery procedures that requires immediate investigation.

What this means:
• Current backups may not be restorable
• Recovery procedures are not functioning correctly
• Data recovery might not be possible in case of disaster

ACTION REQUIRED
──────────────────────────────────────────────────────────────────
1. Investigate immediately:
   tail -100 logs/backup-manager.log | grep ERROR
   tail -100 logs/restore-backup.log | grep ERROR

2. Verify backup integrity:
   ls -lh backups/full/*/backup_*.sql
   file backups/full/*/backup_*.sql

3. Test database connectivity:
   docker compose exec db pg_isready
   docker compose exec db pg_restore --list /backups/backup_*.sql

4. Check disk space:
   df -h

5. Verify permissions:
   ls -la backups/ logs/

IMPACT ASSESSMENT
──────────────────────────────────────────────────────────────────
Backup Creation:    Active (continuing)
Backup Integrity:   Questionable (test failed)
Recovery Capability: Not verified
Risk Level:         HIGH

════════════════════════════════════════════════════════════════
This is a critical notification. Please resolve the issue immediately
to restore confidence in your disaster recovery procedures.
Contact your system administrator for immediate assistance.
"""
    return body

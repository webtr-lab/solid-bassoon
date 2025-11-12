#!/usr/bin/env python3
"""
Maps Tracker Email Templates
Provides professional, consistent email templates for notifications with uniform structure
"""

from datetime import datetime
import socket
import os


# Company and System Information
COMPANY_NAME = "Devnan Agencies, Inc."
SYSTEM_NAME = "Maps Tracker"
SYSTEM_FULL_NAME = "Maps Tracker Vehicle Tracking System"


def get_server_info():
    """Get server hostname and timestamp"""
    hostname = socket.gethostname()
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    return hostname, timestamp


def get_app_paths():
    """Get application paths dynamically"""
    # Get the base directory (scripts/email -> scripts -> project-root)
    script_dir = os.path.dirname(os.path.abspath(__file__))  # scripts/email
    base_dir = os.path.dirname(os.path.dirname(script_dir))  # project-root

    return {
        'base_dir': base_dir,
        'backups': os.path.join(base_dir, 'backups'),
        'logs': os.path.join(base_dir, 'logs'),
        'scripts_backup': os.path.join(base_dir, 'scripts/backup')
    }


def format_header(task_name, status, status_symbol):
    """
    Format standard email header with company, system, task, and status

    Args:
        task_name: Name of the task (e.g., "Full Database Backup")
        status: Status text (e.g., "SUCCESS", "FAILED", "WARNING")
        status_symbol: Symbol to use (e.g., "✓", "✗", "⚠")

    Returns:
        Formatted header string with company, task, and status
    """
    hostname, timestamp = get_server_info()

    return f"""================================================================================
  SYSTEM NOTIFICATION - {SYSTEM_NAME}
================================================================================

COMPANY:        {COMPANY_NAME}
SYSTEM:         {SYSTEM_FULL_NAME}
SERVER:         {hostname}
TASK:           {task_name}
STATUS:         {status_symbol} {status}
TIMESTAMP:      {timestamp}

================================================================================"""


def format_footer():
    """Format standard email footer"""
    return """
================================================================================
This is an automated notification from:
Maps Tracker Backup & Monitoring System
================================================================================"""


def format_backup_success(backup_type, backup_file, backup_size, duration=None):
    """Format a successful backup notification email with uniform structure"""
    paths = get_app_paths()
    task_name = f"{backup_type.upper()} Database Backup"

    header = format_header(task_name, "SUCCESS", "✓")

    body = f"""{header}

WHAT HAPPENED:
The scheduled database backup completed successfully. The database
was backed up and verified for recovery capability.

BACKUP DETAILS:
  Backup Type:      {backup_type.upper()}
  Filename:         {os.path.basename(backup_file) if backup_file else 'N/A'}
  File Size:        {backup_size}
"""

    if duration:
        body += f"  Duration:         {duration}\n"

    body += f"""  Checksum:         SHA256 (verified)
  Status:           Ready for Recovery

VERIFICATION COMPLETED:
  ✓ Database dump completed successfully
  ✓ Backup file verified and validated
  ✓ SHA256 checksum generated and stored
  ✓ Metadata created and indexed
  ✓ Backup added to catalog
  ✓ Archival policy applied

NEXT STEPS:
No action required. This is routine automated backup operation.
The backup system is fully operational and functioning normally.

SUPPORT CONTACT:
Log Location: {paths['logs']}/backup-manager.log
Contact: System Administrator / DevOps Team{format_footer()}
"""
    return body


def format_backup_failure(backup_type, error_message, duration=None):
    """Format a failed backup notification email with uniform structure"""
    paths = get_app_paths()
    task_name = f"{backup_type.upper()} Database Backup"

    header = format_header(task_name, "FAILED", "✗")

    body = f"""{header}

WHAT HAPPENED:
The scheduled database backup FAILED and did not complete successfully.
The database was NOT backed up and recovery capability is at risk.

BACKUP DETAILS:
  Backup Type:      {backup_type.upper()}
  Error Message:    {error_message}
"""

    if duration:
        body += f"  Duration:         {duration}\n"

    body += f"""  Status:           FAILED - ACTION REQUIRED

BUSINESS IMPACT:
  ⚠ No backup created for this cycle
  ⚠ Recovery point may be outdated
  ⚠ SLA/Data protection policy is VIOLATED
  ⚠ Disaster recovery capability at risk

IMMEDIATE ACTION REQUIRED:
1. Check Database Status:
   docker compose ps | grep db
   docker compose exec db pg_isready

2. Check Disk Space:
   df -h {paths['backups']}

3. Review Error Logs:
   tail -50 {paths['logs']}/backup-manager.log | grep ERROR

4. Test Manual Backup:
   {paths['scripts_backup']}/backup-manager.sh --daily

5. Investigate Root Cause:
   - Is database running? → docker compose logs db
   - Is backup directory writable? → ls -lad {paths['backups']}
   - Is cron configured? → crontab -l | grep backup

COMMON CAUSES:
  - Database service down or unresponsive
  - Insufficient disk space
  - Backup directory permission errors
  - Network connectivity issues
  - Cron job not running properly
  - Resource exhaustion

LOG LOCATIONS:
  - Backup Log:  {paths['logs']}/backup-manager.log
  - Error Log:   {paths['logs']}/error.log
  - Docker Logs: docker compose logs db

SUPPORT CONTACT:
Priority: CRITICAL - Resolve within 2 hours
Contact: System Administrator / DevOps Team{format_footer()}
"""
    return body


def format_restore_success(restore_file, restore_duration, rows_restored=None):
    """Format a successful restore notification email with uniform structure"""
    paths = get_app_paths()
    header = format_header("Database Restore", "SUCCESS", "✓")

    body = f"""{header}

WHAT HAPPENED:
The database has been successfully restored from a backup. All data
from the backup timestamp is now active and verified. The system is
ready for normal operation.

RESTORE DETAILS:
  Backup File:      {os.path.basename(restore_file) if restore_file else 'N/A'}
  Restore Duration: {restore_duration}
"""

    if rows_restored:
        body += f"  Rows Restored:    {rows_restored}\n"

    body += f"""  Status:           ONLINE AND OPERATIONAL

VERIFICATION COMPLETED:
  ✓ Backup file integrity verified
  ✓ Database restore completed successfully
  ✓ All tables and indexes restored
  ✓ Foreign key constraints validated
  ✓ Data consistency verified
  ✓ Application connectivity tested
  ✓ Safety backup created (original state preserved)

SYSTEM STATUS:
  ✓ Database: ONLINE and OPERATIONAL
  ✓ Services: Running normally
  ✓ Data: Fully accessible
  ✓ Backups: Safety copy maintained

NEXT STEPS:
1. Verify application functionality
2. Monitor system behavior and logs
3. Document restoration details

SUPPORT CONTACT:
Contact: System Administrator / Database Team
Log Locations:
  - Restore Log: {paths['logs']}/restore-backup.log
  - Backup Log:  {paths['logs']}/backup-manager.log{format_footer()}
"""
    return body


def format_restore_failure(restore_file, error_message):
    """Format a failed restore notification email with uniform structure"""
    paths = get_app_paths()
    header = format_header("Database Restore", "FAILED", "✗")

    body = f"""{header}

WHAT HAPPENED:
The database restore operation FAILED and could not complete.
IMPORTANT: Database has NOT been modified - original data is intact.

RESTORE ATTEMPT DETAILS:
  Backup File Attempted: {os.path.basename(restore_file) if restore_file else 'N/A'}
  Error Message:        {error_message}
  Status:               FAILED - ACTION REQUIRED
  Data Loss:            NOT OCCURRED (database unchanged)

CRITICAL INFORMATION:
  ✓ Original database: UNCHANGED (restore did not execute)
  ✓ Data integrity: PRESERVED (no modifications made)
  ✓ System status: Previous state intact

BUSINESS IMPACT:
  ⚠ Database restoration was NOT completed
  ⚠ If database failure occurred, recovery is NOT possible
  ⚠ Previous backup (if available) may still be usable
  ⚠ Investigate cause immediately

IMMEDIATE ACTION REQUIRED:
1. Verify Database Status:
   docker compose exec db pg_isready

2. Review Error Logs:
   tail -50 {paths['logs']}/restore-backup.log | grep ERROR
   tail -50 {paths['logs']}/error.log

3. Verify Backup File:
   ls -lh {os.path.basename(restore_file) if restore_file else '[backup_file]'}

4. Check System Resources:
   docker compose exec db df -h
   docker stats

COMMON FAILURE CAUSES:
  - Database service crashed during restore
  - Insufficient disk space for restore operation
  - Backup file is corrupted or unreadable
  - Database user lacks required permissions
  - Backup format incompatible with PostgreSQL version
  - Network issues during restore process
  - Resource exhaustion (out of memory)

RECOVERY OPTIONS:
1. Try using a different (older) backup file
2. Increase available system resources and retry
3. Restart database and attempt restore again
4. Contact Database Administrator for manual recovery

SUPPORT CONTACT:
Priority: HIGH - Resolve within 1-2 hours
Contact: Database Administrator / DevOps Team
Log Locations:
  - Restore Log: {paths['logs']}/restore-backup.log
  - Error Log:   {paths['logs']}/error.log
  - Database Log: docker compose logs db{format_footer()}
"""
    return body


def format_remote_sync_success(backup_count, total_size, duration, remote_host):
    """Format a successful remote backup sync notification email with uniform structure"""
    header = format_header("Remote Backup Sync (rsync)", "SUCCESS", "✓")

    body = f"""{header}

WHAT HAPPENED:
The scheduled remote backup synchronization completed successfully.
All local backups have been replicated to the remote server for
off-site redundancy and disaster recovery protection.

SYNC DETAILS:
  Remote Host:      {remote_host}
  Backups Synced:   {backup_count}
  Total Size:       {total_size}
  Duration:         {duration}
  Status:           SYNCHRONIZED

VERIFICATION COMPLETED:
  ✓ SSH connection successful
  ✓ Remote directories created/verified
  ✓ All backup files synced successfully
  ✓ File integrity verified with checksums
  ✓ Remote storage updated
  ✓ Off-site backup protection active

REMOTE BACKUP STATUS:
  ✓ Backups replicated to remote server
  ✓ Off-site redundancy: ACTIVE
  ✓ Disaster recovery capability: ENABLED
  ✓ Checksums verified for integrity

NEXT STEPS:
No action required. Off-site backup replication is functioning normally.
Data is protected at both local and remote locations.{format_footer()}
"""
    return body


def format_remote_sync_failure(error_message, remote_host):
    """Format a failed remote backup sync notification email with uniform structure"""
    paths = get_app_paths()
    header = format_header("Remote Backup Sync (rsync)", "FAILED", "✗")

    body = f"""{header}

WHAT HAPPENED:
The scheduled remote backup synchronization FAILED to complete.
Local backups are safe and continuing. Remote backup is NOT
up-to-date with recent backups.

SYNC DETAILS:
  Remote Host:      {remote_host}
  Error Message:    {error_message}
  Status:           SYNC FAILED - ACTION REQUIRED
  Local Backups:    SAFE (unaffected)

BUSINESS IMPACT:
  ⚠ Off-site backup protection currently UNAVAILABLE
  ⚠ Remote location is OUT OF SYNC
  ⚠ Last successful sync time: UNKNOWN (check logs)
  ⚠ Disaster recovery capability temporarily compromised

ACTION REQUIRED:
1. Verify Network Connection:
   ping {remote_host}
   ssh -v {remote_host} echo "Test connection"

2. Check Remote Storage:
   ssh {remote_host} df -h

3. Review Error Logs:
   tail -50 {paths['logs']}/rsync-backup.log | grep ERROR

4. Verify Remote Credentials:
   ssh {remote_host} ls -la ~/maps-tracker-backup/

COMMON CAUSES:
  - Remote host is unreachable (network issue)
  - SSH connection/authentication failed
  - SSH key permissions incorrect
  - Remote storage insufficient space
  - Network connectivity interrupted
  - Firewall blocking SSH (port 22)
  - Remote user credentials expired

BACKUP STATUS:
  ✓ Local backups: Still being created and stored locally
  ⚠ Remote backups: OUT OF SYNC with recent changes
  ⚠ Off-site protection: Currently unavailable
  ✓ System: Continuing to operate normally

RECOVERY OPTIONS:
1. Restore network connectivity to remote host
2. Verify SSH keys and permissions
3. Check remote server storage space
4. Manually attempt sync to verify: rsync-backup-remote.sh
5. Contact System Administrator if issue persists

SUPPORT CONTACT:
Priority: HIGH - Resolve within 4 hours
Contact: System Administrator / Network Team
Log Location: {paths['logs']}/rsync-backup.log{format_footer()}
"""
    return body


def format_monthly_restore_test_success(backup_used, test_duration, rows_verified):
    """Format a successful restore test notification email with uniform structure"""
    header = format_header("Backup Restore Test (Weekly)", "SUCCESS", "✓")

    body = f"""{header}

WHAT HAPPENED:
A scheduled backup restore test completed successfully. The latest
backup was restored to an isolated test database to validate recovery
procedures and verify data integrity.

TEST DETAILS:
  Backup Used:      {os.path.basename(backup_used) if backup_used else 'Latest'}
  Test Duration:    {test_duration}
  Rows Verified:    {rows_verified}
  Test Database:    Created, tested, and cleaned up
  Status:           ALL TESTS PASSED ✓

VERIFICATION RESULTS:
  ✓ Backup file selected and validated
  ✓ Test database created successfully
  ✓ Database restore completed without errors
  ✓ All tables and indexes verified
  ✓ Data integrity checks passed
  ✓ Sample queries executed successfully
  ✓ Foreign key constraints validated
  ✓ Test database cleaned up

DISASTER RECOVERY STATUS:
  ✓ Backups are valid and restorable
  ✓ Recovery procedures verified and working
  ✓ RTO (Recovery Time Objective): CONFIRMED ACHIEVABLE
  ✓ Database integrity: CONFIRMED
  ✓ Data completeness: CONFIRMED
  ✓ Disaster recovery capability: VALIDATED

TEST CONCLUSION:
All restore tests have passed successfully. Your backup and recovery
procedures are fully operational. Data restoration capability is
verified and ready for production use.

NEXT STEPS:
No action required. This is routine automated testing confirming
system reliability. Your data protection and recovery procedures
are working correctly.{format_footer()}
"""
    return body


def format_monthly_restore_test_failure(error_message, backup_attempted):
    """Format a failed restore test notification email with uniform structure"""
    paths = get_app_paths()
    header = format_header("Backup Restore Test (Weekly)", "FAILED", "✗")

    body = f"""{header}

WHAT HAPPENED:
A scheduled backup restore test FAILED. The backup could not be
successfully restored to the test database. This indicates a potential
problem with disaster recovery procedures.

TEST DETAILS:
  Backup Attempted:  {os.path.basename(backup_attempted) if backup_attempted else 'Latest'}
  Error Message:     {error_message}
  Test Database:     Failed to restore
  Status:            FAILED - ACTION REQUIRED
  Risk Level:        HIGH

ISSUE IDENTIFIED:
⚠ Current backups may not be restorable
⚠ Recovery procedures are not functioning correctly
⚠ Data recovery might not be possible in case of disaster
⚠ Disaster recovery capability: NOT VERIFIED

BUSINESS IMPACT:
  ⚠ Backup Creation:    Active (continuing)
  ⚠ Backup Integrity:   Questionable (test failed)
  ⚠ Recovery Capability: NOT VERIFIED
  ⚠ Risk Level:         HIGH

IMMEDIATE ACTION REQUIRED:
1. Investigate Immediately:
   tail -50 {paths['logs']}/backup-manager.log | grep ERROR
   tail -50 {paths['logs']}/error.log

2. Verify Backup Integrity:
   ls -lh {paths['backups']}/full/*/backup_*.sql
   file {paths['backups']}/full/*/backup_*.sql

3. Test Database Connectivity:
   docker compose exec db pg_isready

4. Check System Resources:
   df -h {paths['backups']}
   docker stats
   free -h

COMMON CAUSES:
  - Backup file is corrupted or unreadable
  - Insufficient disk space for restore operation
  - Database user lacks required permissions
  - PostgreSQL version incompatibility
  - Test database creation failed
  - Resource exhaustion (out of memory)
  - Database service issue

LOG LOCATIONS:
  - Backup Log:  {paths['logs']}/backup-manager.log
  - Test Log:    {paths['logs']}/backup-test-restore.log
  - Error Log:   {paths['logs']}/error.log
  - Docker Logs: docker compose logs db

RECOVERY OPTIONS:
1. Fix the root cause using checklist above
2. Manually attempt restore to verify fix
3. Re-run restore test to confirm resolution
4. Contact Database Administrator if issue persists

SUPPORT CONTACT:
Priority: CRITICAL - Do not delay
Contact: Database Administrator / System Administrator
Timeframe: Resolve within 2 hours{format_footer()}
"""
    return body


def format_backup_verification_success(backup_file, table_count, test_duration):
    """Format a successful backup verification notification email"""
    header = format_header("Backup Verification (pg_restore)", "SUCCESS", "✓")

    body = f"""{header}

WHAT HAPPENED:
The scheduled backup verification completed successfully. The backup
file was tested to ensure it can be restored and contains valid data.

VERIFICATION DETAILS:
  Backup File:       {os.path.basename(backup_file) if backup_file else 'N/A'}
  Tables Verified:   {table_count}
  Test Duration:     {test_duration}
  Status:            ALL CHECKS PASSED ✓

VERIFICATION COMPLETED:
  ✓ Backup file readable and accessible
  ✓ All database tables restored successfully
  ✓ Table structure validated
  ✓ Indexes created properly
  ✓ Foreign key constraints verified
  ✓ Data integrity confirmed
  ✓ Backup is recoverable and production-ready

BUSINESS BENEFIT:
  ✓ Backup integrity confirmed
  ✓ Recovery capability verified
  ✓ Data protection validated
  ✓ SLA compliance verified

NEXT STEPS:
No action required. Backup verification completed successfully.
The backup is ready for recovery if needed.{format_footer()}
"""
    return body


def format_backup_verification_failure(backup_file, error_message):
    """Format a failed backup verification notification email"""
    paths = get_app_paths()
    header = format_header("Backup Verification (pg_restore)", "FAILED", "✗")

    body = f"""{header}

WHAT HAPPENED:
The scheduled backup verification FAILED. The backup file could not
be validated, indicating a potential issue with the backup.

VERIFICATION DETAILS:
  Backup File:       {os.path.basename(backup_file) if backup_file else 'N/A'}
  Error Message:     {error_message}
  Status:            FAILED - ACTION REQUIRED

ISSUE IDENTIFIED:
⚠ Backup file may be corrupted or incomplete
⚠ Restore capability cannot be confirmed
⚠ Recovery procedures may fail if backup is used

ACTION REQUIRED:
1. Review Error Logs:
   tail -50 {paths['logs']}/backup-verification.log | grep ERROR

2. Verify Backup File:
   ls -lh {os.path.basename(backup_file) if backup_file else '[backup_file]'}
   file {os.path.basename(backup_file) if backup_file else '[backup_file]'}

3. Check If Previous Backup Is Valid:
   ls -lt {paths['backups']}/*/*/*.sql | head -5

4. Investigate Root Cause:
   - Is disk space available? → df -h
   - Is backup directory accessible? → ls -la {paths['backups']}/
   - Are there recent errors? → tail -50 {paths['logs']}/backup-manager.log

SUPPORT CONTACT:
Priority: HIGH - Resolve within 4 hours
Contact: System Administrator / Database Team
Log Location: {paths['logs']}/backup-verification.log{format_footer()}
"""
    return body


def format_backup_cleanup_success(removed_count, freed_space):
    """Format a successful backup cleanup notification email"""
    header = format_header("Backup Cleanup (Retention Policy)", "SUCCESS", "✓")

    body = f"""{header}

WHAT HAPPENED:
The scheduled backup cleanup completed successfully. Old backups
exceeding the retention period were removed according to policy.

CLEANUP DETAILS:
  Backups Removed:   {removed_count}
  Space Freed:       {freed_space}
  Retention Policy:  180 days
  Status:            CLEANUP COMPLETED ✓

VERIFICATION COMPLETED:
  ✓ Old backups identified (older than 180 days)
  ✓ Files safely removed
  ✓ Storage space freed
  ✓ Retention policy enforced

BUSINESS BENEFIT:
  ✓ Disk space optimized
  ✓ Storage costs minimized
  ✓ Retention policy compliance maintained
  ✓ System performance improved

NEXT STEPS:
No action required. Backup cleanup completed as scheduled.
Recent backups are preserved per retention policy.{format_footer()}
"""
    return body


def format_disk_monitor_success(usage_percent, available_space):
    """Format a disk space monitoring success notification email"""
    header = format_header("Disk Space Monitoring", "HEALTHY", "✓")

    body = f"""{header}

WHAT HAPPENED:
A scheduled disk space monitoring check completed successfully.
Current disk usage is healthy and within normal parameters.

DISK USAGE DETAILS:
  Disk Usage:        {usage_percent}% (Normal)
  Available Space:   {available_space}
  Status:            HEALTHY ✓
  Alert Threshold:   75% (Warning), 90% (Critical)

SYSTEM STATUS:
  ✓ Disk usage within normal range
  ✓ Sufficient space for backups
  ✓ Capacity planning: No concerns
  ✓ Storage trending: Stable

NEXT STEPS:
No action required. Disk space is healthy.
Backups and logging operations continue normally.{format_footer()}
"""
    return body


def format_disk_monitor_warning(usage_percent, available_space):
    """Format a disk space monitoring warning notification email"""
    header = format_header("Disk Space Monitoring", "WARNING", "⚠")

    body = f"""{header}

WHAT HAPPENED:
A scheduled disk space monitoring check detected elevated disk usage.
Available disk space is approaching the warning threshold.

DISK USAGE DETAILS:
  Disk Usage:        {usage_percent}% (WARNING)
  Available Space:   {available_space}
  Status:            APPROACHING LIMIT ⚠
  Alert Threshold:   75% (Warning), 90% (Critical)

ACTION REQUIRED:
1. Monitor disk usage closely
2. Consider archiving old backups to external storage
3. Remove any unnecessary files/logs
4. Plan for disk upgrade if trend continues

RECOMMENDATIONS:
  - Archive old backups (>30 days) to external storage
  - Clean up old log files
  - Review docker image/volume storage
  - Plan capacity upgrade if approaching critical

SUPPORT CONTACT:
Priority: MEDIUM - Address within 24 hours
Contact: System Administrator / DevOps Team{format_footer()}
"""
    return body


def format_disk_monitor_critical(usage_percent, available_space):
    """Format a disk space monitoring critical notification email"""
    header = format_header("Disk Space Monitoring", "CRITICAL", "✗")

    body = f"""{header}

WHAT HAPPENED:
A scheduled disk space monitoring check detected CRITICAL disk usage.
Disk space is nearly full. Immediate action is required.

DISK USAGE DETAILS:
  Disk Usage:        {usage_percent}% (CRITICAL)
  Available Space:   {available_space}
  Status:            DISK NEARLY FULL ✗
  Alert Threshold:   75% (Warning), 90% (Critical)

BUSINESS IMPACT:
  ⚠ Backups may fail to complete
  ⚠ System performance degraded
  ⚠ Application operations at risk
  ⚠ Database may become unstable

IMMEDIATE ACTION REQUIRED:
1. ALERT TEAM IMMEDIATELY (Priority: CRITICAL)

2. Free Disk Space Immediately:
   - Archive old backups to external storage
   - Delete old log files (>30 days)
   - Remove temporary files/docker cache

3. Monitor Backup Operations:
   - Verify backups complete successfully
   - Check backup logs for errors
   - Confirm disk space doesn't drop further

4. Plan Long-Term Solution:
   - Upgrade disk storage
   - Implement automated archival
   - Review storage growth rate

SUPPORT CONTACT:
Priority: CRITICAL - Address immediately
Contact: System Administrator / DevOps Team
Timeframe: Resolve within 1 hour{format_footer()}
"""
    return body


def format_health_check_success(systems_checked, systems_healthy):
    """Format a system health check success notification email"""
    header = format_header("System Health Check", "HEALTHY", "✓")

    body = f"""{header}

WHAT HAPPENED:
A comprehensive system health check completed successfully. All
monitored systems and services are operational and responsive.

HEALTH CHECK DETAILS:
  Systems Checked:   {systems_checked}
  Systems Healthy:   {systems_healthy}/{systems_checked}
  Status:            ALL SYSTEMS OPERATIONAL ✓

SYSTEM STATUS:
  ✓ Backend API:       RESPONSIVE
  ✓ Frontend:          RESPONSIVE
  ✓ Mobile Interface:  RESPONSIVE
  ✓ Database:          CONNECTED
  ✓ Nominatim Service: RESPONSIVE
  ✓ Disk Usage:        HEALTHY

BUSINESS BENEFIT:
  ✓ All services operational
  ✓ Application ready for users
  ✓ Monitoring systems functional
  ✓ No critical issues detected

NEXT STEPS:
No action required. All systems operational.
Continue normal operations. Next health check scheduled.{format_footer()}
"""
    return body


def format_health_check_warning(systems_checked, systems_healthy, issues_found):
    """Format a system health check warning notification email"""
    header = format_header("System Health Check", "WARNING", "⚠")

    body = f"""{header}

WHAT HAPPENED:
A comprehensive system health check detected issues. Some systems
are not responding normally or are showing warnings.

HEALTH CHECK DETAILS:
  Systems Checked:   {systems_checked}
  Systems Healthy:   {systems_healthy}/{systems_checked}
  Issues Found:      {issues_found}
  Status:            SOME SYSTEMS OFFLINE/DEGRADED ⚠

ISSUES DETECTED:
{issues_found}

ACTION REQUIRED:
1. Investigate Immediately:
   - Check service status: docker compose ps
   - Review service logs: docker compose logs [service]
   - Verify connectivity: curl/telnet to endpoints

2. Restart Affected Services:
   - docker compose restart [service_name]
   - Verify service comes online
   - Confirm connectivity restored

3. Monitor System:
   - Watch for recurring issues
   - Check resource usage (CPU, Memory, Disk)
   - Review system logs for errors

4. If Issues Persist:
   - Contact System Administrator immediately
   - Prepare detailed error logs
   - Document timeline of issues

SUPPORT CONTACT:
Priority: HIGH - Address within 2 hours
Contact: System Administrator / DevOps Team{format_footer()}
"""
    return body

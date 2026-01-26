#!/usr/bin/env python3
"""
Maps Tracker HTML Email Templates
Provides professional, responsive HTML email templates for notifications
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
    script_dir = os.path.dirname(os.path.abspath(__file__))
    base_dir = os.path.dirname(os.path.dirname(script_dir))

    return {
        'base_dir': base_dir,
        'backups': os.path.join(base_dir, 'backups'),
        'logs': os.path.join(base_dir, 'logs'),
        'scripts_backup': os.path.join(base_dir, 'scripts/backup')
    }


def get_base_html_template(status_type):
    """
    Get base HTML template with responsive design

    Args:
        status_type: 'success', 'error', 'warning', or 'info'

    Returns:
        Base HTML template with appropriate colors for status type
    """
    # Color schemes for different status types
    colors = {
        'success': {'primary': '#10b981', 'bg': '#d1fae5', 'border': '#059669', 'text': '#065f46'},
        'error': {'primary': '#ef4444', 'bg': '#fee2e2', 'border': '#dc2626', 'text': '#991b1b'},
        'warning': {'primary': '#f59e0b', 'bg': '#fef3c7', 'border': '#d97706', 'text': '#92400e'},
        'info': {'primary': '#3b82f6', 'bg': '#dbeafe', 'border': '#2563eb', 'text': '#1e40af'}
    }

    color_scheme = colors.get(status_type, colors['info'])

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <title>{{{{title}}}}</title>
    <!--[if mso]>
    <style type="text/css">
        table {{border-collapse:collapse;}}
    </style>
    <![endif]-->
    <style type="text/css">
        body, table, td, a {{
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }}
        table, td {{
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }}
        img {{
            -ms-interpolation-mode: bicubic;
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
        }}
        body {{
            margin: 0;
            padding: 0;
            width: 100% !important;
            height: 100% !important;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background-color: #f3f4f6;
        }}
        .email-container {{
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }}
        .header {{
            background: linear-gradient(135deg, {color_scheme['primary']} 0%, {color_scheme['border']} 100%);
            color: #ffffff;
            padding: 30px 20px;
            text-align: center;
        }}
        .header h1 {{
            margin: 0 0 10px 0;
            font-size: 24px;
            font-weight: 700;
        }}
        .header .company {{
            font-size: 14px;
            opacity: 0.9;
            margin: 5px 0;
        }}
        .status-badge {{
            display: inline-block;
            background-color: {color_scheme['bg']};
            color: {color_scheme['text']};
            padding: 8px 16px;
            border-radius: 20px;
            font-weight: 600;
            font-size: 14px;
            margin: 10px 0;
            border: 2px solid {color_scheme['border']};
        }}
        .content {{
            padding: 30px 20px;
        }}
        .section {{
            margin-bottom: 25px;
        }}
        .section-title {{
            font-size: 16px;
            font-weight: 700;
            color: #1f2937;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid {color_scheme['primary']};
        }}
        .info-table {{
            width: 100%;
            border-collapse: collapse;
            margin: 10px 0;
        }}
        .info-table td {{
            padding: 8px 0;
            vertical-align: top;
        }}
        .info-label {{
            font-weight: 600;
            color: #6b7280;
            width: 150px;
            padding-right: 10px;
        }}
        .info-value {{
            color: #1f2937;
        }}
        .checklist {{
            margin: 15px 0;
            padding: 0;
            list-style: none;
        }}
        .checklist li {{
            padding: 8px 0 8px 30px;
            position: relative;
            color: #1f2937;
        }}
        .checklist li:before {{
            content: '✓';
            position: absolute;
            left: 0;
            color: {color_scheme['primary']};
            font-weight: bold;
            font-size: 18px;
        }}
        .alert-box {{
            background-color: {color_scheme['bg']};
            border-left: 4px solid {color_scheme['border']};
            padding: 15px;
            margin: 15px 0;
            border-radius: 4px;
        }}
        .alert-box p {{
            margin: 5px 0;
            color: {color_scheme['text']};
        }}
        .code-block {{
            background-color: #f3f4f6;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 12px;
            margin: 10px 0;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #1f2937;
            overflow-x: auto;
        }}
        .action-steps {{
            counter-reset: step-counter;
            padding-left: 0;
            list-style: none;
        }}
        .action-steps li {{
            counter-increment: step-counter;
            padding: 12px 0 12px 40px;
            position: relative;
            margin-bottom: 10px;
        }}
        .action-steps li:before {{
            content: counter(step-counter);
            position: absolute;
            left: 0;
            top: 12px;
            background-color: {color_scheme['primary']};
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            text-align: center;
            line-height: 28px;
            font-weight: bold;
            font-size: 14px;
        }}
        .footer {{
            background-color: #f9fafb;
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 13px;
        }}
        .footer p {{
            margin: 5px 0;
        }}
        @media only screen and (max-width: 600px) {{
            .email-container {{
                margin: 0 !important;
                border-radius: 0 !important;
            }}
            .content {{
                padding: 20px 15px !important;
            }}
            .info-label {{
                width: 120px;
                font-size: 13px;
            }}
        }}
    </style>
</head>
<body>
    <div class="email-container">
        {{{{content}}}}
        <div class="footer">
            <p><strong>This is an automated notification from:</strong></p>
            <p>{SYSTEM_NAME} Backup &amp; Monitoring System</p>
            <p>{COMPANY_NAME}</p>
        </div>
    </div>
</body>
</html>"""


def format_header_html(task_name, status, status_symbol, status_type='info'):
    """Format HTML email header"""
    hostname, timestamp = get_server_info()

    return f"""
        <div class="header">
            <h1>{SYSTEM_NAME}</h1>
            <p class="company">{COMPANY_NAME}</p>
            <div class="status-badge">{status_symbol} {status}</div>
        </div>
        <div class="content">
            <div class="section">
                <table class="info-table">
                    <tr>
                        <td class="info-label">System:</td>
                        <td class="info-value">{SYSTEM_FULL_NAME}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Server:</td>
                        <td class="info-value">{hostname}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Task:</td>
                        <td class="info-value">{task_name}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Timestamp:</td>
                        <td class="info-value">{timestamp}</td>
                    </tr>
                </table>
            </div>"""


def format_backup_success(backup_type, backup_file, backup_size, duration=None):
    """Format a successful backup notification email in HTML"""
    paths = get_app_paths()
    task_name = f"{backup_type.upper()} Database Backup"

    header = format_header_html(task_name, "SUCCESS", "✓", "success")

    duration_row = f"""<tr>
                        <td class="info-label">Duration:</td>
                        <td class="info-value">{duration}</td>
                    </tr>""" if duration else ""

    template = get_base_html_template('success')
    content = f"""{header}

            <div class="section">
                <h2 class="section-title">What Happened</h2>
                <p>The scheduled database backup completed successfully. The database was backed up and verified for recovery capability.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Backup Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Backup Type:</td>
                        <td class="info-value">{backup_type.upper()}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Filename:</td>
                        <td class="info-value">{os.path.basename(backup_file) if backup_file else 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="info-label">File Size:</td>
                        <td class="info-value">{backup_size}</td>
                    </tr>
                    {duration_row}
                    <tr>
                        <td class="info-label">Checksum:</td>
                        <td class="info-value">SHA256 (verified)</td>
                    </tr>
                    <tr>
                        <td class="info-label">Status:</td>
                        <td class="info-value"><strong>Ready for Recovery</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">Verification Completed</h2>
                <ul class="checklist">
                    <li>Database dump completed successfully</li>
                    <li>Backup file verified and validated</li>
                    <li>SHA256 checksum generated and stored</li>
                    <li>Metadata created and indexed</li>
                    <li>Backup added to catalog</li>
                    <li>Archival policy applied</li>
                </ul>
            </div>

            <div class="section">
                <h2 class="section-title">Next Steps</h2>
                <p>No action required. This is a routine automated backup operation. The backup system is fully operational and functioning normally.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Support Contact</h2>
                <p><strong>Log Location:</strong> <code>{paths['logs']}/backup-manager.log</code></p>
                <p><strong>Contact:</strong> System Administrator / DevOps Team</p>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


def format_backup_failure(backup_type, error_message, duration=None):
    """Format a failed backup notification email in HTML"""
    paths = get_app_paths()
    task_name = f"{backup_type.upper()} Database Backup"

    header = format_header_html(task_name, "FAILED", "✗", "error")

    duration_row = f"""<tr>
                        <td class="info-label">Duration:</td>
                        <td class="info-value">{duration}</td>
                    </tr>""" if duration else ""

    template = get_base_html_template('error')
    content = f"""{header}

            <div class="alert-box">
                <p><strong>⚠ CRITICAL:</strong> The scheduled database backup FAILED and did not complete successfully. The database was NOT backed up and recovery capability is at risk.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Backup Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Backup Type:</td>
                        <td class="info-value">{backup_type.upper()}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Error Message:</td>
                        <td class="info-value" style="color: #dc2626;">{error_message}</td>
                    </tr>
                    {duration_row}
                    <tr>
                        <td class="info-label">Status:</td>
                        <td class="info-value" style="color: #dc2626;"><strong>FAILED - ACTION REQUIRED</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">Business Impact</h2>
                <ul class="checklist">
                    <li style="color: #dc2626;">⚠ No backup created for this cycle</li>
                    <li style="color: #dc2626;">⚠ Recovery point may be outdated</li>
                    <li style="color: #dc2626;">⚠ SLA/Data protection policy is VIOLATED</li>
                    <li style="color: #dc2626;">⚠ Disaster recovery capability at risk</li>
                </ul>
            </div>

            <div class="section">
                <h2 class="section-title">Immediate Action Required</h2>
                <ol class="action-steps">
                    <li>
                        <strong>Check Database Status:</strong>
                        <div class="code-block">docker compose ps | grep db<br>docker compose exec db pg_isready</div>
                    </li>
                    <li>
                        <strong>Check Disk Space:</strong>
                        <div class="code-block">df -h {paths['backups']}</div>
                    </li>
                    <li>
                        <strong>Review Error Logs:</strong>
                        <div class="code-block">tail -50 {paths['logs']}/backup-manager.log | grep ERROR</div>
                    </li>
                    <li>
                        <strong>Test Manual Backup:</strong>
                        <div class="code-block">{paths['scripts_backup']}/backup-manager.sh --daily</div>
                    </li>
                </ol>
            </div>

            <div class="section">
                <h2 class="section-title">Common Causes</h2>
                <ul>
                    <li>Database service down or unresponsive</li>
                    <li>Insufficient disk space</li>
                    <li>Backup directory permission errors</li>
                    <li>Network connectivity issues</li>
                    <li>Cron job not running properly</li>
                    <li>Resource exhaustion</li>
                </ul>
            </div>

            <div class="section">
                <h2 class="section-title">Support Contact</h2>
                <p style="color: #dc2626;"><strong>Priority: CRITICAL - Resolve within 2 hours</strong></p>
                <p><strong>Contact:</strong> System Administrator / DevOps Team</p>
                <p><strong>Backup Log:</strong> {paths['logs']}/backup-manager.log</p>
                <p><strong>Error Log:</strong> {paths['logs']}/error.log</p>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


def format_restore_success(restore_file, restore_duration, rows_restored=None):
    """Format a successful restore notification email in HTML"""
    paths = get_app_paths()
    task_name = "Database Restore"

    header = format_header_html(task_name, "SUCCESS", "✓", "success")

    rows_row = f"""<tr>
                        <td class="info-label">Rows Restored:</td>
                        <td class="info-value">{rows_restored}</td>
                    </tr>""" if rows_restored else ""

    template = get_base_html_template('success')
    content = f"""{header}

            <div class="section">
                <h2 class="section-title">What Happened</h2>
                <p>The database has been successfully restored from a backup. All data from the backup timestamp is now active and verified. The system is ready for normal operation.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Restore Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Backup File:</td>
                        <td class="info-value">{os.path.basename(restore_file) if restore_file else 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Restore Duration:</td>
                        <td class="info-value">{restore_duration}</td>
                    </tr>
                    {rows_row}
                    <tr>
                        <td class="info-label">Status:</td>
                        <td class="info-value"><strong>ONLINE AND OPERATIONAL</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">Verification Completed</h2>
                <ul class="checklist">
                    <li>Backup file integrity verified</li>
                    <li>Database restore completed successfully</li>
                    <li>All tables and indexes restored</li>
                    <li>Foreign key constraints validated</li>
                    <li>Data consistency verified</li>
                    <li>Application connectivity tested</li>
                    <li>Safety backup created (original state preserved)</li>
                </ul>
            </div>

            <div class="section">
                <h2 class="section-title">System Status</h2>
                <ul class="checklist">
                    <li>Database: ONLINE and OPERATIONAL</li>
                    <li>Services: Running normally</li>
                    <li>Data: Fully accessible</li>
                    <li>Backups: Safety copy maintained</li>
                </ul>
            </div>

            <div class="section">
                <h2 class="section-title">Next Steps</h2>
                <ol>
                    <li>Verify application functionality</li>
                    <li>Monitor system behavior and logs</li>
                    <li>Document restoration details</li>
                </ol>
            </div>

            <div class="section">
                <h2 class="section-title">Support Contact</h2>
                <p><strong>Contact:</strong> System Administrator / Database Team</p>
                <p><strong>Restore Log:</strong> {paths['logs']}/restore-backup.log</p>
                <p><strong>Backup Log:</strong> {paths['logs']}/backup-manager.log</p>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


def format_restore_failure(restore_file, error_message):
    """Format a failed restore notification email in HTML"""
    paths = get_app_paths()
    task_name = "Database Restore"

    header = format_header_html(task_name, "FAILED", "✗", "error")

    template = get_base_html_template('error')
    content = f"""{header}

            <div class="alert-box">
                <p><strong>⚠ IMPORTANT:</strong> The database restore operation FAILED and could not complete.</p>
                <p><strong>✓ GOOD NEWS:</strong> Database has NOT been modified - original data is intact.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Restore Attempt Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Backup File Attempted:</td>
                        <td class="info-value">{os.path.basename(restore_file) if restore_file else 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Error Message:</td>
                        <td class="info-value" style="color: #dc2626;">{error_message}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Status:</td>
                        <td class="info-value" style="color: #dc2626;"><strong>FAILED - ACTION REQUIRED</strong></td>
                    </tr>
                    <tr>
                        <td class="info-label">Data Loss:</td>
                        <td class="info-value" style="color: #10b981;"><strong>NOT OCCURRED (database unchanged)</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">Critical Information</h2>
                <ul class="checklist">
                    <li>Original database: UNCHANGED (restore did not execute)</li>
                    <li>Data integrity: PRESERVED (no modifications made)</li>
                    <li>System status: Previous state intact</li>
                </ul>
            </div>

            <div class="section">
                <h2 class="section-title">Immediate Action Required</h2>
                <ol class="action-steps">
                    <li>
                        <strong>Verify Database Status:</strong>
                        <div class="code-block">docker compose exec db pg_isready</div>
                    </li>
                    <li>
                        <strong>Review Error Logs:</strong>
                        <div class="code-block">tail -50 {paths['logs']}/restore-backup.log | grep ERROR<br>tail -50 {paths['logs']}/error.log</div>
                    </li>
                    <li>
                        <strong>Verify Backup File:</strong>
                        <div class="code-block">ls -lh {os.path.basename(restore_file) if restore_file else '[backup_file]'}</div>
                    </li>
                </ol>
            </div>

            <div class="section">
                <h2 class="section-title">Support Contact</h2>
                <p style="color: #dc2626;"><strong>Priority: HIGH - Resolve within 1-2 hours</strong></p>
                <p><strong>Contact:</strong> Database Administrator / DevOps Team</p>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


def format_remote_sync_success(backup_count, total_size, duration, remote_host):
    """Format a successful remote backup sync notification email in HTML"""
    task_name = "Remote Backup Sync (rsync)"

    header = format_header_html(task_name, "SUCCESS", "✓", "success")

    template = get_base_html_template('success')
    content = f"""{header}

            <div class="section">
                <h2 class="section-title">What Happened</h2>
                <p>The scheduled remote backup synchronization completed successfully. All local backups have been replicated to the remote server for off-site redundancy and disaster recovery protection.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Sync Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Remote Host:</td>
                        <td class="info-value">{remote_host}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Backups Synced:</td>
                        <td class="info-value">{backup_count}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Total Size:</td>
                        <td class="info-value">{total_size}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Duration:</td>
                        <td class="info-value">{duration}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Status:</td>
                        <td class="info-value"><strong>SYNCHRONIZED</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">Verification Completed</h2>
                <ul class="checklist">
                    <li>SSH connection successful</li>
                    <li>Remote directories created/verified</li>
                    <li>All backup files synced successfully</li>
                    <li>File integrity verified with checksums</li>
                    <li>Remote storage updated</li>
                    <li>Off-site backup protection active</li>
                </ul>
            </div>

            <div class="section">
                <h2 class="section-title">Next Steps</h2>
                <p>No action required. Off-site backup replication is functioning normally. Data is protected at both local and remote locations.</p>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


def format_remote_sync_failure(error_message, remote_host):
    """Format a failed remote backup sync notification email in HTML"""
    paths = get_app_paths()
    task_name = "Remote Backup Sync (rsync)"

    header = format_header_html(task_name, "FAILED", "✗", "error")

    template = get_base_html_template('error')
    content = f"""{header}

            <div class="alert-box">
                <p><strong>⚠ WARNING:</strong> The scheduled remote backup synchronization FAILED to complete. Local backups are safe and continuing. Remote backup is NOT up-to-date with recent backups.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Sync Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Remote Host:</td>
                        <td class="info-value">{remote_host}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Error Message:</td>
                        <td class="info-value" style="color: #dc2626;">{error_message}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Status:</td>
                        <td class="info-value" style="color: #dc2626;"><strong>SYNC FAILED - ACTION REQUIRED</strong></td>
                    </tr>
                    <tr>
                        <td class="info-label">Local Backups:</td>
                        <td class="info-value" style="color: #10b981;"><strong>SAFE (unaffected)</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">Action Required</h2>
                <ol class="action-steps">
                    <li>
                        <strong>Verify Network Connection:</strong>
                        <div class="code-block">ping {remote_host}<br>ssh -v {remote_host} echo "Test connection"</div>
                    </li>
                    <li>
                        <strong>Check Remote Storage:</strong>
                        <div class="code-block">ssh {remote_host} df -h</div>
                    </li>
                    <li>
                        <strong>Review Error Logs:</strong>
                        <div class="code-block">tail -50 {paths['logs']}/rsync-backup.log | grep ERROR</div>
                    </li>
                </ol>
            </div>

            <div class="section">
                <h2 class="section-title">Support Contact</h2>
                <p style="color: #dc2626;"><strong>Priority: HIGH - Resolve within 4 hours</strong></p>
                <p><strong>Contact:</strong> System Administrator / Network Team</p>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


def format_monthly_restore_test_success(backup_used, test_duration, rows_verified):
    """Format a successful restore test notification email in HTML"""
    task_name = "Backup Restore Test (Weekly)"

    header = format_header_html(task_name, "SUCCESS", "✓", "success")

    template = get_base_html_template('success')
    content = f"""{header}

            <div class="section">
                <h2 class="section-title">What Happened</h2>
                <p>A scheduled backup restore test completed successfully. The latest backup was restored to an isolated test database to validate recovery procedures and verify data integrity.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Test Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Backup Used:</td>
                        <td class="info-value">{os.path.basename(backup_used) if backup_used else 'Latest'}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Test Duration:</td>
                        <td class="info-value">{test_duration}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Rows Verified:</td>
                        <td class="info-value">{rows_verified}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Test Database:</td>
                        <td class="info-value">Created, tested, and cleaned up</td>
                    </tr>
                    <tr>
                        <td class="info-label">Status:</td>
                        <td class="info-value"><strong>ALL TESTS PASSED ✓</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">Disaster Recovery Status</h2>
                <ul class="checklist">
                    <li>Backups are valid and restorable</li>
                    <li>Recovery procedures verified and working</li>
                    <li>RTO (Recovery Time Objective): CONFIRMED ACHIEVABLE</li>
                    <li>Database integrity: CONFIRMED</li>
                    <li>Data completeness: CONFIRMED</li>
                    <li>Disaster recovery capability: VALIDATED</li>
                </ul>
            </div>

            <div class="section">
                <h2 class="section-title">Test Conclusion</h2>
                <p>All restore tests have passed successfully. Your backup and recovery procedures are fully operational. Data restoration capability is verified and ready for production use.</p>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


def format_monthly_restore_test_failure(error_message, backup_attempted):
    """Format a failed restore test notification email in HTML"""
    paths = get_app_paths()
    task_name = "Backup Restore Test (Weekly)"

    header = format_header_html(task_name, "FAILED", "✗", "error")

    template = get_base_html_template('error')
    content = f"""{header}

            <div class="alert-box">
                <p><strong>⚠ CRITICAL:</strong> A scheduled backup restore test FAILED. The backup could not be successfully restored to the test database. This indicates a potential problem with disaster recovery procedures.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Test Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Backup Attempted:</td>
                        <td class="info-value">{os.path.basename(backup_attempted) if backup_attempted else 'Latest'}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Error Message:</td>
                        <td class="info-value" style="color: #dc2626;">{error_message}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Test Database:</td>
                        <td class="info-value" style="color: #dc2626;">Failed to restore</td>
                    </tr>
                    <tr>
                        <td class="info-label">Risk Level:</td>
                        <td class="info-value" style="color: #dc2626;"><strong>HIGH</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">Business Impact</h2>
                <ul style="list-style: none; padding-left: 0;">
                    <li style="color: #dc2626; padding: 5px 0;">⚠ Current backups may not be restorable</li>
                    <li style="color: #dc2626; padding: 5px 0;">⚠ Recovery procedures are not functioning correctly</li>
                    <li style="color: #dc2626; padding: 5px 0;">⚠ Data recovery might not be possible in case of disaster</li>
                    <li style="color: #dc2626; padding: 5px 0;">⚠ Disaster recovery capability: NOT VERIFIED</li>
                </ul>
            </div>

            <div class="section">
                <h2 class="section-title">Immediate Action Required</h2>
                <ol class="action-steps">
                    <li>
                        <strong>Investigate Immediately:</strong>
                        <div class="code-block">tail -50 {paths['logs']}/backup-manager.log | grep ERROR<br>tail -50 {paths['logs']}/error.log</div>
                    </li>
                    <li>
                        <strong>Verify Backup Integrity:</strong>
                        <div class="code-block">ls -lh {paths['backups']}/full/*/backup_*.sql<br>file {paths['backups']}/full/*/backup_*.sql</div>
                    </li>
                    <li>
                        <strong>Test Database Connectivity:</strong>
                        <div class="code-block">docker compose exec db pg_isready</div>
                    </li>
                </ol>
            </div>

            <div class="section">
                <h2 class="section-title">Support Contact</h2>
                <p style="color: #dc2626;"><strong>Priority: CRITICAL - Do not delay</strong></p>
                <p><strong>Timeframe:</strong> Resolve within 2 hours</p>
                <p><strong>Contact:</strong> Database Administrator / System Administrator</p>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


def format_backup_verification_success(backup_file, table_count, test_duration):
    """Format a successful backup verification notification email in HTML"""
    task_name = "Backup Verification (pg_restore)"

    header = format_header_html(task_name, "SUCCESS", "✓", "success")

    template = get_base_html_template('success')
    content = f"""{header}

            <div class="section">
                <h2 class="section-title">What Happened</h2>
                <p>The scheduled backup verification completed successfully. The backup file was tested to ensure it can be restored and contains valid data.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Verification Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Backup File:</td>
                        <td class="info-value">{os.path.basename(backup_file) if backup_file else 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Tables Verified:</td>
                        <td class="info-value">{table_count}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Test Duration:</td>
                        <td class="info-value">{test_duration}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Status:</td>
                        <td class="info-value"><strong>ALL CHECKS PASSED ✓</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">Verification Completed</h2>
                <ul class="checklist">
                    <li>Backup file readable and accessible</li>
                    <li>All database tables restored successfully</li>
                    <li>Table structure validated</li>
                    <li>Indexes created properly</li>
                    <li>Foreign key constraints verified</li>
                    <li>Data integrity confirmed</li>
                    <li>Backup is recoverable and production-ready</li>
                </ul>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


def format_backup_verification_failure(backup_file, error_message):
    """Format a failed backup verification notification email in HTML"""
    paths = get_app_paths()
    task_name = "Backup Verification (pg_restore)"

    header = format_header_html(task_name, "FAILED", "✗", "error")

    template = get_base_html_template('error')
    content = f"""{header}

            <div class="alert-box">
                <p><strong>⚠ WARNING:</strong> The scheduled backup verification FAILED. The backup file could not be validated, indicating a potential issue with the backup.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Verification Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Backup File:</td>
                        <td class="info-value">{os.path.basename(backup_file) if backup_file else 'N/A'}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Error Message:</td>
                        <td class="info-value" style="color: #dc2626;">{error_message}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Status:</td>
                        <td class="info-value" style="color: #dc2626;"><strong>FAILED - ACTION REQUIRED</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">Action Required</h2>
                <ol class="action-steps">
                    <li>
                        <strong>Review Error Logs:</strong>
                        <div class="code-block">tail -50 {paths['logs']}/backup-verification.log | grep ERROR</div>
                    </li>
                    <li>
                        <strong>Verify Backup File:</strong>
                        <div class="code-block">ls -lh {os.path.basename(backup_file) if backup_file else '[backup_file]'}<br>file {os.path.basename(backup_file) if backup_file else '[backup_file]'}</div>
                    </li>
                    <li>
                        <strong>Check If Previous Backup Is Valid:</strong>
                        <div class="code-block">ls -lt {paths['backups']}/*/*/*.sql | head -5</div>
                    </li>
                </ol>
            </div>

            <div class="section">
                <h2 class="section-title">Support Contact</h2>
                <p style="color: #dc2626;"><strong>Priority: HIGH - Resolve within 4 hours</strong></p>
                <p><strong>Contact:</strong> System Administrator / Database Team</p>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


def format_backup_cleanup_success(removed_count, freed_space):
    """Format a successful backup cleanup notification email in HTML"""
    task_name = "Backup Cleanup (Retention Policy)"

    header = format_header_html(task_name, "SUCCESS", "✓", "success")

    template = get_base_html_template('success')
    content = f"""{header}

            <div class="section">
                <h2 class="section-title">What Happened</h2>
                <p>The scheduled backup cleanup completed successfully. Old backups exceeding the retention period were removed according to policy.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Cleanup Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Backups Removed:</td>
                        <td class="info-value">{removed_count}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Space Freed:</td>
                        <td class="info-value">{freed_space}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Retention Policy:</td>
                        <td class="info-value">180 days</td>
                    </tr>
                    <tr>
                        <td class="info-label">Status:</td>
                        <td class="info-value"><strong>CLEANUP COMPLETED ✓</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">Verification Completed</h2>
                <ul class="checklist">
                    <li>Old backups identified (older than 180 days)</li>
                    <li>Files safely removed</li>
                    <li>Storage space freed</li>
                    <li>Retention policy enforced</li>
                </ul>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


def format_disk_monitor_success(usage_percent, available_space):
    """Format a disk space monitoring success notification email in HTML"""
    task_name = "Disk Space Monitoring"

    header = format_header_html(task_name, "HEALTHY", "✓", "success")

    template = get_base_html_template('success')
    content = f"""{header}

            <div class="section">
                <h2 class="section-title">What Happened</h2>
                <p>A scheduled disk space monitoring check completed successfully. Current disk usage is healthy and within normal parameters.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Disk Usage Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Disk Usage:</td>
                        <td class="info-value">{usage_percent}% (Normal)</td>
                    </tr>
                    <tr>
                        <td class="info-label">Available Space:</td>
                        <td class="info-value">{available_space}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Alert Threshold:</td>
                        <td class="info-value">75% (Warning), 90% (Critical)</td>
                    </tr>
                    <tr>
                        <td class="info-label">Status:</td>
                        <td class="info-value"><strong>HEALTHY ✓</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">System Status</h2>
                <ul class="checklist">
                    <li>Disk usage within normal range</li>
                    <li>Sufficient space for backups</li>
                    <li>Capacity planning: No concerns</li>
                    <li>Storage trending: Stable</li>
                </ul>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


def format_disk_monitor_warning(usage_percent, available_space):
    """Format a disk space monitoring warning notification email in HTML"""
    task_name = "Disk Space Monitoring"

    header = format_header_html(task_name, "WARNING", "⚠", "warning")

    template = get_base_html_template('warning')
    content = f"""{header}

            <div class="alert-box">
                <p><strong>⚠ WARNING:</strong> A scheduled disk space monitoring check detected elevated disk usage. Available disk space is approaching the warning threshold.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Disk Usage Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Disk Usage:</td>
                        <td class="info-value" style="color: #d97706;"><strong>{usage_percent}% (WARNING)</strong></td>
                    </tr>
                    <tr>
                        <td class="info-label">Available Space:</td>
                        <td class="info-value">{available_space}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Alert Threshold:</td>
                        <td class="info-value">75% (Warning), 90% (Critical)</td>
                    </tr>
                    <tr>
                        <td class="info-label">Status:</td>
                        <td class="info-value" style="color: #d97706;"><strong>APPROACHING LIMIT ⚠</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">Action Required</h2>
                <ol>
                    <li>Monitor disk usage closely</li>
                    <li>Consider archiving old backups to external storage</li>
                    <li>Remove any unnecessary files/logs</li>
                    <li>Plan for disk upgrade if trend continues</li>
                </ol>
            </div>

            <div class="section">
                <h2 class="section-title">Support Contact</h2>
                <p style="color: #d97706;"><strong>Priority: MEDIUM - Address within 24 hours</strong></p>
                <p><strong>Contact:</strong> System Administrator / DevOps Team</p>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


def format_disk_monitor_critical(usage_percent, available_space):
    """Format a disk space monitoring critical notification email in HTML"""
    task_name = "Disk Space Monitoring"

    header = format_header_html(task_name, "CRITICAL", "✗", "error")

    template = get_base_html_template('error')
    content = f"""{header}

            <div class="alert-box">
                <p><strong>⚠ CRITICAL:</strong> A scheduled disk space monitoring check detected CRITICAL disk usage. Disk space is nearly full. Immediate action is required.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Disk Usage Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Disk Usage:</td>
                        <td class="info-value" style="color: #dc2626;"><strong>{usage_percent}% (CRITICAL)</strong></td>
                    </tr>
                    <tr>
                        <td class="info-label">Available Space:</td>
                        <td class="info-value">{available_space}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Alert Threshold:</td>
                        <td class="info-value">75% (Warning), 90% (Critical)</td>
                    </tr>
                    <tr>
                        <td class="info-label">Status:</td>
                        <td class="info-value" style="color: #dc2626;"><strong>DISK NEARLY FULL ✗</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">Business Impact</h2>
                <ul style="list-style: none; padding-left: 0;">
                    <li style="color: #dc2626; padding: 5px 0;">⚠ Backups may fail to complete</li>
                    <li style="color: #dc2626; padding: 5px 0;">⚠ System performance degraded</li>
                    <li style="color: #dc2626; padding: 5px 0;">⚠ Application operations at risk</li>
                    <li style="color: #dc2626; padding: 5px 0;">⚠ Database may become unstable</li>
                </ul>
            </div>

            <div class="section">
                <h2 class="section-title">Immediate Action Required</h2>
                <ol class="action-steps">
                    <li><strong>ALERT TEAM IMMEDIATELY (Priority: CRITICAL)</strong></li>
                    <li>
                        <strong>Free Disk Space Immediately:</strong>
                        <ul style="margin-top: 5px;">
                            <li>Archive old backups to external storage</li>
                            <li>Delete old log files (&gt;30 days)</li>
                            <li>Remove temporary files/docker cache</li>
                        </ul>
                    </li>
                    <li><strong>Monitor backup operations to ensure they complete</strong></li>
                    <li><strong>Plan long-term solution (disk upgrade, automated archival)</strong></li>
                </ol>
            </div>

            <div class="section">
                <h2 class="section-title">Support Contact</h2>
                <p style="color: #dc2626;"><strong>Priority: CRITICAL - Address immediately</strong></p>
                <p><strong>Timeframe:</strong> Resolve within 1 hour</p>
                <p><strong>Contact:</strong> System Administrator / DevOps Team</p>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


def format_health_check_success(systems_checked, systems_healthy):
    """Format a system health check success notification email in HTML"""
    task_name = "System Health Check"

    header = format_header_html(task_name, "HEALTHY", "✓", "success")

    template = get_base_html_template('success')
    content = f"""{header}

            <div class="section">
                <h2 class="section-title">What Happened</h2>
                <p>A comprehensive system health check completed successfully. All monitored systems and services are operational and responsive.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Health Check Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Systems Checked:</td>
                        <td class="info-value">{systems_checked}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Systems Healthy:</td>
                        <td class="info-value">{systems_healthy}/{systems_checked}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Status:</td>
                        <td class="info-value"><strong>ALL SYSTEMS OPERATIONAL ✓</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">System Status</h2>
                <ul class="checklist">
                    <li>Backend API: RESPONSIVE</li>
                    <li>Frontend: RESPONSIVE</li>
                    <li>Mobile Interface: RESPONSIVE</li>
                    <li>Database: CONNECTED</li>
                    <li>Nominatim Service: RESPONSIVE</li>
                    <li>Disk Usage: HEALTHY</li>
                </ul>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


def format_health_check_warning(systems_checked, systems_healthy, issues_found):
    """Format a system health check warning notification email in HTML"""
    task_name = "System Health Check"

    header = format_header_html(task_name, "WARNING", "⚠", "warning")

    template = get_base_html_template('warning')
    content = f"""{header}

            <div class="alert-box">
                <p><strong>⚠ WARNING:</strong> A comprehensive system health check detected issues. Some systems are not responding normally or are showing warnings.</p>
            </div>

            <div class="section">
                <h2 class="section-title">Health Check Details</h2>
                <table class="info-table">
                    <tr>
                        <td class="info-label">Systems Checked:</td>
                        <td class="info-value">{systems_checked}</td>
                    </tr>
                    <tr>
                        <td class="info-label">Systems Healthy:</td>
                        <td class="info-value" style="color: #d97706;"><strong>{systems_healthy}/{systems_checked}</strong></td>
                    </tr>
                    <tr>
                        <td class="info-label">Status:</td>
                        <td class="info-value" style="color: #d97706;"><strong>SOME SYSTEMS OFFLINE/DEGRADED ⚠</strong></td>
                    </tr>
                </table>
            </div>

            <div class="section">
                <h2 class="section-title">Issues Detected</h2>
                <div class="code-block" style="white-space: pre-wrap;">{issues_found}</div>
            </div>

            <div class="section">
                <h2 class="section-title">Action Required</h2>
                <ol class="action-steps">
                    <li>
                        <strong>Investigate Immediately:</strong>
                        <div class="code-block">docker compose ps<br>docker compose logs [service]</div>
                    </li>
                    <li>
                        <strong>Restart Affected Services:</strong>
                        <div class="code-block">docker compose restart [service_name]</div>
                    </li>
                    <li><strong>Monitor System and watch for recurring issues</strong></li>
                </ol>
            </div>

            <div class="section">
                <h2 class="section-title">Support Contact</h2>
                <p style="color: #d97706;"><strong>Priority: HIGH - Address within 2 hours</strong></p>
                <p><strong>Contact:</strong> System Administrator / DevOps Team</p>
            </div>
        </div>"""

    return template.replace('{{title}}', task_name).replace('{{content}}', content)


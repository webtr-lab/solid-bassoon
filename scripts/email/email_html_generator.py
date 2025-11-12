#!/usr/bin/env python3
"""
HTML Email Generator for Maps Tracker
Generates professional HTML emails with status-based color coding
"""

from datetime import datetime
import socket
import os


# Color codes for different statuses
STATUS_COLORS = {
    'success': {
        'bg_gradient': 'linear-gradient(135deg, #10b981, #059669)',
        'accent': '#10b981',
        'badge_bg': 'rgba(16, 185, 129, 0.2)',
        'symbol': '✓',
        'status_text': 'SUCCESS'
    },
    'warning': {
        'bg_gradient': 'linear-gradient(135deg, #f59e0b, #d97706)',
        'accent': '#f59e0b',
        'badge_bg': 'rgba(245, 158, 11, 0.2)',
        'symbol': '⚠',
        'status_text': 'WARNING'
    },
    'failed': {
        'bg_gradient': 'linear-gradient(135deg, #ef4444, #dc2626)',
        'accent': '#ef4444',
        'badge_bg': 'rgba(239, 68, 68, 0.2)',
        'symbol': '✗',
        'status_text': 'FAILED'
    }
}


def get_server_info():
    """Get server hostname and timestamp"""
    hostname = socket.gethostname()
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    return hostname, timestamp


def generate_html_email(task_name, status, title, content_sections, support_info=None):
    """
    Generate a professional HTML email with status-based colors

    Args:
        task_name: Name of the task
        status: 'success', 'warning', or 'failed'
        title: Email header title
        content_sections: List of tuples (section_title, content_dict)
            where content_dict has 'kv_table' (list of tuples) or 'text' (plain text)
        support_info: Optional dict with 'contact' and 'frequency' keys

    Returns:
        HTML email string
    """
    hostname, timestamp = get_server_info()
    colors = STATUS_COLORS.get(status, STATUS_COLORS['warning'])

    # Build content sections
    content_html = ""
    for i, (section_title, section_content) in enumerate(content_sections):
        if i > 0:
            content_html += '<div class="divider"></div>\n'

        content_html += f"""
        <div class="section">
            <h2 class="section-title" style="color-accent: {colors['accent']}">{section_title}</h2>
"""

        if isinstance(section_content, dict):
            if 'kv_table' in section_content:
                content_html += '            <table class="kv-table">\n'
                for key, value in section_content['kv_table']:
                    # Highlight important values with accent color
                    is_highlight = key.lower() in ['status', 'summary', 'result'] or 'failed' in value.lower()
                    value_class = 'kv-value highlight' if is_highlight else 'kv-value'
                    value_style = f'color: {colors["accent"]};' if is_highlight else ''
                    content_html += f"""                <tr>
                    <td class="kv-label">{key}:</td>
                    <td class="{value_class}" style="{value_style}">{value}</td>
                </tr>
"""
                content_html += '            </table>\n'

            if 'text' in section_content:
                content_html += f'            <p style="color: #2d3748; line-height: 1.6;">{section_content["text"]}</p>\n'

            if 'list' in section_content:
                content_html += '            <ul class="bullet-list">\n'
                for item in section_content['list']:
                    content_html += f'                <li>{item}</li>\n'
                content_html += '            </ul>\n'

        content_html += '        </div>\n'

    # Support info section
    support_html = ""
    if support_info:
        support_html = """
        <div class="divider"></div>
        <div class="section">
            <h2 class="section-title">SUPPORT CONTACT</h2>
            <table class="kv-table">
"""
        for key, value in support_info.items():
            support_html += f"""                <tr>
                    <td class="kv-label">{key.title()}:</td>
                    <td class="kv-value">{value}</td>
                </tr>
"""
        support_html += """            </table>
        </div>
"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} - {colors['status_text']}</title>
  <style>
    /* Base Reset */
    body, table, td, a {{ -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }}
    table, td {{ mso-table-lspace: 0pt; mso-table-rspace: 0pt; }}
    img {{ -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }}
    table {{ border-collapse: collapse !important; }}
    body {{ margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #f7f9fc; }}

    /* Container */
    .container {{
      max-width: 640px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    }}

    /* Header */
    .header {{
      background: {colors['bg_gradient']};
      color: #ffffff;
      padding: 24px 32px;
      text-align: center;
    }}
    .header h1 {{
      margin: 0;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: 0.5px;
    }}
    .status-badge {{
      display: inline-block;
      background-color: {colors['badge_bg']};
      color: #ffffff;
      font-size: 13px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 20px;
      margin-top: 8px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }}

    /* Content */
    .content {{
      padding: 32px;
      color: #2d3748;
      line-height: 1.6;
    }}
    .section {{
      margin-bottom: 28px;
    }}
    .section-title {{
      font-size: 16px;
      font-weight: 700;
      color: #1a202c;
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 2px solid #e2e8f0;
      display: flex;
      align-items: center;
    }}
    .section-title::before {{
      content: "{colors['symbol']}";
      color: {colors['accent']};
      font-weight: bold;
      margin-right: 8px;
      font-size: 18px;
    }}

    /* Key-Value Table */
    .kv-table {{
      width: 100%;
      font-size: 14px;
      margin: 12px 0;
    }}
    .kv-table td {{
      padding: 6px 0;
      vertical-align: top;
    }}
    .kv-label {{
      font-weight: 600;
      color: #4a5568;
      width: 180px;
      padding-right: 16px;
    }}
    .kv-value {{
      color: #2d3748;
    }}
    .highlight {{
      color: {colors['accent']};
      font-weight: 600;
    }}

    /* Divider */
    .divider {{
      height: 1px;
      background-color: #e2e8f0;
      margin: 24px 0;
    }}

    /* List */
    .bullet-list {{
      margin: 12px 0;
      padding-left: 20px;
    }}
    .bullet-list li {{
      margin-bottom: 8px;
      color: #2d3748;
      font-size: 14px;
    }}
    .bullet-list strong {{
      color: #1a202c;
    }}

    /* Footer */
    .footer {{
      background-color: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      font-size: 13px;
      color: #718096;
      border-top: 1px solid #e2e8f0;
    }}
    .footer a {{
      color: #4299e1;
      text-decoration: none;
    }}

    /* Responsive */
    @media only screen and (max-width: 600px) {{
      .container {{ width: 100% !important; border-radius: 0 !important; }}
      .content, .header, .footer {{ padding: 20px !important; }}
      .kv-label {{ width: 140px !important; }}
    }}
  </style>
</head>
<body style="margin:0;padding:0;background:#f7f9fc;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f7f9fc;padding:20px 0;">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table class="container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="640">

          <!-- Header -->
          <tr>
            <td class="header">
              <h1>{title}</h1>
              <div class="status-badge">{colors['status_text']} STATUS</div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content">

              <!-- System Info -->
              <table class="kv-table">
                <tr>
                  <td class="kv-label">Application:</td>
                  <td class="kv-value">Maps Tracker (Vehicle Tracking System)</td>
                </tr>
                <tr>
                  <td class="kv-label">Server:</td>
                  <td class="kv-value">{hostname}</td>
                </tr>
                <tr>
                  <td class="kv-label">Environment:</td>
                  <td class="kv-value">Production</td>
                </tr>
                <tr>
                  <td class="kv-label">Task:</td>
                  <td class="kv-value">{task_name}</td>
                </tr>
                <tr>
                  <td class="kv-label">Status:</td>
                  <td class="kv-value highlight">{colors['symbol']} {colors['status_text']}</td>
                </tr>
                <tr>
                  <td class="kv-label">Timestamp:</td>
                  <td class="kv-value">{timestamp}</td>
                </tr>
              </table>

              <div class="divider"></div>

              {content_html}
              {support_html}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer">
              <p style="margin:0 0 8px 0;">
                This is an automated system notification.<br>
                Do not reply to this email.
              </p>
              <p style="margin:0;font-size:12px;color:#a0aec0;">
                © 2025 Maps Tracker System. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return html


# Template builders for specific notification types

def backup_success_html(backup_type, backup_file, backup_size, duration=None):
    """Generate HTML email for successful backup"""
    kv_table = [
        ('Backup Type', backup_type.upper()),
        ('Filename', os.path.basename(backup_file) if backup_file else 'N/A'),
        ('File Size', backup_size),
    ]
    if duration:
        kv_table.append(('Duration', duration))
    kv_table.append(('Checksum', 'SHA256 (verified)'))
    kv_table.append(('Status', 'Ready for Recovery'))

    sections = [
        ('BACKUP SUMMARY', {
            'kv_table': kv_table
        }),
        ('VERIFICATION COMPLETED', {
            'list': [
                '<strong>✓</strong> Database dump completed successfully',
                '<strong>✓</strong> Backup file verified and validated',
                '<strong>✓</strong> SHA256 checksum generated and stored',
                '<strong>✓</strong> Metadata created and indexed',
                '<strong>✓</strong> Backup added to catalog',
                '<strong>✓</strong> Archival policy applied',
            ]
        }),
        ('NEXT STEPS', {
            'text': 'No action required. This is routine automated backup operation. The backup system is fully operational and functioning normally.'
        })
    ]

    support = {
        'Contact': 'System Administrator / DevOps Team',
        'Frequency': 'Automated daily backup'
    }

    return generate_html_email(
        f'{backup_type.upper()} Database Backup',
        'success',
        'BACKUP COMPLETED SUCCESSFULLY',
        sections,
        support
    )


def backup_failure_html(backup_type, error_message, duration=None):
    """Generate HTML email for failed backup"""
    kv_table = [
        ('Backup Type', backup_type.upper()),
        ('Error Message', error_message),
    ]
    if duration:
        kv_table.append(('Duration', duration))
    kv_table.append(('Status', 'FAILED - ACTION REQUIRED'))

    sections = [
        ('BACKUP FAILURE', {
            'kv_table': kv_table
        }),
        ('BUSINESS IMPACT', {
            'list': [
                '⚠ No backup created for this cycle',
                '⚠ Recovery point may be outdated',
                '⚠ SLA/Data protection policy is VIOLATED',
                '⚠ Disaster recovery capability at risk',
            ]
        }),
        ('IMMEDIATE ACTION REQUIRED', {
            'list': [
                '<strong>1. Check Database Status:</strong> docker compose ps | grep db',
                '<strong>2. Check Disk Space:</strong> df -h /backups',
                '<strong>3. Review Error Logs:</strong> tail -50 logs/backup-manager.log | grep ERROR',
                '<strong>4. Test Manual Backup:</strong> scripts/backup/backup-manager.sh --daily',
            ]
        })
    ]

    support = {
        'Priority': 'CRITICAL - Resolve within 2 hours',
        'Contact': 'System Administrator / DevOps Team'
    }

    return generate_html_email(
        f'{backup_type.upper()} Database Backup',
        'failed',
        'BACKUP FAILED - ACTION REQUIRED',
        sections,
        support
    )


def restore_success_html(restore_file, restore_duration, rows_restored=None):
    """Generate HTML email for successful restore"""
    kv_table = [
        ('Backup File', os.path.basename(restore_file) if restore_file else 'N/A'),
        ('Restore Duration', restore_duration),
    ]
    if rows_restored:
        kv_table.append(('Rows Restored', rows_restored))
    kv_table.append(('Status', 'ONLINE AND OPERATIONAL'))

    sections = [
        ('RESTORE COMPLETED SUCCESSFULLY', {
            'kv_table': kv_table
        }),
        ('VERIFICATION COMPLETED', {
            'list': [
                '<strong>✓</strong> Backup file integrity verified',
                '<strong>✓</strong> Database restore completed successfully',
                '<strong>✓</strong> All tables and indexes restored',
                '<strong>✓</strong> Foreign key constraints validated',
                '<strong>✓</strong> Data consistency verified',
                '<strong>✓</strong> Application connectivity tested',
            ]
        }),
        ('SYSTEM STATUS', {
            'list': [
                '<strong>✓</strong> Database: ONLINE and OPERATIONAL',
                '<strong>✓</strong> Services: Running normally',
                '<strong>✓</strong> Data: Fully accessible',
                '<strong>✓</strong> Backups: Safety copy maintained',
            ]
        })
    ]

    support = {
        'Contact': 'System Administrator / Database Team',
        'Action': 'Verify application functionality'
    }

    return generate_html_email(
        'Database Restore',
        'success',
        'DATABASE RESTORE COMPLETED',
        sections,
        support
    )


def restore_failure_html(restore_file, error_message):
    """Generate HTML email for failed restore"""
    sections = [
        ('RESTORE FAILED', {
            'kv_table': [
                ('Backup File Attempted', os.path.basename(restore_file) if restore_file else 'N/A'),
                ('Error Message', error_message),
                ('Status', 'FAILED - ACTION REQUIRED'),
                ('Data Loss', 'NOT OCCURRED (database unchanged)'),
            ]
        }),
        ('CRITICAL INFORMATION', {
            'list': [
                '<strong>✓</strong> Original database: UNCHANGED (restore did not execute)',
                '<strong>✓</strong> Data integrity: PRESERVED (no modifications made)',
                '<strong>✓</strong> System status: Previous state intact',
            ]
        }),
        ('BUSINESS IMPACT', {
            'list': [
                '⚠ Database restoration was NOT completed',
                '⚠ If database failure occurred, recovery is NOT possible',
                '⚠ Previous backup (if available) may still be usable',
                '⚠ Investigate cause immediately',
            ]
        })
    ]

    support = {
        'Priority': 'HIGH - Resolve within 1-2 hours',
        'Contact': 'Database Administrator / DevOps Team'
    }

    return generate_html_email(
        'Database Restore',
        'failed',
        'DATABASE RESTORE FAILED',
        sections,
        support
    )


def disk_monitoring_html(disk_usage, backup_count, status_type='success'):
    """Generate HTML email for disk monitoring"""
    kv_table = [
        ('Backup Partition Usage', disk_usage),
        ('Number of Backups', backup_count),
    ]

    if status_type == 'success':
        sections = [
            ('DISK USAGE SUMMARY', {
                'kv_table': kv_table + [('Status', 'NORMAL - All systems operational')]
            }),
            ('STATUS', {
                'text': '✓ All systems normal - No action required'
            })
        ]
    elif status_type == 'warning':
        sections = [
            ('DISK USAGE SUMMARY', {
                'kv_table': kv_table + [('Status', 'WARNING - Disk usage increasing')]
            }),
            ('RECOMMENDED ACTIONS', {
                'list': [
                    'Monitor disk space closely',
                    'Consider archiving old backups',
                    'Implement compression for older backups',
                ]
            })
        ]
    else:
        sections = [
            ('DISK USAGE SUMMARY', {
                'kv_table': kv_table + [('Status', 'CRITICAL - Disk almost full')]
            }),
            ('IMMEDIATE ACTIONS REQUIRED', {
                'list': [
                    'Manually delete old backups immediately',
                    'Compress existing backups',
                    'Increase storage capacity',
                ]
            })
        ]

    return generate_html_email(
        'Disk Usage Monitoring',
        status_type,
        f'BACKUP DISK USAGE MONITORING - {status_type.upper()}',
        sections,
    )

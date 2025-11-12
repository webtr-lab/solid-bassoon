#!/usr/bin/env python3
"""
Maps Tracker HTML Email Templates
Provides beautiful, professional HTML email templates with inline CSS styling
Falls back to plain text for compatibility
"""

from datetime import datetime
import socket
import os


# Company and System Information
COMPANY_NAME = "Devnan Agencies, Inc."
SYSTEM_NAME = "Maps Tracker"
SYSTEM_FULL_NAME = "Maps Tracker Vehicle Tracking System"

# Color scheme
COLOR_SUCCESS = "#28a745"  # Green
COLOR_FAILURE = "#dc3545"  # Red
COLOR_WARNING = "#ffc107"  # Amber/Yellow
COLOR_CRITICAL = "#dc3545"  # Red
COLOR_HEALTHY = "#28a745"  # Green
COLOR_PRIMARY = "#007bff"  # Blue
COLOR_LIGHT_BG = "#f8f9fa"  # Light gray background
COLOR_DARK_TEXT = "#212529"  # Dark text


def get_server_info():
    """Get server hostname and timestamp"""
    hostname = socket.gethostname()
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    return hostname, timestamp


def format_html_header(task_name, status, status_color, status_symbol):
    """
    Format HTML email header with company, system, task, and status information

    Args:
        task_name: Name of the task being executed
        status: Status text (SUCCESS, FAILED, WARNING, etc.)
        status_color: Color hex code for status (#28a745, #dc3545, etc.)
        status_symbol: Symbol to use (✓, ✗, ⚠)

    Returns:
        HTML string with formatted header
    """
    hostname, timestamp = get_server_info()

    html = f"""
    <div style="background-color: #007bff; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 28px; font-weight: bold;">📧 SYSTEM NOTIFICATION</h1>
        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">{SYSTEM_NAME}</p>
    </div>

    <div style="background-color: {COLOR_LIGHT_BG}; padding: 20px; border-left: 4px solid {status_color};">
        <table style="width: 100%; font-family: Arial, sans-serif; font-size: 14px; line-height: 1.8;">
            <tr>
                <td style="font-weight: bold; width: 150px; color: #555;">COMPANY:</td>
                <td style="color: {COLOR_DARK_TEXT};">{COMPANY_NAME}</td>
            </tr>
            <tr>
                <td style="font-weight: bold; color: #555;">SYSTEM:</td>
                <td style="color: {COLOR_DARK_TEXT};">{SYSTEM_FULL_NAME}</td>
            </tr>
            <tr>
                <td style="font-weight: bold; color: #555;">SERVER:</td>
                <td style="color: {COLOR_DARK_TEXT};">{hostname}</td>
            </tr>
            <tr>
                <td style="font-weight: bold; color: #555;">TASK:</td>
                <td style="color: {COLOR_DARK_TEXT}; font-weight: bold;">{task_name}</td>
            </tr>
            <tr>
                <td style="font-weight: bold; color: {status_color};">STATUS:</td>
                <td style="color: white; background-color: {status_color}; padding: 8px 12px; border-radius: 4px; font-weight: bold; display: inline-block;">
                    {status_symbol} {status}
                </td>
            </tr>
            <tr>
                <td style="font-weight: bold; color: #555;">TIMESTAMP:</td>
                <td style="color: {COLOR_DARK_TEXT};">{timestamp}</td>
            </tr>
        </table>
    </div>
    """
    return html


def format_html_footer():
    """Format HTML email footer"""
    html = """
    <div style="background-color: {COLOR_LIGHT_BG}; padding: 20px; border-top: 1px solid #ddd; margin-top: 20px; text-align: center; font-size: 12px; color: #666;">
        <p style="margin: 10px 0;">
            This is an automated notification from<br>
            <strong>Maps Tracker Backup & Monitoring System</strong>
        </p>
        <p style="margin: 5px 0; opacity: 0.8;">
            © 2025 Devnan Agencies, Inc. All rights reserved.
        </p>
    </div>
    """
    return html


def format_html_section(title, content_html):
    """
    Format an HTML section with title and content

    Args:
        title: Section title
        content_html: HTML content for the section

    Returns:
        HTML string with formatted section
    """
    return f"""
    <div style="margin-top: 20px; padding: 15px; background-color: #fff; border-left: 4px solid {COLOR_PRIMARY};">
        <h3 style="margin: 0 0 15px 0; color: {COLOR_DARK_TEXT}; font-size: 16px; font-weight: bold;">
            {title}
        </h3>
        <div style="color: {COLOR_DARK_TEXT}; line-height: 1.8; font-size: 14px;">
            {content_html}
        </div>
    </div>
    """


def format_html_success_email(task_name, details_html):
    """
    Format a successful operation HTML email

    Args:
        task_name: Name of the task
        details_html: HTML content with task details

    Returns:
        HTML email string
    """
    header = format_html_header(task_name, "SUCCESS", COLOR_SUCCESS, "✓")

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: Arial, sans-serif;
                background-color: #f5f5f5;
                margin: 0;
                padding: 20px;
            }}
            .email-container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            .success-badge {{
                display: inline-block;
                background-color: {COLOR_SUCCESS};
                color: white;
                padding: 4px 8px;
                border-radius: 3px;
                font-size: 12px;
                font-weight: bold;
                margin: 5px 0;
            }}
            .detail-row {{
                display: flex;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }}
            .detail-label {{
                font-weight: bold;
                color: #555;
                width: 160px;
                flex-shrink: 0;
            }}
            .detail-value {{
                color: {COLOR_DARK_TEXT};
                flex-grow: 1;
            }}
            ul {{
                margin: 10px 0;
                padding-left: 25px;
            }}
            li {{
                margin: 5px 0;
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            {header}

            <div style="padding: 30px;">
                <p style="color: {COLOR_DARK_TEXT}; font-size: 16px; margin-bottom: 20px;">
                    <strong>✓ Operation Completed Successfully</strong>
                </p>

                {details_html}
            </div>

            {format_html_footer()}
        </div>
    </body>
    </html>
    """
    return html


def format_html_failure_email(task_name, details_html):
    """
    Format a failed operation HTML email

    Args:
        task_name: Name of the task
        details_html: HTML content with task details

    Returns:
        HTML email string
    """
    header = format_html_header(task_name, "FAILED", COLOR_FAILURE, "✗")

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: Arial, sans-serif;
                background-color: #f5f5f5;
                margin: 0;
                padding: 20px;
            }}
            .email-container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(220, 53, 69, 0.2);
            }}
            .failure-badge {{
                display: inline-block;
                background-color: {COLOR_FAILURE};
                color: white;
                padding: 4px 8px;
                border-radius: 3px;
                font-size: 12px;
                font-weight: bold;
                margin: 5px 0;
            }}
            .action-box {{
                background-color: #fff3cd;
                border: 1px solid #ffc107;
                padding: 15px;
                border-radius: 4px;
                margin: 15px 0;
            }}
            .action-box h4 {{
                margin: 0 0 10px 0;
                color: #856404;
            }}
            .detail-row {{
                display: flex;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }}
            .detail-label {{
                font-weight: bold;
                color: #555;
                width: 160px;
                flex-shrink: 0;
            }}
            .detail-value {{
                color: {COLOR_DARK_TEXT};
                flex-grow: 1;
            }}
            ol {{
                margin: 10px 0;
                padding-left: 25px;
            }}
            li {{
                margin: 8px 0;
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            {header}

            <div style="padding: 30px;">
                <p style="color: {COLOR_FAILURE}; font-size: 16px; margin-bottom: 20px; font-weight: bold;">
                    ✗ OPERATION FAILED - ACTION REQUIRED
                </p>

                <div class="action-box">
                    <h4>🚨 Immediate Action Required</h4>
                    <p style="margin: 0; color: #856404;">
                        This operation encountered an error. Please review the details below and take corrective action.
                    </p>
                </div>

                {details_html}
            </div>

            {format_html_footer()}
        </div>
    </body>
    </html>
    """
    return html


def format_html_warning_email(task_name, details_html):
    """
    Format a warning/caution HTML email

    Args:
        task_name: Name of the task
        details_html: HTML content with task details

    Returns:
        HTML email string
    """
    header = format_html_header(task_name, "WARNING", COLOR_WARNING, "⚠")

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: Arial, sans-serif;
                background-color: #f5f5f5;
                margin: 0;
                padding: 20px;
            }}
            .email-container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(255, 193, 7, 0.2);
            }}
            .caution-box {{
                background-color: #fff3cd;
                border: 1px solid #ffc107;
                padding: 15px;
                border-radius: 4px;
                margin: 15px 0;
            }}
            .caution-box h4 {{
                margin: 0 0 10px 0;
                color: #856404;
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            {header}

            <div style="padding: 30px;">
                <p style="color: #856404; font-size: 16px; margin-bottom: 20px; font-weight: bold;">
                    ⚠ OPERATION COMPLETED WITH WARNINGS
                </p>

                <div class="caution-box">
                    <h4>⚡ Attention Required</h4>
                    <p style="margin: 0; color: #856404;">
                        The operation completed, but warnings were detected. Please review the details.
                    </p>
                </div>

                {details_html}
            </div>

            {format_html_footer()}
        </div>
    </body>
    </html>
    """
    return html


def format_html_critical_email(task_name, details_html):
    """
    Format a critical HTML email

    Args:
        task_name: Name of the task
        details_html: HTML content with task details

    Returns:
        HTML email string
    """
    header = format_html_header(task_name, "CRITICAL", COLOR_CRITICAL, "✗")

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body {{
                font-family: Arial, sans-serif;
                background-color: #f5f5f5;
                margin: 0;
                padding: 20px;
            }}
            .email-container {{
                max-width: 600px;
                margin: 0 auto;
                background-color: white;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
            }}
            .critical-alert {{
                background-color: #f8d7da;
                border: 2px solid {COLOR_CRITICAL};
                padding: 20px;
                border-radius: 4px;
                margin: 15px 0;
            }}
            .critical-alert h4 {{
                margin: 0 0 10px 0;
                color: #721c24;
                font-size: 16px;
            }}
            .critical-alert p {{
                margin: 8px 0;
                color: #721c24;
            }}
        </style>
    </head>
    <body>
        <div class="email-container">
            {header}

            <div style="padding: 30px;">
                <p style="color: {COLOR_CRITICAL}; font-size: 16px; margin-bottom: 20px; font-weight: bold;">
                    🚨 CRITICAL ALERT - IMMEDIATE ACTION REQUIRED
                </p>

                <div class="critical-alert">
                    <h4>⚠️ Critical Issue Detected</h4>
                    <p>
                        <strong>This is a critical alert requiring immediate attention.</strong><br>
                        Please address this issue as soon as possible to prevent system disruption.
                    </p>
                </div>

                {details_html}
            </div>

            {format_html_footer()}
        </div>
    </body>
    </html>
    """
    return html


# Example usage function for creating detail boxes
def create_detail_table_html(details_dict):
    """
    Create an HTML table from a dictionary of details

    Args:
        details_dict: Dictionary with {'label': 'value'} pairs

    Returns:
        HTML string with formatted detail table
    """
    html = '<div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px;">'
    for label, value in details_dict.items():
        html += f"""
        <div style="display: flex; padding: 8px 0; border-bottom: 1px solid #ddd;">
            <div style="font-weight: bold; color: #555; width: 160px; flex-shrink: 0;">
                {label}:
            </div>
            <div style="color: {COLOR_DARK_TEXT}; flex-grow: 1;">
                {value}
            </div>
        </div>
        """
    html += '</div>'
    return html


def create_checklist_html(items_list, style='check'):
    """
    Create an HTML checklist

    Args:
        items_list: List of items
        style: 'check' for ✓, 'bullet' for •

    Returns:
        HTML string with formatted checklist
    """
    html = '<ul style="margin: 10px 0; padding-left: 25px;">'
    for item in items_list:
        symbol = '✓' if style == 'check' else '•'
        html += f'<li style="margin: 5px 0; color: {COLOR_DARK_TEXT};">{symbol} {item}</li>'
    html += '</ul>'
    return html


def create_action_steps_html(steps_list):
    """
    Create an HTML ordered list for action steps

    Args:
        steps_list: List of action steps

    Returns:
        HTML string with formatted steps
    """
    html = '<ol style="margin: 10px 0; padding-left: 25px;">'
    for step in steps_list:
        html += f'<li style="margin: 8px 0; color: {COLOR_DARK_TEXT};">{step}</li>'
    html += '</ol>'
    return html

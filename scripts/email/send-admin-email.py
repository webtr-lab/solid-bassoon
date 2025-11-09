#!/usr/bin/env python3
"""
Helper script to send admin email notifications from Flask backend
Usage: python send-admin-email.py "subject" "message"
"""
import sys
import subprocess

def send_email(subject, message, recipient="demo@praxisnetworking.com"):
    """Send email using mail command"""
    try:
        # Prepare email with proper formatting
        email_body = f"""{message}

---
This is an automated notification from the GPS Tracker system.
Server: {subprocess.check_output(['hostname'], text=True).strip()}
Time: {subprocess.check_output(['date', '+%Y-%m-%d %H:%M:%S'], text=True).strip()}
"""
        
        # Send via mail command
        process = subprocess.Popen(
            ['mail', '-s', subject, recipient],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        stdout, stderr = process.communicate(input=email_body)
        
        if process.returncode == 0:
            print(f"Email sent successfully to {recipient}")
            return True
        else:
            print(f"Failed to send email: {stderr}")
            return False
            
    except Exception as e:
        print(f"Error sending email: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: send-admin-email.py 'subject' 'message'")
        sys.exit(1)
    
    subject = sys.argv[1]
    message = sys.argv[2]
    
    success = send_email(subject, message)
    sys.exit(0 if success else 1)

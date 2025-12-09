#!/bin/bash
#
# Test Alert Email Notifications
# Sends a test alert to Alertmanager to verify email delivery
#

set -e

echo "Testing Alertmanager Email Notifications..."
echo "============================================"
echo ""

# Send test alert to Alertmanager
curl -X POST http://localhost:9093/api/v1/alerts -H "Content-Type: application/json" -d '[
  {
    "labels": {
      "alertname": "TestAlert",
      "severity": "warning",
      "component": "test",
      "instance": "test-script"
    },
    "annotations": {
      "summary": "This is a test alert from monitoring system",
      "description": "If you receive this email, alerting is working correctly! This alert will auto-resolve in 2 minutes."
    },
    "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%S.000Z)'",
    "endsAt": "'$(date -u -d '+2 minutes' +%Y-%m-%dT%H:%M:%S.000Z)'"
  }
]'

echo ""
echo ""
echo "✓ Test alert sent to Alertmanager"
echo ""
echo "Check your email: notification@praxisnetworking.com"
echo "Subject: 🚨 ALERT: TestAlert - Maps Tracker"
echo ""
echo "If you don't receive an email within 1 minute, check:"
echo "1. Alertmanager logs: docker compose logs alertmanager | grep -i error"
echo "2. Alertmanager UI: http://localhost:9093/#/alerts"
echo "3. Prometheus alerts: http://localhost:9090/alerts"
echo ""

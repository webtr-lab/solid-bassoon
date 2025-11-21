# Monitoring and Alerts Setup Guide

This guide covers setting up comprehensive monitoring, alerting, and dashboards for the Maps Tracker application.

## Table of Contents

1. [Sentry Configuration](#sentry-configuration)
2. [Health Check Endpoints](#health-check-endpoints)
3. [Application Metrics](#application-metrics)
4. [Alert Rules](#alert-rules)
5. [Communication Integrations](#communication-integrations)
6. [Monitoring Dashboards](#monitoring-dashboards)
7. [Troubleshooting](#troubleshooting)

---

## Sentry Configuration

### Initial Setup

1. **Create Sentry Account**
   - Go to https://sentry.io
   - Sign up and create an organization

2. **Create Projects**
   - Create project for Backend (Python/Flask)
   - Create project for Frontend (React)

3. **Get DSN Values**
   - Backend: Copy the Python DSN
   - Frontend: Copy the JavaScript DSN

4. **Add to Environment**
   ```bash
   # .env
   SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxx
   APP_VERSION=1.0.0
   ```

   ```bash
   # frontend/.env
   VITE_SENTRY_DSN=https://xxxx@xxxx.ingest.sentry.io/xxxx
   ```

### Sentry Alert Rules

#### 1. Error Rate Alert

**When to alert:** Error rate > 5%

**Setup in Sentry:**
1. Go to Alerts → Create Alert
2. Set conditions:
   - `when` = Error rate
   - `is above` = 5%
   - `for` = 10 minutes
3. Add action:
   - Send to Slack/Email (see below)

#### 2. New Issue Alert

**When to alert:** New error type detected

**Setup in Sentry:**
1. Go to Alerts → Create Alert
2. Set conditions:
   - `when` = A new issue is created
3. Add action:
   - Send to Slack/Email

#### 3. Critical Exception Alert

**When to alert:** Specific exceptions occur

**Setup in Sentry:**
1. Go to Alerts → Create Alert
2. Set conditions:
   - `when` = An event occurs
   - `if` = exception equals "DatabaseError"
3. Add action:
   - Send to Slack/Email

#### 4. Release Deployment Alert

**When to alert:** Errors spike after deployment

**Setup in Sentry:**
1. Go to Alerts → Create Alert
2. Set conditions:
   - `when` = Error rate
   - `since` = Release deployment
   - `is above` = 10%
3. Add action:
   - Send to Slack/Email

---

## Health Check Endpoints

### Backend Health Check

**Endpoint:** `GET /api/health`

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-11-14T12:00:00Z",
  "uptime_seconds": 3600,
  "uptime_readable": "1h 0m",
  "database": {
    "status": "connected",
    "response_time_ms": "quick"
  },
  "vehicles": {
    "total": 5,
    "active": 3,
    "active_last_hour": 3,
    "inactive": 2
  },
  "locations": {
    "total_recorded": 1000,
    "last_hour": 45,
    "saved_stops": 120,
    "gps_submissions_total": 1000
  },
  "system": {
    "requests_total": 50000,
    "errors_total": 5,
    "error_rate": 0.01
  }
}
```

### Monitor Health Check

Use monitoring tools to check this endpoint every minute:

```bash
# Using curl with uptime robot
curl https://your-domain.com/api/health

# Check response status
echo $?  # Should be 0 if healthy
```

### Monitoring Services

**Free Options:**
- [UptimeRobot](https://uptimerobot.com/) - Monitor endpoint
- [Statuspage.io](https://www.statuspage.io/) - Status page
- [Freshping](https://www.freshworks.com/freshping/) - Uptime monitoring

**Setup with UptimeRobot:**
1. Go to https://uptimerobot.com
2. Create new monitor
3. Type: HTTP(S)
4. URL: `https://your-domain.com/api/health`
5. Interval: 5 minutes
6. Alert contacts: Email/Slack

---

## Application Metrics

### Backend Metrics Collection

The application tracks metrics automatically via `backend/app/metrics.py`:

**Available Metrics:**
- Uptime
- Request count
- Error count
- Error rate
- Vehicle count (total, active, recent)
- Location submissions
- Database health
- Connection pool stats

**Access metrics via health endpoint:**
```bash
curl https://your-domain.com/api/health
```

### Frontend Performance Metrics

React Query provides built-in performance tracking:

```javascript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

getCLS(console.log);  // Cumulative Layout Shift
getFID(console.log);  // First Input Delay
getFCP(console.log);  // First Contentful Paint
getLCP(console.log);  // Largest Contentful Paint
getTTFB(console.log); // Time to First Byte
```

**These automatically report to Sentry:**
- Core Web Vitals tracked
- Performance degradation detected
- Slow operations identified

---

## Alert Rules

### Critical Alerts (Alert Immediately)

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Database offline | Any | Page on-call |
| Error rate spike | > 10% | Slack + Email |
| API response time | > 5s | Slack |
| WebSocket disconnections | > 100/hour | Slack |
| Memory usage | > 90% | Slack + Email |

### Warning Alerts (Check within 1 hour)

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Error rate | 5-10% | Slack |
| High CPU | > 80% | Slack |
| Slow queries | > 1s | Email |
| Cache hit rate | < 50% | Slack |
| Vehicle sync issues | > 5 errors | Email |

### Info Alerts (Daily digest)

| Condition | Threshold | Action |
|-----------|-----------|--------|
| New errors | Any | Daily email |
| Performance trends | Any | Daily email |
| Deployment status | Any | Daily email |
| User activity | Any | Daily email |

---

## Communication Integrations

### 1. Slack Integration

**Step 1: Create Slack App**
1. Go to https://api.slack.com/apps
2. Click "Create New App"
3. Choose "From scratch"
4. Name: "Maps Tracker Alerts"
5. Select your workspace

**Step 2: Configure Permissions**
1. Go to OAuth & Permissions
2. Add scopes:
   - `chat:write`
   - `incoming-webhook`
3. Install app to workspace

**Step 3: Create Webhook**
1. Go to Incoming Webhooks
2. Click "Add New Webhook to Workspace"
3. Select channel: #alerts (or create it)
4. Copy Webhook URL

**Step 4: Add to Sentry**
1. In Sentry, go to Integrations
2. Search for "Slack"
3. Install integration
4. Configure channel: #alerts
5. Test alert

**Step 5: Create Slack Notification Script**

```python
# backend/app/utils/slack_notify.py
import requests
import os

def send_slack_alert(message, severity='warning'):
    """Send alert to Slack"""
    webhook_url = os.getenv('SLACK_WEBHOOK_URL')
    if not webhook_url:
        return

    color = {
        'critical': 'danger',
        'warning': 'warning',
        'info': 'good'
    }.get(severity, 'warning')

    payload = {
        'attachments': [{
            'color': color,
            'title': f'Maps Tracker Alert ({severity.upper()})',
            'text': message,
            'footer': 'Maps Tracker Monitoring',
            'ts': int(time.time())
        }]
    }

    requests.post(webhook_url, json=payload)
```

### 2. Email Alerts

**Using SMTP (Already Configured)**

Emails are sent via the existing SMTP configuration for:
- Authentication failures
- Database errors
- System alerts
- Daily digests

**Recipient Configuration:**
```bash
# .env
ALERT_EMAIL=ops@example.com
BACKUP_EMAIL=admin@example.com
```

### 3. PagerDuty Integration (Optional)

For on-call rotation:

1. Create PagerDuty account at https://www.pagerduty.com
2. In Sentry, go to Integrations → PagerDuty
3. Install and authorize
4. Configure escalation policies
5. Set alert rules to trigger PagerDuty

---

## Monitoring Dashboards

### 1. Sentry Dashboard

**What to monitor:**
- Error rate trends
- Top errors
- Release health
- Performance metrics
- User impact

**Access:** https://sentry.io/organizations/your-org/issues/

### 2. Custom Dashboard (Optional)

Create a monitoring dashboard using:

**Option A: Grafana + Prometheus**
```yaml
# Advanced but very powerful
# Requires Prometheus setup
```

**Option B: Simple HTML Dashboard**

```html
<!-- backend/app/routes/dashboard.py -->
@app.route('/api/dashboard/metrics')
@login_required
@require_admin
def get_dashboard_metrics():
    """Get dashboard metrics for admin view"""
    return jsonify({
        'health': metrics.get_health_status(),
        'alerts': get_recent_alerts(),
        'performance': get_performance_metrics(),
    })
```

Then display in admin panel or separate dashboard.

### 3. Datadog Integration (Optional)

For comprehensive monitoring:

1. Create account at https://www.datadoghq.com
2. Install Datadog agent
3. Configure integrations:
   - Flask
   - PostgreSQL
   - Sentry
4. Create dashboards
5. Configure alert policies

---

## Setting Up Alerts Step-by-Step

### Quick Setup (15 minutes)

1. **Sentry Alerts**
   ```bash
   # Get Sentry DSN
   # Add to .env
   export SENTRY_DSN="https://..."
   ```

2. **Slack Integration**
   ```bash
   # Create webhook
   # Add to .env
   export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."
   ```

3. **Email Configuration**
   ```bash
   # Already configured via SMTP
   # Ensure ALERT_EMAIL is set in .env
   export ALERT_EMAIL="ops@example.com"
   ```

4. **Uptime Monitoring**
   - Sign up at UptimeRobot
   - Add monitor for /api/health endpoint
   - Set interval to 5 minutes

### Comprehensive Setup (1 hour)

1. Complete Quick Setup above
2. Create Sentry alert rules for:
   - Error rate > 5%
   - New issues
   - Critical exceptions
3. Configure Slack channels:
   - #alerts-critical
   - #alerts-warnings
   - #alerts-info
4. Set up dashboard:
   - Create monitoring page
   - Add key metrics
   - Link to dashboards
5. Test alerts:
   - Trigger test error
   - Verify Slack notification
   - Verify email

---

## Monitoring Best Practices

### 1. Alert Fatigue Prevention

✅ **DO:**
- Create meaningful thresholds
- Avoid low-priority alerts
- Group related alerts
- Set escalation policies

❌ **DON'T:**
- Alert on every error
- Send duplicate alerts
- Set thresholds too low
- Ignore alert feedback

### 2. Response Time Targets

| Alert Level | Response Time |
|-------------|---------------|
| Critical | 5 minutes |
| High | 15 minutes |
| Medium | 1 hour |
| Low | Next business day |

### 3. Runbook Creation

Create runbooks for common alerts:

```markdown
## Database Connection Error

**Severity:** Critical

**Symptoms:**
- Health check endpoint returns 500
- API requests timing out

**Troubleshooting:**
1. Check database connection string
2. Verify database is running: `psql -c "SELECT 1"`
3. Check connection pool: `SELECT * FROM pg_stat_connections`
4. Restart database if needed

**Resolution:**
- If issue persists > 5 min, contact DBA
- Page on-call for immediate response
```

### 4. Regular Review

**Weekly:**
- Review alert trends
- Check false positive rate
- Adjust thresholds if needed

**Monthly:**
- Analyze incident response times
- Update runbooks
- Review on-call schedule

---

## Troubleshooting

### Alerts Not Triggering

**Check:**
1. Alert rule is enabled in Sentry
2. Condition thresholds are appropriate
3. Communication channel is configured
4. Test alert manually

**Fix:**
```bash
# Trigger test error
curl -X POST http://localhost:5000/api/test-error

# Check Sentry dashboard for event
# Verify Slack/email received
```

### Too Many Alerts

**Solutions:**
1. Increase alert thresholds
2. Add filters to alert rules
3. Use alert suppression for known issues
4. Set up escalation policy

### Slack Integration Not Working

**Check:**
1. Webhook URL is valid
2. Slack app has permissions
3. Channel exists
4. Test webhook:
   ```bash
   curl -X POST \
     -H 'Content-type: application/json' \
     --data '{"text":"Test alert"}' \
     YOUR_WEBHOOK_URL
   ```

### Email Not Sending

**Check:**
1. SMTP configuration in .env
2. Email recipient is valid
3. Check email logs:
   ```bash
   grep -i "email\|smtp" logs/app.log
   ```
4. Test manually:
   ```python
   from app.utils.email import send_alert_email
   send_alert_email("ops@example.com", "Test Alert")
   ```

---

## Recommended Monitoring Stack

### Essential
- ✅ **Sentry** - Error tracking (IMPLEMENTED)
- ✅ **Slack** - Notifications
- ✅ **UptimeRobot** - Uptime monitoring

### Recommended
- **Datadog** - APM & Infrastructure
- **PagerDuty** - On-call management
- **Grafana** - Dashboards

### Optional
- **New Relic** - Application Performance
- **Prometheus** - Metrics collection
- **ELK Stack** - Log aggregation

---

## Example Alert Scenarios

### Scenario 1: Database Error Spike

**Alert:** Error rate > 10% for 5 minutes

**Response:**
1. Check Sentry for error pattern
2. Review recent deployments
3. Check database logs
4. Rollback if needed
5. Post-incident review

### Scenario 2: GPS Data Not Arriving

**Alert:** GPS submissions = 0 for 10 minutes

**Response:**
1. Check mobile app status
2. Verify WebSocket connections
3. Check rate limiting rules
4. Review network connectivity
5. Contact field teams if needed

### Scenario 3: Memory Leak

**Alert:** Memory usage > 90%

**Response:**
1. Check running processes
2. Review recent code changes
3. Check for resource leaks
4. Restart service if needed
5. Investigate root cause

---

## Resources

- [Sentry Alerts Documentation](https://docs.sentry.io/product/alerts/)
- [UptimeRobot](https://uptimerobot.com/)
- [Slack API](https://api.slack.com/)
- [Monitoring Best Practices](https://en.wikipedia.org/wiki/Site_reliability_engineering)

---

## Next Steps

1. **Implement Sentry Alerts** (15 min)
   - Create alert rules
   - Add Slack integration
   - Test alerts

2. **Set Up Uptime Monitoring** (10 min)
   - Configure UptimeRobot
   - Add to status page

3. **Create Runbooks** (30 min)
   - Document common issues
   - Define response procedures
   - Share with team

4. **Schedule Review** (ongoing)
   - Weekly: Check alert trends
   - Monthly: Adjust thresholds
   - Quarterly: Training update

---

**Last Updated:** November 14, 2024
**Status:** Ready for implementation

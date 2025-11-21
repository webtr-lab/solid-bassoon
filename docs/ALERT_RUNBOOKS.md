# Alert Runbooks

Quick reference guides for responding to alerts. Keep this accessible to your on-call team.

---

## Table of Contents

1. [Database Issues](#database-issues)
2. [GPS Data Issues](#gps-data-issues)
3. [API Performance](#api-performance)
4. [WebSocket Issues](#websocket-issues)
5. [Memory/CPU Issues](#memorycpu-issues)
6. [Security/Rate Limiting](#securityrate-limiting)

---

## Database Issues

### Alert: Database Connection Error

**Severity:** 🔴 Critical

**When to trigger:**
- Health check returns 500 status
- Cannot connect to PostgreSQL
- Connection pool exhausted

**Symptoms:**
- API requests timeout
- /api/health returns error
- Log shows "connection refused"

**Step 1: Verify Database Status (2 min)**
```bash
# SSH into server
ssh user@your-server.com

# Check if PostgreSQL is running
sudo systemctl status postgresql

# Try direct connection
psql -U mapsadmin -d maps_tracker -c "SELECT 1"
```

**Step 2: Check Logs (5 min)**
```bash
# Backend logs
tail -100 logs/app.log | grep -i "error\|database"

# PostgreSQL logs
sudo tail -100 /var/log/postgresql/*.log
```

**Step 3: Restart if Needed (5 min)**
```bash
# Restart PostgreSQL
sudo systemctl restart postgresql

# Restart backend
sudo systemctl restart maps-tracker-backend

# Verify health
curl http://localhost:5000/api/health
```

**Step 4: Escalation (if not resolved)**
- Page DBA on-call
- Check PostgreSQL replication status
- Review backup for recovery

**Recovery Time Target:** 15 minutes

**Post-incident:**
- Review logs for root cause
- Check for connection leaks
- Schedule capacity review if pool exhausted

---

### Alert: Database Performance Degraded

**Severity:** 🟡 High

**When to trigger:**
- Database query > 5 seconds
- CPU usage > 80%
- Disk usage > 90%

**Symptoms:**
- API endpoints slow (>1s response time)
- Timeout errors in logs
- High CPU usage on database server

**Step 1: Check Current Queries (3 min)**
```bash
# List long-running queries
psql -c "SELECT pid, usename, query_start, query FROM pg_stat_activity WHERE query_start < NOW() - INTERVAL '1 minute';"

# Kill slow query if needed
psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE query_start < NOW() - INTERVAL '5 minutes';"
```

**Step 2: Check Disk Space (2 min)**
```bash
# Check disk usage
df -h

# Check table sizes
psql -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) FROM pg_tables WHERE schemaname != 'pg_catalog' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

**Step 3: Optimize if Needed (5-10 min)**
```bash
# Run ANALYZE if statistics stale
psql -c "ANALYZE;"

# Reindex if indexes corrupted
psql -c "REINDEX DATABASE maps_tracker;"
```

**Step 4: Monitor (10 min)**
- Watch API response times recover
- Check /api/health/detailed endpoint
- Monitor CPU/memory usage

**Recovery Time Target:** 20 minutes

---

## GPS Data Issues

### Alert: GPS Data Not Arriving

**Severity:** 🔴 Critical

**When to trigger:**
- GPS submissions = 0 for 10+ minutes
- Health check shows 0 locations in last hour
- No new locations in database

**Symptoms:**
- Mobile apps can't send data
- Map shows stale locations
- No new stops detected

**Step 1: Check Services (3 min)**
```bash
# Verify backend is running
curl http://localhost:5000/api/health

# Check WebSocket connections
curl http://localhost:5000/api/health/detailed | grep -A 5 "locations"

# Check for errors in logs
grep "api/gps\|GPS" logs/app.log | tail -20
```

**Step 2: Check Mobile App Status (5 min)**
- Message field teams: "Are devices sending data?"
- Ask: "Is app running? Is location service enabled?"
- Check: "Any error messages in app?"

**Step 3: Verify Network (5 min)**
```bash
# Check if endpoint is reachable
curl -v http://your-domain.com/api/gps

# Test from device
# (Have team send test data)
```

**Step 4: Check Rate Limiting (2 min)**
```bash
# Review recent requests
grep "api/gps" logs/access.log | tail -5

# Check if rate-limited
grep "429" logs/access.log | wc -l
```

**Step 5: Escalation**
- If network unreachable: Contact IT
- If mobile app error: Check app logs
- If persistent: Investigate rate limiter rules

**Recovery Time Target:** 15-20 minutes

---

### Alert: Duplicate GPS Submissions

**Severity:** 🟡 Medium

**When to trigger:**
- Same location recorded multiple times
- Multiple identical timestamps
- Database shows duplicates

**Step 1: Check Recent Submissions**
```bash
# Find duplicates
psql -c "SELECT device_id, latitude, longitude, timestamp, COUNT(*) as count FROM locations WHERE timestamp > NOW() - INTERVAL '1 hour' GROUP BY device_id, latitude, longitude, timestamp HAVING COUNT(*) > 1;"
```

**Step 2: Identify Source**
- Check if mobile app has retry logic
- Review WebSocket connection status
- Check rate limiter logs

**Step 3: Resolution**
- If app bug: Notify development team
- If network issue: May self-resolve
- If persistent: Consider deduplication logic

---

## API Performance

### Alert: High Response Time

**Severity:** 🟡 High

**When to trigger:**
- API response time > 1 second
- Error rate > 5%
- Requests timing out

**Symptoms:**
- UI is sluggish
- Map updates slow
- Users report timeout errors

**Step 1: Check System Load (3 min)**
```bash
# CPU usage
top -b -n 1 | head -20

# Memory usage
free -h

# Disk I/O
iostat -x 1 3
```

**Step 2: Identify Slow Endpoints (5 min)**
```bash
# Find slow endpoints in logs
grep "Duration:" logs/access.log | sort -t':' -k2 -nr | head -10
```

**Step 3: Check Database (5 min)**
```bash
# See current queries
psql -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 5;"
```

**Step 4: Restart if Needed (5 min)**
```bash
# Graceful restart
sudo systemctl restart maps-tracker-backend

# Verify health
curl http://localhost:5000/api/health/detailed
```

**Recovery Time Target:** 15 minutes

---

## WebSocket Issues

### Alert: WebSocket Disconnections > 100/hour

**Severity:** 🟡 High

**When to trigger:**
- Real-time updates failing
- Users report losing connection
- Connection error rate high

**Symptoms:**
- Map markers stop updating
- Must manually refresh to see new data
- Users see "reconnecting..." messages

**Step 1: Check WebSocket Service (2 min)**
```bash
# Verify SocketIO is running
ps aux | grep socketio

# Check WebSocket logs
grep "websocket\|socket" logs/app.log | tail -20
```

**Step 2: Check Connection Pool (3 min)**
```bash
# WebSocket connections status
curl http://localhost:5000/api/health/detailed | grep -A 5 "connection"
```

**Step 3: Analyze Errors (5 min)**
```bash
# Get disconnect reasons
grep "disconnect\|client_disconnect" logs/app.log | tail -10
```

**Step 4: Check Network Issues**
- Verify network stability
- Check for DNS issues
- Verify SSL/TLS certificates

**Step 5: Restart SocketIO**
```bash
# Restart backend (includes SocketIO)
sudo systemctl restart maps-tracker-backend

# Monitor connections
watch -n 2 "curl -s http://localhost:5000/api/health/detailed"
```

**Recovery Time Target:** 10 minutes

---

## Memory/CPU Issues

### Alert: Memory Usage > 90%

**Severity:** 🔴 Critical

**When to trigger:**
- Free memory < 10%
- Swap usage active
- OOM killer warnings in logs

**Symptoms:**
- System slow
- Applications crash
- "Cannot allocate memory" errors

**Step 1: Check Memory Usage (2 min)**
```bash
# Detailed memory info
free -h && echo && top -b -n 1 | head -15
```

**Step 2: Find Memory Hogs (3 min)**
```bash
# Find top memory consumers
ps aux --sort=-%mem | head -10
```

**Step 3: Identify Leaks (5 min)**
```bash
# Check for memory leaks in app
grep "MemoryError\|memory\|leak" logs/app.log | tail -20

# Check Sentry for memory warnings
```

**Step 4: Restart Services (5 min)**
```bash
# Restart backend
sudo systemctl restart maps-tracker-backend

# Monitor memory
watch -n 2 free -h
```

**Step 5: Escalation**
- If no improvement: Investigate memory leak
- Page development team if code issue
- Consider horizontal scaling if load-related

**Recovery Time Target:** 15 minutes

---

### Alert: CPU Usage > 80%

**Severity:** 🟡 High

**When to trigger:**
- CPU consistently > 80%
- Load average > number of cores
- Processes context-switching heavily

**Symptoms:**
- Server feels slow
- Response times increase
- Fan noise increases

**Step 1: Identify CPU Hog (3 min)**
```bash
# Top CPU consumers
ps aux --sort=-%cpu | head -10

# Check which process
top -b -n 1 -p $(pgrep -f flask)
```

**Step 2: Check for Runaway Processes (3 min)**
```bash
# Find long-running processes
ps aux | grep -v COMMAND | awk '{print $10, $11}' | sort | uniq -c | sort -rn
```

**Step 3: Kill if Necessary (2 min)**
```bash
# Kill runaway process if safe
kill -9 <PID>

# Restart service
sudo systemctl restart maps-tracker-backend
```

**Recovery Time Target:** 10 minutes

---

## Security/Rate Limiting

### Alert: Login Attempts Spike

**Severity:** 🟡 High

**When to trigger:**
- Login failures > 50/minute
- Single IP > 20 failed attempts
- Brute force attempt detected

**Symptoms:**
- Legitimate users rate-limited
- Suspicious IP in logs
- Many 429 responses

**Step 1: Check Logs (2 min)**
```bash
# Find failed logins
grep "Invalid username\|Invalid credentials\|429" logs/access.log | tail -20

# Count by IP
grep "429" logs/access.log | awk '{print $1}' | sort | uniq -c | sort -rn
```

**Step 2: Identify Attack (3 min)**
```bash
# Is it coordinated?
grep -c "429" logs/access.log
grep "^<IP>" logs/access.log | wc -l

# Check if legitimate users affected
grep "POST.*login" logs/access.log | grep $IP_ADDRESS
```

**Step 3: Mitigation (5 min)**
```bash
# Temporarily block IP (if warranted)
sudo ufw insert 1 deny from <ATTACK_IP>

# Or increase rate limit temporarily
# (Update rate_limiter config)

# Notify users if affected
```

**Step 4: Monitor (10 min)**
- Watch for additional attempts
- Track if attack stops
- Check for other suspicious activity

**Step 5: Post-incident**
- Review attack patterns
- Update security rules
- Consider WAF/DDoS protection

**Recovery Time Target:** 10-15 minutes

---

## Generic Troubleshooting

### When All Else Fails

**Step 1: Check Service Status**
```bash
# All services
sudo systemctl status | grep maps

# Backend
sudo systemctl status maps-tracker-backend

# Frontend (if applicable)
sudo systemctl status maps-tracker-frontend
```

**Step 2: Review Recent Changes**
```bash
# What was deployed recently?
git log --oneline -10

# What changed in config?
git diff HEAD~1 .env
```

**Step 3: Check Logs Comprehensively**
```bash
# Last 100 errors
grep "ERROR\|error\|Exception" logs/app.log | tail -100

# Last 100 lines
tail -100 logs/app.log
```

**Step 4: Safe Restart**
```bash
# Graceful stop and start
sudo systemctl stop maps-tracker-backend
sleep 5
sudo systemctl start maps-tracker-backend

# Verify
curl http://localhost:5000/api/health
```

**Step 5: Escalation Decision**
- If fixed: Document what worked
- If not: Escalate to development team with logs
- Page on-call for expert assistance

---

## Quick Reference

### Critical Alerts (Respond in < 5 min)
- Database offline
- GPS data not arriving
- API down (all endpoints failing)
- WebSocket failures for all users

### High Alerts (Respond in < 15 min)
- High response time
- Memory > 90%
- CPU > 80%
- Brute force attack

### Medium Alerts (Respond in < 1 hour)
- Error rate 5-10%
- Database performance slow
- Duplicate data

### Low Alerts (Next business day)
- Low error rates
- Performance warnings
- Diagnostic information

---

## Escalation Path

**Level 1: On-Call Engineer**
- Follows runbook
- Attempts fixes from runbook
- Gathers information for escalation

**Level 2: Senior Engineer**
- Complex troubleshooting
- Code-level debugging
- Architecture review

**Level 3: Lead/Manager**
- Decision authority
- Customer communication
- Post-incident review

**Page (Escalate) When:**
- Can't resolve in 10 minutes
- Requires database expertise
- Affects customers
- Security incident
- Requires code changes

---

## Important Numbers

- **Critical Response Time:** 5 minutes
- **Critical Resolution Time:** 30 minutes
- **Max Database Query Time:** 5 seconds
- **Max API Response Time:** 1 second
- **Max Memory Usage:** 90%
- **Max CPU Usage:** 80%
- **Max Error Rate:** 10%

---

**Last Updated:** November 14, 2024
**Version:** 1.0
**Next Review:** Monthly

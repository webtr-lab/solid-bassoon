# CODEBASE.md — maps-tracker-app1
**Last updated:** 2026-04-02 by Snuzzle  
**Branch:** `pivot-to-stores` (only branch in use)  
**VPS:** 192.3.117.83 | user: devnan  
**Stack:** Flask + PostgreSQL + Redis + Nginx + Docker Compose

---

## ⚠️ Current State Warning

**40+ files modified but NOT committed.** Before making any changes, commit or stash current state first:
```bash
cd ~/maps-tracker-app1
git add -A && git commit -m "snapshot: pre-cleanup state $(date +%Y%m%d)"
```

---

## Architecture

```
docker-compose services:
  maps_backend    Flask API (port 5000, public) ← SHOULD be 127.0.0.1 only
  maps_frontend   Nginx + React (ports 80/443)
  maps_db         PostgreSQL (internal only)
  maps_redis      Redis (127.0.0.1:6379)
  maps_nominatim  OpenStreetMap geocoding (port 8081)
  maps_grafana    Grafana dashboards (127.0.0.1:3001)
  maps_prometheus Prometheus metrics (127.0.0.1:9090)
  maps_alertmanager Alerting (127.0.0.1:9093)
  maps_mobile     Nginx mobile interface (ports 8080/8443)
```

---

## Backend File Map (`backend/app/`)

### ✅ ACTIVE — core app wiring
| File | Purpose | Notes |
|------|---------|-------|
| `main.py` | App factory, blueprint registration, APScheduler | Gunicorn fixed 2026-04-02 |
| `config.py` | Env-based config | SESSION_COOKIE_SECURE defaults false — needs fix |
| `models.py` | DB models: User, Vehicle, Location, SavedLocation, PlaceOfInterest, AuditLog, PasswordResetToken | Clean, well-indexed |
| `security.py` | RBAC decorators, input validators, RateLimiter class, login_rate_limiter | Has duplicate rate limiting issue (see bugs) |
| `limiter.py` | Flask-Limiter init | Conflicts with login_rate_limiter in security.py on login route |
| `csrf_protection.py` | CSRF token init | Working |
| `logging_config.py` | Structured logging setup | Working |
| `sentry_config.py` | Sentry error monitoring init | Configured but SENTRY_DSN is blank — not active |

### ✅ ACTIVE — routes (all registered in main.py)
| File | Prefix | Key endpoints |
|------|--------|--------------|
| `routes/health.py` | `/api` | GET /health, /health/detailed, /health/ready, /health/live, /time |
| `routes/auth.py` | `/api/auth` | login, logout, register, check, change-password, forgot/reset-password |
| `routes/locations.py` | `/api` | POST /gps (vehicle GPS submission) |
| `routes/vehicles.py` | `/api/vehicles` | Full CRUD + history, stats, export, saved-locations |
| `routes/places.py` | `/api/places` | Full CRUD + areas, visits |
| `routes/reports.py` | `/api/reports` | visits, check-ins, visits-detailed |
| `routes/users.py` | `/api/users` | CRUD (admin only) |
| `routes/backups.py` | `/api/backups` | list, create, restore, download, delete, verify |
| `routes/geocoding.py` | `/api` | /geocode, /reverse-geocode |
| `routes/data_retention.py` | `/api/retention` | stats, cleanup preview/execute |

### ✅ ACTIVE — services
| File | Purpose | Notes |
|------|---------|-------|
| `services/backup_service.py` | DB backup/restore via pg_dump | **BROKEN**: script path wrong (see bugs) |
| `services/data_retention_service.py` | Scheduled data cleanup | Working, runs daily 3 AM |
| `services/email_service.py` | Flask-Mail init + send helpers | Working |
| `services/geocoding_service.py` | Nominatim geocoding wrapper | Working |
| `services/location_service.py` | GPS data processing | Working |
| `services/place_service.py` | Place of interest logic | Working |
| `services/user_service.py` | User management logic | Working |
| `services/vehicle_service.py` | Vehicle management logic | Working |
| `services/secret_manager.py` | Secret file management | Working |

### ✅ ACTIVE — monitoring
| File | Purpose | Notes |
|------|---------|-------|
| `monitoring.py` | Prometheus metrics — THE real metrics file | All record_* functions used here |

### 🔴 DEAD — never imported, never runs
| File | What it is | Safe to delete? |
|------|-----------|----------------|
| `metrics.py` | Old in-memory Metrics class, duplicates monitoring.py | **YES** |
| `cache.py` | Redis caching layer with decorators | **YES** — but consider wiring in (Redis is running unused) |
| `performance.py` | SQL profiling, PerformanceAnalyzer, query optimizers | **YES** |
| `websocket_events.py` | SocketIO event handlers | **YES** — flask-socketio not in requirements.txt |

---

## Known Bugs (priority order)

### 🔴 P1 — Backup never runs
- **File:** `backend/app/services/backup_service.py`, function `automatic_backup()`
- **Problem:** Script path resolves to `/app/app/backup-manager.sh` — doesn't exist
- **Actual path:** `/app/scripts/backup/backup-manager.sh`
- **Fix:** Replace path calculation with hardcoded `/app/scripts/backup/backup-manager.sh`
- **Impact:** No DB backups have EVER been created. 2 AM emails are from monitor script, not real backups.

### 🔴 P1 — Uncommitted changes
- **Problem:** 40+ modified files never committed. No rollback point if something breaks.
- **Fix:** `git add -A && git commit -m "snapshot: pre-cleanup state"`

### 🟡 P2 — Double rate limiting on login
- **Files:** `routes/auth.py`, `security.py`, `limiter.py`
- **Problem:** Login route hits Flask-Limiter (`@limiter.limit("5 per hour")`) AND `login_rate_limiter.is_rate_limited()` (in-memory, 5 per 15min). Independent counters, no coordination.
- **Fix:** Remove `login_rate_limiter` from security.py login logic, rely solely on Flask-Limiter. Or keep both but wire Flask-Limiter to Redis for persistence.

### 🟡 P2 — SESSION_COOKIE_SECURE not enabled
- **File:** `.env`
- **Problem:** `SESSION_COOKIE_SECURE` not set → defaults to `false`, even though FLASK_ENV=production and site runs HTTPS
- **Fix:** Add `SESSION_COOKIE_SECURE=true` to `.env`

### 🟡 P2 — Port 5000 publicly exposed
- **File:** `docker-compose.yml`
- **Problem:** `"0.0.0.0:5000:5000"` — API bypasses Nginx, accessible directly from internet
- **Fix:** Change to `"127.0.0.1:5000:5000"`

### 🟡 P2 — backup-monitor.sh DB activity always shows 0
- **File:** `scripts/monitoring/backup-monitor.sh`, function `get_database_activity()`
- **Problem:** Falls back to SQLite query which always fails; Postgres query path has issues
- **Fix:** Remove SQLite fallback, fix Postgres docker exec query

### 🟠 P3 — Dead code (800 lines)
- Delete: `metrics.py`, `performance.py`, `websocket_events.py`
- Evaluate: `cache.py` — Redis is running, could be wired in for real benefit

### 🟠 P3 — Missing Postgres/Redis exporters
- **Problem:** Prometheus only scrapes Flask. DB/Redis health invisible to alerting.
- **Fix:** Add `postgres_exporter` and `redis_exporter` to docker-compose

### 🟠 P3 — Default passwords in .env
- `ADMIN_PASSWORD=admin123` — change to something real
- `GRAFANA_ADMIN_PASSWORD=CHANGE_THIS_GRAFANA_PASSWORD` — change

### 🟠 P3 — Sentry not active
- **File:** `.env`
- `SENTRY_DSN=` is blank. App won't report errors to Sentry.
- **Fix:** Create free Sentry project, paste DSN

---

## Recommended Fix Order

```
1. git commit current state (snapshot)
2. Fix backup path bug (P1) → test a real backup runs
3. Fix SESSION_COOKIE_SECURE + port 5000 (P2, .env + compose changes)
4. Fix backup-monitor DB activity (P2)
5. Remove double rate limiter (P2)
6. Delete dead files: metrics.py, performance.py, websocket_events.py (P3)
7. Add postgres/redis exporters (P3)
8. Fix default passwords (P3)
```

Each step = one commit. Never batch multiple fixes into one commit.

---

## Data Model (quick ref)

- **User** — auth, roles: admin / manager / operator / viewer
- **Vehicle** — has api_token for GPS auth, entity_type: 'vehicle' or 'sales_rep'
- **Location** — raw GPS points (vehicle_id, lat, lng, speed, timestamp)
- **SavedLocation** — detected stops/visits (links vehicle + place + user)
- **PlaceOfInterest** — locations of interest with area/category
- **AuditLog** — immutable security event log
- **PasswordResetToken** — time-limited reset tokens (1hr expiry)

---

## Cron Jobs (host level, devnan user)

| Schedule | Script | Purpose |
|----------|--------|---------|
| `*/10 * * * *` | `scripts/monitoring/system-monitor.sh` | System metrics |
| `0 2 * * *` | `scripts/monitoring/backup-monitor.sh` | Daily status email (NOT real backup) |
| `0 1 1 * *` | `scripts/backup/monthly-backup-integrity-check.sh` | Monthly check |
| `0 3 1 1,4,7,10 *` | `scripts/backup/quarterly-remote-restore-test.sh` | Quarterly restore test |

Real backups are triggered by APScheduler inside Flask at 2 AM — but broken (see P1 bug).

---

## Notes for Future Sessions

- Always SSH as `devnan@192.3.117.83`
- App lives at `~/maps-tracker-app1`
- Docker commands: `docker compose` (not `docker-compose`)
- Backup box: `demo@10.2.210.10` (LAN only, VPS can't reach it directly)
- Manual backup taken: `~/backups/maps-tracker-app1-backup-20260402-221719.tar.gz` on 10.2.210.10
- Gunicorn fix already applied (2026-04-02), rollback tag: `maps-tracker-app1-backend:pre-gunicorn`

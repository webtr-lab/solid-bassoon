# Rollback Instructions - Restore Vehicle Tracking App

**Created:** 2025-12-07
**Purpose:** Restore app to pre-pivot state (vehicle tracking focus)

---

## Quick Rollback (Code Only)

If you need to restore the vehicle tracking version of the app:

```bash
# Option 1: Using git tag (RECOMMENDED)
git checkout pre-pivot-vehicle-tracking

# Option 2: Using commit hash
git checkout eea1f55

# Option 3: Create new branch from rollback point
git checkout -b restore-vehicle-tracking pre-pivot-vehicle-tracking
```

---

## Full Rollback (Code + Database)

### Step 1: Restore Code
```bash
cd /home/devnan/maps-tracker-app1
git checkout pre-pivot-vehicle-tracking
```

### Step 2: Restore Services
```bash
# Rebuild containers with pre-pivot code
docker compose down
docker compose up -d --build

# Verify services running
docker compose ps
```

### Step 3: Verify Application
```bash
# Check backend
curl http://localhost:5000/api/health

# Check frontend
curl http://localhost:3000

# Check mobile
curl http://localhost:8080
```

---

## What Gets Restored

### ✅ Code & Features:
- Real-time vehicle tracking
- GPS data logging every 10 seconds
- Vehicle list with current positions
- Historical track playback
- Vehicle management (CRUD)
- Location history API
- Admin panel

### ✅ Frontend:
- Map-focused on vehicle positions
- Vehicle markers update every 5 seconds
- Historical track polylines
- Vehicle stats (distance, speed)

### ✅ Mobile Interface:
- Continuous GPS tracking
- Vehicle selection dropdown
- Automatic location submission

### ⚠️ Database:
- Data created during pivot will remain
- PlaceOfInterest records will still exist
- No data loss, just UI/focus changes

---

## Verification Checklist

After rollback, verify these features work:

```bash
# 1. Login works
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}'

# 2. Vehicles list works
curl http://localhost:5000/api/vehicles

# 3. GPS endpoint works
curl -X POST http://localhost:5000/api/gps \
  -H "Content-Type: application/json" \
  -d '{"device_id":"vehicle_1","latitude":5.85,"longitude":-55.20,"speed":0}'

# 4. Frontend loads
# Open browser: http://localhost:3000
# Should see vehicle tracking interface

# 5. Mobile interface loads
# Open browser: http://localhost:8080
# Should see GPS tracking interface
```

---

## Comparison: Before vs After Pivot

### Pre-Pivot (Vehicle Tracking) ← This rollback restores:
```
Default View:     Real-time vehicle map
Primary Feature:  Track vehicle movements
Mobile Use:       Continuous GPS logging
Data Model:       Vehicle → Locations (time series)
Update Frequency: Every 5-10 seconds
Complexity:       Moderate (real-time tracking)
```

### Post-Pivot (Store Locations) ← Current/future state:
```
Default View:     Store location map
Primary Feature:  Map of customer stores
Mobile Use:       Manual pin locations
Data Model:       PlaceOfInterest (static pins)
Update Frequency: Manual only
Complexity:       Simple (static pins)
```

---

## Rollback Branches

We have these git references for rollback:

| Reference | Type | Description |
|-----------|------|-------------|
| `pre-pivot-vehicle-tracking` | Tag | Exact rollback point |
| `eea1f55` | Commit | Snapshot commit hash |
| `development` | Branch | Contains pivot changes (after merge) |
| `pivot-to-stores` | Branch | Pivot work in progress |

---

## Emergency Rollback Script

Save this as `emergency-rollback.sh`:

```bash
#!/bin/bash
# Emergency rollback to vehicle tracking app

echo "🚨 EMERGENCY ROLLBACK TO VEHICLE TRACKING APP"
echo "=============================================="
echo ""
echo "This will:"
echo "  1. Restore code to pre-pivot state"
echo "  2. Rebuild Docker containers"
echo "  3. Restart all services"
echo ""
read -p "Continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Rollback cancelled"
    exit 1
fi

# Stop services
echo "Stopping services..."
docker compose down

# Restore code
echo "Restoring code to pre-pivot state..."
git checkout pre-pivot-vehicle-tracking

# Rebuild and restart
echo "Rebuilding containers..."
docker compose up -d --build

# Wait for services
echo "Waiting for services to start..."
sleep 10

# Verify
echo ""
echo "Verification:"
echo "============="
docker compose ps
echo ""
echo "Backend health:"
curl -s http://localhost:5000/api/health || echo "Backend not responding"
echo ""
echo ""
echo "✅ Rollback complete!"
echo ""
echo "Access app at: http://localhost:3000"
echo "Mobile interface: http://localhost:8080"
```

---

## Rollback Timing

**Code rollback:** Instant (git checkout)
**Service restart:** ~30 seconds
**Total downtime:** ~1 minute

---

## Support

If rollback fails:
1. Check Docker containers: `docker compose ps`
2. Check logs: `docker compose logs backend frontend`
3. Verify git state: `git log --oneline -5`
4. Check tag exists: `git tag -l`

---

## Prevention

To avoid needing rollback:
- ✅ Test pivot in development first
- ✅ Get stakeholder approval before merging
- ✅ Keep pivot work in separate branch
- ✅ Don't delete vehicle tracking code
- ✅ Make changes reversible

---

**Last Updated:** 2025-12-07
**Rollback Point:** Tag `pre-pivot-vehicle-tracking` (commit eea1f55)

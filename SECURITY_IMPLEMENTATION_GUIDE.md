# Security Implementation Guide

**Date:** 2025-11-11  
**Status:** Ready for Implementation  
**Estimated Time:** 2-3 hours for Phase 1 (Critical fixes)

---

## PHASE 1: CRITICAL FIXES (TODAY)

### Fix #1: Remove `/api/auth/default-credentials` Endpoint

**Location:** `backend/app/main.py` Lines 85-97

**REMOVE ENTIRE FUNCTION:**
```python
@app.route('/api/auth/default-credentials', methods=['GET'])
def check_default_credentials():
    """Check if default admin credentials should be displayed"""
    admin_user = User.query.filter_by(username='admin').first()

    if admin_user and admin_user.must_change_password:
        return jsonify({
            'show_default': True,
            'username': 'admin',
            'password': 'admin123'
        })

    return jsonify({'show_default': False})
```

**DELETE LINES 85-97 COMPLETELY**

---

### Fix #2: Replace Hardcoded Credentials with Random Generation

**Location:** `backend/app/main.py` Lines 61-79

**REPLACE WITH:**
```python
    if User.query.count() == 0:
        # Create default admin user with randomly generated password
        from app.security import generate_secure_password
        import os
        
        # Generate random password on first run
        default_password = generate_secure_password()
        admin_password = bcrypt.generate_password_hash(default_password).decode('utf-8')
        admin_user = User(
            username='admin',
            email='admin@mapstracker.local',
            password_hash=admin_password,
            role='admin',
            must_change_password=True
        )
        db.session.add(admin_user)
        db.session.commit()
        
        # Write credentials to secure temporary file (NOT logs)
        credentials_file = '/tmp/INITIAL_ADMIN_CREDENTIALS.txt'
        try:
            with open(credentials_file, 'w') as f:
                f.write(f"Initial Admin Credentials\n")
                f.write(f"========================\n")
                f.write(f"Username: admin\n")
                f.write(f"Password: {default_password}\n")
                f.write(f"Important: Change this password on first login\n")
            os.chmod(credentials_file, 0o600)  # Read-only by owner
            app.logger.warning(f"Initial admin credentials written to {credentials_file}")
            app.logger.warning("Credentials will be deleted after first password change")
        except Exception as e:
            app.logger.error(f"Failed to write credentials file: {e}")
            app.logger.warning("IMPORTANT: Default admin user created but credentials could not be saved")
```

**KEY CHANGES:**
- ✓ Uses `generate_secure_password()` from security module
- ✓ Writes to temporary file (NOT in logs)
- ✓ Sets secure file permissions (0o600)
- ✓ Does NOT log password
- ✓ File is isolated from version control

---

### Fix #3: Add GPS Coordinate Validation

**Location:** `backend/app/main.py` GPS endpoint (search for `/api/gps`)

**ADD IMPORT AT TOP OF FILE (after other imports):**
```python
from app.security import validate_gps_coordinates, ValidationError
```

**FIND THE `/api/gps` ENDPOINT AND REPLACE THE GPS SECTION:**

**BEFORE:**
```python
location = Location(
    vehicle_id=vehicle.id,
    latitude=float(data['latitude']),
    longitude=float(data['longitude']),
    speed=float(data.get('speed', 0.0))
)
```

**AFTER:**
```python
try:
    # Validate GPS coordinates are within valid ranges
    latitude = data.get('latitude')
    longitude = data.get('longitude')
    speed = data.get('speed', 0.0)
    
    validate_gps_coordinates(latitude, longitude, speed)
    
    location = Location(
        vehicle_id=vehicle.id,
        latitude=float(latitude),
        longitude=float(longitude),
        speed=float(speed)
    )
except ValidationError as e:
    return jsonify({'error': str(e)}), 400
except (ValueError, TypeError) as e:
    return jsonify({'error': 'Invalid coordinate values'}), 400
```

---

### Fix #4: Add Role-Based Access Control

**Location:** `backend/app/main.py` All admin endpoints

**ADD IMPORT AT TOP:**
```python
from app.security import require_admin, require_manager_or_admin
```

**ENDPOINTS REQUIRING @require_admin DECORATOR:**

1. **GET /api/users** (Line ~431)
   - Add `@require_admin` before `@app.route`
   
2. **PUT /api/users/<id>** (Line ~444)
   - Add `@require_admin` before `@app.route`
   
3. **DELETE /api/users/<id>** (Line ~477)
   - Add `@require_admin` before `@app.route`

**ENDPOINTS REQUIRING @require_manager_or_admin DECORATOR:**

1. **POST /api/vehicles** (Line ~491)
   - Add `@require_manager_or_admin` before `@app.route`
   
2. **PUT /api/vehicles/<id>** (Line ~510)
   - Add `@require_manager_or_admin` before `@app.route`
   
3. **DELETE /api/vehicles/<id>** (Line ~520)
   - Add `@require_manager_or_admin` before `@app.route`
   
4. **POST /api/places-of-interest** (Line ~592)
   - Add `@require_manager_or_admin` before `@app.route`
   
5. **PUT /api/places-of-interest/<id>** (Line ~606)
   - Add `@require_manager_or_admin` before `@app.route`
   
6. **DELETE /api/places-of-interest/<id>** (Line ~620)
   - Add `@require_manager_or_admin` before `@app.route`

**EXAMPLE FORMAT:**
```python
@app.route('/api/users', methods=['GET'])
@login_required
@require_admin  # ← ADD THIS LINE
def get_users():
    users = User.query.all()
    # ... rest of function
```

---

## Phase 1 Validation Checklist

After making Phase 1 changes, verify:

- [ ] `/api/auth/default-credentials` endpoint returns 404
- [ ] Admin user created on first run
- [ ] Credentials file created at `/tmp/INITIAL_ADMIN_CREDENTIALS.txt`
- [ ] Credentials NOT in logs
- [ ] GPS endpoint rejects invalid coordinates:
  - [ ] `latitude: 999` → HTTP 400
  - [ ] `longitude: -999` → HTTP 400
  - [ ] `speed: -50` → HTTP 400
  - [ ] `speed: 500` → HTTP 400
- [ ] Admin endpoints protected:
  - [ ] Viewer user gets 403 on `/api/users`
  - [ ] Viewer user gets 403 on `POST /api/vehicles`
  - [ ] Admin user gets 200 on `/api/users`
  - [ ] Manager user gets 200 on `POST /api/vehicles`

---

## Testing Commands

### Test GPS Validation
```bash
# Invalid latitude (should fail with 400)
curl -X POST http://localhost:5000/api/gps \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "device_1",
    "latitude": 999,
    "longitude": 0,
    "speed": 50
  }'

# Valid coordinates (should work)
curl -X POST http://localhost:5000/api/gps \
  -H "Content-Type: application/json" \
  -d '{
    "device_id": "device_1",
    "latitude": 40.7128,
    "longitude": -74.0060,
    "speed": 50
  }'
```

### Test RBAC
```bash
# Login as viewer
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "viewer_user", "password": "password"}'

# Try to access /api/users (should fail with 403)
curl -X GET http://localhost:5000/api/users \
  -H "Cookie: session=..."
# Response: {"error": "Insufficient permissions for this operation"}
```

---

## Files Modified Summary

| File | Changes | Lines |
|------|---------|-------|
| `backend/app/security.py` | NEW | +250 |
| `backend/app/main.py` | Modified | 8 endpoints + imports |

---

## Phase 2 Preview (Next Implementation)

1. Update `backend/app/config.py` - Session security
2. Add email validation to `/api/auth/register`
3. Add password strength to `/api/auth/change-password`
4. Implement login rate limiting
5. Fix session security settings

---

**Next Step:** Follow this guide to implement Phase 1 fixes


# Maps Tracker - Quick Setup Guide

## 🚀 First Time Setup (5 Minutes)

### 1. Configure Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env file and set these REQUIRED values:
nano .env
```

**Minimum Required Configuration:**

```bash
# Database Password (change this!)
POSTGRES_PASSWORD=your_strong_database_password

# Flask Secret Key (generate with: openssl rand -hex 32)
SECRET_KEY=your_generated_secret_key_here

# Initial Admin Password (IMPORTANT!)
ADMIN_PASSWORD=your_secure_admin_password
```

**Optional but Recommended:**

```bash
# Your domain name
DOMAIN=maps.yourdomain.com

# Email settings for notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

### 2. Start the Application

```bash
# Start all services
docker compose up -d

# Check services are running
docker compose ps
```

All services should show "healthy" status after ~30 seconds.

### 3. Access the Application

Open your browser and navigate to:
- **HTTP:** http://localhost or http://your-domain
- **HTTPS:** https://localhost or https://your-domain

### 4. Login

Use the admin credentials you configured:

**Username:** `admin`
**Password:** The password you set in `ADMIN_PASSWORD` (or `admin123` if not set)

⚠️ **You will be forced to change your password on first login.**

---

## 🔐 Finding Your Admin Password

If you forgot your admin password, retrieve it from:

### Option 1: Check the credentials file
```bash
docker exec maps_backend cat /app/ADMIN_CREDENTIALS.txt
```

### Option 2: Check backend logs
```bash
docker logs maps_backend | grep "INITIAL ADMIN"
```

---

## 🔧 Common Setup Issues

### Issue: Can't remember admin password

**Solution:** Reset the admin password manually

```bash
docker exec -it maps_backend python -c "
from app.main import app, db
from app.models import User
from flask_bcrypt import Bcrypt

with app.app_context():
    bcrypt = Bcrypt()
    new_password = 'NewPassword123!'
    admin = User.query.filter_by(username='admin').first()
    admin.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    admin.must_change_password = True
    db.session.commit()
    print(f'Admin password reset to: {new_password}')
"
```

### Issue: Database connection errors

**Solution:** Check your database credentials in `.env` match in both:
- `POSTGRES_PASSWORD`
- `DATABASE_URL` (should contain same password)

### Issue: Frontend shows blank page

**Solution:** Clear browser cache
- Chrome: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Firefox: `Ctrl+F5`

---

## 📊 Monitoring

View service logs:
```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f frontend
```

Check health:
```bash
curl http://localhost:5000/api/health
```

---

## 🛑 Stopping the Application

```bash
# Stop all services
docker compose down

# Stop and remove all data (CAUTION: deletes database!)
docker compose down -v
```

---

## 📚 Next Steps

1. **Configure Mobile GPS Tracking:**
   - Access mobile interface at: http://your-domain:8080
   - See `mobile/README.md` for setup

2. **Setup Backups:**
   - Configure `BACKUP_EMAIL` in `.env`
   - See `docs/BACKUP_SYSTEM.md`

3. **Add Vehicles:**
   - Login to admin panel
   - Navigate to "Admin" → "Vehicle Management"
   - Add your vehicles with device IDs

4. **Add Places of Interest:**
   - Navigate to "Store Locations"
   - Click on map to add stores/locations

---

## 🆘 Need Help?

- **Documentation:** Check `CLAUDE.md` for detailed information
- **Issues:** Report at https://github.com/yourusername/maps-tracker/issues
- **Logs:** Always check logs first: `docker compose logs -f`

---

## ⚠️ Security Checklist for Production

- [ ] Set strong `ADMIN_PASSWORD` in `.env`
- [ ] Set strong `POSTGRES_PASSWORD` in `.env`
- [ ] Generate secure `SECRET_KEY` with `openssl rand -hex 32`
- [ ] Enable HTTPS (certificates in `ssl/` directory)
- [ ] Configure firewall (ports 80, 443, 5000)
- [ ] Setup regular backups (configure B2 or local backups)
- [ ] Enable backup encryption (`BACKUP_ENCRYPTION_ENABLED=true`)
- [ ] Configure email notifications
- [ ] Change admin password after first login
- [ ] Review user permissions regularly

---

**Version:** 1.0.0
**Last Updated:** 2025-12-11

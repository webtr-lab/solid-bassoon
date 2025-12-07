# Documentation Index

Comprehensive guide to all project documentation, organized by topic.

---

## 🚀 Getting Started

- **[README.md](../README.md)** - Project overview and main documentation
- **[CLAUDE.md](../CLAUDE.md)** - Claude Code project instructions and architecture guide
- **[CONTRIBUTING.md](../CONTRIBUTING.md)** - Contribution guidelines

---

## 🔐 Security & Authentication

- **[SECURITY.md](../SECURITY.md)** - Security guidelines and best practices
- **[ENCRYPTION_IMPLEMENTATION_GUIDE.md](ENCRYPTION_IMPLEMENTATION_GUIDE.md)** - Backup encryption and secret management implementation
- **[CRITICAL_FIXES_IMPLEMENTATION_SUMMARY.md](CRITICAL_FIXES_IMPLEMENTATION_SUMMARY.md)** - Summary of critical encryption fixes deployed

---

## 🛠️ Setup & Deployment

- **[NOMINATIM_SETUP.md](NOMINATIM_SETUP.md)** - Local Nominatim geocoding service configuration
- **[SSL_SETUP.md](SSL_SETUP.md)** - HTTPS/SSL certificate setup
- **[CI_CD_SETUP.md](CI_CD_SETUP.md)** - Continuous Integration/Deployment configuration
- **[DEPLOYMENT_TROUBLESHOOTING.md](DEPLOYMENT_TROUBLESHOOTING.md)** - Troubleshooting deployment issues

---

## 📊 Database & Backups

- **[BACKUP_ASSESSMENT_REPORT.md](BACKUP_ASSESSMENT_REPORT.md)** - Comprehensive backup system assessment and recommendations
- **[B2_BACKUP_SETUP.md](B2_BACKUP_SETUP.md)** - Backblaze B2 cloud backup configuration (recommended)
- **[REMOTE_BACKUP_CONFIGURATION.md](REMOTE_BACKUP_CONFIGURATION.md)** - Legacy rsync remote backup (deprecated)
- **[WAL_ARCHIVING_SETUP.md](WAL_ARCHIVING_SETUP.md)** - PostgreSQL WAL archiving for point-in-time recovery
- **[DISASTER_RECOVERY_RUNBOOK.md](DISASTER_RECOVERY_RUNBOOK.md)** - Step-by-step disaster recovery procedures

---

## 📧 Email System

- **[EMAIL_NOTIFICATION_GUIDE.md](EMAIL_NOTIFICATION_GUIDE.md)** - Email notification system configuration and usage
- **[ALERT_RUNBOOKS.md](ALERT_RUNBOOKS.md)** - Alert notification and runbook procedures

---

## 📋 Monitoring & Operations

- **[LOGGING.md](LOGGING.md)** - Application logging system and log locations
- **[MONITORING_SETUP.md](MONITORING_SETUP.md)** - Monitoring and alerting system setup

---

## 🎨 API & Frontend

- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)** - Complete REST API endpoint reference
- **[openapi.yaml](openapi.yaml)** - OpenAPI/Swagger specification for API
- **[ACCESSIBILITY.md](ACCESSIBILITY.md)** - Accessibility features and WCAG compliance
- **[WEBSOCKET_GUIDE.md](WEBSOCKET_GUIDE.md)** - Real-time WebSocket communication setup
- **[REACT_QUERY_GUIDE.md](REACT_QUERY_GUIDE.md)** - React Query state management patterns

---

## 📁 Directory Structure

```
maps-tracker-app1/
├── backend/                    # Flask backend API
├── frontend/                   # React + Vite frontend
├── docs/                       # Project documentation (this folder)
├── scripts/                    # Utility and automation scripts
├── secrets/                    # Secret credentials (in .gitignore)
├── backups/                    # Database backups
├── logs/                       # Application logs
├── docker-compose.yml          # Multi-container Docker setup
├── README.md                   # Main project documentation
├── CLAUDE.md                   # Claude Code instructions
├── SECURITY.md                 # Security guidelines
├── LICENSE                     # Project license
└── .env.example                # Environment variables template
```

---

## 🔍 Quick Reference

### Common Tasks

| Task | Documentation |
|------|---|
| Add new API endpoint | API_DOCUMENTATION.md |
| Set up local geocoding | NOMINATIM_SETUP.md |
| Configure local backups | BACKUP_ASSESSMENT_REPORT.md |
| Set up cloud backups (B2) | B2_BACKUP_SETUP.md |
| Send email notifications | EMAIL_NOTIFICATION_GUIDE.md |
| Deploy to production | DEPLOYMENT_TROUBLESHOOTING.md |
| Recover from disaster | DISASTER_RECOVERY_RUNBOOK.md |
| View application logs | LOGGING.md |
| Set up monitoring | MONITORING_SETUP.md |
| Understand encryption | ENCRYPTION_IMPLEMENTATION_GUIDE.md |

---

## 📝 File Organization

### Essential Core Documentation
Files in this folder that directly impact development and operations:
- API specifications and development guides
- Deployment and setup procedures
- Emergency procedures and runbooks
- Logging and monitoring information

### Cloud Storage
- **B2_BACKUP_SETUP.md** - Backblaze B2 cloud backup configuration (replaces rsync)

### Implementation Guides
Detailed technical documentation for recently implemented features:
- Encryption and secret management system
- Email notification system
- Monitoring and alerting setup

### API & Frontend
Complete reference for API endpoints and frontend patterns

---

## 🔄 Maintenance

This index is automatically maintained. When adding new documentation:
1. Create file in `/docs` directory
2. Update this INDEX.md with link and description
3. Follow the organization structure above

---

**Last Updated:** 2025-12-01
**Status:** Current and organized

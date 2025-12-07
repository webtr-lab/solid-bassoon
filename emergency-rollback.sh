#!/bin/bash
#
# Emergency Rollback Script
# Restores app to pre-pivot vehicle tracking state
#

set -e

echo "🚨 EMERGENCY ROLLBACK TO VEHICLE TRACKING APP"
echo "=============================================="
echo ""
echo "This will:"
echo "  1. Restore code to pre-pivot state (tag: pre-pivot-vehicle-tracking)"
echo "  2. Rebuild Docker containers"
echo "  3. Restart all services"
echo ""
echo "Current branch: $(git branch --show-current)"
echo "Current commit: $(git log --oneline -1)"
echo ""
read -p "Continue with rollback? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "❌ Rollback cancelled"
    exit 1
fi

# Save current state in case of mistake
echo ""
echo "📝 Saving current state as backup..."
BACKUP_BRANCH="backup-before-rollback-$(date +%Y%m%d-%H%M%S)"
git branch "$BACKUP_BRANCH"
echo "✓ Current state saved to branch: $BACKUP_BRANCH"

# Stop services
echo ""
echo "🛑 Stopping services..."
docker compose down

# Restore code
echo ""
echo "⏮️  Restoring code to pre-pivot state..."
git checkout pre-pivot-vehicle-tracking

# Rebuild and restart
echo ""
echo "🔨 Rebuilding containers..."
docker compose up -d --build

# Wait for services
echo ""
echo "⏳ Waiting for services to start..."
sleep 15

# Verify
echo ""
echo "=============================================="
echo "✅ ROLLBACK COMPLETE"
echo "=============================================="
echo ""
echo "Services status:"
docker compose ps
echo ""
echo "Backend health check:"
curl -s http://localhost:5000/api/health && echo "" || echo "⚠️  Backend not responding yet (may need more time)"
echo ""
echo "Frontend: http://localhost:3000"
echo "Mobile:   http://localhost:8080"
echo "Admin:    http://localhost:3000 (login as admin)"
echo ""
echo "Note: Your previous state was saved to branch: $BACKUP_BRANCH"
echo "To return to pivot work: git checkout $BACKUP_BRANCH"
echo ""

# Database Migrations Guide

## Overview

Database schema changes are now managed using **Flask-Migrate** (Alembic wrapper). This ensures safe, trackable schema changes in production.

## Migration Commands

All commands run inside the backend container:

```bash
docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db <command>"
```

### Common Operations

#### 1. Create a New Migration

After modifying models in `backend/app/models.py`:

```bash
docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db migrate -m 'Description of changes'"
```

This generates a migration file in `backend/migrations/versions/`.

#### 2. Review the Migration

**ALWAYS** review auto-generated migrations before applying:

```bash
cat backend/migrations/versions/<migration_file>.py
```

Check for:
- Correct column types
- Proper indexes
- Data preservation logic (if renaming/removing columns)
- Foreign key constraints

#### 3. Apply Migration

```bash
docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db upgrade"
```

#### 4. Rollback Migration

```bash
docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db downgrade"
```

#### 5. Check Current Version

```bash
docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db current"
```

#### 6. Show Migration History

```bash
docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db history"
```

## Production Workflow

### Safe Schema Change Process

1. **Development**:
   ```bash
   # Modify models
   vim backend/app/models.py

   # Generate migration
   docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db migrate -m 'Add column xyz'"

   # Review generated migration
   cat backend/migrations/versions/*.py

   # Test migration
   docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db upgrade"

   # Test application
   # ...

   # If issues, rollback
   docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db downgrade"
   ```

2. **Commit Migration Files**:
   ```bash
   git add backend/migrations/versions/*.py
   git commit -m "Add migration: description"
   ```

3. **Production Deployment**:
   ```bash
   # Pull latest code
   git pull

   # Rebuild containers
   docker compose up -d --build backend

   # Apply migrations
   docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db upgrade"

   # Verify
   docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db current"
   ```

## Manual Schema Changes (AVOID)

**Do NOT** manually modify the database schema with SQL commands in production. Always use migrations.

If you must make a manual change (emergency):
1. Document it immediately
2. Create a matching migration as soon as possible
3. Use `flask db stamp` to mark the database as being at the new version

## Current Status

- **Initial Migration**: `211704bace94`
- **Tables Tracked**: users, vehicles, locations, saved_locations, places_of_interest, audit_logs, password_reset_tokens
- **Migration Directory**: `backend/migrations/`

## Troubleshooting

### "Can't locate revision identified by 'head'"

The database doesn't have migration tracking. Run:
```bash
docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db stamp head"
```

### "Target database is not up to date"

Migrations need to be applied:
```bash
docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db upgrade"
```

### Migration Generated Empty File

Check if models actually changed. Alembic compares model definitions to database schema.

### Failed Migration

1. Check logs for error details
2. Fix the migration file manually
3. Try upgrade again
4. If corrupted, rollback and regenerate:
   ```bash
   docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db downgrade"
   rm backend/migrations/versions/<bad_migration>.py
   docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db migrate -m 'Fixed migration'"
   ```

## Best Practices

1. **One logical change per migration** - Don't bundle unrelated schema changes
2. **Test rollbacks** - Ensure `downgrade()` works before deploying
3. **Backup before migration** - Always have a recent backup
4. **Review auto-generated code** - Alembic isn't perfect
5. **Add data migrations when needed** - Use `op.execute()` for data transformations
6. **Document complex migrations** - Add comments explaining why

## Example: Adding a Column

```python
# backend/app/models.py
class Vehicle(db.Model):
    # ...
    status = db.Column(db.String(20), default='active')  # NEW
```

```bash
# Generate migration
docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db migrate -m 'Add status column to vehicles'"

# Review
cat backend/migrations/versions/*.py

# Apply
docker exec maps_backend bash -c "cd /app && FLASK_APP=app.main:app flask db upgrade"
```

## Example: Data Migration

If you need to transform existing data:

```python
def upgrade():
    # Add column
    op.add_column('vehicles', sa.Column('status', sa.String(20), nullable=True))

    # Set default for existing rows
    op.execute("UPDATE vehicles SET status = 'active' WHERE status IS NULL")

    # Make non-nullable
    op.alter_column('vehicles', 'status', nullable=False)

def downgrade():
    op.drop_column('vehicles', 'status')
```

## Resources

- [Flask-Migrate Documentation](https://flask-migrate.readthedocs.io/)
- [Alembic Documentation](https://alembic.sqlalchemy.org/)

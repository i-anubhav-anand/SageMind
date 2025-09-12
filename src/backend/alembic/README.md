# Database Migrations with Alembic

This directory contains all database migration files for the SageMind application using PostgreSQL and Alembic.

## 📁 File Structure

```
src/backend/
├── alembic/                    # Alembic migration directory
│   ├── versions/              # Migration files
│   │   └── 407fee368daa_initial_migration_with_chat_models.py
│   ├── env.py                 # Alembic environment configuration
│   ├── script.py.mako        # Migration template
│   └── README                 # This file
├── alembic.ini               # Alembic configuration file
├── db_manager.py             # Database management script
└── db/
    ├── models.py             # SQLAlchemy models
    └── engine.py             # Database connection
```

## 🚀 Quick Start

### Using Docker (Recommended)

Run database operations inside the Docker container:

```bash
# Create a new migration
docker exec -it sagemind-backend-1 bash -c "cd /workspace/src/backend && alembic revision --autogenerate -m 'Your migration message'"

# Apply migrations
docker exec -it sagemind-backend-1 bash -c "cd /workspace/src/backend && alembic upgrade head"

# Check current revision
docker exec -it sagemind-backend-1 bash -c "cd /workspace/src/backend && alembic current"

# View migration history
docker exec -it sagemind-backend-1 bash -c "cd /workspace/src/backend && alembic history"
```

### Using the Database Manager Script

The `db_manager.py` script provides convenient commands:

```bash
# Inside Docker container
docker exec -it sagemind-backend-1 bash -c "cd /workspace/src/backend && python db_manager.py check"
docker exec -it sagemind-backend-1 bash -c "cd /workspace/src/backend && python db_manager.py create_migration 'Add new feature'"
docker exec -it sagemind-backend-1 bash -c "cd /workspace/src/backend && python db_manager.py upgrade"
```

## 📊 Database Schema

### Current Tables

1. **chat_thread**
   - `id`: Primary key
   - `model_name`: AI model used for the conversation
   - `time_created`: Thread creation timestamp
   - `time_updated`: Last update timestamp

2. **chat_message**
   - `id`: Primary key
   - `role`: Message role (USER/ASSISTANT)
   - `content`: Message content
   - `parent_message_id`: Reference to parent message (optional)
   - `chat_thread_id`: Foreign key to chat_thread
   - `agent_search_full_response`: JSONB field for search responses
   - `related_queries`: Array of related query strings
   - `image_results`: Array of image URLs

3. **search_result**
   - `id`: Primary key
   - `title`: Search result title
   - `url`: Search result URL
   - `content`: Search result content
   - `chat_message_id`: Foreign key to chat_message

## 🔧 Common Operations

### Creating New Migrations

When you modify models in `db/models.py`:

1. **Auto-generate migration:**
   ```bash
   docker exec -it sagemind-backend-1 bash -c "cd /workspace/src/backend && alembic revision --autogenerate -m 'Describe your changes'"
   ```

2. **Review the generated migration file** in `alembic/versions/`

3. **Apply the migration:**
   ```bash
   docker exec -it sagemind-backend-1 bash -c "cd /workspace/src/backend && alembic upgrade head"
   ```

### Manual Migrations

For complex changes that auto-generate can't handle:

```bash
# Create empty migration
docker exec -it sagemind-backend-1 bash -c "cd /workspace/src/backend && alembic revision -m 'Manual migration description'"

# Edit the generated file manually
# Then apply it
docker exec -it sagemind-backend-1 bash -c "cd /workspace/src/backend && alembic upgrade head"
```

### Rolling Back Changes

```bash
# Downgrade one revision
docker exec -it sagemind-backend-1 bash -c "cd /workspace/src/backend && alembic downgrade -1"

# Downgrade to specific revision
docker exec -it sagemind-backend-1 bash -c "cd /workspace/src/backend && alembic downgrade 407fee368daa"

# Reset to base (removes all data!)
docker exec -it sagemind-backend-1 bash -c "cd /workspace/src/backend && alembic downgrade base"
```

## 🛠️ Environment Configuration

Database connection is configured via environment variables:

```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=postgres
DATABASE_URL=postgresql+psycopg2://user:pass@host:port/dbname  # Optional override
```

## 📝 Best Practices

1. **Always review auto-generated migrations** before applying them
2. **Backup your database** before running migrations in production
3. **Test migrations** on a copy of production data first
4. **Use descriptive migration messages** that explain what changed
5. **Don't edit applied migrations** - create new ones instead
6. **Keep migrations small and focused** on single changes when possible

## 🚨 Troubleshooting

### Common Issues

1. **"No module named 'backend'"**: Make sure you're running from the correct directory
2. **Connection refused**: Ensure PostgreSQL container is running
3. **Permission denied**: Check Docker container permissions
4. **Migration conflicts**: Use `alembic merge` to resolve branching

### Checking Database State

```bash
# Check connection and current state
docker exec -it sagemind-backend-1 bash -c "cd /workspace/src/backend && python db_manager.py check"

# List all tables
docker exec -it sagemind-postgres-1 psql -U postgres -d postgres -c "\dt"

# Check alembic version
docker exec -it sagemind-postgres-1 psql -U postgres -d postgres -c "SELECT * FROM alembic_version;"
```

## 🔄 Migration Workflow

1. **Modify models** in `db/models.py`
2. **Generate migration** with descriptive message
3. **Review** the generated migration file
4. **Test** the migration on development data
5. **Apply** to development database
6. **Commit** both model changes and migration file
7. **Deploy** and apply to production

Remember: Migrations should always be applied in order and never skipped! 
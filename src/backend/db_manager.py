#!/usr/bin/env python3
"""
Database Management Script for SageMind

This script provides common database management operations using Alembic.
Run this script from the backend directory or use Docker exec.

Usage:
    python db_manager.py create_migration "migration message"
    python db_manager.py upgrade
    python db_manager.py downgrade
    python db_manager.py current
    python db_manager.py history
    python db_manager.py reset
"""

import os
import sys
import subprocess
import click
import uuid
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
from backend.db.engine import create_connection_string, engine
from backend.db.models import Base


def run_alembic_command(args):
    """Run an alembic command with proper error handling."""
    try:
        result = subprocess.run(
            ["alembic"] + args,
            capture_output=True,
            text=True,
            check=True
        )
        print(result.stdout)
        if result.stderr:
            print(result.stderr, file=sys.stderr)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running alembic command: {e}", file=sys.stderr)
        print(f"stdout: {e.stdout}", file=sys.stderr)
        print(f"stderr: {e.stderr}", file=sys.stderr)
        return False
    except FileNotFoundError:
        print("Alembic not found. Make sure it's installed and in your PATH.", file=sys.stderr)
        return False


@click.group()
def cli():
    """Database management commands for SageMind."""
    pass


@cli.command()
@click.argument('message')
def create_migration(message):
    """Create a new migration with autogenerate."""
    click.echo(f"Creating migration: {message}")
    success = run_alembic_command(["revision", "--autogenerate", "-m", message])
    if success:
        click.echo("✅ Migration created successfully!")
    else:
        click.echo("❌ Failed to create migration")


@cli.command()
@click.option('--revision', default='head', help='Revision to upgrade to')
def upgrade(revision):
    """Upgrade database to latest migration or specified revision."""
    click.echo(f"Upgrading database to {revision}...")
    success = run_alembic_command(["upgrade", revision])
    if success:
        click.echo("✅ Database upgraded successfully!")
    else:
        click.echo("❌ Failed to upgrade database")


@cli.command()
@click.option('--revision', default='-1', help='Revision to downgrade to')
def downgrade(revision):
    """Downgrade database to previous migration or specified revision."""
    click.echo(f"Downgrading database to {revision}...")
    success = run_alembic_command(["downgrade", revision])
    if success:
        click.echo("✅ Database downgraded successfully!")
    else:
        click.echo("❌ Failed to downgrade database")


@cli.command()
def current():
    """Show current database revision."""
    click.echo("Current database revision:")
    run_alembic_command(["current"])


@cli.command()
def history():
    """Show migration history."""
    click.echo("Migration history:")
    run_alembic_command(["history"])


@cli.command()
@click.confirmation_option(prompt='Are you sure you want to reset the database? This will drop all tables!')
def reset():
    """Reset database by dropping all tables and recreating them."""
    try:
        engine = create_engine(create_connection_string())
        
        # Drop all tables
        click.echo("Dropping all tables...")
        Base.metadata.drop_all(engine)
        
        # Recreate tables using Alembic
        click.echo("Running migrations...")
        success = run_alembic_command(["upgrade", "head"])
        
        if success:
            click.echo("✅ Database reset successfully!")
        else:
            click.echo("❌ Failed to reset database")
            
    except Exception as e:
        click.echo(f"❌ Error resetting database: {e}")


@cli.command()
def init():
    """Initialize Alembic if not already initialized."""
    if os.path.exists("alembic"):
        click.echo("Alembic already initialized")
        return
    
    click.echo("Initializing Alembic...")
    success = run_alembic_command(["init", "alembic"])
    if success:
        click.echo("✅ Alembic initialized successfully!")
        click.echo("Please update alembic/env.py with your models")
    else:
        click.echo("❌ Failed to initialize Alembic")


@cli.command()
def check():
    """Check database connection and current state."""
    try:
        engine = create_engine(create_connection_string())
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            click.echo(f"✅ Database connection successful!")
            click.echo(f"PostgreSQL version: {version}")
            
            # Check if alembic_version table exists
            result = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'alembic_version'
                )
            """))
            has_alembic = result.fetchone()[0]
            
            if has_alembic:
                result = conn.execute(text("SELECT version_num FROM alembic_version"))
                current_revision = result.fetchone()
                if current_revision:
                    click.echo(f"Current migration: {current_revision[0]}")
                else:
                    click.echo("No migrations applied")
            else:
                click.echo("⚠️  Alembic not initialized in database")
                
    except Exception as e:
        click.echo(f"❌ Database connection failed: {e}")


def fix_user_id_null_values():
    """
    Updates NULL user_id values in chat_thread and chat_message tables with a default UUID.
    This is needed to make the user_id columns non-nullable in a future migration.
    """
    
    # Create a default UUID for existing records
    default_uuid = uuid.uuid4()
    
    with Session(engine) as session:
        try:
            # Update chat_thread table
            session.execute(
                text("UPDATE chat_thread SET user_id = :uuid WHERE user_id IS NULL"),
                {"uuid": default_uuid}
            )
            
            # Update chat_message table
            session.execute(
                text("UPDATE chat_message SET user_id = :uuid WHERE user_id IS NULL"),
                {"uuid": default_uuid}
            )
            
            session.commit()
            print(f"Updated NULL user_id values to default UUID: {default_uuid}")
            return True
        except Exception as e:
            session.rollback()
            print(f"Error updating NULL user_id values: {e}")
            return False

if __name__ == "__main__":
    fix_user_id_null_values()


if __name__ == '__main__':
    cli() 
"""Make user_id fields non-nullable

Revision ID: a1b2c3d4e5f6
Revises: f8a9b2c3d4e5
Create Date: 2025-07-17 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'f8a9b2c3d4e5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Before making the columns non-nullable, we need to ensure no NULL values exist
    # This would normally be done by running the fix_user_id_null_values() function
    # from db_manager.py, but we'll include a direct SQL statement here as well
    
    # Create a default UUID for any NULL records
    op.execute("UPDATE chat_thread SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL")
    op.execute("UPDATE chat_message SET user_id = '00000000-0000-0000-0000-000000000000' WHERE user_id IS NULL")
    
    # Now make the columns non-nullable
    op.alter_column('chat_thread', 'user_id',
               existing_type=postgresql.UUID(),
               nullable=False)
    op.alter_column('chat_message', 'user_id',
               existing_type=postgresql.UUID(),
               nullable=False)


def downgrade() -> None:
    # Make columns nullable again
    op.alter_column('chat_thread', 'user_id',
               existing_type=postgresql.UUID(),
               nullable=True)
    op.alter_column('chat_message', 'user_id',
               existing_type=postgresql.UUID(),
               nullable=True) 
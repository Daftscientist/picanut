"""per-user agent token and printer preference

Revision ID: 003
Revises: 002
Create Date: 2024-01-03 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "user_settings",
        sa.Column("user_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("agent_token", sa.String(255), nullable=True, unique=True),
        sa.Column("selected_printer", sa.Text(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_user_settings_agent_token", "user_settings", ["agent_token"])


def downgrade() -> None:
    op.drop_index("ix_user_settings_agent_token", "user_settings")
    op.drop_table("user_settings")

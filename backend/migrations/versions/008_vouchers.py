"""Create vouchers table

Revision ID: 008
Revises: 007
Create Date: 2026-03-22 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vouchers",
        sa.Column("id", postgresql.UUID(as_uuid=False), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("code", sa.String(100), nullable=False, unique=True),
        sa.Column("discount_type", sa.String(50), nullable=False, server_default="percentage"), # 'percentage' or 'fixed_amount'
        sa.Column("value", sa.Numeric(10, 2), nullable=False, server_default="0.00"),
        sa.Column("plan_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("plans.id", ondelete="SET NULL"), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("max_uses", sa.Integer(), nullable=True),
        sa.Column("times_used", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_vouchers_code", "vouchers", ["code"])


def downgrade() -> None:
    op.drop_index("ix_vouchers_code", "vouchers")
    op.drop_table("vouchers")

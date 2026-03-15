"""per-user data ownership and admin flag

Revision ID: 004
Revises: 003
Create Date: 2024-01-04 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Admin flag on users
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"))
    op.execute("UPDATE users SET is_admin = TRUE WHERE username = 'admin'")

    # owner_id on tags (NOT NULL — every tag belongs to someone)
    op.add_column("tags", sa.Column(
        "owner_id", postgresql.UUID(as_uuid=False),
        sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True,
    ))
    op.execute("UPDATE tags SET owner_id = (SELECT id FROM users WHERE is_admin = TRUE ORDER BY created_at LIMIT 1) WHERE owner_id IS NULL")
    op.alter_column("tags", "owner_id", nullable=False)
    op.create_index("ix_tags_owner_id", "tags", ["owner_id"])

    # owner_id on products (NOT NULL)
    op.add_column("products", sa.Column(
        "owner_id", postgresql.UUID(as_uuid=False),
        sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True,
    ))
    op.execute("UPDATE products SET owner_id = (SELECT id FROM users WHERE is_admin = TRUE ORDER BY created_at LIMIT 1) WHERE owner_id IS NULL")
    op.alter_column("products", "owner_id", nullable=False)
    op.create_index("ix_products_owner_id", "products", ["owner_id"])

    # owner_id on woo_orders (nullable — legacy/unowned orders remain)
    op.add_column("woo_orders", sa.Column(
        "owner_id", postgresql.UUID(as_uuid=False),
        sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    ))
    op.execute("UPDATE woo_orders SET owner_id = (SELECT id FROM users WHERE is_admin = TRUE ORDER BY created_at LIMIT 1) WHERE owner_id IS NULL")
    op.create_index("ix_woo_orders_owner_id", "woo_orders", ["owner_id"])

    # owner_id on print_jobs (nullable)
    op.add_column("print_jobs", sa.Column(
        "owner_id", postgresql.UUID(as_uuid=False),
        sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True,
    ))
    op.execute("UPDATE print_jobs SET owner_id = (SELECT id FROM users WHERE is_admin = TRUE ORDER BY created_at LIMIT 1) WHERE owner_id IS NULL")
    op.create_index("ix_print_jobs_owner_id", "print_jobs", ["owner_id"])


def downgrade() -> None:
    op.drop_index("ix_print_jobs_owner_id", "print_jobs")
    op.drop_index("ix_woo_orders_owner_id", "woo_orders")
    op.drop_index("ix_products_owner_id", "products")
    op.drop_index("ix_tags_owner_id", "tags")
    op.drop_column("print_jobs", "owner_id")
    op.drop_column("woo_orders", "owner_id")
    op.drop_column("products", "owner_id")
    op.drop_column("tags", "owner_id")
    op.drop_column("users", "is_admin")

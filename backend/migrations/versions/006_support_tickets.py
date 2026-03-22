"""compatibility placeholder for removed support tickets schema

Revision ID: 006
Revises: 005
Create Date: 2026-03-21 00:00:00.000000
"""

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This revision previously created support ticket tables that are no longer
    # part of the active application schema. Keep the revision id so existing
    # databases with alembic_version=006/007 can still boot.
    pass


def downgrade() -> None:
    pass

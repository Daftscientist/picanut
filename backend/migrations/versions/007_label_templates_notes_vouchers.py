"""compatibility placeholder for removed templates/notes/vouchers schema

Revision ID: 007
Revises: 006
Create Date: 2026-03-21 00:00:00.000000
"""

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This revision previously added label templates, user notes, and vouchers.
    # Keep the revision id so older deployed databases remain migratable.
    pass


def downgrade() -> None:
    pass

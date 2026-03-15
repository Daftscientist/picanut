"""orgs, plans, agents — multi-tenant SaaS schema

Revision ID: 005
Revises: 004
Create Date: 2024-01-05 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── a) plans table ────────────────────────────────────────────────────────
    op.create_table(
        "plans",
        sa.Column("id", postgresql.UUID(as_uuid=False), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("stripe_price_id", sa.String(255), nullable=True),
        sa.Column("price_pence", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("trial_days", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("subuser_limit", sa.Integer(), nullable=False, server_default="5"),
        sa.Column("agent_limit", sa.Integer(), nullable=False, server_default="2"),
        sa.Column("product_limit", sa.Integer(), nullable=False, server_default="100"),
        sa.Column("print_quota", sa.Integer(), nullable=False, server_default="1000"),
        sa.Column("is_public", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.execute(
        "INSERT INTO plans (name, price_pence, trial_days, subuser_limit, agent_limit, product_limit, print_quota) "
        "VALUES ('Starter', 2900, 30, 5, 2, 100, 1000)"
    )

    # ── b) organizations table ────────────────────────────────────────────────
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=False), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(100), nullable=False, unique=True),
        sa.Column("plan_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("plans.id", ondelete="SET NULL"), nullable=True),
        sa.Column("stripe_customer_id", sa.String(255), nullable=True, unique=True),
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True, unique=True),
        sa.Column("subscription_status", sa.String(50), nullable=False, server_default="trialing"),
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_organizations_slug", "organizations", ["slug"])
    op.create_index("ix_organizations_stripe_customer_id", "organizations", ["stripe_customer_id"])

    op.execute(
        "INSERT INTO organizations (name, slug, plan_id, subscription_status) "
        "VALUES ('Default', 'default', (SELECT id FROM plans LIMIT 1), 'active')"
    )

    # ── c) modify users table — add columns ───────────────────────────────────
    op.add_column("users", sa.Column(
        "org_id", postgresql.UUID(as_uuid=False),
        sa.ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True,
    ))
    op.add_column("users", sa.Column("role", sa.String(50), nullable=False, server_default="subuser"))
    op.add_column("users", sa.Column("is_platform_admin", sa.Boolean(), nullable=False, server_default="false"))
    # default_agent_id added after agents table exists (step e)

    op.execute(
        """UPDATE users SET
          org_id = (SELECT id FROM organizations WHERE slug='default'),
          role = CASE WHEN is_admin = TRUE THEN 'manager' ELSE 'subuser' END,
          is_platform_admin = CASE WHEN username = 'admin' AND is_admin = TRUE THEN TRUE ELSE FALSE END"""
    )

    # ── d) agents table ───────────────────────────────────────────────────────
    op.create_table(
        "agents",
        sa.Column("id", postgresql.UUID(as_uuid=False), server_default=sa.text("gen_random_uuid()"), primary_key=True),
        sa.Column("org_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False, server_default="Default Agent"),
        sa.Column("token", sa.String(255), nullable=False, unique=True),
        sa.Column("selected_printer", sa.Text(), nullable=True),
        sa.Column("paper_size", sa.String(100), nullable=True),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW()")),
    )
    op.create_index("ix_agents_token", "agents", ["token"])
    op.create_index("ix_agents_org_id", "agents", ["org_id"])

    # Migrate existing agent tokens from user_settings
    op.execute(
        """INSERT INTO agents (org_id, name, token, selected_printer, is_default)
        SELECT
          COALESCE(u.org_id, (SELECT id FROM organizations WHERE slug='default')),
          'Default Agent',
          us.agent_token,
          us.selected_printer,
          true
        FROM user_settings us
        JOIN users u ON u.id = us.user_id
        WHERE us.agent_token IS NOT NULL
        ON CONFLICT (token) DO NOTHING"""
    )

    # ── e) add default_agent_id FK to users and organizations ─────────────────
    op.add_column("users", sa.Column("default_agent_id", postgresql.UUID(as_uuid=False), nullable=True))
    op.create_foreign_key("fk_users_default_agent", "users", "agents", ["default_agent_id"], ["id"])

    op.add_column("organizations", sa.Column("default_agent_id", postgresql.UUID(as_uuid=False), nullable=True))
    op.create_foreign_key("fk_orgs_default_agent", "organizations", "agents", ["default_agent_id"], ["id"])

    # Set org's default_agent_id
    op.execute(
        """UPDATE organizations o SET default_agent_id = (
          SELECT a.id FROM agents a WHERE a.org_id = o.id AND a.is_default = true LIMIT 1
        )"""
    )

    # Set user's default_agent_id to their org's default
    op.execute(
        """UPDATE users u SET default_agent_id = (
          SELECT o.default_agent_id FROM organizations o WHERE o.id = u.org_id
        )
        WHERE u.org_id IS NOT NULL"""
    )

    # ── f) agent_access table ─────────────────────────────────────────────────
    op.create_table(
        "agent_access",
        sa.Column("agent_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("agents.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("access_type", sa.String(10), nullable=False, server_default="allow"),
    )

    # ── g) print_quota_usage table ────────────────────────────────────────────
    op.create_table(
        "print_quota_usage",
        sa.Column("org_id", postgresql.UUID(as_uuid=False), sa.ForeignKey("organizations.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("month", sa.Date(), primary_key=True),
        sa.Column("count", sa.Integer(), nullable=False, server_default="0"),
    )

    # ── h) add org_id to products, tags, woo_orders, print_jobs ──────────────

    # products
    op.add_column("products", sa.Column(
        "org_id", postgresql.UUID(as_uuid=False),
        sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True,
    ))
    op.execute(
        """UPDATE products SET org_id = (
          SELECT u.org_id FROM users u WHERE u.id = products.owner_id
        ) WHERE owner_id IS NOT NULL"""
    )
    op.execute(
        "UPDATE products SET org_id = (SELECT id FROM organizations WHERE slug='default') WHERE org_id IS NULL"
    )
    op.create_index("ix_products_org_id", "products", ["org_id"])

    # tags
    op.add_column("tags", sa.Column(
        "org_id", postgresql.UUID(as_uuid=False),
        sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True,
    ))
    op.execute(
        """UPDATE tags SET org_id = (
          SELECT u.org_id FROM users u WHERE u.id = tags.owner_id
        ) WHERE owner_id IS NOT NULL"""
    )
    op.execute(
        "UPDATE tags SET org_id = (SELECT id FROM organizations WHERE slug='default') WHERE org_id IS NULL"
    )
    op.create_index("ix_tags_org_id", "tags", ["org_id"])

    # woo_orders
    op.add_column("woo_orders", sa.Column(
        "org_id", postgresql.UUID(as_uuid=False),
        sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True,
    ))
    op.execute(
        """UPDATE woo_orders SET org_id = (
          SELECT u.org_id FROM users u WHERE u.id = woo_orders.owner_id
        ) WHERE owner_id IS NOT NULL"""
    )
    op.execute(
        "UPDATE woo_orders SET org_id = (SELECT id FROM organizations WHERE slug='default') WHERE org_id IS NULL"
    )
    op.create_index("ix_woo_orders_org_id", "woo_orders", ["org_id"])

    # print_jobs
    op.add_column("print_jobs", sa.Column(
        "org_id", postgresql.UUID(as_uuid=False),
        sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=True,
    ))
    op.execute(
        """UPDATE print_jobs SET org_id = (
          SELECT u.org_id FROM users u WHERE u.id = print_jobs.owner_id
        ) WHERE owner_id IS NOT NULL"""
    )
    op.execute(
        "UPDATE print_jobs SET org_id = (SELECT id FROM organizations WHERE slug='default') WHERE org_id IS NULL"
    )
    op.create_index("ix_print_jobs_org_id", "print_jobs", ["org_id"])


def downgrade() -> None:
    # Remove org_id from tables
    op.drop_index("ix_print_jobs_org_id", "print_jobs")
    op.drop_column("print_jobs", "org_id")

    op.drop_index("ix_woo_orders_org_id", "woo_orders")
    op.drop_column("woo_orders", "org_id")

    op.drop_index("ix_tags_org_id", "tags")
    op.drop_column("tags", "org_id")

    op.drop_index("ix_products_org_id", "products")
    op.drop_column("products", "org_id")

    # Drop quota and access tables
    op.drop_table("print_quota_usage")
    op.drop_table("agent_access")

    # Remove FK columns added in step e
    op.drop_constraint("fk_orgs_default_agent", "organizations", type_="foreignkey")
    op.drop_column("organizations", "default_agent_id")

    op.drop_constraint("fk_users_default_agent", "users", type_="foreignkey")
    op.drop_column("users", "default_agent_id")

    # Drop agents table
    op.drop_index("ix_agents_org_id", "agents")
    op.drop_index("ix_agents_token", "agents")
    op.drop_table("agents")

    # Remove user columns added in step c
    op.drop_column("users", "is_platform_admin")
    op.drop_column("users", "role")
    op.drop_column("users", "org_id")

    # Drop organizations and plans
    op.drop_index("ix_organizations_stripe_customer_id", "organizations")
    op.drop_index("ix_organizations_slug", "organizations")
    op.drop_table("organizations")
    op.drop_table("plans")

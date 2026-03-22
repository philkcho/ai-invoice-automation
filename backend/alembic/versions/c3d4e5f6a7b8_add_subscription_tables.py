"""add_subscription_tables

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-03-21 11:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # subscription_plans
    op.create_table(
        'subscription_plans',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(50), unique=True, nullable=False),
        sa.Column('display_name', sa.String(100), nullable=False),
        sa.Column('monthly_price', sa.Numeric(10, 2), nullable=False, server_default='0'),
        sa.Column('max_invoices_per_month', sa.Integer(), nullable=False, server_default='20'),
        sa.Column('max_users', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('max_ocr_per_month', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('features', sa.Text(), nullable=True),
        sa.Column('stripe_price_id', sa.String(255), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # subscriptions
    op.create_table(
        'subscriptions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('company_id', UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('plan_id', UUID(as_uuid=True), sa.ForeignKey('subscription_plans.id', ondelete='RESTRICT'), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='trialing'),
        sa.Column('stripe_customer_id', sa.String(255), nullable=True),
        sa.Column('stripe_subscription_id', sa.String(255), nullable=True),
        sa.Column('trial_ends_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_start', sa.DateTime(timezone=True), nullable=True),
        sa.Column('current_period_end', sa.DateTime(timezone=True), nullable=True),
        sa.Column('canceled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_subscriptions_company_id', 'subscriptions', ['company_id'])

    # usage_records
    op.create_table(
        'usage_records',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('company_id', UUID(as_uuid=True), sa.ForeignKey('companies.id', ondelete='CASCADE'), nullable=False),
        sa.Column('year_month', sa.String(7), nullable=False),
        sa.Column('invoice_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('ocr_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('user_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('ix_usage_records_company_id', 'usage_records', ['company_id'])
    op.create_unique_constraint('uq_usage_records_company_month', 'usage_records', ['company_id', 'year_month'])

    # 기본 플랜 데이터 삽입
    import uuid
    op.execute(f"""
        INSERT INTO subscription_plans (id, name, display_name, monthly_price, max_invoices_per_month, max_users, max_ocr_per_month, features, sort_order)
        VALUES
        ('{uuid.uuid4()}', 'free_trial', 'Free Trial', 0, 20, 3, 10, '{{"email_integration": false, "api_access": false, "multi_approval": false, "sso": false, "audit_log": false}}', 0),
        ('{uuid.uuid4()}', 'starter', 'Starter', 49, 100, 5, 50, '{{"email_integration": true, "api_access": false, "multi_approval": false, "sso": false, "audit_log": false}}', 1),
        ('{uuid.uuid4()}', 'professional', 'Professional', 149, 500, 15, 200, '{{"email_integration": true, "api_access": true, "multi_approval": true, "sso": false, "audit_log": true}}', 2),
        ('{uuid.uuid4()}', 'enterprise', 'Enterprise', 0, 0, 0, 0, '{{"email_integration": true, "api_access": true, "multi_approval": true, "sso": true, "audit_log": true}}', 3)
    """)


def downgrade() -> None:
    op.drop_table('usage_records')
    op.drop_table('subscriptions')
    op.drop_table('subscription_plans')

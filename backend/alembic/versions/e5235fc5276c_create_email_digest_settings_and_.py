"""create email digest settings and recipients tables

Revision ID: e5235fc5276c
Revises: d4e5f6a7b8c9
Create Date: 2026-03-23 19:20:53.746602

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e5235fc5276c'
down_revision: Union[str, None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('email_digest_settings',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=False),
    sa.Column('is_active', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('frequency', sa.Enum('daily', 'weekly', 'both', name='digest_frequency_type'), server_default='weekly', nullable=False),
    sa.Column('daily_hour_utc', sa.Integer(), server_default='13', nullable=False, comment='Hour in UTC to send daily digest (0-23)'),
    sa.Column('weekly_day', sa.Integer(), server_default='1', nullable=False, comment='Day of week for weekly digest (0=Mon, 6=Sun)'),
    sa.Column('include_summary', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('include_overdue', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('include_pending', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('include_top_vendors', sa.Boolean(), server_default='false', nullable=False),
    sa.Column('smtp_host', sa.String(length=255), nullable=True),
    sa.Column('smtp_port', sa.Integer(), nullable=True),
    sa.Column('smtp_user', sa.String(length=255), nullable=True),
    sa.Column('smtp_password', sa.Text(), nullable=True, comment='Encrypted SMTP password'),
    sa.Column('smtp_from_name', sa.String(length=100), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_digest_settings_company_id'), 'email_digest_settings', ['company_id'], unique=True)

    op.create_table('email_digest_recipients',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('digest_setting_id', sa.UUID(), nullable=False),
    sa.Column('user_id', sa.UUID(), nullable=True, comment='System user (null = external recipient)'),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('name', sa.String(length=100), nullable=True),
    sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['digest_setting_id'], ['email_digest_settings.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_digest_recipients_digest_setting_id'), 'email_digest_recipients', ['digest_setting_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_email_digest_recipients_digest_setting_id'), table_name='email_digest_recipients')
    op.drop_table('email_digest_recipients')
    op.drop_index(op.f('ix_email_digest_settings_company_id'), table_name='email_digest_settings')
    op.drop_table('email_digest_settings')
    op.execute("DROP TYPE IF EXISTS digest_frequency_type")

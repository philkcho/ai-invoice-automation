"""create email_configurations table

Revision ID: 7c2dfc46a221
Revises: a7b3c4d5e6f7
Create Date: 2026-03-17 00:26:56.427140

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c2dfc46a221'
down_revision: Union[str, None] = 'a7b3c4d5e6f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ENUM 타입 생성
    conn = op.get_bind()
    conn.execute(sa.text(
        "DO $$ BEGIN CREATE TYPE email_provider_type AS ENUM ('GMAIL', 'OUTLOOK'); "
        "EXCEPTION WHEN duplicate_object THEN null; END $$;"
    ))

    op.create_table('email_configurations',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('email_provider', sa.VARCHAR(20), nullable=False),
        sa.Column('email_address', sa.String(length=255), nullable=False),
        sa.Column('credentials_encrypted', sa.Text(), nullable=True, comment='OAuth tokens encrypted with AES-256'),
        sa.Column('filter_keywords', sa.Text(), nullable=True, comment='Subject keywords to filter (comma-separated)'),
        sa.Column('filter_senders', sa.Text(), nullable=True, comment='Allowed sender domains (comma-separated)'),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('last_polled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_message_id', sa.String(length=255), nullable=True, comment='Last processed email message ID'),
        sa.Column('processed_message_ids', sa.Text(), nullable=True, comment='JSON array of recent message IDs (max 500, FIFO)'),
        sa.Column('poll_error_count', sa.Integer(), server_default='0', nullable=False, comment='Consecutive poll errors (reset on success)'),
        sa.Column('last_error_message', sa.Text(), nullable=True, comment='Last polling error message'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_email_configurations_company_id', 'email_configurations', ['company_id'])


def downgrade() -> None:
    op.drop_index('ix_email_configurations_company_id', table_name='email_configurations')
    op.drop_table('email_configurations')

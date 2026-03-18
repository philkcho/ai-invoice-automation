"""add company_policies table

Revision ID: 0f7b22dda68e
Revises: 551fe02942fb
Create Date: 2026-03-17 03:37:01.612136

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0f7b22dda68e'
down_revision: Union[str, None] = '551fe02942fb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('company_policies',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=False),
    sa.Column('policy_name', sa.String(length=200), nullable=False),
    sa.Column('policy_text', sa.Text(), nullable=False),
    sa.Column('category', sa.String(length=20), server_default='GENERAL', nullable=False, comment='APPROVAL | VALIDATION | PAYMENT | GENERAL'),
    sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_company_policies_company_id'), 'company_policies', ['company_id'], unique=False)
    op.create_index('ix_company_policies_lookup', 'company_policies', ['company_id', 'category', 'is_active'], unique=False)


def downgrade() -> None:
    op.drop_index('ix_company_policies_lookup', table_name='company_policies')
    op.drop_index(op.f('ix_company_policies_company_id'), table_name='company_policies')
    op.drop_table('company_policies')

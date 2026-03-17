"""add recurring_amounts table

Revision ID: 510011699660
Revises: 8d1a389117ce
Create Date: 2026-03-17 01:12:58.630738

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '510011699660'
down_revision: Union[str, None] = '8d1a389117ce'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('recurring_amounts',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=False),
    sa.Column('vendor_id', sa.UUID(), nullable=True),
    sa.Column('description', sa.String(length=500), nullable=False),
    sa.Column('monthly_amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('currency', sa.String(length=3), server_default='USD', nullable=False),
    sa.Column('effective_from', sa.Date(), nullable=False),
    sa.Column('effective_to', sa.Date(), nullable=True),
    sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_recurring_amounts_company_id'), 'recurring_amounts', ['company_id'], unique=False)
    op.create_index(op.f('ix_recurring_amounts_vendor_id'), 'recurring_amounts', ['vendor_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_recurring_amounts_vendor_id'), table_name='recurring_amounts')
    op.drop_index(op.f('ix_recurring_amounts_company_id'), table_name='recurring_amounts')
    op.drop_table('recurring_amounts')

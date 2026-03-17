"""add linkage_details table

Revision ID: ab0340182ac2
Revises: 510011699660
Create Date: 2026-03-17 02:21:03.705641

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ab0340182ac2'
down_revision: Union[str, None] = '510011699660'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('linkage_details',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=False),
    sa.Column('invoice_type_id', sa.UUID(), nullable=False),
    sa.Column('linkage_no', sa.String(length=100), nullable=False),
    sa.Column('vendor_id', sa.UUID(), nullable=True),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['invoice_type_id'], ['invoice_types.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_linkage_details_company_id'), 'linkage_details', ['company_id'], unique=False)
    op.create_index(op.f('ix_linkage_details_invoice_type_id'), 'linkage_details', ['invoice_type_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_linkage_details_invoice_type_id'), table_name='linkage_details')
    op.drop_index(op.f('ix_linkage_details_company_id'), table_name='linkage_details')
    op.drop_table('linkage_details')

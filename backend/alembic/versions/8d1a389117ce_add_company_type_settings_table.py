"""add company_type_settings table

Revision ID: 8d1a389117ce
Revises: 7c2dfc46a221
Create Date: 2026-03-17 01:00:42.913821

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d1a389117ce'
down_revision: Union[str, None] = '7c2dfc46a221'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('company_type_settings',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('company_id', sa.UUID(), nullable=False),
    sa.Column('invoice_type_id', sa.UUID(), nullable=False),
    sa.Column('link_enabled', sa.Boolean(), server_default='false', nullable=False, comment='true=연계, false=연계안함'),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='RESTRICT'),
    sa.ForeignKeyConstraint(['invoice_type_id'], ['invoice_types.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('company_id', 'invoice_type_id', name='uq_company_type_setting')
    )
    op.create_index(op.f('ix_company_type_settings_company_id'), 'company_type_settings', ['company_id'], unique=False)
    op.create_index(op.f('ix_company_type_settings_invoice_type_id'), 'company_type_settings', ['invoice_type_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_company_type_settings_invoice_type_id'), table_name='company_type_settings')
    op.drop_index(op.f('ix_company_type_settings_company_id'), table_name='company_type_settings')
    op.drop_table('company_type_settings')

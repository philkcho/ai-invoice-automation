"""add amount_invoiced and amount_remaining to linkage_details

Revision ID: 61066fef6b1d
Revises: ab0340182ac2
Create Date: 2026-03-17 02:26:55.670982

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '61066fef6b1d'
down_revision: Union[str, None] = 'ab0340182ac2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('linkage_details', sa.Column('amount_invoiced', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False, comment='Total invoiced so far'))
    op.add_column('linkage_details', sa.Column('amount_remaining', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False, comment='Remaining balance (amount - amount_invoiced)'))


def downgrade() -> None:
    op.drop_column('linkage_details', 'amount_remaining')
    op.drop_column('linkage_details', 'amount_invoiced')

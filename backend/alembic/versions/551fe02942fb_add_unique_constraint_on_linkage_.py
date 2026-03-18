"""add unique constraint on linkage_details linkage_no

Revision ID: 551fe02942fb
Revises: 61066fef6b1d
Create Date: 2026-03-17 03:01:46.787747

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '551fe02942fb'
down_revision: Union[str, None] = '61066fef6b1d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_unique_constraint('uq_linkage_details_company_linkage_no', 'linkage_details', ['company_id', 'linkage_no'])


def downgrade() -> None:
    op.drop_constraint('uq_linkage_details_company_linkage_no', 'linkage_details', type_='unique')

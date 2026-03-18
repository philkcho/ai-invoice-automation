"""remove sort_order from company_policies

Revision ID: 941b2c33a56f
Revises: 0f7b22dda68e
Create Date: 2026-03-17 04:20:22.516715

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '941b2c33a56f'
down_revision: Union[str, None] = '0f7b22dda68e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('company_policies', 'sort_order')


def downgrade() -> None:
    op.add_column('company_policies', sa.Column('sort_order', sa.INTEGER(), server_default=sa.text('0'), autoincrement=False, nullable=False))

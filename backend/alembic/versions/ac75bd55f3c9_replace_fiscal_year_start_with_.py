"""replace fiscal_year_start with established_date

Revision ID: ac75bd55f3c9
Revises: 941b2c33a56f
Create Date: 2026-03-20 14:57:10.971915

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ac75bd55f3c9'
down_revision: Union[str, None] = '941b2c33a56f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('companies', sa.Column('established_date', sa.Date(), nullable=True, comment='회사 등록일'))
    op.drop_column('companies', 'fiscal_year_start')


def downgrade() -> None:
    op.add_column('companies', sa.Column('fiscal_year_start', sa.VARCHAR(length=5), server_default=sa.text("'01-01'::character varying"), autoincrement=False, nullable=False, comment='MM-DD format'))
    op.drop_column('companies', 'established_date')

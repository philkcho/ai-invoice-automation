"""remove s3_bucket_prefix from companies

Revision ID: bce975628fe9
Revises: ac75bd55f3c9
Create Date: 2026-03-20 16:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'bce975628fe9'
down_revision: Union[str, None] = 'ac75bd55f3c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('companies', 's3_bucket_prefix')


def downgrade() -> None:
    op.add_column('companies', sa.Column('s3_bucket_prefix', sa.VARCHAR(length=100), autoincrement=False, nullable=True))

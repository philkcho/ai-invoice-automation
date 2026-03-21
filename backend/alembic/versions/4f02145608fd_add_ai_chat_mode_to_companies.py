"""add_ai_chat_mode_to_companies

Revision ID: 4f02145608fd
Revises: bce975628fe9
Create Date: 2026-03-21 00:37:20.176567

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4f02145608fd'
down_revision: Union[str, None] = 'bce975628fe9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('companies', sa.Column(
        'ai_chat_mode', sa.String(length=20),
        server_default='invoice_only', nullable=False,
        comment='AI chat mode: invoice_only or hybrid',
    ))


def downgrade() -> None:
    op.drop_column('companies', 'ai_chat_mode')

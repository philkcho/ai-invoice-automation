"""update_subscription_plan_prices

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-03-21 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'd4e5f6a7b8c9'
down_revision: Union[str, None] = 'c3d4e5f6a7b8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Stripe Sandbox 연동을 위한 플랜 가격 조정
    op.execute("""
        UPDATE subscription_plans SET monthly_price = 29 WHERE name = 'starter';
    """)
    op.execute("""
        UPDATE subscription_plans SET monthly_price = 79 WHERE name = 'professional';
    """)
    op.execute("""
        UPDATE subscription_plans SET monthly_price = 199 WHERE name = 'enterprise';
    """)


def downgrade() -> None:
    # 원래 가격으로 복원
    op.execute("""
        UPDATE subscription_plans SET monthly_price = 49 WHERE name = 'starter';
    """)
    op.execute("""
        UPDATE subscription_plans SET monthly_price = 149 WHERE name = 'professional';
    """)
    op.execute("""
        UPDATE subscription_plans SET monthly_price = 0 WHERE name = 'enterprise';
    """)

"""add_approval_level_and_approver_user_id

Revision ID: a1b2c3d4e5f6
Revises: 4f02145608fd
Create Date: 2026-03-20 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '4f02145608fd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # users 테이블에 approval_level 추가
    op.add_column('users', sa.Column(
        'approval_level', sa.Integer(), nullable=False, server_default='0',
        comment='조직 레벨 (0=없음, 1-5=승인 레벨)',
    ))

    # approval_settings 테이블에 approver_user_id 추가
    op.add_column('approval_settings', sa.Column(
        'approver_user_id', sa.UUID(), nullable=True,
        comment='지정 승인자 (NULL=역할 기반 폴백)',
    ))
    op.create_foreign_key(
        'fk_approval_settings_approver_user',
        'approval_settings', 'users',
        ['approver_user_id'], ['id'],
        ondelete='SET NULL',
    )

    # step_approver_role을 nullable로 변경
    op.alter_column('approval_settings', 'step_approver_role',
        existing_type=sa.Enum('APPROVER', 'COMPANY_ADMIN', name='approver_role_type'),
        nullable=True,
        comment='하위호환용 — approver_user_id 지정 시 자동 파생',
    )


def downgrade() -> None:
    # step_approver_role을 NOT NULL로 복원
    op.alter_column('approval_settings', 'step_approver_role',
        existing_type=sa.Enum('APPROVER', 'COMPANY_ADMIN', name='approver_role_type'),
        nullable=False,
    )

    # FK 및 컬럼 삭제
    op.drop_constraint('fk_approval_settings_approver_user', 'approval_settings', type_='foreignkey')
    op.drop_column('approval_settings', 'approver_user_id')
    op.drop_column('users', 'approval_level')

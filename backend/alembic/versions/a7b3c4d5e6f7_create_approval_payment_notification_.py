"""create approval_settings, invoice_approvals, invoice_payments, notifications tables

Revision ID: a7b3c4d5e6f7
Revises: 107942078da9
Create Date: 2026-03-16 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a7b3c4d5e6f7'
down_revision: Union[str, None] = '107942078da9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── ENUM 타입 생성 ────────────────────────────────
    approver_role_type = sa.Enum('APPROVER', 'COMPANY_ADMIN', name='approver_role_type')
    approver_role_type.create(op.get_bind(), checkfirst=True)

    approval_status = sa.Enum('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', name='approval_status')
    approval_status.create(op.get_bind(), checkfirst=True)

    payment_method_type = sa.Enum('ACH', 'CHECK', 'WIRE', 'CREDIT_CARD', name='payment_method_type')
    payment_method_type.create(op.get_bind(), checkfirst=True)

    payment_status_type = sa.Enum('SCHEDULED', 'PROCESSING', 'PAID', 'FAILED', 'VOID', name='payment_status_type')
    payment_status_type.create(op.get_bind(), checkfirst=True)

    notification_type = sa.Enum(
        'APPROVAL_REQUEST', 'INVOICE_APPROVED', 'INVOICE_REJECTED',
        'VALIDATION_FAIL', 'VALIDATION_OVERRIDDEN', 'CONTRACT_EXPIRY',
        'PAYMENT_DUE', 'EMAIL_RECEIVED', 'OCR_REVIEW_NEEDED',
        'OCR_FAILED', 'PO_OVER_BUDGET', 'TAX_EXEMPT_EXPIRED',
        name='notification_type',
    )
    notification_type.create(op.get_bind(), checkfirst=True)

    # ── approval_settings ─────────────────────────────
    op.create_table('approval_settings',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('invoice_type_id', sa.UUID(), nullable=True, comment='NULL = 모든 인보이스 타입에 적용'),
        sa.Column('amount_threshold_min', sa.Numeric(precision=12, scale=2), server_default='0', nullable=False),
        sa.Column('amount_threshold_max', sa.Numeric(precision=12, scale=2), nullable=True, comment='NULL = 무제한'),
        sa.Column('step', sa.Integer(), nullable=False, comment='승인 단계 번호 (1, 2, 3...)'),
        sa.Column('step_approver_role', sa.Enum('APPROVER', 'COMPANY_ADMIN', name='approver_role_type', create_type=False), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['invoice_type_id'], ['invoice_types.id'], ondelete='RESTRICT'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_approval_settings_company_id', 'approval_settings', ['company_id'])
    op.create_index('ix_approval_settings_lookup', 'approval_settings', ['company_id', 'invoice_type_id', 'is_active'])

    # ── invoice_approvals ─────────────────────────────
    op.create_table('invoice_approvals',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('invoice_id', sa.UUID(), nullable=False),
        sa.Column('submission_round', sa.Integer(), server_default='1', nullable=False, comment='제출 회차 (validation_results와 동일 기준)'),
        sa.Column('step', sa.Integer(), nullable=False, comment='승인 단계 (1, 2, 3...)'),
        sa.Column('approver_role', sa.Enum('APPROVER', 'COMPANY_ADMIN', name='approver_role_type', create_type=False), nullable=False, comment='배정 기준 역할'),
        sa.Column('approver_id', sa.UUID(), nullable=True, comment='NULL=미지정, 액션 시 업데이트'),
        sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED', name='approval_status', create_type=False), server_default='PENDING', nullable=False),
        sa.Column('action_at', sa.DateTime(timezone=True), nullable=True, comment='승인/거절 처리 시각'),
        sa.Column('comments', sa.Text(), nullable=True),
        sa.Column('rejection_reason', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['approver_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_invoice_approvals_company_id', 'invoice_approvals', ['company_id'])
    op.create_index('ix_invoice_approvals_invoice_id', 'invoice_approvals', ['invoice_id'])
    op.create_index('ix_invoice_approvals_lookup', 'invoice_approvals', ['invoice_id', 'submission_round'])
    op.create_index('ix_invoice_approvals_status', 'invoice_approvals', ['company_id', 'status'])

    # ── invoice_payments ──────────────────────────────
    op.create_table('invoice_payments',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('invoice_id', sa.UUID(), nullable=False),
        sa.Column('payment_method', sa.Enum('ACH', 'CHECK', 'WIRE', 'CREDIT_CARD', name='payment_method_type', create_type=False), nullable=False),
        sa.Column('payment_status', sa.Enum('SCHEDULED', 'PROCESSING', 'PAID', 'FAILED', 'VOID', name='payment_status_type', create_type=False), server_default='SCHEDULED', nullable=False),
        sa.Column('scheduled_date', sa.Date(), nullable=True),
        sa.Column('paid_date', sa.Date(), nullable=True),
        sa.Column('amount_paid', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('transaction_ref', sa.String(length=100), nullable=True),
        sa.Column('bank_name', sa.String(length=255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_by', sa.UUID(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['invoice_id'], ['invoices.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_invoice_payments_company_id', 'invoice_payments', ['company_id'])
    op.create_index('ix_invoice_payments_invoice_id', 'invoice_payments', ['invoice_id'])

    # ── notifications ─────────────────────────────────
    op.create_table('notifications',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('company_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('type', sa.Enum(
            'APPROVAL_REQUEST', 'INVOICE_APPROVED', 'INVOICE_REJECTED',
            'VALIDATION_FAIL', 'VALIDATION_OVERRIDDEN', 'CONTRACT_EXPIRY',
            'PAYMENT_DUE', 'EMAIL_RECEIVED', 'OCR_REVIEW_NEEDED',
            'OCR_FAILED', 'PO_OVER_BUDGET', 'TAX_EXEMPT_EXPIRED',
            name='notification_type', create_type=False,
        ), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('entity_type', sa.String(length=50), nullable=True, comment='관련 엔티티 종류 (invoice, vendor 등)'),
        sa.Column('entity_id', sa.UUID(), nullable=True, comment='관련 레코드 ID'),
        sa.Column('is_read', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('email_sent', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['company_id'], ['companies.id'], ondelete='RESTRICT'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_notifications_company_id', 'notifications', ['company_id'])
    op.create_index('ix_notifications_user_id', 'notifications', ['user_id'])


def downgrade() -> None:
    op.drop_table('notifications')
    op.drop_table('invoice_payments')
    op.drop_table('invoice_approvals')
    op.drop_table('approval_settings')

    # ENUM 타입 삭제
    sa.Enum(name='notification_type').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='payment_status_type').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='payment_method_type').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='approval_status').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='approver_role_type').drop(op.get_bind(), checkfirst=True)

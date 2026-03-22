import uuid
from datetime import datetime

from sqlalchemy import (
    Text, Integer, Enum as SAEnum,
    DateTime, ForeignKey, func, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class InvoiceApproval(Base):
    __tablename__ = "invoice_approvals"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    invoice_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoices.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    submission_round: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="1",
        comment="제출 회차 (validation_results와 동일 기준)",
    )
    step: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="승인 단계 (1, 2, 3...)",
    )
    approver_role: Mapped[str] = mapped_column(
        SAEnum("APPROVER", "COMPANY_ADMIN", name="approver_role_type", create_type=False),
        nullable=False,
        comment="배정 기준 역할",
    )
    approver_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        comment="NULL=미지정, 액션 시 업데이트",
    )
    status: Mapped[str] = mapped_column(
        SAEnum("PENDING", "APPROVED", "REJECTED", "CANCELLED", name="approval_status"),
        nullable=False,
        server_default="PENDING",
    )
    action_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), comment="승인/거절 처리 시각",
    )
    comments: Mapped[str | None] = mapped_column(Text)
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    company = relationship("Company", lazy="selectin")
    invoice = relationship("Invoice", lazy="selectin")
    approver = relationship("User", lazy="selectin", foreign_keys=[approver_id])

    __table_args__ = (
        Index("ix_invoice_approvals_lookup", "invoice_id", "submission_round"),
        Index("ix_invoice_approvals_status", "company_id", "status"),
    )

    def __repr__(self) -> str:
        return (
            f"<InvoiceApproval invoice={self.invoice_id} "
            f"step={self.step} status={self.status}>"
        )

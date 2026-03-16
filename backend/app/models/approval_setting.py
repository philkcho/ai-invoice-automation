import uuid
from datetime import datetime

from sqlalchemy import (
    Integer, Boolean, Enum as SAEnum,
    DateTime, ForeignKey, Numeric, func, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class ApprovalSetting(Base):
    __tablename__ = "approval_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    invoice_type_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoice_types.id", ondelete="RESTRICT"),
        nullable=True,
        comment="NULL = 모든 인보이스 타입에 적용",
    )
    amount_threshold_min: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0",
    )
    amount_threshold_max: Mapped[float | None] = mapped_column(
        Numeric(12, 2), nullable=True,
        comment="NULL = 무제한",
    )
    step: Mapped[int] = mapped_column(
        Integer, nullable=False, comment="승인 단계 번호 (1, 2, 3...)",
    )
    step_approver_role: Mapped[str] = mapped_column(
        SAEnum("APPROVER", "COMPANY_ADMIN", name="approver_role_type"),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), onupdate=func.now(),
    )

    # Relationships
    company = relationship("Company", lazy="selectin")
    invoice_type = relationship("InvoiceType", lazy="selectin")

    __table_args__ = (
        Index(
            "ix_approval_settings_lookup",
            "company_id", "invoice_type_id", "is_active",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<ApprovalSetting company={self.company_id} "
            f"step={self.step} role={self.step_approver_role}>"
        )

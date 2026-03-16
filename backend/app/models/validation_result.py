import uuid
from datetime import datetime

from sqlalchemy import (
    String, Text, Integer, Enum as SAEnum,
    DateTime, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ValidationResult(Base):
    __tablename__ = "validation_results"

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
    )
    layer: Mapped[str] = mapped_column(
        SAEnum("GLOBAL", "TYPE", "CONTRACT", name="validation_layer"),
        nullable=False,
    )
    rule_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, comment="원본 규칙 ID (참고용)",
    )
    rule_table: Mapped[str | None] = mapped_column(
        String(50), comment="FK 대상 테이블명",
    )
    rule_name: Mapped[str | None] = mapped_column(String(255))
    condition_name: Mapped[str | None] = mapped_column(String(255))
    result: Mapped[str] = mapped_column(
        SAEnum("PASS", "FAIL", "WARNING", "OVERRIDDEN", name="validation_result_status"),
        nullable=False,
    )
    reason: Mapped[str | None] = mapped_column(Text)
    override_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    override_reason: Mapped[str | None] = mapped_column(Text)
    checked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    def __repr__(self) -> str:
        return f"<ValidationResult {self.layer}/{self.rule_name}: {self.result}>"

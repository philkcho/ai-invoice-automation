import uuid
from datetime import datetime

from sqlalchemy import (
    String, Text, Boolean, Enum as SAEnum,
    DateTime, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[str] = mapped_column(
        SAEnum(
            "APPROVAL_REQUEST",
            "INVOICE_APPROVED",
            "INVOICE_REJECTED",
            "VALIDATION_FAIL",
            "VALIDATION_OVERRIDDEN",
            "CONTRACT_EXPIRY",
            "PAYMENT_DUE",
            "EMAIL_RECEIVED",
            "OCR_REVIEW_NEEDED",
            "OCR_FAILED",
            "PO_OVER_BUDGET",
            "TAX_EXEMPT_EXPIRED",
            name="notification_type",
        ),
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str | None] = mapped_column(Text)
    entity_type: Mapped[str | None] = mapped_column(
        String(50), comment="관련 엔티티 종류 (invoice, vendor 등)",
    )
    entity_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), comment="관련 레코드 ID",
    )
    is_read: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false",
    )
    email_sent: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    company = relationship("Company", lazy="selectin")
    user = relationship("User", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Notification {self.type} -> user={self.user_id}>"

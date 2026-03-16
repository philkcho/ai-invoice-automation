import uuid
from datetime import datetime, date

from sqlalchemy import (
    String, Text, Date, Enum as SAEnum,
    DateTime, ForeignKey, Numeric, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class InvoicePayment(Base):
    __tablename__ = "invoice_payments"

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
    payment_method: Mapped[str] = mapped_column(
        SAEnum("ACH", "CHECK", "WIRE", "CREDIT_CARD", name="payment_method_type"),
        nullable=False,
    )
    payment_status: Mapped[str] = mapped_column(
        SAEnum("SCHEDULED", "PROCESSING", "PAID", "FAILED", "VOID", name="payment_status_type"),
        nullable=False,
        server_default="SCHEDULED",
    )
    scheduled_date: Mapped[date | None] = mapped_column(Date)
    paid_date: Mapped[date | None] = mapped_column(Date)
    amount_paid: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False,
    )
    transaction_ref: Mapped[str | None] = mapped_column(String(100))
    bank_name: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
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
    invoice = relationship("Invoice", lazy="selectin")
    creator = relationship("User", lazy="selectin")

    def __repr__(self) -> str:
        return (
            f"<InvoicePayment invoice={self.invoice_id} "
            f"{self.payment_method} {self.payment_status}>"
        )

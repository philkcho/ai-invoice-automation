import uuid
from datetime import datetime, date

from sqlalchemy import (
    String, Text, Integer, Boolean, Date,
    Enum as SAEnum, DateTime, ForeignKey, Numeric, func, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        Index("idx_invoices_company_status", "company_id", "status"),
        Index("idx_invoices_company_created", "company_id", "created_at"),
        Index("idx_invoices_company_due_date", "company_id", "due_date"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    vendor_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vendors.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    invoice_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoice_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    invoice_number: Mapped[str | None] = mapped_column(String(100))
    invoice_date: Mapped[date | None] = mapped_column(Date)
    due_date: Mapped[date | None] = mapped_column(Date)
    amount_subtotal: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )
    amount_tax: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )
    amount_total: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0"
    )
    currency_original: Mapped[str] = mapped_column(
        String(10), nullable=False, server_default="USD"
    )
    amount_original: Mapped[float | None] = mapped_column(Numeric(15, 2))
    exchange_rate_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True,
    )
    po_number: Mapped[str | None] = mapped_column(String(100))
    po_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchase_orders.id", ondelete="SET NULL"),
        nullable=True,
    )
    source_channel: Mapped[str] = mapped_column(
        SAEnum("UPLOAD", "GMAIL", "OUTLOOK", "MANUAL", name="source_channel"),
        nullable=False,
    )
    source_email: Mapped[str | None] = mapped_column(String(255))
    file_path: Mapped[str | None] = mapped_column(String(500))
    raw_text: Mapped[str | None] = mapped_column(Text)
    ocr_status: Mapped[str | None] = mapped_column(
        SAEnum("PENDING", "COMPLETED", "FAILED", "CORRECTED", name="ocr_status"),
    )
    status: Mapped[str] = mapped_column(
        SAEnum(
            "RECEIVED", "OCR_REVIEW", "PENDING", "SUBMITTED",
            "REVIEW_NEEDED", "IN_APPROVAL", "APPROVED", "REJECTED",
            "SCHEDULED", "PAID", "VOID",
            name="invoice_status",
        ),
        nullable=False,
        server_default="RECEIVED",
    )
    validation_status: Mapped[str | None] = mapped_column(
        SAEnum("PENDING", "PASS", "FAIL", "WARNING", "OVERRIDDEN", name="validation_status"),
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text)
    submission_round: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="1",
        comment="제출 횟수 (최초 1, 재제출마다 +1)",
    )
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
    vendor = relationship("Vendor", lazy="selectin")
    invoice_type = relationship("InvoiceType", lazy="selectin")
    purchase_order = relationship("PurchaseOrder", lazy="selectin")
    line_items = relationship("InvoiceLineItem", back_populates="invoice", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Invoice {self.invoice_number} ({self.status})>"

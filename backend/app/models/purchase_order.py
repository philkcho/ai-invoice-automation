import uuid
from datetime import datetime, date

from sqlalchemy import (
    String, Text, Date, Enum as SAEnum,
    DateTime, ForeignKey, Numeric, func, UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PurchaseOrder(Base):
    __tablename__ = "purchase_orders"

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
    po_number: Mapped[str] = mapped_column(
        String(100), nullable=False, comment="UNIQUE per company_id"
    )
    po_date: Mapped[date] = mapped_column(Date, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    amount_total: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, comment="Total PO amount (USD)"
    )
    amount_invoiced: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0",
        comment="Total invoiced so far",
    )
    amount_remaining: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0",
        comment="Remaining balance",
    )
    status: Mapped[str] = mapped_column(
        SAEnum(
            "OPEN", "PARTIALLY_INVOICED", "FULLY_INVOICED", "CLOSED", "CANCELLED",
            name="po_status",
        ),
        nullable=False,
        server_default="OPEN",
    )
    file_path: Mapped[str | None] = mapped_column(String(500))
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
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    __table_args__ = (
        UniqueConstraint("company_id", "po_number", name="uq_po_company_number"),
    )

    # Relationships
    company = relationship("Company", lazy="selectin")
    vendor = relationship("Vendor", lazy="selectin")
    lines = relationship("PurchaseOrderLine", back_populates="purchase_order", lazy="selectin")

    def __repr__(self) -> str:
        return f"<PurchaseOrder {self.po_number} ({self.status})>"

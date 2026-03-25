import uuid
from datetime import datetime, date

from sqlalchemy import (
    String, Text, Boolean, Date, Integer,
    DateTime, ForeignKey, Numeric, func, Index,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class VendorContract(Base):
    __tablename__ = "vendor_contracts"
    __table_args__ = (
        Index("idx_contracts_vendor_active", "vendor_id", "is_active"),
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
        ForeignKey("vendors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    invoice_type_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, comment="NULL = all invoice types"
    )
    contract_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contract_number: Mapped[str | None] = mapped_column(String(100))
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiry_warning_days: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="30"
    )
    max_order_amount: Mapped[float | None] = mapped_column(Numeric(12, 2))
    allowed_categories: Mapped[str | None] = mapped_column(Text)
    contracted_prices: Mapped[dict | None] = mapped_column(
        JSONB, comment="Item → unit price mapping"
    )
    price_tolerance_pct: Mapped[float | None] = mapped_column(Numeric(5, 2))
    notes: Mapped[str | None] = mapped_column(Text)
    file_path: Mapped[str | None] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
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

    # Relationships
    vendor = relationship("Vendor", back_populates="contracts", lazy="selectin")
    company = relationship("Company", lazy="selectin")

    def __repr__(self) -> str:
        return f"<VendorContract {self.contract_name} ({self.vendor_id})>"

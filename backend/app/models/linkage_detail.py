import uuid
from datetime import datetime

from sqlalchemy import (
    String, Numeric, DateTime, ForeignKey, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class LinkageDetail(Base):
    __tablename__ = "linkage_details"
    __table_args__ = (
        UniqueConstraint("company_id", "linkage_no", name="uq_linkage_details_company_linkage_no"),
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
    invoice_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoice_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    linkage_no: Mapped[str] = mapped_column(String(100), nullable=False)
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vendors.id", ondelete="RESTRICT"),
        nullable=True,
    )
    amount: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0",
    )
    amount_invoiced: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0",
        comment="Total invoiced so far",
    )
    amount_remaining: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, server_default="0",
        comment="Remaining balance (amount - amount_invoiced)",
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
    company = relationship("Company", lazy="selectin")
    invoice_type = relationship("InvoiceType", lazy="selectin")
    vendor = relationship("Vendor", lazy="selectin")

    def __repr__(self) -> str:
        return f"<LinkageDetail {self.linkage_no}: {self.amount}>"

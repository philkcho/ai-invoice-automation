import uuid
from datetime import datetime

from sqlalchemy import (
    String, Text, Boolean, Date, Enum as SAEnum,
    DateTime, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="NULL = shared pool",
    )
    vendor_code: Mapped[str] = mapped_column(String(20), nullable=False)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dba: Mapped[str | None] = mapped_column(String(255))
    ein: Mapped[str | None] = mapped_column(String(20))
    ein_normalized: Mapped[str | None] = mapped_column(
        String(20), index=True, comment="하이픈/공백 제거된 EIN"
    )
    w9_submitted: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    w9_file_path: Mapped[str | None] = mapped_column(String(500))
    is_1099_required: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    is_tax_exempt: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false"
    )
    tax_exempt_cert_path: Mapped[str | None] = mapped_column(String(500))
    tax_exempt_expiry_date: Mapped[datetime | None] = mapped_column(Date)
    website: Mapped[str | None] = mapped_column(String(255))
    vendor_category: Mapped[str | None] = mapped_column(
        SAEnum("SERVICE", "PRODUCT", "BOTH", name="vendor_category")
    )
    status: Mapped[str] = mapped_column(
        SAEnum("ACTIVE", "INACTIVE", name="vendor_status"),
        nullable=False,
        server_default="ACTIVE",
    )
    # Billing address
    billing_address: Mapped[str | None] = mapped_column(Text)
    billing_city: Mapped[str | None] = mapped_column(String(100))
    billing_state: Mapped[str | None] = mapped_column(String(50))
    billing_zip: Mapped[str | None] = mapped_column(String(20))
    # Shipping address
    shipping_address: Mapped[str | None] = mapped_column(Text)
    shipping_city: Mapped[str | None] = mapped_column(String(100))
    shipping_state: Mapped[str | None] = mapped_column(String(50))
    shipping_zip: Mapped[str | None] = mapped_column(String(20))
    # Contact
    contact_name: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(50))
    contact_email: Mapped[str | None] = mapped_column(String(255))
    # Payment
    payment_terms: Mapped[str | None] = mapped_column(String(50))
    bank_name: Mapped[str | None] = mapped_column(String(255))
    ach_routing: Mapped[str | None] = mapped_column(
        String(500), comment="Encrypted (AES-256)"
    )
    ach_account: Mapped[str | None] = mapped_column(
        String(500), comment="Encrypted (AES-256)"
    )
    # Internal
    internal_buyer: Mapped[str | None] = mapped_column(
        String(255), comment="사내 담당 구매자 (free text)"
    )
    approved_by: Mapped[str | None] = mapped_column(
        String(255), comment="벤더 등록 승인자 (free text)"
    )
    notes: Mapped[str | None] = mapped_column(Text)
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
    contracts = relationship("VendorContract", back_populates="vendor", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Vendor {self.vendor_code}: {self.company_name}>"

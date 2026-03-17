import uuid
from datetime import datetime, date

from sqlalchemy import (
    String, Text, Numeric, Date, Boolean,
    DateTime, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class RecurringAmount(Base):
    __tablename__ = "recurring_amounts"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    vendor_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("vendors.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    monthly_amount: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False,
    )
    currency: Mapped[str] = mapped_column(
        String(3), nullable=False, server_default="USD",
    )
    effective_from: Mapped[date] = mapped_column(Date, nullable=False)
    effective_to: Mapped[date | None] = mapped_column(Date, nullable=True)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true",
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
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
    vendor = relationship("Vendor", lazy="selectin")

    def __repr__(self) -> str:
        return f"<RecurringAmount {self.description}: {self.monthly_amount}>"

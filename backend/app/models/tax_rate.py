import uuid
from datetime import datetime, date

from sqlalchemy import (
    String, Text, Boolean, Date, Enum as SAEnum,
    DateTime, ForeignKey, Numeric, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TaxRate(Base):
    __tablename__ = "tax_rates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="NULL = system default",
    )
    tax_name: Mapped[str] = mapped_column(String(100), nullable=False)
    tax_type: Mapped[str] = mapped_column(
        SAEnum("FEDERAL", "STATE_SALES", "STATE_USE", "EXEMPT", name="tax_type"),
        nullable=False,
    )
    state_code: Mapped[str | None] = mapped_column(
        String(5), index=True, comment="e.g. CA, NY, TX"
    )
    rate_pct: Mapped[float] = mapped_column(
        Numeric(6, 4), nullable=False, comment="e.g. 8.2500"
    )
    effective_date: Mapped[date] = mapped_column(Date, nullable=False)
    expiry_date: Mapped[date | None] = mapped_column(
        Date, comment="NULL = current rate"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
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

    def __repr__(self) -> str:
        return f"<TaxRate {self.tax_name} ({self.state_code}: {self.rate_pct}%)>"

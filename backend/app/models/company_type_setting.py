import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, DateTime, ForeignKey, UniqueConstraint, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CompanyTypeSetting(Base):
    __tablename__ = "company_type_settings"
    __table_args__ = (
        UniqueConstraint("company_id", "invoice_type_id", name="uq_company_type_setting"),
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
    link_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false",
        comment="true=연계, false=연계안함",
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

    def __repr__(self) -> str:
        return f"<CompanyTypeSetting company={self.company_id} type={self.invoice_type_id} link={self.link_enabled}>"

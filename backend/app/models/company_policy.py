import uuid
from datetime import datetime

from sqlalchemy import (
    String, Text, Boolean,
    DateTime, ForeignKey, func, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class CompanyPolicy(Base):
    __tablename__ = "company_policies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    policy_name: Mapped[str] = mapped_column(
        String(200), nullable=False,
    )
    policy_text: Mapped[str] = mapped_column(
        Text, nullable=False,
    )
    category: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="GENERAL",
        comment="APPROVAL | VALIDATION | PAYMENT | GENERAL",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true",
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

    __table_args__ = (
        Index(
            "ix_company_policies_lookup",
            "company_id", "category", "is_active",
        ),
    )

    def __repr__(self) -> str:
        return (
            f"<CompanyPolicy company={self.company_id} "
            f"name={self.policy_name!r} category={self.category}>"
        )

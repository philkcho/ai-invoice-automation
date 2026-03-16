import uuid
from datetime import datetime

from sqlalchemy import (
    String, Text, Boolean, Enum as SAEnum,
    DateTime, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class GlobalValidationRule(Base):
    __tablename__ = "global_validation_rules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="NULL = system template",
    )
    parent_rule_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("global_validation_rules.id", ondelete="SET NULL"),
        nullable=True,
        comment="Inherited from parent rule",
    )
    rule_name: Mapped[str] = mapped_column(String(255), nullable=False)
    rule_type: Mapped[str] = mapped_column(
        SAEnum(
            "MAX_AMOUNT", "PAYMENT_TERMS", "REQUIRED_DOC",
            "DUPLICATE_CHECK", "DUE_DATE", "ANNUAL_LIMIT",
            name="global_rule_type",
        ),
        nullable=False,
    )
    severity: Mapped[str] = mapped_column(
        SAEnum("FAIL", "WARNING", name="rule_severity"),
        nullable=False,
    )
    config: Mapped[dict | None] = mapped_column(
        JSONB, comment="Rule-type specific config values"
    )
    apply_to_category: Mapped[str | None] = mapped_column(
        String(100), comment="NULL = all categories"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    description: Mapped[str | None] = mapped_column(Text)
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
    company = relationship("Company", lazy="selectin")
    parent_rule = relationship("GlobalValidationRule", remote_side=[id], lazy="selectin")

    def __repr__(self) -> str:
        return f"<GlobalRule {self.rule_name} ({self.rule_type})>"

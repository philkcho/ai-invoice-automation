import uuid
from datetime import datetime

from sqlalchemy import (
    String, Text, Boolean,
    DateTime, ForeignKey, func, Index,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TypeRuleSet(Base):
    __tablename__ = "type_rule_sets"
    __table_args__ = (
        Index("idx_type_rules_company_type", "company_id", "invoice_type_id", "is_active"),
    )

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
    invoice_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("invoice_types.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    parent_rule_set_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("type_rule_sets.id", ondelete="SET NULL"),
        nullable=True,
        comment="Inherited from parent rule set",
    )
    rule_set_name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
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
    company = relationship("Company", lazy="selectin")
    invoice_type = relationship("InvoiceType", lazy="selectin")
    parent_rule_set = relationship("TypeRuleSet", remote_side=[id], lazy="selectin")
    conditions = relationship("TypeRuleCondition", back_populates="rule_set", lazy="selectin")

    def __repr__(self) -> str:
        return f"<TypeRuleSet {self.rule_set_name}>"

import uuid
from datetime import datetime

from sqlalchemy import (
    String, Text, Boolean, Integer, Enum as SAEnum,
    DateTime, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class TypeRuleCondition(Base):
    __tablename__ = "type_rule_conditions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    rule_set_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("type_rule_sets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    condition_name: Mapped[str] = mapped_column(String(255), nullable=False)
    condition_type: Mapped[str] = mapped_column(
        SAEnum(
            "AMOUNT_MATCH", "RATE_CHECK", "CYCLE_CHECK", "VARIANCE_CHECK",
            "ROUTE_CHECK", "DELIVERABLE_CHECK", "HOURLY_RATE_CHECK", "REQUIRES_APPROVER",
            name="condition_type",
        ),
        nullable=False,
    )
    severity: Mapped[str] = mapped_column(
        SAEnum("FAIL", "WARNING", name="condition_severity", create_constraint=False),
        nullable=False,
    )
    operator: Mapped[str] = mapped_column(
        SAEnum(
            "EQ", "NEQ", "GT", "LT", "GTE", "LTE", "IN", "BETWEEN", "PCT_VARIANCE",
            name="condition_operator",
        ),
        nullable=False,
    )
    threshold_value: Mapped[str | None] = mapped_column(String(255))
    threshold_value2: Mapped[str | None] = mapped_column(
        String(255), comment="For BETWEEN operator"
    )
    field_target: Mapped[str | None] = mapped_column(String(100))
    description: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    # Relationships
    rule_set = relationship("TypeRuleSet", back_populates="conditions", lazy="selectin")

    def __repr__(self) -> str:
        return f"<TypeRuleCondition {self.condition_name} ({self.condition_type})>"

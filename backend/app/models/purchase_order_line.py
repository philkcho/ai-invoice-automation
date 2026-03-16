import uuid

from sqlalchemy import (
    String, Text, Integer, ForeignKey, Numeric,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class PurchaseOrderLine(Base):
    __tablename__ = "purchase_order_lines"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    po_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("purchase_orders.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    line_number: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    quantity: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False, comment="Ordered quantity"
    )
    unit_price: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, comment="Agreed unit price (USD)"
    )
    amount: Mapped[float] = mapped_column(
        Numeric(12, 2), nullable=False, comment="Line total (USD)"
    )
    quantity_invoiced: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False, server_default="0",
        comment="Qty invoiced so far",
    )
    category: Mapped[str | None] = mapped_column(String(100))

    # Relationships
    purchase_order = relationship("PurchaseOrder", back_populates="lines", lazy="selectin")

    def __repr__(self) -> str:
        return f"<POLine #{self.line_number}: {self.description}>"

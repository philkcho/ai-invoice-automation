import uuid
from datetime import date, datetime

from sqlalchemy import Date, String, Text, Enum as SAEnum, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Company(Base):
    __tablename__ = "companies"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_code: Mapped[str] = mapped_column(
        String(20), unique=True, nullable=False, index=True
    )
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    ein: Mapped[str | None] = mapped_column(String(20))
    address: Mapped[str | None] = mapped_column(Text)
    city: Mapped[str | None] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(50))
    zip: Mapped[str | None] = mapped_column(String(20))
    contact_name: Mapped[str | None] = mapped_column(String(255))
    contact_email: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(50))
    established_date: Mapped[date | None] = mapped_column(
        Date, comment="회사 등록일"
    )
    default_currency: Mapped[str] = mapped_column(
        String(10), nullable=False, server_default="USD"
    )
    status: Mapped[str] = mapped_column(
        SAEnum("ACTIVE", "INACTIVE", name="company_status"),
        nullable=False,
        server_default="ACTIVE",
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
    users = relationship("User", back_populates="company", lazy="selectin")

    def __repr__(self) -> str:
        return f"<Company {self.company_code}: {self.company_name}>"

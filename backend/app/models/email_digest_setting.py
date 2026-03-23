import uuid
from datetime import datetime

from sqlalchemy import (
    String, Text, Boolean, Integer, Enum as SAEnum,
    DateTime, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EmailDigestSetting(Base):
    __tablename__ = "email_digest_settings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false",
    )
    frequency: Mapped[str] = mapped_column(
        SAEnum("daily", "weekly", "both", name="digest_frequency_type"),
        nullable=False,
        server_default="weekly",
    )
    daily_hour_utc: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="13",
        comment="Hour in UTC to send daily digest (0-23)",
    )
    weekly_day: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="1",
        comment="Day of week for weekly digest (0=Mon, 6=Sun)",
    )

    # Content options
    include_summary: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true",
    )
    include_overdue: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true",
    )
    include_pending: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true",
    )
    include_top_vendors: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="false",
    )

    # Company-level SMTP (nullable = use system default)
    smtp_host: Mapped[str | None] = mapped_column(String(255))
    smtp_port: Mapped[int | None] = mapped_column(Integer)
    smtp_user: Mapped[str | None] = mapped_column(String(255))
    smtp_password: Mapped[str | None] = mapped_column(
        Text, comment="Encrypted SMTP password",
    )
    smtp_from_name: Mapped[str | None] = mapped_column(String(100))

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), onupdate=func.now(),
    )

    # Relationships
    company = relationship("Company", lazy="selectin")
    recipients = relationship(
        "EmailDigestRecipient", back_populates="digest_setting",
        cascade="all, delete-orphan", lazy="selectin",
    )

    def __repr__(self) -> str:
        return f"<EmailDigestSetting company={self.company_id} active={self.is_active}>"


class EmailDigestRecipient(Base):
    __tablename__ = "email_digest_recipients"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    digest_setting_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("email_digest_settings.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        comment="System user (null = external recipient)",
    )
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str | None] = mapped_column(String(100))
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )

    # Relationships
    digest_setting = relationship("EmailDigestSetting", back_populates="recipients")
    user = relationship("User", lazy="selectin")

    def __repr__(self) -> str:
        return f"<EmailDigestRecipient {self.email}>"

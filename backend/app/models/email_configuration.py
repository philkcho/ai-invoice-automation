import uuid
from datetime import datetime

from sqlalchemy import (
    String, Text, Boolean, Enum as SAEnum,
    DateTime, ForeignKey, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class EmailConfiguration(Base):
    __tablename__ = "email_configurations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    email_provider: Mapped[str] = mapped_column(
        SAEnum("GMAIL", "OUTLOOK", name="email_provider_type"),
        nullable=False,
    )
    email_address: Mapped[str] = mapped_column(
        String(255), nullable=False,
    )
    # OAuth 토큰 (AES-256 암호화 저장)
    credentials_encrypted: Mapped[str | None] = mapped_column(
        Text, comment="OAuth tokens encrypted with AES-256",
    )
    filter_keywords: Mapped[str | None] = mapped_column(
        Text, comment="Subject keywords to filter (comma-separated)",
    )
    filter_senders: Mapped[str | None] = mapped_column(
        Text, comment="Allowed sender domains (comma-separated)",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true",
    )
    last_polled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )
    last_message_id: Mapped[str | None] = mapped_column(
        String(255), comment="Last processed email message ID",
    )
    processed_message_ids: Mapped[str | None] = mapped_column(
        Text, comment="JSON array of recent message IDs (max 500, FIFO)",
    )
    poll_error_count: Mapped[int] = mapped_column(
        nullable=False, server_default="0",
        comment="Consecutive poll errors (reset on success)",
    )
    last_error_message: Mapped[str | None] = mapped_column(
        Text, comment="Last polling error message",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), onupdate=func.now(),
    )

    # Relationships
    company = relationship("Company", lazy="selectin")

    def __repr__(self) -> str:
        return f"<EmailConfiguration {self.email_provider}:{self.email_address}>"

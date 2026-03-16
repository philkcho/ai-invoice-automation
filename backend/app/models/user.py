import uuid
from datetime import datetime

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum as SAEnum, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
        comment="NULL = Super Admin (회사 소속 없음)",
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        SAEnum(
            "SUPER_ADMIN",
            "COMPANY_ADMIN",
            "ACCOUNTANT",
            "APPROVER",
            "VIEWER",
            name="user_role",
        ),
        nullable=False,
    )
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true"
    )
    last_login: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notification_email: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true", comment="이메일 알림 수신 여부"
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
    company = relationship("Company", back_populates="users", lazy="selectin")

    def __repr__(self) -> str:
        return f"<User {self.email} ({self.role})>"

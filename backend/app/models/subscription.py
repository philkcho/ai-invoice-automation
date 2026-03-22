import uuid
from datetime import datetime

from sqlalchemy import (
    String, Boolean, Integer, Numeric, DateTime, Date,
    ForeignKey, Text, func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class SubscriptionPlan(Base):
    """요금제 정의 테이블"""
    __tablename__ = "subscription_plans"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False,
        comment="플랜 이름 (free_trial, starter, professional, enterprise)",
    )
    display_name: Mapped[str] = mapped_column(
        String(100), nullable=False,
        comment="UI 표시용 이름",
    )
    monthly_price: Mapped[float] = mapped_column(
        Numeric(10, 2), nullable=False, server_default="0",
        comment="월 요금 (USD)",
    )
    max_invoices_per_month: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="20",
        comment="월 인보이스 처리 한도 (0=무제한)",
    )
    max_users: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="3",
        comment="최대 사용자 수 (0=무제한)",
    )
    max_ocr_per_month: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="10",
        comment="월 OCR 처리 한도 (0=무제한)",
    )
    features: Mapped[str | None] = mapped_column(
        Text, comment="JSON 형태의 기능 목록",
    )
    stripe_price_id: Mapped[str | None] = mapped_column(
        String(255), comment="Stripe Price ID",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default="true",
    )
    sort_order: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), onupdate=func.now(),
    )

    # Relationships
    subscriptions = relationship("Subscription", back_populates="plan", lazy="selectin")


class Subscription(Base):
    """회사별 구독 상태 테이블"""
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False, unique=True, index=True,
    )
    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscription_plans.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="trialing",
        comment="trialing, active, past_due, canceled, expired",
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(
        String(255), comment="Stripe Customer ID",
    )
    stripe_subscription_id: Mapped[str | None] = mapped_column(
        String(255), comment="Stripe Subscription ID",
    )
    trial_ends_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), comment="트라이얼 종료일",
    )
    current_period_start: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )
    current_period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
    )
    canceled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
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
    plan = relationship("SubscriptionPlan", back_populates="subscriptions", lazy="selectin")


class UsageRecord(Base):
    """월별 사용량 기록 테이블"""
    __tablename__ = "usage_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    company_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False, index=True,
    )
    year_month: Mapped[str] = mapped_column(
        String(7), nullable=False,
        comment="YYYY-MM 형식",
    )
    invoice_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0",
    )
    ocr_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0",
    )
    user_count: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default="0",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False,
        server_default=func.now(), onupdate=func.now(),
    )

    __table_args__ = (
        # 회사별 월별 유니크 제약
        {"comment": "월별 사용량 기록"},
    )

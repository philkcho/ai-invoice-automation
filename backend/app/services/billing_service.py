import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.core.config import settings
from app.models.subscription import SubscriptionPlan, Subscription, UsageRecord
from app.models.user import User

logger = logging.getLogger(__name__)


# ── 플랜 조회 ────────────────────────────────────────

async def list_plans(db: AsyncSession) -> list[SubscriptionPlan]:
    """활성 요금제 목록 (정렬순)"""
    result = await db.execute(
        select(SubscriptionPlan)
        .where(SubscriptionPlan.is_active == True)  # noqa: E712
        .order_by(SubscriptionPlan.sort_order)
    )
    return list(result.scalars().all())


async def get_plan_by_name(db: AsyncSession, name: str) -> SubscriptionPlan:
    result = await db.execute(
        select(SubscriptionPlan).where(SubscriptionPlan.name == name)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Plan '{name}' not found",
        )
    return plan


# ── 구독 관리 ────────────────────────────────────────

async def get_subscription(db: AsyncSession, company_id: UUID) -> Optional[Subscription]:
    """회사의 현재 구독 조회"""
    result = await db.execute(
        select(Subscription).where(Subscription.company_id == company_id)
    )
    return result.scalar_one_or_none()


async def create_trial_subscription(
    db: AsyncSession, company_id: UUID, trial_days: int = 14
) -> Subscription:
    """Free Trial 구독 생성"""
    from datetime import timedelta

    plan = await get_plan_by_name(db, "free_trial")

    trial_end = datetime.now(timezone.utc) + timedelta(days=trial_days)

    subscription = Subscription(
        company_id=company_id,
        plan_id=plan.id,
        status="trialing",
        trial_ends_at=trial_end,
        current_period_start=datetime.now(timezone.utc),
        current_period_end=trial_end,
    )
    db.add(subscription)
    await db.flush()
    await db.refresh(subscription)
    return subscription


async def create_checkout_session(
    db: AsyncSession, company_id: UUID, plan_name: str
) -> dict:
    """Stripe Checkout Session 생성"""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment system is not configured",
        )

    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY

    plan = await get_plan_by_name(db, plan_name)
    if not plan.stripe_price_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Plan '{plan_name}' is not available for purchase",
        )

    subscription = await get_subscription(db, company_id)

    # Stripe Customer 생성 또는 기존 사용
    customer_id = subscription.stripe_customer_id if subscription else None
    if not customer_id:
        from app.models.company import Company
        result = await db.execute(select(Company).where(Company.id == company_id))
        company = result.scalar_one_or_none()

        customer = stripe.Customer.create(
            metadata={"company_id": str(company_id)},
            name=company.company_name if company else None,
            email=company.contact_email if company else None,
        )
        customer_id = customer.id

        if subscription:
            subscription.stripe_customer_id = customer_id
            await db.flush()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": plan.stripe_price_id, "quantity": 1}],
        mode="subscription",
        success_url=f"{settings.FRONTEND_URL}/settings/billing?success=true",
        cancel_url=f"{settings.FRONTEND_URL}/settings/billing?canceled=true",
        metadata={"company_id": str(company_id), "plan_name": plan_name},
    )

    return {"checkout_url": session.url, "session_id": session.id}


async def create_customer_portal(db: AsyncSession, company_id: UUID) -> dict:
    """Stripe Customer Portal 세션 생성"""
    if not settings.STRIPE_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment system is not configured",
        )

    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY

    subscription = await get_subscription(db, company_id)
    if not subscription or not subscription.stripe_customer_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active billing account found",
        )

    session = stripe.billing_portal.Session.create(
        customer=subscription.stripe_customer_id,
        return_url=f"{settings.FRONTEND_URL}/settings/billing",
    )

    return {"portal_url": session.url}


async def handle_stripe_webhook(db: AsyncSession, payload: bytes, sig_header: str) -> None:
    """Stripe Webhook 이벤트 처리"""
    if not settings.STRIPE_SECRET_KEY or not settings.STRIPE_WEBHOOK_SECRET:
        logger.warning("Stripe webhook received but not configured")
        return

    import stripe
    stripe.api_key = settings.STRIPE_SECRET_KEY

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.SignatureVerificationError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid webhook: {e}")

    event_type = event["type"]
    data = event["data"]["object"]

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(db, data)
    elif event_type == "customer.subscription.updated":
        await _handle_subscription_updated(db, data)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(db, data)
    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(db, data)

    logger.info("Processed Stripe webhook: %s", event_type)


async def _handle_checkout_completed(db: AsyncSession, session: dict) -> None:
    """Checkout 완료 → 구독 활성화"""
    company_id = session.get("metadata", {}).get("company_id")
    plan_name = session.get("metadata", {}).get("plan_name")
    if not company_id or not plan_name:
        return

    plan = await get_plan_by_name(db, plan_name)
    subscription = await get_subscription(db, UUID(company_id))

    if subscription:
        subscription.plan_id = plan.id
        subscription.status = "active"
        subscription.stripe_customer_id = session.get("customer")
        subscription.stripe_subscription_id = session.get("subscription")
        subscription.trial_ends_at = None
    else:
        subscription = Subscription(
            company_id=UUID(company_id),
            plan_id=plan.id,
            status="active",
            stripe_customer_id=session.get("customer"),
            stripe_subscription_id=session.get("subscription"),
        )
        db.add(subscription)

    await db.flush()
    await db.commit()


async def _handle_subscription_updated(db: AsyncSession, sub_data: dict) -> None:
    """Stripe 구독 상태 변경 동기화"""
    stripe_sub_id = sub_data.get("id")
    result = await db.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    )
    subscription = result.scalar_one_or_none()
    if not subscription:
        return

    stripe_status = sub_data.get("status", "")
    status_map = {
        "active": "active",
        "past_due": "past_due",
        "canceled": "canceled",
        "trialing": "trialing",
    }
    subscription.status = status_map.get(stripe_status, subscription.status)

    period = sub_data.get("current_period_start")
    if period:
        subscription.current_period_start = datetime.fromtimestamp(period, tz=timezone.utc)
    period_end = sub_data.get("current_period_end")
    if period_end:
        subscription.current_period_end = datetime.fromtimestamp(period_end, tz=timezone.utc)

    await db.flush()
    await db.commit()


async def _handle_subscription_deleted(db: AsyncSession, sub_data: dict) -> None:
    """Stripe 구독 취소/삭제"""
    stripe_sub_id = sub_data.get("id")
    result = await db.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    )
    subscription = result.scalar_one_or_none()
    if not subscription:
        return

    subscription.status = "canceled"
    subscription.canceled_at = datetime.now(timezone.utc)
    await db.flush()
    await db.commit()


async def _handle_payment_failed(db: AsyncSession, invoice_data: dict) -> None:
    """결제 실패 → 구독 상태를 past_due로"""
    stripe_sub_id = invoice_data.get("subscription")
    if not stripe_sub_id:
        return

    result = await db.execute(
        select(Subscription).where(Subscription.stripe_subscription_id == stripe_sub_id)
    )
    subscription = result.scalar_one_or_none()
    if subscription:
        subscription.status = "past_due"
        await db.flush()
        await db.commit()


# ── 사용량 추적 ──────────────────────────────────────

def _current_year_month() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


async def get_or_create_usage(db: AsyncSession, company_id: UUID) -> UsageRecord:
    """현재 월의 사용량 레코드 조회 또는 생성"""
    ym = _current_year_month()
    result = await db.execute(
        select(UsageRecord).where(
            UsageRecord.company_id == company_id,
            UsageRecord.year_month == ym,
        )
    )
    usage = result.scalar_one_or_none()

    if not usage:
        # user_count 계산
        user_count_result = await db.execute(
            select(func.count()).select_from(User).where(
                User.company_id == company_id,
                User.is_active == True,  # noqa: E712
            )
        )
        user_count = user_count_result.scalar() or 0

        usage = UsageRecord(
            company_id=company_id,
            year_month=ym,
            user_count=user_count,
        )
        db.add(usage)
        await db.flush()
        await db.refresh(usage)

    return usage


async def increment_usage(
    db: AsyncSession, company_id: UUID, field: str
) -> None:
    """사용량 카운터 증가 (invoice_count 또는 ocr_count)"""
    usage = await get_or_create_usage(db, company_id)
    current = getattr(usage, field, 0)
    setattr(usage, field, current + 1)
    await db.flush()


async def check_usage_limit(
    db: AsyncSession, company_id: UUID, field: str
) -> bool:
    """한도 초과 여부 확인. True = 한도 내, False = 초과"""
    subscription = await get_subscription(db, company_id)
    if not subscription:
        return False  # 구독 없음

    # 구독 상태 확인
    if subscription.status not in ("trialing", "active"):
        return False

    # 트라이얼 만료 확인
    if subscription.status == "trialing" and subscription.trial_ends_at:
        if subscription.trial_ends_at < datetime.now(timezone.utc):
            subscription.status = "expired"
            await db.flush()
            return False

    plan = subscription.plan
    if not plan:
        return False

    usage = await get_or_create_usage(db, company_id)

    limit_map = {
        "invoice_count": plan.max_invoices_per_month,
        "ocr_count": plan.max_ocr_per_month,
        "user_count": plan.max_users,
    }

    max_val = limit_map.get(field, 0)
    if max_val == 0:  # 0 = 무제한
        return True

    current_val = getattr(usage, field, 0)
    return current_val < max_val


async def get_billing_summary(db: AsyncSession, company_id: UUID) -> dict:
    """Billing 요약 정보 (구독 + 사용량 + 한도)"""
    subscription = await get_subscription(db, company_id)
    usage = await get_or_create_usage(db, company_id)

    usage_data = {
        "year_month": usage.year_month,
        "invoice_count": usage.invoice_count,
        "ocr_count": usage.ocr_count,
        "user_count": usage.user_count,
        "max_invoices": 0,
        "max_ocr": 0,
        "max_users": 0,
    }

    if subscription and subscription.plan:
        usage_data["max_invoices"] = subscription.plan.max_invoices_per_month
        usage_data["max_ocr"] = subscription.plan.max_ocr_per_month
        usage_data["max_users"] = subscription.plan.max_users

    return {
        "subscription": subscription,
        "usage": usage_data,
        "stripe_publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
    }

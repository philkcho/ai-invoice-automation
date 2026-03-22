from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_admin
from app.schemas.billing import (
    PlanListResponse,
    BillingSummaryResponse,
    CheckoutSessionRequest,
    CheckoutSessionResponse,
    CustomerPortalResponse,
)
from app.services import billing_service

router = APIRouter()


@router.get("/plans", response_model=PlanListResponse)
async def list_plans(db: AsyncSession = Depends(get_db)):
    """요금제 목록 (인증 불필요 — 퍼블릭 API)"""
    plans = await billing_service.list_plans(db)
    return {"items": plans}


@router.get("/summary", response_model=BillingSummaryResponse)
async def get_billing_summary(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """현재 회사의 구독 + 사용량 요약"""
    return await billing_service.get_billing_summary(db, current_user["company_id"])


@router.post("/checkout", response_model=CheckoutSessionResponse)
async def create_checkout(
    data: CheckoutSessionRequest,
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Stripe Checkout Session 생성 (COMPANY_ADMIN 이상)"""
    return await billing_service.create_checkout_session(
        db, current_user["company_id"], data.plan_name
    )


@router.post("/portal", response_model=CustomerPortalResponse)
async def create_portal(
    current_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    """Stripe Customer Portal 세션 생성 (COMPANY_ADMIN 이상)"""
    return await billing_service.create_customer_portal(db, current_user["company_id"])


@router.post("/webhook", include_in_schema=False)
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Stripe Webhook 수신 (인증 불필요 — Stripe 서명으로 검증)"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    await billing_service.handle_stripe_webhook(db, payload, sig_header)
    return {"status": "ok"}

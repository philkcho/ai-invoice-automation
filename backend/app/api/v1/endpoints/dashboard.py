"""대시보드 API — KPI 통계, 트렌드, 차트 데이터"""
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_any, require_super_admin, ROLE_SUPER_ADMIN
from app.services import dashboard_service

router = APIRouter()


@router.get("/summary")
async def get_summary(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any),
):
    """회사 KPI 요약 카드"""
    if current_user["role"] == ROLE_SUPER_ADMIN and not current_user.get("company_id"):
        return await dashboard_service.get_super_admin_summary(db)
    return await dashboard_service.get_company_summary(db, current_user["company_id"])


@router.get("/super-admin")
async def get_super_admin_summary(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_super_admin),
):
    """전체 시스템 요약 (SUPER_ADMIN 전용)"""
    return await dashboard_service.get_super_admin_summary(db)


@router.get("/invoice-trend")
async def get_invoice_trend(
    months: int = Query(12, ge=1, le=24),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any),
):
    """월별 인보이스 트렌드"""
    company_id = current_user.get("company_id")
    if not company_id:
        return []
    return await dashboard_service.get_invoice_trend(db, company_id, months)


@router.get("/spend-by-type")
async def get_spend_by_type(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any),
):
    """인보이스 타입별 지출 (파이 차트)"""
    company_id = current_user.get("company_id")
    if not company_id:
        return []
    return await dashboard_service.get_spend_by_type(db, company_id, date_from, date_to)


@router.get("/top-vendors")
async def get_top_vendors(
    limit: int = Query(10, ge=1, le=50),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any),
):
    """Top N 벤더별 지출"""
    company_id = current_user.get("company_id")
    if not company_id:
        return []
    return await dashboard_service.get_top_vendors(db, company_id, limit, date_from, date_to)


@router.get("/recent-activity")
async def get_recent_activity(
    limit: int = Query(10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any),
):
    """최근 인보이스 활동"""
    company_id = current_user.get("company_id")
    if not company_id:
        return []
    return await dashboard_service.get_recent_activity(db, company_id, limit)


@router.get("/kpi-detail")
async def get_kpi_detail(
    category: str = Query(..., regex="^(this_month|unpaid|overdue|paid_this_month)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any),
):
    """KPI card detail list (this_month, unpaid, overdue)"""
    company_id = current_user.get("company_id")
    if not company_id:
        return []
    return await dashboard_service.get_kpi_detail(db, company_id, category)


@router.get("/action-items")
async def get_action_items(
    limit: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any),
):
    """즉시 조치 필요 항목 (연체, 승인대기, 검증실패, OCR리뷰)"""
    company_id = current_user.get("company_id")
    if not company_id:
        return []
    return await dashboard_service.get_action_items(
        db, company_id, current_user["user_id"], limit
    )


@router.get("/cashflow")
async def get_cashflow_forecast(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any),
):
    """캐시플로우 예측 (due_date 구간별 미결제 금액)"""
    company_id = current_user.get("company_id")
    if not company_id:
        return []
    return await dashboard_service.get_cashflow_forecast(db, company_id)


@router.get("/cashflow-detail")
async def get_cashflow_detail(
    bucket: str = Query(..., regex="^(overdue|this_week|next_week|this_month|next_month|later|no_due_date)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any),
):
    """캐시플로우 구간별 인보이스 상세 목록"""
    company_id = current_user.get("company_id")
    if not company_id:
        return []
    return await dashboard_service.get_cashflow_detail(db, company_id, bucket)

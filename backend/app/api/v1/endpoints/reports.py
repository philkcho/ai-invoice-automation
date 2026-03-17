"""리포트 내보내기 API — CSV/Excel 다운로드"""
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_admin, require_accountant_up, ROLE_SUPER_ADMIN
from app.services import export_service

router = APIRouter()


@router.get("/invoices/export")
async def export_invoices(
    status: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    fmt: str = Query("csv", pattern="^(csv|excel)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """인보이스 목록 내보내기"""
    company_id = current_user.get("company_id")
    if not company_id:
        return Response(status_code=400, content="Company context required")

    content, filename, content_type = await export_service.export_invoice_list(
        db, company_id, status_filter=status, date_from=date_from, date_to=date_to, fmt=fmt,
    )
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/vendor-spend/export")
async def export_vendor_spend(
    fmt: str = Query("csv", pattern="^(csv|excel)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """벤더별 지출 요약 내보내기"""
    company_id = current_user.get("company_id")
    if not company_id:
        return Response(status_code=400, content="Company context required")

    content, filename, content_type = await export_service.export_vendor_spend(
        db, company_id, fmt=fmt,
    )
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/payments/export")
async def export_payments(
    fmt: str = Query("csv", pattern="^(csv|excel)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_accountant_up),
):
    """결제 리포트 내보내기"""
    company_id = current_user.get("company_id")
    if not company_id:
        return Response(status_code=400, content="Company context required")

    content, filename, content_type = await export_service.export_payment_report(
        db, company_id, fmt=fmt,
    )
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/1099-prep/export")
async def export_1099_prep(
    tax_year: int = Query(..., ge=2020, le=2030),
    fmt: str = Query("csv", pattern="^(csv|excel)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """1099 준비 리포트 내보내기"""
    company_id = current_user.get("company_id")
    if not company_id:
        return Response(status_code=400, content="Company context required")

    content, filename, content_type = await export_service.export_1099_prep(
        db, company_id, tax_year=tax_year, fmt=fmt,
    )
    return Response(
        content=content,
        media_type=content_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )

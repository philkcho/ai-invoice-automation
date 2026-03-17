"""대시보드 KPI 통계 서비스"""
import logging
from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, case, extract, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice
from app.models.invoice_payment import InvoicePayment
from app.models.invoice_approval import InvoiceApproval
from app.models.vendor import Vendor
from app.models.vendor_contract import VendorContract
from app.models.company import Company

logger = logging.getLogger(__name__)


async def get_company_summary(
    db: AsyncSession, company_id: UUID
) -> dict:
    """회사별 KPI 요약 카드"""
    today = date.today()
    month_start = today.replace(day=1)
    year_start = today.replace(month=1, day=1)

    # 인보이스 통계
    inv_stats = await db.execute(
        select(
            func.count(Invoice.id).label("total"),
            func.coalesce(func.sum(Invoice.amount_total), 0).label("total_amount"),
            func.count(case((Invoice.created_at >= month_start, Invoice.id))).label("month_count"),
            func.coalesce(func.sum(case((Invoice.created_at >= month_start, Invoice.amount_total))), 0).label("month_amount"),
            func.count(case((Invoice.created_at >= year_start, Invoice.id))).label("ytd_count"),
            func.coalesce(func.sum(case((Invoice.created_at >= year_start, Invoice.amount_total))), 0).label("ytd_amount"),
        ).where(Invoice.company_id == company_id)
    )
    inv = inv_stats.one()

    # 상태별 카운트
    status_stats = await db.execute(
        select(Invoice.status, func.count(Invoice.id))
        .where(Invoice.company_id == company_id)
        .group_by(Invoice.status)
    )
    status_counts = {row[0]: row[1] for row in status_stats.all()}

    # 승인 대기 건수
    pending_approvals = await db.execute(
        select(func.count(InvoiceApproval.id))
        .where(
            InvoiceApproval.company_id == company_id,
            InvoiceApproval.status == "PENDING",
        )
    )

    # 검증 실패/경고 건수
    validation_stats = await db.execute(
        select(Invoice.validation_status, func.count(Invoice.id))
        .where(
            Invoice.company_id == company_id,
            Invoice.validation_status.in_(["FAIL", "WARNING"]),
        )
        .group_by(Invoice.validation_status)
    )
    val_counts = {row[0]: row[1] for row in validation_stats.all()}

    # 연체 결제 건수
    overdue = await db.execute(
        select(func.count(Invoice.id))
        .where(
            Invoice.company_id == company_id,
            Invoice.due_date < today,
            Invoice.status.in_(["APPROVED", "SCHEDULED", "IN_APPROVAL", "PENDING"]),
        )
    )

    # 활성 벤더 수
    vendor_count = await db.execute(
        select(func.count(Vendor.id))
        .where(Vendor.company_id == company_id, Vendor.status == "ACTIVE")
    )

    return {
        "invoices_total": inv.total,
        "invoices_this_month": inv.month_count,
        "invoices_ytd": inv.ytd_count,
        "spend_this_month": float(inv.month_amount),
        "spend_ytd": float(inv.ytd_amount),
        "pending_approvals": pending_approvals.scalar() or 0,
        "validation_fails": val_counts.get("FAIL", 0),
        "validation_warnings": val_counts.get("WARNING", 0),
        "overdue_payments": overdue.scalar() or 0,
        "active_vendors": vendor_count.scalar() or 0,
        "status_counts": status_counts,
    }


async def get_invoice_trend(
    db: AsyncSession, company_id: UUID, months: int = 12
) -> list[dict]:
    """월별 인보이스 트렌드 (최근 N개월)"""
    result = await db.execute(
        select(
            extract("year", Invoice.created_at).label("year"),
            extract("month", Invoice.created_at).label("month"),
            func.count(Invoice.id).label("count"),
            func.coalesce(func.sum(Invoice.amount_total), 0).label("amount"),
        )
        .where(Invoice.company_id == company_id)
        .group_by("year", "month")
        .order_by("year", "month")
        .limit(months)
    )
    return [
        {
            "year": int(row.year),
            "month": int(row.month),
            "count": row.count,
            "amount": float(row.amount),
        }
        for row in result.all()
    ]


async def get_spend_by_type(
    db: AsyncSession, company_id: UUID
) -> list[dict]:
    """인보이스 타입별 지출 (파이 차트)"""
    from app.models.invoice_type import InvoiceType

    result = await db.execute(
        select(
            InvoiceType.type_name,
            func.count(Invoice.id).label("count"),
            func.coalesce(func.sum(Invoice.amount_total), 0).label("amount"),
        )
        .join(InvoiceType, Invoice.invoice_type_id == InvoiceType.id)
        .where(Invoice.company_id == company_id)
        .group_by(InvoiceType.type_name)
        .order_by(func.sum(Invoice.amount_total).desc())
    )
    return [
        {"type_name": row.type_name, "count": row.count, "amount": float(row.amount)}
        for row in result.all()
    ]


async def get_top_vendors(
    db: AsyncSession, company_id: UUID, limit: int = 10
) -> list[dict]:
    """Top N 벤더별 지출"""
    result = await db.execute(
        select(
            Vendor.company_name.label("vendor_name"),
            func.count(Invoice.id).label("invoice_count"),
            func.coalesce(func.sum(Invoice.amount_total), 0).label("total_spend"),
        )
        .join(Vendor, Invoice.vendor_id == Vendor.id)
        .where(Invoice.company_id == company_id)
        .group_by(Vendor.company_name)
        .order_by(func.sum(Invoice.amount_total).desc())
        .limit(limit)
    )
    return [
        {
            "vendor_name": row.vendor_name,
            "invoice_count": row.invoice_count,
            "total_spend": float(row.total_spend),
        }
        for row in result.all()
    ]


async def get_recent_activity(
    db: AsyncSession, company_id: UUID, limit: int = 10
) -> list[dict]:
    """최근 인보이스 활동"""
    result = await db.execute(
        select(Invoice)
        .where(Invoice.company_id == company_id)
        .order_by(Invoice.updated_at.desc())
        .limit(limit)
    )
    invoices = result.scalars().all()
    return [
        {
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "vendor_name": inv.vendor.company_name if inv.vendor else None,
            "amount_total": float(inv.amount_total),
            "status": inv.status,
            "updated_at": inv.updated_at.isoformat() if inv.updated_at else None,
        }
        for inv in invoices
    ]


async def get_super_admin_summary(db: AsyncSession) -> dict:
    """전체 시스템 요약 (SUPER_ADMIN)"""
    company_count = (await db.execute(
        select(func.count(Company.id)).where(Company.status == "ACTIVE")
    )).scalar() or 0

    total_invoices = (await db.execute(
        select(func.count(Invoice.id))
    )).scalar() or 0

    total_spend = (await db.execute(
        select(func.coalesce(func.sum(Invoice.amount_total), 0))
    )).scalar() or 0

    pending_approvals = (await db.execute(
        select(func.count(InvoiceApproval.id))
        .where(InvoiceApproval.status == "PENDING")
    )).scalar() or 0

    # 회사별 요약
    company_stats = await db.execute(
        select(
            Company.company_name,
            func.count(Invoice.id).label("invoice_count"),
            func.coalesce(func.sum(Invoice.amount_total), 0).label("total_spend"),
        )
        .outerjoin(Invoice, Company.id == Invoice.company_id)
        .where(Company.status == "ACTIVE")
        .group_by(Company.company_name)
        .order_by(func.sum(Invoice.amount_total).desc().nulls_last())
    )

    return {
        "active_companies": company_count,
        "total_invoices": total_invoices,
        "total_spend": float(total_spend),
        "pending_approvals": pending_approvals,
        "company_breakdown": [
            {
                "company_name": row.company_name,
                "invoice_count": row.invoice_count,
                "total_spend": float(row.total_spend),
            }
            for row in company_stats.all()
        ],
    }

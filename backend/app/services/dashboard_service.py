"""대시보드 KPI 통계 서비스"""
import logging
from datetime import date, datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, case, extract, and_, cast, String
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invoice import Invoice
from app.models.invoice_payment import InvoicePayment
from app.models.invoice_approval import InvoiceApproval
from app.models.invoice_type import InvoiceType
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

    # 상태별 카운트 + 금액
    status_stats = await db.execute(
        select(Invoice.status, func.count(Invoice.id), func.coalesce(func.sum(Invoice.amount_total), 0))
        .where(Invoice.company_id == company_id)
        .group_by(Invoice.status)
    )
    status_counts = {}
    status_amounts = {}
    for row in status_stats.all():
        status_counts[row[0]] = row[1]
        status_amounts[row[0]] = float(row[2])

    # 승인 대기 건수
    pending_approvals = await db.execute(
        select(func.count(InvoiceApproval.id))
        .where(
            InvoiceApproval.company_id == company_id,
            InvoiceApproval.status.cast(String) == "PENDING",
        )
    )

    # 검증 실패/경고 건수
    validation_stats = await db.execute(
        select(Invoice.validation_status, func.count(Invoice.id))
        .where(
            Invoice.company_id == company_id,
            Invoice.validation_status.cast(String).in_(["FAIL", "WARNING"]),
        )
        .group_by(Invoice.validation_status)
    )
    val_counts = {row[0]: row[1] for row in validation_stats.all()}

    # 미지급 (승인 완료 but 미결제) 건수/금액
    unpaid_stats = await db.execute(
        select(
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.amount_total), 0),
        ).where(
            Invoice.company_id == company_id,
            Invoice.status.cast(String).notin_(["PAID", "VOID"]),
        )
    )
    unpaid_row = unpaid_stats.one()

    # 연체 결제 건수/금액
    overdue_stats = await db.execute(
        select(
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.amount_total), 0),
        ).where(
            Invoice.company_id == company_id,
            Invoice.due_date < today,
            Invoice.status.cast(String).in_(["APPROVED", "SCHEDULED", "IN_APPROVAL", "PENDING"]),
        )
    )
    overdue_row = overdue_stats.one()

    # 이번 달 결제 완료 건수/금액
    paid_this_month_stats = await db.execute(
        select(
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.amount_total), 0),
        ).where(
            Invoice.company_id == company_id,
            Invoice.status.cast(String) == "PAID",
            Invoice.updated_at >= month_start,
        )
    )
    paid_month_row = paid_this_month_stats.one()

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
        "overdue_payments": overdue_row[0],
        "overdue_amount": float(overdue_row[1]),
        "paid_this_month_count": paid_month_row[0],
        "paid_this_month_amount": float(paid_month_row[1]),
        "unpaid_count": unpaid_row[0],
        "unpaid_amount": float(unpaid_row[1]),
        "active_vendors": vendor_count.scalar() or 0,
        "status_counts": status_counts,
        "status_amounts": status_amounts,
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


async def get_action_items(
    db: AsyncSession, company_id: UUID, user_id: UUID, limit: int = 20
) -> list[dict]:
    """즉시 조치가 필요한 항목 목록"""
    today = date.today()
    items: list[dict] = []

    # 🔴 연체 결제
    overdue_result = await db.execute(
        select(Invoice)
        .where(
            Invoice.company_id == company_id,
            Invoice.due_date < today,
            Invoice.status.cast(String).in_(["APPROVED", "SCHEDULED", "IN_APPROVAL", "PENDING"]),
        )
        .order_by(Invoice.due_date.asc())
        .limit(limit)
    )
    for inv in overdue_result.scalars().all():
        items.append({
            "type": "overdue_payment",
            "priority": "critical",
            "invoice_id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "vendor_name": inv.vendor.company_name if inv.vendor else None,
            "amount": float(inv.amount_total),
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "days_overdue": (today - inv.due_date).days if inv.due_date else 0,
        })

    # 🟡 승인 대기 (현재 사용자가 승인자인 건)
    pending_result = await db.execute(
        select(InvoiceApproval)
        .where(
            InvoiceApproval.company_id == company_id,
            InvoiceApproval.approver_id == user_id,
            InvoiceApproval.status.cast(String) == "PENDING",
        )
        .order_by(InvoiceApproval.created_at.asc())
        .limit(limit)
    )
    for appr in pending_result.scalars().all():
        inv = appr.invoice
        items.append({
            "type": "pending_approval",
            "priority": "high",
            "invoice_id": str(appr.invoice_id),
            "invoice_number": inv.invoice_number if inv else None,
            "vendor_name": inv.vendor.company_name if inv and inv.vendor else None,
            "amount": float(inv.amount_total) if inv else 0,
            "step": appr.step,
        })

    # 🟠 검증 실패 인보이스
    fail_result = await db.execute(
        select(Invoice)
        .where(
            Invoice.company_id == company_id,
            Invoice.validation_status.cast(String) == "FAIL",
            Invoice.status.cast(String).notin_(["VOID", "REJECTED"]),
        )
        .order_by(Invoice.updated_at.desc())
        .limit(limit)
    )
    for inv in fail_result.scalars().all():
        items.append({
            "type": "validation_failed",
            "priority": "medium",
            "invoice_id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "vendor_name": inv.vendor.company_name if inv.vendor else None,
            "amount": float(inv.amount_total),
        })

    # 🔵 OCR 리뷰 대기
    ocr_result = await db.execute(
        select(Invoice)
        .where(
            Invoice.company_id == company_id,
            Invoice.ocr_status.cast(String) == "COMPLETED",
            Invoice.status.cast(String) == "OCR_REVIEW",
        )
        .order_by(Invoice.updated_at.desc())
        .limit(limit)
    )
    for inv in ocr_result.scalars().all():
        items.append({
            "type": "ocr_review",
            "priority": "low",
            "invoice_id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "vendor_name": inv.vendor.company_name if inv.vendor else None,
            "amount": float(inv.amount_total),
        })

    return items


async def get_super_admin_summary(db: AsyncSession) -> dict:
    """전체 시스템 요약 (SUPER_ADMIN) — company_summary와 동일 형식 + 추가 필드"""
    today = date.today()
    month_start = today.replace(day=1)
    year_start = today.replace(month=1, day=1)

    company_count = (await db.execute(
        select(func.count(Company.id)).where(Company.status == "ACTIVE")
    )).scalar() or 0

    # 인보이스 통계 (전체)
    inv_stats = await db.execute(
        select(
            func.count(Invoice.id).label("total"),
            func.coalesce(func.sum(Invoice.amount_total), 0).label("total_amount"),
            func.count(case((Invoice.created_at >= month_start, Invoice.id))).label("month_count"),
            func.coalesce(func.sum(case((Invoice.created_at >= month_start, Invoice.amount_total))), 0).label("month_amount"),
            func.count(case((Invoice.created_at >= year_start, Invoice.id))).label("ytd_count"),
            func.coalesce(func.sum(case((Invoice.created_at >= year_start, Invoice.amount_total))), 0).label("ytd_amount"),
        )
    )
    inv = inv_stats.one()

    # 상태별 카운트
    status_stats = await db.execute(
        select(Invoice.status, func.count(Invoice.id))
        .group_by(Invoice.status)
    )
    status_counts = {row[0]: row[1] for row in status_stats.all()}

    pending_approvals = (await db.execute(
        select(func.count(InvoiceApproval.id))
        .where(InvoiceApproval.status.cast(String) == "PENDING")
    )).scalar() or 0

    # 미지급 (전체)
    unpaid_stats = await db.execute(
        select(
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.amount_total), 0),
        ).where(
            Invoice.status.cast(String).notin_(["PAID", "VOID"]),
        )
    )
    unpaid_row = unpaid_stats.one()

    # 연체 결제 건수/금액 (전체)
    overdue_stats = await db.execute(
        select(
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.amount_total), 0),
        ).where(
            Invoice.due_date < today,
            Invoice.status.cast(String).in_(["APPROVED", "SCHEDULED", "IN_APPROVAL", "PENDING"]),
        )
    )
    overdue_row = overdue_stats.one()

    # 이번 달 결제 완료 (전체)
    paid_this_month_stats = await db.execute(
        select(
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.amount_total), 0),
        ).where(
            Invoice.status.cast(String) == "PAID",
            Invoice.updated_at >= month_start,
        )
    )
    paid_month_row = paid_this_month_stats.one()

    # 검증 실패/경고 (전체)
    validation_stats = await db.execute(
        select(Invoice.validation_status, func.count(Invoice.id))
        .where(Invoice.validation_status.cast(String).in_(["FAIL", "WARNING"]))
        .group_by(Invoice.validation_status)
    )
    val_counts = {row[0]: row[1] for row in validation_stats.all()}

    # 활성 벤더 수
    vendor_count = (await db.execute(
        select(func.count(Vendor.id)).where(Vendor.status == "ACTIVE")
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
        "invoices_total": inv.total,
        "invoices_this_month": inv.month_count,
        "invoices_ytd": inv.ytd_count,
        "spend_this_month": float(inv.month_amount),
        "spend_ytd": float(inv.ytd_amount),
        "pending_approvals": pending_approvals,
        "validation_fails": val_counts.get("FAIL", 0),
        "validation_warnings": val_counts.get("WARNING", 0),
        "overdue_payments": overdue_row[0],
        "overdue_amount": float(overdue_row[1]),
        "unpaid_count": unpaid_row[0],
        "unpaid_amount": float(unpaid_row[1]),
        "paid_this_month_count": paid_month_row[0],
        "paid_this_month_amount": float(paid_month_row[1]),
        "active_vendors": vendor_count,
        "status_counts": status_counts,
        "active_companies": company_count,
        "company_breakdown": [
            {
                "company_name": row.company_name,
                "invoice_count": row.invoice_count,
                "total_spend": float(row.total_spend),
            }
            for row in company_stats.all()
        ],
    }


async def get_kpi_detail(
    db: AsyncSession, company_id: UUID, category: str
) -> list[dict]:
    """KPI 카드 클릭 시 상세 인보이스 목록"""
    today = date.today()
    month_start = today.replace(day=1)

    query = select(Invoice).where(Invoice.company_id == company_id)

    if category == "this_month":
        query = query.where(Invoice.created_at >= month_start)
        query = query.order_by(Invoice.created_at.desc())
    elif category == "unpaid":
        query = query.where(
            Invoice.status.cast(String).notin_(["PAID", "VOID"])
        )
        query = query.order_by(Invoice.due_date.asc().nulls_last())
    elif category == "overdue":
        query = query.where(
            Invoice.due_date < today,
            Invoice.status.cast(String).in_(["APPROVED", "SCHEDULED", "IN_APPROVAL", "PENDING"]),
        )
        query = query.order_by(Invoice.due_date.asc())
    elif category == "paid_this_month":
        query = query.where(
            Invoice.status.cast(String) == "PAID",
            Invoice.updated_at >= month_start,
        )
        query = query.order_by(Invoice.updated_at.desc())
    else:
        return []

    result = await db.execute(query.limit(50))
    invoices = result.scalars().all()

    return [
        {
            "id": str(inv.id),
            "invoice_number": inv.invoice_number,
            "vendor_name": inv.vendor.company_name if inv.vendor else None,
            "amount_total": float(inv.amount_total),
            "invoice_type": inv.invoice_type.type_name if inv.invoice_type else None,
            "status": inv.status,
            "due_date": inv.due_date.isoformat() if inv.due_date else None,
            "days_overdue": (today - inv.due_date).days if inv.due_date and inv.due_date < today else None,
        }
        for inv in invoices
    ]

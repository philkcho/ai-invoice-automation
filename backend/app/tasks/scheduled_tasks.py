"""Phase 7: 예약 작업 — 결제 기한 알림, 계약 만료 체크, 면세 만료 체크"""
import logging
from datetime import date, timedelta

from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.scheduled_tasks.send_payment_due_reminders")
def send_payment_due_reminders():
    """결제 기한 D-3, D-1, D-day 알림 (매일 8시 UTC 실행)"""
    import asyncio
    asyncio.run(_send_payment_due_reminders_async())


async def _send_payment_due_reminders_async():
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.invoice import Invoice
    from app.services import notification_service

    today = date.today()
    alert_dates = [today, today + timedelta(days=1), today + timedelta(days=3)]

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Invoice).where(
                Invoice.due_date.in_(alert_dates),
                Invoice.status.in_(["APPROVED", "SCHEDULED"]),
            )
        )
        invoices = result.scalars().all()

        count = 0
        for inv in invoices:
            days_left = (inv.due_date - today).days
            if days_left == 0:
                urgency = "오늘"
            elif days_left == 1:
                urgency = "내일"
            else:
                urgency = f"{days_left}일 후"

            if inv.created_by:
                await notification_service.create_notification(
                    db,
                    company_id=inv.company_id,
                    user_id=inv.created_by,
                    type="PAYMENT_DUE",
                    title=f"결제 기한 알림: Invoice #{inv.invoice_number or inv.id}",
                    message=f"결제 기한이 {urgency}입니다. (기한: {inv.due_date})",
                    entity_type="invoice",
                    entity_id=inv.id,
                )
                count += 1

        await db.commit()
        logger.info("Payment due reminders sent: %d", count)


@celery_app.task(name="app.tasks.scheduled_tasks.check_contract_expiry")
def check_contract_expiry():
    """계약 만료 D-30, D-7, D-day 알림 (매일 8시 UTC 실행)"""
    import asyncio
    asyncio.run(_check_contract_expiry_async())


async def _check_contract_expiry_async():
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.vendor_contract import VendorContract
    from app.services import notification_service

    today = date.today()
    alert_dates = [today, today + timedelta(days=7), today + timedelta(days=30)]

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(VendorContract).where(
                VendorContract.end_date.in_(alert_dates),
                VendorContract.is_active.is_(True),
            )
        )
        contracts = result.scalars().all()

        count = 0
        for contract in contracts:
            days_left = (contract.end_date - today).days
            if days_left == 0:
                urgency = "오늘 만료"
            elif days_left == 7:
                urgency = "7일 후 만료"
            else:
                urgency = "30일 후 만료"

            await notification_service.create_role_notifications(
                db,
                company_id=contract.company_id,
                role="COMPANY_ADMIN",
                type="CONTRACT_EXPIRY",
                title=f"계약 만료 알림: {contract.contract_number or contract.id}",
                message=f"벤더 계약이 {urgency}됩니다. (만료일: {contract.end_date})",
                entity_type="vendor_contract",
                entity_id=contract.id,
            )
            count += 1

        await db.commit()
        logger.info("Contract expiry alerts sent: %d", count)


@celery_app.task(name="app.tasks.scheduled_tasks.check_tax_exempt_expiry")
def check_tax_exempt_expiry():
    """면세 인증서 만료 D-30, D-7, D-day 알림 (매일 8시 UTC 실행)"""
    import asyncio
    asyncio.run(_check_tax_exempt_expiry_async())


async def _check_tax_exempt_expiry_async():
    from sqlalchemy import select
    from app.core.database import AsyncSessionLocal
    from app.models.vendor import Vendor
    from app.services import notification_service

    today = date.today()
    alert_dates = [today, today + timedelta(days=7), today + timedelta(days=30)]

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Vendor).where(
                Vendor.tax_exempt_expiry.in_(alert_dates),
                Vendor.is_tax_exempt.is_(True),
            )
        )
        vendors = result.scalars().all()

        count = 0
        for vendor in vendors:
            days_left = (vendor.tax_exempt_expiry - today).days
            if days_left == 0:
                urgency = "오늘 만료"
            elif days_left == 7:
                urgency = "7일 후 만료"
            else:
                urgency = "30일 후 만료"

            await notification_service.create_role_notifications(
                db,
                company_id=vendor.company_id,
                role="COMPANY_ADMIN",
                type="TAX_EXEMPT_EXPIRED",
                title=f"면세 인증서 만료: {vendor.name}",
                message=f"면세 인증서가 {urgency}됩니다. (만료일: {vendor.tax_exempt_expiry})",
                entity_type="vendor",
                entity_id=vendor.id,
            )
            count += 1

        await db.commit()
        logger.info("Tax exempt expiry alerts sent: %d", count)

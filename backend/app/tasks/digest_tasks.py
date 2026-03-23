"""
Email Digest Celery Tasks

Sends daily/weekly digest emails to configured recipients.
Runs every hour; checks each company's scheduled time.
"""
import asyncio
import logging
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from sqlalchemy import select, func as sqlfunc
from sqlalchemy.orm import selectinload

from app.tasks.celery_app import celery_app
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models.email_digest_setting import EmailDigestSetting
from app.models.invoice import Invoice
from app.models.invoice_payment import InvoicePayment

logger = logging.getLogger(__name__)


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


# ── Tasks ─────────────────────────────────────────────

@celery_app.task(name="app.tasks.digest_tasks.send_daily_digests")
def send_daily_digests():
    """Send daily digests for companies whose hour matches now."""
    return _run_async(_send_digests("daily"))


@celery_app.task(name="app.tasks.digest_tasks.send_weekly_digests")
def send_weekly_digests():
    """Send weekly digests for companies whose day+hour matches now."""
    return _run_async(_send_digests("weekly"))


async def _send_digests(digest_type: str):
    now = datetime.utcnow()
    current_hour = now.hour
    current_weekday = now.weekday()  # 0=Mon

    async with AsyncSessionLocal() as db:
        query = (
            select(EmailDigestSetting)
            .options(selectinload(EmailDigestSetting.recipients))
            .where(
                EmailDigestSetting.is_active == True,
                EmailDigestSetting.daily_hour_utc == current_hour,
            )
        )

        if digest_type == "daily":
            query = query.where(
                EmailDigestSetting.frequency.in_(["daily", "both"])
            )
        else:
            query = query.where(
                EmailDigestSetting.frequency.in_(["weekly", "both"]),
                EmailDigestSetting.weekly_day == current_weekday,
            )

        result = await db.execute(query)
        digest_settings = result.scalars().all()

        total_sent = 0
        for ds in digest_settings:
            active_recipients = [r for r in ds.recipients if r.is_active]
            if not active_recipients:
                continue

            try:
                data = await _gather_company_data(db, ds.company_id, digest_type)
                html = _build_digest_html(data, ds, digest_type)
                text = _build_digest_text(data, digest_type)
                sent = _send_emails(ds, active_recipients, html, text, digest_type)
                total_sent += sent
            except Exception as e:
                logger.error("Digest failed for company %s: %s", ds.company_id, e)

    logger.info("%s digest: sent %d emails", digest_type, total_sent)
    return {"type": digest_type, "sent": total_sent}


# ── Data Gathering ────────────────────────────────────

async def _gather_company_data(db, company_id, digest_type: str) -> dict:
    """Gather KPI data for a company."""
    now = datetime.utcnow()

    if digest_type == "daily":
        period_start = now - timedelta(days=1)
        period_label = now.strftime("%B %d, %Y")
    else:
        period_start = now - timedelta(days=7)
        period_label = f"{(now - timedelta(days=7)).strftime('%b %d')} — {now.strftime('%b %d, %Y')}"

    # Total invoices in period
    inv_count = await db.execute(
        select(sqlfunc.count(Invoice.id)).where(
            Invoice.company_id == company_id,
            Invoice.created_at >= period_start,
        )
    )
    invoices_count = inv_count.scalar() or 0

    # Total spend in period
    spend_result = await db.execute(
        select(sqlfunc.coalesce(sqlfunc.sum(Invoice.total_amount), 0)).where(
            Invoice.company_id == company_id,
            Invoice.created_at >= period_start,
        )
    )
    total_spend = float(spend_result.scalar() or 0)

    # Overdue
    overdue_result = await db.execute(
        select(sqlfunc.count(Invoice.id), sqlfunc.coalesce(sqlfunc.sum(Invoice.total_amount), 0)).where(
            Invoice.company_id == company_id,
            Invoice.due_date < now.date(),
            Invoice.status.notin_(["PAID", "VOID"]),
        )
    )
    overdue_row = overdue_result.one()
    overdue_count = overdue_row[0] or 0
    overdue_amount = float(overdue_row[1] or 0)

    # Pending approval
    pending_result = await db.execute(
        select(sqlfunc.count(Invoice.id)).where(
            Invoice.company_id == company_id,
            Invoice.status.in_(["SUBMITTED", "IN_APPROVAL"]),
        )
    )
    pending_count = pending_result.scalar() or 0

    # Paid in period
    paid_result = await db.execute(
        select(sqlfunc.count(Invoice.id), sqlfunc.coalesce(sqlfunc.sum(Invoice.total_amount), 0)).where(
            Invoice.company_id == company_id,
            Invoice.status == "PAID",
            Invoice.updated_at >= period_start,
        )
    )
    paid_row = paid_result.one()
    paid_count = paid_row[0] or 0
    paid_amount = float(paid_row[1] or 0)

    # Company name
    from app.models.company import Company
    company_result = await db.execute(
        select(Company.name).where(Company.id == company_id)
    )
    company_name = company_result.scalar() or "Your Company"

    return {
        "company_name": company_name,
        "period_label": period_label,
        "invoices_count": invoices_count,
        "total_spend": total_spend,
        "overdue_count": overdue_count,
        "overdue_amount": overdue_amount,
        "pending_count": pending_count,
        "paid_count": paid_count,
        "paid_amount": paid_amount,
    }


# ── Email Building ────────────────────────────────────

def _build_digest_html(data: dict, ds, digest_type: str) -> str:
    period_type = "Daily" if digest_type == "daily" else "Weekly"
    frontend_url = settings.FRONTEND_URL

    overdue_section = ""
    if ds.include_overdue and data["overdue_count"] > 0:
        overdue_section = f"""
        <div style="margin-top:16px;padding:16px;background:#fef2f2;border-radius:8px;border:1px solid #fecaca;">
            <p style="margin:0;color:#dc2626;font-weight:600;">⚠ {data['overdue_count']} Overdue Invoice{'s' if data['overdue_count'] > 1 else ''}</p>
            <p style="margin:4px 0 0;color:#991b1b;font-size:14px;">Total overdue: ${data['overdue_amount']:,.2f}</p>
        </div>
        """

    pending_section = ""
    if ds.include_pending and data["pending_count"] > 0:
        pending_section = f"""
        <div style="margin-top:12px;padding:16px;background:#fffbeb;border-radius:8px;border:1px solid #fde68a;">
            <p style="margin:0;color:#d97706;font-weight:600;">⏳ {data['pending_count']} Pending Approval</p>
        </div>
        """

    return f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;background:#f9fafb;">
        <div style="background:linear-gradient(135deg,#6d28d9,#4f46e5);border-radius:12px 12px 0 0;padding:24px;color:white;text-align:center;">
            <h1 style="margin:0;font-size:22px;">AI Invoice — {period_type} Digest</h1>
            <p style="margin:8px 0 0;opacity:0.8;font-size:14px;">{data['company_name']} · {data['period_label']}</p>
        </div>

        <div style="background:white;padding:24px;border:1px solid #e5e7eb;border-top:none;">
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
                <tr>
                    <td style="padding:12px;text-align:center;background:#f3f4f6;border-radius:8px;width:33%;">
                        <div style="font-size:24px;font-weight:700;color:#4f46e5;">{data['invoices_count']}</div>
                        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Processed</div>
                    </td>
                    <td style="padding:12px;text-align:center;background:#f3f4f6;border-radius:8px;width:33%;margin:0 8px;">
                        <div style="font-size:24px;font-weight:700;color:#059669;">{data['paid_count']}</div>
                        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Paid</div>
                    </td>
                    <td style="padding:12px;text-align:center;background:#f3f4f6;border-radius:8px;width:33%;">
                        <div style="font-size:24px;font-weight:700;color:#374151;">${data['total_spend']:,.0f}</div>
                        <div style="font-size:12px;color:#6b7280;margin-top:4px;">Total Spend</div>
                    </td>
                </tr>
            </table>

            {overdue_section}
            {pending_section}

            <div style="margin-top:24px;text-align:center;">
                <a href="{frontend_url}" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#6d28d9,#4f46e5);color:white;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
                    View Dashboard →
                </a>
            </div>
        </div>

        <div style="border-radius:0 0 12px 12px;padding:16px;text-align:center;border:1px solid #e5e7eb;border-top:none;background:#f9fafb;">
            <p style="margin:0;color:#9ca3af;font-size:12px;">
                You received this because you're subscribed to {data['company_name']}'s digest.
                Contact your admin to manage preferences.
            </p>
        </div>
    </div>
    """


def _build_digest_text(data: dict, digest_type: str) -> str:
    period_type = "Daily" if digest_type == "daily" else "Weekly"
    lines = [
        f"AI Invoice — {period_type} Digest",
        f"{data['company_name']} · {data['period_label']}",
        "",
        f"Processed: {data['invoices_count']}",
        f"Paid: {data['paid_count']} (${data['paid_amount']:,.2f})",
        f"Total Spend: ${data['total_spend']:,.2f}",
    ]
    if data["overdue_count"] > 0:
        lines.append(f"⚠ Overdue: {data['overdue_count']} (${data['overdue_amount']:,.2f})")
    if data["pending_count"] > 0:
        lines.append(f"⏳ Pending Approval: {data['pending_count']}")
    lines.append(f"\nView Dashboard: {settings.FRONTEND_URL}")
    return "\n".join(lines)


# ── Email Sending ─────────────────────────────────────

def _send_emails(ds, recipients, html: str, text: str, digest_type: str) -> int:
    smtp_host = ds.smtp_host or settings.SMTP_HOST
    smtp_port = ds.smtp_port or settings.SMTP_PORT
    smtp_user = ds.smtp_user or settings.SMTP_USER
    smtp_pass = ds.smtp_password or settings.SMTP_PASSWORD
    from_name = ds.smtp_from_name or "AI Invoice"

    if not smtp_user or not smtp_pass:
        logger.warning("SMTP not configured for company %s, skipping digest", ds.company_id)
        return 0

    period_type = "Daily" if digest_type == "daily" else "Weekly"
    sent = 0

    try:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)

            for r in recipients:
                msg = MIMEMultipart("alternative")
                msg["From"] = f"{from_name} <{smtp_user}>"
                msg["To"] = r.email
                msg["Subject"] = f"AI Invoice — {period_type} Digest"
                msg.attach(MIMEText(text, "plain", "utf-8"))
                msg.attach(MIMEText(html, "html", "utf-8"))

                try:
                    server.send_message(msg)
                    sent += 1
                except Exception as e:
                    logger.error("Failed to send digest to %s: %s", r.email, e)
    except Exception as e:
        logger.error("SMTP connection failed for company %s: %s", ds.company_id, e)

    return sent

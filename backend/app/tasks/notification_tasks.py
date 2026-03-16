import asyncio
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from app.tasks.celery_app import celery_app
from app.core.config import settings
from app.core.database import AsyncSessionLocal

logger = logging.getLogger(__name__)


async def _send_notification_email(notification_id: str):
    """알림 ID로 DB 조회 후 이메일 발송"""
    from uuid import UUID
    from sqlalchemy import select
    from app.models.notification import Notification
    from app.models.user import User

    async with AsyncSessionLocal() as db:
        try:
            result = await db.execute(
                select(Notification).where(Notification.id == UUID(notification_id))
            )
            notification = result.scalar_one_or_none()
            if not notification:
                logger.warning("Notification %s not found", notification_id)
                return

            if notification.email_sent:
                logger.info("Notification %s email already sent", notification_id)
                return

            # 사용자 조회
            user_result = await db.execute(
                select(User).where(User.id == notification.user_id)
            )
            user = user_result.scalar_one_or_none()
            if not user or not user.notification_email:
                logger.info(
                    "User %s not found or email notification disabled",
                    notification.user_id,
                )
                return

            # SMTP 설정 확인
            if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
                logger.warning("SMTP not configured, skipping email for %s", notification_id)
                return

            # 이메일 생성
            msg = MIMEMultipart("alternative")
            msg["From"] = settings.SMTP_USER
            msg["To"] = user.email
            msg["Subject"] = f"[Invoice System] {notification.title}"

            body = notification.message or notification.title
            msg.attach(MIMEText(body, "plain", "utf-8"))

            # 이메일 발송
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.send_message(msg)

            # email_sent 플래그 업데이트
            notification.email_sent = True
            await db.commit()
            logger.info("Email sent for notification %s to %s", notification_id, user.email)

        except smtplib.SMTPException as e:
            logger.error("SMTP error for notification %s: %s", notification_id, e)
            await db.rollback()
        except Exception as e:
            logger.error("Failed to send email for notification %s: %s", notification_id, e)
            await db.rollback()


@celery_app.task(
    bind=True,
    max_retries=3,
    default_retry_delay=60,
    name="app.tasks.notification_tasks.send_notification_email",
)
def send_notification_email(self, notification_id: str):
    """알림 이메일 비동기 발송 (Celery task)"""
    try:
        asyncio.run(_send_notification_email(notification_id))
    except Exception as exc:
        logger.error("send_notification_email failed: %s", exc)
        self.retry(exc=exc)

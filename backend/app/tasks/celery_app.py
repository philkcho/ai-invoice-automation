import logging

from celery import Celery
from celery.schedules import crontab
from celery.signals import task_failure
from app.core.config import settings

logger = logging.getLogger(__name__)

celery_app = Celery(
    "ai_invoice_automation",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.ocr_tasks",           # Phase 6
        "app.tasks.notification_tasks",  # Phase 7
        "app.tasks.scheduled_tasks",     # Phase 7
        "app.tasks.email_tasks",         # Phase 8
        "app.tasks.backup_tasks",        # Backup & Monitoring
    ],
    # 향후 추가:
    # "app.tasks.validation_tasks",    # Phase 5
    # "app.tasks.export_tasks",        # Phase 9
    # "app.tasks.exchange_rate_tasks", # Phase 4
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,  # 작업 완료 후 ack (안정성)
    worker_prefetch_multiplier=1,  # 한 번에 1개씩 처리
)

celery_app.conf.beat_schedule = {
    # 이메일 폴링 — 매 5분
    "email-poll": {
        "task": "app.tasks.email_tasks.poll_all_email_accounts",
        "schedule": crontab(minute="*/5"),
    },
    # 환율 업데이트 — 매일 자정 UTC (Phase 4, 미구현)
    # "exchange-rate-update": {
    #     "task": "app.tasks.exchange_rate_tasks.update_exchange_rates",
    #     "schedule": crontab(hour=0, minute=0),
    # },
    # 계약 만료 체크 — 매일 오전 8시 UTC
    "contract-expiry-check": {
        "task": "app.tasks.scheduled_tasks.check_contract_expiry",
        "schedule": crontab(hour=8, minute=0),
    },
    # 면세 만료 체크 — 매일 오전 8시 UTC
    "tax-exempt-expiry-check": {
        "task": "app.tasks.scheduled_tasks.check_tax_exempt_expiry",
        "schedule": crontab(hour=8, minute=0),
    },
    # 결제 마감 알림 — 매일 오전 8시 UTC
    "payment-due-reminder": {
        "task": "app.tasks.scheduled_tasks.send_payment_due_reminders",
        "schedule": crontab(hour=8, minute=0),
    },
    # ── 백업/모니터링 (KST 기준, UTC로 변환) ──────────────────
    # DB 백업 — 매일 03:00 KST (UTC 18:00)
    "backup-database": {
        "task": "app.tasks.backup_tasks.backup_database",
        "schedule": crontab(hour=18, minute=0),
    },
    # 미디어 백업 — 매일 03:30 KST (UTC 18:30)
    "backup-media": {
        "task": "app.tasks.backup_tasks.backup_media",
        "schedule": crontab(hour=18, minute=30),
    },
    # 백업 로테이션 — 매일 04:00 KST (UTC 19:00)
    "rotate-backups": {
        "task": "app.tasks.backup_tasks.rotate_backups",
        "schedule": crontab(hour=19, minute=0),
    },
    # 헬스체크 — 5분마다
    "health-check": {
        "task": "app.tasks.backup_tasks.health_check_all",
        "schedule": crontab(minute="*/5"),
    },
    # 디스크 감시 — 매시 정각
    "disk-monitor": {
        "task": "app.tasks.backup_tasks.monitor_disk",
        "schedule": crontab(minute=0),
    },
    # 환경설정 백업 — 매주 일요일 04:00 KST (UTC 19:00)
    "backup-config": {
        "task": "app.tasks.backup_tasks.backup_config",
        "schedule": crontab(day_of_week=0, hour=19, minute=0),
    },
}


# ── Celery 작업 실패 시그널 핸들러 ──────────────────────────
@task_failure.connect
def handle_task_failure(sender=None, task_id=None, exception=None,
                        args=None, kwargs=None, traceback=None, **kw):
    """작업 실패 시 Sentry + 텔레그램 알림"""
    task_name = sender.name if sender else "unknown"
    error_msg = f"Celery task failed: {task_name}\nTask ID: {task_id}\nError: {exception}"
    logger.error(error_msg)

    # Sentry 알림
    try:
        import sentry_sdk
        if sentry_sdk.is_initialized():
            sentry_sdk.capture_exception(exception)
    except Exception:
        pass

    # 텔레그램 알림
    if settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID:
        try:
            import urllib.request
            import urllib.parse

            message = f"🔴 *Celery Task Failed*\nTask: `{task_name}`\nID: `{task_id}`\nError: `{exception}`"
            params = urllib.parse.urlencode({
                "chat_id": settings.TELEGRAM_CHAT_ID,
                "text": message,
                "parse_mode": "Markdown",
            })
            url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage?{params}"
            req = urllib.request.Request(url, method="GET")
            urllib.request.urlopen(req, timeout=10)
        except Exception as e:
            logger.warning("Failed to send Telegram alert: %s", e)

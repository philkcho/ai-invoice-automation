from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "ai_invoice_automation",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        "app.tasks.ocr_tasks",           # Phase 6
        "app.tasks.notification_tasks",  # Phase 7
        "app.tasks.scheduled_tasks",     # Phase 7
        "app.tasks.email_tasks",         # Phase 8
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
}

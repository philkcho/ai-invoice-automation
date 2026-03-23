from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    # 환경
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # PostgreSQL
    DATABASE_URL: str
    DATABASE_URL_SYNC: str

    # Redis / Celery
    REDIS_URL: str
    CELERY_BROKER_URL: str
    CELERY_RESULT_BACKEND: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Claude API (OCR fallback용)
    ANTHROPIC_API_KEY: Optional[str] = None

    # Gemini API (AI 채팅용)
    GEMINI_API_KEY: Optional[str] = None

    # Google Document AI
    GOOGLE_PROJECT_ID: Optional[str] = None
    GOOGLE_LOCATION: str = "us"
    GOOGLE_PROCESSOR_ID: Optional[str] = None
    GOOGLE_APPLICATION_CREDENTIALS: Optional[str] = None

    # Gmail
    GMAIL_CLIENT_ID: Optional[str] = None
    GMAIL_CLIENT_SECRET: Optional[str] = None
    GMAIL_REDIRECT_URI: Optional[str] = None

    # Outlook
    OUTLOOK_CLIENT_ID: Optional[str] = None
    OUTLOOK_CLIENT_SECRET: Optional[str] = None
    OUTLOOK_TENANT_ID: Optional[str] = None
    OUTLOOK_REDIRECT_URI: Optional[str] = None

    # Open Exchange Rates
    OPEN_EXCHANGE_RATES_APP_ID: Optional[str] = None

    # Stripe
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_PUBLISHABLE_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"  # 콤마 구분 다중 도메인

    # Sentry
    SENTRY_DSN: Optional[str] = None

    # 암호화 (ACH)
    ENCRYPTION_KEY: str

    # Rate Limiting
    RATE_LIMIT_IP_PER_MIN: int = 100
    RATE_LIMIT_COMPANY_PER_MIN: int = 1000
    LOGIN_MAX_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15

    # Password Reset
    PASSWORD_RESET_TOKEN_EXPIRE_MINUTES: int = 30
    FRONTEND_URL: str = "http://localhost:3000"

    # Cookie
    COOKIE_SECURE: bool = False  # 프로덕션에서 True (HTTPS)
    COOKIE_DOMAIN: Optional[str] = None  # 프로덕션에서 도메인 설정
    COOKIE_SAMESITE: str = "lax"

    # SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    # Telegram Alerts
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    TELEGRAM_CHAT_ID: Optional[str] = None

    # Backup
    BACKUP_DIR: str = "/backups"

    class Config:
        env_file = ".env.dev"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

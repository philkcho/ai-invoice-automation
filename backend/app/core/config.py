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

    # AWS S3
    AWS_ACCESS_KEY_ID: str
    AWS_SECRET_ACCESS_KEY: str
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: str
    S3_PRESIGNED_URL_EXPIRY: int = 900  # 15분

    # Claude API
    ANTHROPIC_API_KEY: str

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

    # SMTP
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None

    class Config:
        env_file = ".env.dev"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

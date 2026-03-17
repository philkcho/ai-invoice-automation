"""EmailConfiguration CRUD 서비스"""
import json
import logging
from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.email_configuration import EmailConfiguration
from app.utils.encryption import encrypt_value, decrypt_value

logger = logging.getLogger(__name__)


async def create_email_config(
    db: AsyncSession,
    company_id: UUID,
    email_provider: str,
    email_address: str,
    filter_keywords: Optional[str] = None,
    filter_senders: Optional[str] = None,
    is_active: bool = True,
) -> EmailConfiguration:
    """이메일 설정 생성"""
    # 중복 체크
    existing = await db.execute(
        select(EmailConfiguration).where(
            EmailConfiguration.company_id == company_id,
            EmailConfiguration.email_address == email_address,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email configuration already exists: {email_address}",
        )

    config = EmailConfiguration(
        company_id=company_id,
        email_provider=email_provider,
        email_address=email_address,
        filter_keywords=filter_keywords,
        filter_senders=filter_senders,
        is_active=is_active,
        processed_message_ids=json.dumps([]),
    )
    db.add(config)
    await db.flush()
    await db.refresh(config)

    logger.info("Email config created: %s (%s)", email_address, email_provider)
    return config


async def get_email_config(
    db: AsyncSession, config_id: UUID
) -> EmailConfiguration:
    """이메일 설정 조회"""
    result = await db.execute(
        select(EmailConfiguration).where(EmailConfiguration.id == config_id)
    )
    config = result.scalar_one_or_none()
    if not config:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email configuration not found",
        )
    return config


async def list_email_configs(
    db: AsyncSession,
    company_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[EmailConfiguration], int]:
    """이메일 설정 목록 조회"""
    query = select(EmailConfiguration)
    count_query = select(func.count()).select_from(EmailConfiguration)

    if company_id:
        query = query.where(EmailConfiguration.company_id == company_id)
        count_query = count_query.where(EmailConfiguration.company_id == company_id)

    if is_active is not None:
        query = query.where(EmailConfiguration.is_active == is_active)
        count_query = count_query.where(EmailConfiguration.is_active == is_active)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(EmailConfiguration.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def update_email_config(
    db: AsyncSession,
    config_id: UUID,
    **kwargs,
) -> EmailConfiguration:
    """이메일 설정 업데이트"""
    config = await get_email_config(db, config_id)

    for key, value in kwargs.items():
        if value is not None and hasattr(config, key):
            setattr(config, key, value)

    await db.flush()
    await db.refresh(config)

    logger.info("Email config updated: %s", config_id)
    return config


async def delete_email_config(
    db: AsyncSession, config_id: UUID
) -> None:
    """이메일 설정 삭제"""
    config = await get_email_config(db, config_id)
    await db.delete(config)
    await db.flush()
    logger.info("Email config deleted: %s", config_id)


async def save_oauth_credentials(
    db: AsyncSession,
    config_id: UUID,
    credentials: dict,
) -> EmailConfiguration:
    """OAuth 토큰 암호화 저장"""
    config = await get_email_config(db, config_id)
    config.credentials_encrypted = encrypt_value(json.dumps(credentials))
    await db.flush()
    await db.refresh(config)
    logger.info("OAuth credentials saved for: %s", config.email_address)
    return config


def get_decrypted_credentials(config: EmailConfiguration) -> dict | None:
    """암호화된 OAuth 토큰 복호화"""
    if not config.credentials_encrypted:
        return None
    try:
        return json.loads(decrypt_value(config.credentials_encrypted))
    except Exception as e:
        logger.error("Failed to decrypt credentials for %s: %s", config.email_address, e)
        return None


async def get_active_configs(db: AsyncSession) -> list[EmailConfiguration]:
    """활성 이메일 설정 전체 조회 (폴링용)"""
    result = await db.execute(
        select(EmailConfiguration).where(
            EmailConfiguration.is_active == True,
            EmailConfiguration.credentials_encrypted.isnot(None),
        )
    )
    return list(result.scalars().all())

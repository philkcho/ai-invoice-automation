from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, update
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.notification import Notification
from app.models.user import User


async def create_notification(
    db: AsyncSession,
    *,
    company_id: UUID,
    user_id: UUID,
    type: str,
    title: str,
    message: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
) -> Notification:
    """인앱 알림 1건 생성"""
    notification = Notification(
        company_id=company_id,
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    db.add(notification)
    await db.flush()
    await db.refresh(notification)
    return notification


async def create_role_notifications(
    db: AsyncSession,
    *,
    company_id: UUID,
    role: str,
    type: str,
    title: str,
    message: Optional[str] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[UUID] = None,
) -> list[Notification]:
    """특정 역할 보유 유저 전원에게 알림 생성"""
    result = await db.execute(
        select(User).where(
            User.company_id == company_id,
            User.role == role,
            User.is_active.is_(True),
        )
    )
    users = result.scalars().all()

    notifications = []
    for user in users:
        n = Notification(
            company_id=company_id,
            user_id=user.id,
            type=type,
            title=title,
            message=message,
            entity_type=entity_type,
            entity_id=entity_id,
        )
        db.add(n)
        notifications.append(n)

    if notifications:
        await db.flush()
        for n in notifications:
            await db.refresh(n)

    return notifications


async def list_notifications(
    db: AsyncSession,
    user_id: UUID,
    is_read: Optional[bool] = None,
    skip: int = 0,
    limit: int = 50,
) -> tuple[list[Notification], int]:
    """사용자 알림 목록 조회"""
    query = select(Notification).where(Notification.user_id == user_id)
    count_query = select(func.count()).select_from(Notification).where(
        Notification.user_id == user_id
    )

    if is_read is not None:
        query = query.where(Notification.is_read == is_read)
        count_query = count_query.where(Notification.is_read == is_read)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(Notification.created_at.desc()).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def get_unread_count(db: AsyncSession, user_id: UUID) -> int:
    """미읽음 알림 카운트"""
    result = await db.execute(
        select(func.count()).select_from(Notification).where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
    )
    return result.scalar()


async def mark_as_read(
    db: AsyncSession, notification_id: UUID, user_id: UUID
) -> Notification:
    """알림 1건 읽음 처리"""
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == user_id,
        )
    )
    notification = result.scalar_one_or_none()
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found",
        )
    notification.is_read = True
    await db.flush()
    await db.refresh(notification)
    return notification


async def mark_all_as_read(db: AsyncSession, user_id: UUID) -> int:
    """전체 알림 읽음 처리, 업데이트된 건수 반환"""
    result = await db.execute(
        update(Notification)
        .where(
            Notification.user_id == user_id,
            Notification.is_read.is_(False),
        )
        .values(is_read=True)
    )
    await db.flush()
    return result.rowcount

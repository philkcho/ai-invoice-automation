from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_any
from app.schemas.notification import (
    NotificationResponse, NotificationListResponse, UnreadCountResponse,
)
from app.services import notification_service

router = APIRouter()


@router.get("", response_model=NotificationListResponse)
async def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    is_read: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any),
):
    """내 알림 목록 조회"""
    items, total = await notification_service.list_notifications(
        db, current_user["user_id"], is_read, skip, limit
    )
    return NotificationListResponse(items=items, total=total)


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any),
):
    """미읽음 알림 카운트"""
    count = await notification_service.get_unread_count(db, current_user["user_id"])
    return UnreadCountResponse(count=count)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any),
):
    """알림 읽음 처리"""
    return await notification_service.mark_as_read(
        db, notification_id, current_user["user_id"]
    )


@router.post("/read-all", status_code=200)
async def mark_all_as_read(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_any),
):
    """전체 알림 읽음 처리"""
    count = await notification_service.mark_all_as_read(db, current_user["user_id"])
    return {"updated": count}

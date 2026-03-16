from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


# ── 응답 스키마 ──────────────────────────────────────
class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    company_id: UUID
    user_id: UUID
    type: str
    title: str
    message: Optional[str]
    entity_type: Optional[str]
    entity_id: Optional[UUID]
    is_read: bool
    email_sent: bool
    created_at: datetime


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    total: int


class UnreadCountResponse(BaseModel):
    count: int

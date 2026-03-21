from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user, require_admin, ROLE_SUPER_ADMIN
from app.models.company import Company
from app.schemas.chat import ChatMessageRequest, ChatMessageResponse
from app.services import chat_service

router = APIRouter()


class ChatSettingsResponse(BaseModel):
    ai_chat_mode: str


class ChatSettingsUpdate(BaseModel):
    ai_chat_mode: str = Field(..., pattern=r"^(invoice_only|hybrid)$")


@router.get("/settings", response_model=ChatSettingsResponse)
async def get_chat_settings(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """AI 채팅 설정 조회"""
    company_id = current_user.get("company_id")
    if not company_id:
        return ChatSettingsResponse(ai_chat_mode="hybrid")
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    return ChatSettingsResponse(ai_chat_mode=company.ai_chat_mode if company else "invoice_only")


@router.patch("/settings", response_model=ChatSettingsResponse)
async def update_chat_settings(
    body: ChatSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """AI 채팅 설정 변경 (COMPANY_ADMIN 이상)"""
    company_id = current_user.get("company_id")
    if not company_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No company assigned")
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Company not found")
    company.ai_chat_mode = body.ai_chat_mode
    await db.flush()
    await db.commit()
    return ChatSettingsResponse(ai_chat_mode=company.ai_chat_mode)


@router.post("/message", response_model=ChatMessageResponse)
async def send_message(
    body: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """AI 채팅: 자연어 질의 → DB 조회 → 자연어 답변"""
    company_id = current_user.get("company_id")

    # 회사 chat mode 확인
    chat_mode = "invoice_only"
    if company_id:
        result = await db.execute(select(Company).where(Company.id == company_id))
        company = result.scalar_one_or_none()
        if company:
            chat_mode = company.ai_chat_mode
    else:
        chat_mode = "hybrid"  # SUPER_ADMIN

    result = await chat_service.process_chat_message(db, company_id, body.message, chat_mode)
    return ChatMessageResponse(**result)

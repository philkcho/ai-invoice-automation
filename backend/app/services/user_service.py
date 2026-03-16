from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate, PasswordChange
from app.core.security import hash_password, verify_password, ROLE_SUPER_ADMIN


async def create_user(db: AsyncSession, data: UserCreate) -> User:
    # 이메일 중복 체크
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Email '{data.email}' already exists",
        )

    # Super Admin은 company_id가 NULL이어야 함
    if data.role == ROLE_SUPER_ADMIN and data.company_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super Admin must not belong to a company",
        )

    # Super Admin이 아닌 역할은 company_id 필수
    if data.role != ROLE_SUPER_ADMIN and data.company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Non-Super Admin users must belong to a company",
        )

    user = User(
        company_id=data.company_id,
        email=data.email,
        full_name=data.full_name,
        role=data.role,
        password_hash=hash_password(data.password),
        notification_email=data.notification_email,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user


async def get_user(db: AsyncSession, user_id: UUID) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return user


async def list_users(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
    company_id: Optional[UUID] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
) -> tuple[list[User], int]:
    query = select(User)
    count_query = select(func.count()).select_from(User)

    if company_id is not None:
        query = query.where(User.company_id == company_id)
        count_query = count_query.where(User.company_id == company_id)

    if role:
        query = query.where(User.role == role)
        count_query = count_query.where(User.role == role)

    if is_active is not None:
        query = query.where(User.is_active == is_active)
        count_query = count_query.where(User.is_active == is_active)

    if search:
        search_filter = (
            User.full_name.ilike(f"%{search}%") | User.email.ilike(f"%{search}%")
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(User.full_name).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def update_user(
    db: AsyncSession, user_id: UUID, data: UserUpdate
) -> User:
    user = await get_user(db, user_id)
    update_data = data.model_dump(exclude_unset=True)

    # 역할 변경 시 company_id 정합성 검증
    new_role = update_data.get("role", user.role)
    new_company_id = update_data.get("company_id", user.company_id)

    if new_role == ROLE_SUPER_ADMIN and new_company_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Super Admin must not belong to a company",
        )
    if new_role != ROLE_SUPER_ADMIN and new_company_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Non-Super Admin users must belong to a company",
        )

    for field, value in update_data.items():
        setattr(user, field, value)

    await db.flush()
    await db.refresh(user)
    return user


async def change_password(
    db: AsyncSession, user_id: UUID, data: PasswordChange
) -> None:
    user = await get_user(db, user_id)

    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect",
        )

    user.password_hash = hash_password(data.new_password)
    await db.flush()


async def delete_user(db: AsyncSession, user_id: UUID) -> None:
    user = await get_user(db, user_id)
    await db.delete(user)
    await db.flush()

from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.company import Company
from app.schemas.company import CompanyCreate, CompanyUpdate


async def create_company(db: AsyncSession, data: CompanyCreate) -> Company:
    # company_code 중복 체크
    existing = await db.execute(
        select(Company).where(Company.company_code == data.company_code)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Company code '{data.company_code}' already exists",
        )

    # EIN 중복 체크 (값이 있는 경우만)
    if data.ein:
        ein_exists = await db.execute(
            select(Company).where(Company.ein == data.ein)
        )
        if ein_exists.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"EIN '{data.ein}' already exists",
            )

    company = Company(**data.model_dump())
    db.add(company)
    await db.flush()
    await db.refresh(company)
    return company


async def get_company(db: AsyncSession, company_id: UUID) -> Company:
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )
    return company


async def list_companies(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
) -> tuple[list[Company], int]:
    query = select(Company)
    count_query = select(func.count()).select_from(Company)

    if status_filter:
        query = query.where(Company.status == status_filter)
        count_query = count_query.where(Company.status == status_filter)

    if search:
        search_filter = Company.company_name.ilike(f"%{search}%")
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(Company.company_name).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def update_company(
    db: AsyncSession, company_id: UUID, data: CompanyUpdate
) -> Company:
    company = await get_company(db, company_id)
    update_data = data.model_dump(exclude_unset=True)

    # EIN 변경 시 중복 체크
    if "ein" in update_data and update_data["ein"]:
        ein_exists = await db.execute(
            select(Company).where(
                Company.ein == update_data["ein"],
                Company.id != company_id,
            )
        )
        if ein_exists.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"EIN '{update_data['ein']}' already exists",
            )

    for field, value in update_data.items():
        setattr(company, field, value)

    await db.flush()
    await db.refresh(company)
    return company


async def delete_company(db: AsyncSession, company_id: UUID) -> None:
    company = await get_company(db, company_id)

    # 소속 사용자가 있으면 삭제 불가
    await db.refresh(company, ["users"])
    if company.users:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot delete company with existing users. Deactivate instead.",
        )

    await db.delete(company)
    await db.flush()

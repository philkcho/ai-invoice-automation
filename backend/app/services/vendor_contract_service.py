from typing import Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.vendor_contract import VendorContract
from app.schemas.vendor_contract import VendorContractCreate, VendorContractUpdate


async def create_contract(db: AsyncSession, data: VendorContractCreate, created_by: UUID | None) -> VendorContract:
    contract = VendorContract(**data.model_dump(), created_by=created_by)
    db.add(contract)
    await db.flush()
    await db.refresh(contract)
    return contract


async def get_contract(db: AsyncSession, contract_id: UUID) -> VendorContract:
    result = await db.execute(select(VendorContract).where(VendorContract.id == contract_id))
    contract = result.scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vendor contract not found")
    return contract


async def list_contracts(
    db: AsyncSession, skip: int = 0, limit: int = 50,
    company_id: Optional[UUID] = None, vendor_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
) -> tuple[list[VendorContract], int]:
    query = select(VendorContract)
    count_query = select(func.count()).select_from(VendorContract)

    if company_id:
        query = query.where(VendorContract.company_id == company_id)
        count_query = count_query.where(VendorContract.company_id == company_id)

    if vendor_id:
        query = query.where(VendorContract.vendor_id == vendor_id)
        count_query = count_query.where(VendorContract.vendor_id == vendor_id)

    if is_active is not None:
        query = query.where(VendorContract.is_active == is_active)
        count_query = count_query.where(VendorContract.is_active == is_active)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(query.order_by(VendorContract.expiry_date).offset(skip).limit(limit))
    return list(result.scalars().all()), total


async def update_contract(db: AsyncSession, contract_id: UUID, data: VendorContractUpdate) -> VendorContract:
    contract = await get_contract(db, contract_id)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(contract, field, value)
    await db.flush()
    await db.refresh(contract)
    return contract


async def delete_contract(db: AsyncSession, contract_id: UUID) -> None:
    contract = await get_contract(db, contract_id)
    await db.delete(contract)
    await db.flush()

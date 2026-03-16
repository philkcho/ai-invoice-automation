from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import require_admin, get_current_user, ROLE_SUPER_ADMIN
from app.utils.company_access import verify_company_access, verify_company_modify
from app.schemas.vendor_contract import (
    VendorContractCreate, VendorContractUpdate, VendorContractResponse, VendorContractListResponse,
)
from app.services import vendor_contract_service

router = APIRouter()


@router.post("", response_model=VendorContractResponse, status_code=201)
async def create_contract(
    data: VendorContractCreate, db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    if current_user["role"] != ROLE_SUPER_ADMIN:
        if data.company_id != current_user["company_id"]:
            from fastapi import HTTPException, status
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return await vendor_contract_service.create_contract(db, data, current_user["user_id"])


@router.get("", response_model=VendorContractListResponse)
async def list_contracts(
    skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100),
    vendor_id: Optional[UUID] = None, is_active: Optional[bool] = None,
    db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user),
):
    company_id = None if current_user["role"] == ROLE_SUPER_ADMIN else current_user["company_id"]
    items, total = await vendor_contract_service.list_contracts(db, skip, limit, company_id, vendor_id, is_active)
    return VendorContractListResponse(items=items, total=total)


@router.get("/{contract_id}", response_model=VendorContractResponse)
async def get_contract(contract_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(get_current_user)):
    contract = await vendor_contract_service.get_contract(db, contract_id)
    verify_company_access(current_user, contract.company_id)
    return contract


@router.patch("/{contract_id}", response_model=VendorContractResponse)
async def update_contract(contract_id: UUID, data: VendorContractUpdate, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_admin)):
    contract = await vendor_contract_service.get_contract(db, contract_id)
    verify_company_modify(current_user, contract.company_id)
    return await vendor_contract_service.update_contract(db, contract_id, data)


@router.delete("/{contract_id}", status_code=204)
async def delete_contract(contract_id: UUID, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_admin)):
    contract = await vendor_contract_service.get_contract(db, contract_id)
    verify_company_modify(current_user, contract.company_id)
    await vendor_contract_service.delete_contract(db, contract_id)

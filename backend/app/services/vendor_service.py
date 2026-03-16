from typing import Optional
from uuid import UUID

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.vendor import Vendor
from app.schemas.vendor import VendorCreate, VendorUpdate, DuplicateWarning
from app.utils.vendor_utils import normalize_ein, fuzzy_match_score
from app.utils.encryption import encrypt_value, decrypt_value

FUZZY_THRESHOLD = 0.8


def _mask_value(val: str | None) -> str | None:
    """마지막 4자리만 노출"""
    if not val:
        return None
    try:
        plain = decrypt_value(val)
        if len(plain) <= 4:
            return "****"
        return "*" * (len(plain) - 4) + plain[-4:]
    except Exception:
        return "****"


def vendor_to_response_dict(vendor: Vendor) -> dict:
    """Vendor ORM → 응답 dict (ACH 마스킹 포함)"""
    data = {c.key: getattr(vendor, c.key) for c in vendor.__table__.columns}
    data.pop("ach_routing", None)
    data.pop("ach_account", None)
    data.pop("ein_normalized", None)
    data["ach_routing_masked"] = _mask_value(vendor.ach_routing)
    data["ach_account_masked"] = _mask_value(vendor.ach_account)
    return data


async def check_duplicates(
    db: AsyncSession,
    company_name: str,
    ein: str | None,
    ach_routing: str | None,
    ach_account: str | None,
    company_id: UUID | None,
    exclude_id: UUID | None = None,
) -> list[DuplicateWarning]:
    """EIN 완전 일치 + 회사명 fuzzy match + ACH 중복 검사"""
    warnings: list[DuplicateWarning] = []
    ein_norm = normalize_ein(ein)

    # 1. EIN 완전 일치
    if ein_norm:
        query = select(Vendor).where(
            Vendor.ein_normalized == ein_norm,
            or_(
                Vendor.company_id.is_(None),  # shared pool
                Vendor.company_id == company_id,  # same company
            ),
        )
        if exclude_id:
            query = query.where(Vendor.id != exclude_id)

        result = await db.execute(query)
        for v in result.scalars().all():
            scope = "shared pool" if v.company_id is None else "same company"
            warnings.append(DuplicateWarning(
                type="EIN_EXACT",
                message=f"EIN '{ein}' already exists in {scope}",
                existing_vendor_id=v.id,
                existing_vendor_name=v.company_name,
            ))

    # 2. 회사명 fuzzy match (같은 스코프 내)
    scope_filter = or_(
        Vendor.company_id.is_(None),
        Vendor.company_id == company_id,
    )
    query = select(Vendor).where(scope_filter, Vendor.status == "ACTIVE")
    if exclude_id:
        query = query.where(Vendor.id != exclude_id)

    result = await db.execute(query)
    for v in result.scalars().all():
        score = fuzzy_match_score(company_name, v.company_name)
        if score >= FUZZY_THRESHOLD and v.company_name.lower() != company_name.lower():
            warnings.append(DuplicateWarning(
                type="NAME_FUZZY",
                message=f"Similar vendor name found: '{v.company_name}' ({score:.0%} match)",
                existing_vendor_id=v.id,
                existing_vendor_name=v.company_name,
                score=round(score, 2),
            ))

    # 3. ACH 계좌 중복
    if ach_routing and ach_account:
        encrypted_routing = encrypt_value(ach_routing)
        # ACH 중복은 복호화 후 비교 (암호화 결과가 매번 다르므로)
        query = select(Vendor).where(
            Vendor.ach_routing.isnot(None),
            Vendor.ach_account.isnot(None),
            scope_filter,
        )
        if exclude_id:
            query = query.where(Vendor.id != exclude_id)

        result = await db.execute(query)
        for v in result.scalars().all():
            try:
                existing_routing = decrypt_value(v.ach_routing)
                existing_account = decrypt_value(v.ach_account)
                if existing_routing == ach_routing and existing_account == ach_account:
                    warnings.append(DuplicateWarning(
                        type="ACH_DUPLICATE",
                        message=f"Same ACH account found on vendor '{v.company_name}'",
                        existing_vendor_id=v.id,
                        existing_vendor_name=v.company_name,
                    ))
            except Exception:
                continue

    return warnings


async def create_vendor(
    db: AsyncSession, data: VendorCreate
) -> tuple[Vendor, list[DuplicateWarning]]:
    ein_norm = normalize_ein(data.ein)

    # EIN 완전 일치 시 같은 company 내에서는 등록 차단
    if ein_norm and data.company_id:
        existing = await db.execute(
            select(Vendor).where(
                Vendor.ein_normalized == ein_norm,
                Vendor.company_id == data.company_id,
            )
        )
        if existing.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Vendor with EIN '{data.ein}' already exists in this company",
            )

    # 중복 경고 수집
    warnings = await check_duplicates(
        db, data.company_name, data.ein,
        data.ach_routing, data.ach_account, data.company_id
    )

    # ACH 암호화
    ach_routing_enc = encrypt_value(data.ach_routing) if data.ach_routing else None
    ach_account_enc = encrypt_value(data.ach_account) if data.ach_account else None

    vendor_data = data.model_dump(exclude={"ach_routing", "ach_account"})
    vendor = Vendor(
        **vendor_data,
        ein_normalized=ein_norm,
        ach_routing=ach_routing_enc,
        ach_account=ach_account_enc,
    )
    db.add(vendor)
    await db.flush()
    await db.refresh(vendor)
    return vendor, warnings


async def get_vendor(db: AsyncSession, vendor_id: UUID) -> Vendor:
    result = await db.execute(select(Vendor).where(Vendor.id == vendor_id))
    vendor = result.scalar_one_or_none()
    if not vendor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vendor not found",
        )
    return vendor


async def list_vendors(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20,
    company_id: Optional[UUID] = None,
    include_shared: bool = True,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
) -> tuple[list[Vendor], int]:
    query = select(Vendor)
    count_query = select(func.count()).select_from(Vendor)

    # company_id 필터 + shared pool 포함 여부
    if company_id is not None:
        if include_shared:
            scope = or_(Vendor.company_id == company_id, Vendor.company_id.is_(None))
        else:
            scope = Vendor.company_id == company_id
        query = query.where(scope)
        count_query = count_query.where(scope)

    if status_filter:
        query = query.where(Vendor.status == status_filter)
        count_query = count_query.where(Vendor.status == status_filter)

    if search:
        search_filter = or_(
            Vendor.company_name.ilike(f"%{search}%"),
            Vendor.vendor_code.ilike(f"%{search}%"),
            Vendor.ein.ilike(f"%{search}%"),
        )
        query = query.where(search_filter)
        count_query = count_query.where(search_filter)

    total = (await db.execute(count_query)).scalar()
    result = await db.execute(
        query.order_by(Vendor.company_name).offset(skip).limit(limit)
    )
    return list(result.scalars().all()), total


async def update_vendor(
    db: AsyncSession, vendor_id: UUID, data: VendorUpdate
) -> Vendor:
    vendor = await get_vendor(db, vendor_id)
    update_data = data.model_dump(exclude_unset=True)

    # EIN 변경 시 정규화
    if "ein" in update_data:
        vendor.ein_normalized = normalize_ein(update_data["ein"])

    # ACH 변경 시 암호화
    if "ach_routing" in update_data:
        update_data["ach_routing"] = encrypt_value(update_data["ach_routing"]) if update_data["ach_routing"] else None
    if "ach_account" in update_data:
        update_data["ach_account"] = encrypt_value(update_data["ach_account"]) if update_data["ach_account"] else None

    for field, value in update_data.items():
        setattr(vendor, field, value)

    await db.flush()
    await db.refresh(vendor)
    return vendor


async def delete_vendor(db: AsyncSession, vendor_id: UUID) -> None:
    vendor = await get_vendor(db, vendor_id)
    await db.delete(vendor)
    await db.flush()

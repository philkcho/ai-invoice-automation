from uuid import UUID

from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import HTTPException, status

from app.models.linkage_detail import LinkageDetail
from app.schemas.linkage_detail import LinkageDetailCreate


async def list_by_type(
    db: AsyncSession, company_id: UUID, invoice_type_id: UUID,
) -> list[LinkageDetail]:
    result = await db.execute(
        select(LinkageDetail)
        .where(
            LinkageDetail.company_id == company_id,
            LinkageDetail.invoice_type_id == invoice_type_id,
        )
        .order_by(LinkageDetail.created_at)
    )
    return list(result.scalars().all())


async def bulk_save(
    db: AsyncSession,
    company_id: UUID,
    invoice_type_id: UUID,
    details: list[LinkageDetailCreate],
) -> list[LinkageDetail]:
    """기존 내역 삭제 후 새로 일괄 저장"""
    # linkage_no 중복 검증
    linkage_nos = [d.linkage_no for d in details]
    if len(linkage_nos) != len(set(linkage_nos)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Duplicate linkage_no found",
        )

    # 기존 삭제
    await db.execute(
        delete(LinkageDetail).where(
            LinkageDetail.company_id == company_id,
            LinkageDetail.invoice_type_id == invoice_type_id,
        )
    )

    # 새로 생성
    created = []
    for d in details:
        item = LinkageDetail(
            company_id=company_id,
            invoice_type_id=invoice_type_id,
            linkage_no=d.linkage_no,
            vendor_id=d.vendor_id,
            amount=d.amount,
        )
        db.add(item)
        created.append(item)

    if created:
        await db.flush()
        for item in created:
            await db.refresh(item)

    return created


async def delete_by_type(
    db: AsyncSession, company_id: UUID, invoice_type_id: UUID,
) -> None:
    await db.execute(
        delete(LinkageDetail).where(
            LinkageDetail.company_id == company_id,
            LinkageDetail.invoice_type_id == invoice_type_id,
        )
    )
    await db.flush()

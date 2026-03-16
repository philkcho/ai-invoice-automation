from datetime import datetime, date
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class ExchangeRateCreate(BaseModel):
    from_currency: str = Field(..., min_length=1, max_length=10)
    to_currency: str = Field("USD", max_length=10)
    rate: float = Field(..., gt=0)
    rate_date: date
    source: str = Field("MANUAL", pattern=r"^(AUTO_API|MANUAL)$")


class ExchangeRateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    from_currency: str
    to_currency: str
    rate: float
    rate_date: date
    source: str
    updated_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime


class ExchangeRateListResponse(BaseModel):
    items: list[ExchangeRateResponse]
    total: int

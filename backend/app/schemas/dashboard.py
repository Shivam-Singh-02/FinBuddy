from datetime import date
from typing import Literal

from pydantic import BaseModel, Field


class AllocationItemResponse(BaseModel):
    label: str
    value: float = Field(ge=0)


class DashboardSummaryResponse(BaseModel):
    cash_total: float
    investment_current_total: float
    investment_principal_total: float
    vlti_current_total: float
    vlti_principal_total: float
    net_worth: float
    gain_loss: float
    allocation: list[AllocationItemResponse]


class TrendPointResponse(BaseModel):
    label: str
    bucket_start: date
    bucket_end: date
    cash_total: float
    investment_current_total: float
    investment_principal_total: float
    vlti_current_total: float
    vlti_principal_total: float
    net_worth: float


class DashboardTrendResponse(BaseModel):
    period: Literal["weekly", "monthly"]
    points: list[TrendPointResponse]


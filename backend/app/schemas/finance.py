from __future__ import annotations

from datetime import date, datetime
from typing import Annotated, Optional

from pydantic import BaseModel, Field


Money = Annotated[float, Field(ge=0)]


class AccountBalanceEntryCreate(BaseModel):
    balance: Money
    as_of_date: date


class AccountBalanceEntryResponse(BaseModel):
    id: str
    balance: Money
    as_of_date: date
    created_at: datetime


class AccountCreate(BaseModel):
    institution_name: str = Field(min_length=2, max_length=120)
    account_name: str = Field(min_length=2, max_length=120)
    account_type: str = Field(min_length=2, max_length=80)
    notes: Optional[str] = Field(default=None, max_length=500)
    initial_balance: Money
    balance_date: date


class AccountResponse(BaseModel):
    id: str
    institution_name: str
    account_name: str
    account_type: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    latest_balance: Optional[Money] = None
    latest_balance_date: Optional[date] = None
    recent_entries: list[AccountBalanceEntryResponse] = Field(default_factory=list)


class InvestmentValuationEntryCreate(BaseModel):
    invested_amount: Money
    current_value: Money
    as_of_date: date


class InvestmentValuationEntryResponse(BaseModel):
    id: str
    invested_amount: Money
    current_value: Money
    as_of_date: date
    created_at: datetime


class InvestmentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    category: str = Field(min_length=2, max_length=80)
    notes: Optional[str] = Field(default=None, max_length=500)
    initial_invested_amount: Money
    initial_current_value: Money
    valuation_date: date


class InvestmentResponse(BaseModel):
    id: str
    name: str
    category: str
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    latest_invested_amount: Optional[Money] = None
    latest_current_value: Optional[Money] = None
    latest_valuation_date: Optional[date] = None
    recent_entries: list[InvestmentValuationEntryResponse] = Field(default_factory=list)

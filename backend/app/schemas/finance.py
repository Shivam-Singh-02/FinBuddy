from datetime import date, datetime
from typing import Annotated

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
    notes: str | None = Field(default=None, max_length=500)
    initial_balance: Money
    balance_date: date


class AccountResponse(BaseModel):
    id: str
    institution_name: str
    account_name: str
    account_type: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    latest_balance: Money | None = None
    latest_balance_date: date | None = None
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
    notes: str | None = Field(default=None, max_length=500)
    initial_invested_amount: Money
    initial_current_value: Money
    valuation_date: date


class InvestmentResponse(BaseModel):
    id: str
    name: str
    category: str
    notes: str | None = None
    created_at: datetime
    updated_at: datetime
    latest_invested_amount: Money | None = None
    latest_current_value: Money | None = None
    latest_valuation_date: date | None = None
    recent_entries: list[InvestmentValuationEntryResponse] = Field(default_factory=list)

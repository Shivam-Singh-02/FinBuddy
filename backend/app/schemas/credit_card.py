from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field
from app.schemas.expense import ExpenseCategory


class CreditCardCreate(BaseModel):
    issuer: str = Field(min_length=2, max_length=120)
    name: str = Field(min_length=2, max_length=120)
    last_four: str | None = Field(default=None, pattern=r"^\d{4}$")
    credit_limit: float | None = Field(default=None, gt=0)
    billing_cycle_day: int | None = Field(default=None, ge=1, le=31)
    payment_due_day: int | None = Field(default=None, ge=1, le=31)


class CreditCardCategoryUpdate(BaseModel):
    category: ExpenseCategory


class CreditCardUpdate(BaseModel):
    issuer: str | None = Field(default=None, min_length=2, max_length=120)
    name: str | None = Field(default=None, min_length=2, max_length=120)
    last_four: str | None = Field(default=None, pattern=r"^\d{4}$")
    credit_limit: float | None = Field(default=None, gt=0)
    billing_cycle_day: int | None = Field(default=None, ge=1, le=31)
    payment_due_day: int | None = Field(default=None, ge=1, le=31)


class CreditCardResponse(BaseModel):
    id: str
    issuer: str
    name: str
    last_four: str | None = None
    credit_limit: float | None = None
    billing_cycle_day: int | None = None
    payment_due_day: int | None = None
    created_at: datetime
    updated_at: datetime


class CreditCardTransaction(BaseModel):
    transaction_id: str | None = None
    transaction_date: date
    description: str
    merchant: str | None = None
    category: ExpenseCategory
    amount: float
    currency: str = "INR"
    transaction_type: Literal["purchase", "refund", "payment", "fee", "other"] = "purchase"
    confidence: float = 0.6


class CreditCardStatementResponse(BaseModel):
    id: str
    card_id: str
    source_filename: str
    statement_period_start: date | None = None
    statement_period_end: date | None = None
    total_spend: float
    currency: str = "INR"
    parser: str
    transactions: list[CreditCardTransaction]
    created_at: datetime


class CreditCardAnalysisResponse(BaseModel):
    period_start: date | None = None
    period_end: date | None = None
    total_spend: float
    refunds: float
    fees: float
    transaction_count: int
    category_totals: list[dict]
    monthly_trend: list[dict]
    top_merchants: list[dict]
    card_totals: list[dict] = Field(default_factory=list)
    recent_transactions: list[dict]

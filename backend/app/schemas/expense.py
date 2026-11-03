from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


ExpenseCategory = Literal[
    "Food & Dining",
    "Groceries",
    "Shopping",
    "Transport",
    "Travel",
    "Bills & Utilities",
    "Rent & Housing",
    "Healthcare",
    "Entertainment",
    "Education",
    "Fees & Charges",
    "Transfers",
    "Investments",
    "Income",
    "Other",
]


class ExpenseTransaction(BaseModel):
    transaction_date: date
    description: str = Field(min_length=1, max_length=300)
    merchant: str | None = Field(default=None, max_length=120)
    category: ExpenseCategory
    amount: float = Field(ge=0)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    account_name: str | None = Field(default=None, max_length=120)
    confidence: float = Field(default=0.6, ge=0, le=1)


class ExpenseCategorySummary(BaseModel):
    category: ExpenseCategory
    total: float = Field(ge=0)
    transaction_count: int = Field(ge=0)


class ExpenseImportResponse(BaseModel):
    id: str
    source_filename: str
    parser: Literal["bedrock", "openai", "heuristic"]
    statement_period_start: date | None = None
    statement_period_end: date | None = None
    total_spend: float = Field(ge=0)
    currency: str = Field(default="INR", min_length=3, max_length=3)
    category_totals: list[ExpenseCategorySummary]
    transactions: list[ExpenseTransaction]
    created_at: datetime

from collections import defaultdict
from datetime import datetime, time, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.db.database import get_database
from app.schemas.finance import (
    AccountBalanceEntryCreate,
    AccountBalanceEntryResponse,
    AccountCreate,
    AccountResponse,
    InvestmentCreate,
    InvestmentResponse,
    InvestmentValuationEntryCreate,
    InvestmentValuationEntryResponse,
)


router = APIRouter(tags=["finances"])


def _day_to_datetime(day_value) -> datetime:
    return datetime.combine(day_value, time.min, tzinfo=timezone.utc)


def _serialize_account_entry(entry: dict) -> AccountBalanceEntryResponse:
    return AccountBalanceEntryResponse(
        id=str(entry["_id"]),
        balance=round(float(entry["balance"]), 2),
        as_of_date=entry["as_of_date"].date(),
        created_at=entry["created_at"],
    )


def _serialize_investment_entry(entry: dict) -> InvestmentValuationEntryResponse:
    return InvestmentValuationEntryResponse(
        id=str(entry["_id"]),
        invested_amount=round(float(entry["invested_amount"]), 2),
        current_value=round(float(entry["current_value"]), 2),
        as_of_date=entry["as_of_date"].date(),
        created_at=entry["created_at"],
    )


async def _ensure_account(account_id: str, user_id: ObjectId) -> dict:
    if not ObjectId.is_valid(account_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    account = await get_database().accounts.find_one({"_id": ObjectId(account_id), "user_id": user_id})
    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found.")

    return account


async def _ensure_investment(investment_id: str, user_id: ObjectId) -> dict:
    if not ObjectId.is_valid(investment_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment not found.")

    investment = await get_database().investments.find_one(
        {"_id": ObjectId(investment_id), "user_id": user_id}
    )
    if investment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Investment not found.")

    return investment


@router.get("/accounts", response_model=list[AccountResponse])
async def list_accounts(current_user=Depends(get_current_user)) -> list[AccountResponse]:
    db = get_database()
    user_id = current_user["_id"]

    accounts = await db.accounts.find({"user_id": user_id}).sort("updated_at", -1).to_list(length=None)
    entries = await db.account_entries.find({"user_id": user_id}).sort(
        [("as_of_date", -1), ("created_at", -1)]
    ).to_list(length=None)

    entries_by_account: dict[str, list[dict]] = defaultdict(list)
    for entry in entries:
        entries_by_account[str(entry["account_id"])].append(entry)

    results = []
    for account in accounts:
        account_entries = entries_by_account.get(str(account["_id"]), [])
        latest_entry = account_entries[0] if account_entries else None

        results.append(
            AccountResponse(
                id=str(account["_id"]),
                institution_name=account["institution_name"],
                account_name=account["account_name"],
                account_type=account["account_type"],
                notes=account.get("notes"),
                created_at=account["created_at"],
                updated_at=account["updated_at"],
                latest_balance=round(float(latest_entry["balance"]), 2) if latest_entry else None,
                latest_balance_date=latest_entry["as_of_date"].date() if latest_entry else None,
                recent_entries=[_serialize_account_entry(entry) for entry in account_entries[:4]],
            )
        )

    return results


@router.post("/accounts", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(payload: AccountCreate, current_user=Depends(get_current_user)) -> AccountResponse:
    db = get_database()
    user_id = current_user["_id"]
    now = datetime.now(timezone.utc)

    account_document = {
        "user_id": user_id,
        "institution_name": payload.institution_name.strip(),
        "account_name": payload.account_name.strip(),
        "account_type": payload.account_type.strip(),
        "notes": payload.notes.strip() if payload.notes else None,
        "created_at": now,
        "updated_at": now,
    }
    account_result = await db.accounts.insert_one(account_document)

    entry_document = {
        "user_id": user_id,
        "account_id": account_result.inserted_id,
        "balance": round(payload.initial_balance, 2),
        "as_of_date": _day_to_datetime(payload.balance_date),
        "created_at": now,
    }
    entry_result = await db.account_entries.insert_one(entry_document)
    entry_document["_id"] = entry_result.inserted_id

    account_document["_id"] = account_result.inserted_id
    return AccountResponse(
        id=str(account_document["_id"]),
        institution_name=account_document["institution_name"],
        account_name=account_document["account_name"],
        account_type=account_document["account_type"],
        notes=account_document["notes"],
        created_at=account_document["created_at"],
        updated_at=account_document["updated_at"],
        latest_balance=entry_document["balance"],
        latest_balance_date=payload.balance_date,
        recent_entries=[_serialize_account_entry(entry_document)],
    )


@router.get("/accounts/{account_id}/entries", response_model=list[AccountBalanceEntryResponse])
async def list_account_entries(account_id: str, current_user=Depends(get_current_user)) -> list[AccountBalanceEntryResponse]:
    user_id = current_user["_id"]
    await _ensure_account(account_id, user_id)

    entries = await get_database().account_entries.find(
        {"user_id": user_id, "account_id": ObjectId(account_id)}
    ).sort([("as_of_date", -1), ("created_at", -1)]).to_list(length=None)

    return [_serialize_account_entry(entry) for entry in entries]


@router.post("/accounts/{account_id}/entries", response_model=AccountBalanceEntryResponse, status_code=status.HTTP_201_CREATED)
async def add_account_entry(
    account_id: str,
    payload: AccountBalanceEntryCreate,
    current_user=Depends(get_current_user),
) -> AccountBalanceEntryResponse:
    db = get_database()
    user_id = current_user["_id"]
    await _ensure_account(account_id, user_id)

    now = datetime.now(timezone.utc)
    entry_document = {
        "user_id": user_id,
        "account_id": ObjectId(account_id),
        "balance": round(payload.balance, 2),
        "as_of_date": _day_to_datetime(payload.as_of_date),
        "created_at": now,
    }
    insert_result = await db.account_entries.insert_one(entry_document)
    await db.accounts.update_one(
        {"_id": ObjectId(account_id), "user_id": user_id},
        {"$set": {"updated_at": now}},
    )

    entry_document["_id"] = insert_result.inserted_id
    return _serialize_account_entry(entry_document)


@router.get("/investments", response_model=list[InvestmentResponse])
async def list_investments(current_user=Depends(get_current_user)) -> list[InvestmentResponse]:
    db = get_database()
    user_id = current_user["_id"]

    investments = await db.investments.find({"user_id": user_id}).sort("updated_at", -1).to_list(length=None)
    entries = await db.investment_entries.find({"user_id": user_id}).sort(
        [("as_of_date", -1), ("created_at", -1)]
    ).to_list(length=None)

    entries_by_investment: dict[str, list[dict]] = defaultdict(list)
    for entry in entries:
        entries_by_investment[str(entry["investment_id"])].append(entry)

    results = []
    for investment in investments:
        investment_entries = entries_by_investment.get(str(investment["_id"]), [])
        latest_entry = investment_entries[0] if investment_entries else None

        results.append(
            InvestmentResponse(
                id=str(investment["_id"]),
                name=investment["name"],
                category=investment["category"],
                notes=investment.get("notes"),
                created_at=investment["created_at"],
                updated_at=investment["updated_at"],
                latest_invested_amount=round(float(latest_entry["invested_amount"]), 2) if latest_entry else None,
                latest_current_value=round(float(latest_entry["current_value"]), 2) if latest_entry else None,
                latest_valuation_date=latest_entry["as_of_date"].date() if latest_entry else None,
                recent_entries=[_serialize_investment_entry(entry) for entry in investment_entries[:4]],
            )
        )

    return results


@router.post("/investments", response_model=InvestmentResponse, status_code=status.HTTP_201_CREATED)
async def create_investment(payload: InvestmentCreate, current_user=Depends(get_current_user)) -> InvestmentResponse:
    db = get_database()
    user_id = current_user["_id"]
    now = datetime.now(timezone.utc)

    investment_document = {
        "user_id": user_id,
        "name": payload.name.strip(),
        "category": payload.category.strip(),
        "notes": payload.notes.strip() if payload.notes else None,
        "created_at": now,
        "updated_at": now,
    }
    investment_result = await db.investments.insert_one(investment_document)

    entry_document = {
        "user_id": user_id,
        "investment_id": investment_result.inserted_id,
        "invested_amount": round(payload.initial_invested_amount, 2),
        "current_value": round(payload.initial_current_value, 2),
        "as_of_date": _day_to_datetime(payload.valuation_date),
        "created_at": now,
    }
    entry_result = await db.investment_entries.insert_one(entry_document)
    entry_document["_id"] = entry_result.inserted_id

    investment_document["_id"] = investment_result.inserted_id
    return InvestmentResponse(
        id=str(investment_document["_id"]),
        name=investment_document["name"],
        category=investment_document["category"],
        notes=investment_document["notes"],
        created_at=investment_document["created_at"],
        updated_at=investment_document["updated_at"],
        latest_invested_amount=entry_document["invested_amount"],
        latest_current_value=entry_document["current_value"],
        latest_valuation_date=payload.valuation_date,
        recent_entries=[_serialize_investment_entry(entry_document)],
    )


@router.get("/investments/{investment_id}/entries", response_model=list[InvestmentValuationEntryResponse])
async def list_investment_entries(
    investment_id: str,
    current_user=Depends(get_current_user),
) -> list[InvestmentValuationEntryResponse]:
    user_id = current_user["_id"]
    await _ensure_investment(investment_id, user_id)

    entries = await get_database().investment_entries.find(
        {"user_id": user_id, "investment_id": ObjectId(investment_id)}
    ).sort([("as_of_date", -1), ("created_at", -1)]).to_list(length=None)

    return [_serialize_investment_entry(entry) for entry in entries]


@router.post(
    "/investments/{investment_id}/entries",
    response_model=InvestmentValuationEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_investment_entry(
    investment_id: str,
    payload: InvestmentValuationEntryCreate,
    current_user=Depends(get_current_user),
) -> InvestmentValuationEntryResponse:
    db = get_database()
    user_id = current_user["_id"]
    await _ensure_investment(investment_id, user_id)

    now = datetime.now(timezone.utc)
    entry_document = {
        "user_id": user_id,
        "investment_id": ObjectId(investment_id),
        "invested_amount": round(payload.invested_amount, 2),
        "current_value": round(payload.current_value, 2),
        "as_of_date": _day_to_datetime(payload.as_of_date),
        "created_at": now,
    }
    insert_result = await db.investment_entries.insert_one(entry_document)
    await db.investments.update_one(
        {"_id": ObjectId(investment_id), "user_id": user_id},
        {"$set": {"updated_at": now}},
    )

    entry_document["_id"] = insert_result.inserted_id
    return _serialize_investment_entry(entry_document)


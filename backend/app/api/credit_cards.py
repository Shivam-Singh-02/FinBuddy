from collections import defaultdict
from datetime import date, datetime, timezone
from hashlib import sha256

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Query, Response, UploadFile, status

from app.core.security import get_current_user
from app.db.database import get_database
from app.schemas.credit_card import CreditCardAnalysisResponse, CreditCardCategoryUpdate, CreditCardCreate, CreditCardResponse, CreditCardStatementResponse, CreditCardUpdate
from app.services.expense_tracker import ExpenseTrackerError, build_expense_report, detect_credit_card_details, extract_statement_text

router = APIRouter(prefix="/credit-cards", tags=["credit-cards"])


def _card(doc: dict) -> CreditCardResponse:
    return CreditCardResponse(id=str(doc["_id"]), issuer=doc["issuer"], name=doc["name"], last_four=doc.get("last_four"), credit_limit=doc.get("credit_limit"), billing_cycle_day=doc.get("billing_cycle_day"), payment_due_day=doc.get("payment_due_day"), created_at=doc["created_at"], updated_at=doc["updated_at"])


def _statement(doc: dict) -> CreditCardStatementResponse:
    return CreditCardStatementResponse(id=str(doc["_id"]), card_id=str(doc["card_id"]), source_filename=doc["source_filename"], statement_period_start=doc.get("statement_period_start"), statement_period_end=doc.get("statement_period_end"), total_spend=doc["total_spend"], currency=doc.get("currency", "INR"), parser=doc["parser"], transactions=doc["transactions"], created_at=doc["created_at"])


async def _owned_card(card_id: str, user_id: ObjectId) -> dict:
    if not ObjectId.is_valid(card_id):
        raise HTTPException(404, "Credit card not found.")
    card = await get_database().credit_cards.find_one({"_id": ObjectId(card_id), "user_id": user_id})
    if card is None:
        raise HTTPException(404, "Credit card not found.")
    return card


@router.get("", response_model=list[CreditCardResponse])
async def list_cards(user=Depends(get_current_user)):
    cards = await get_database().credit_cards.find({"user_id": user["_id"]}).sort("updated_at", -1).to_list(None)
    return [_card(item) for item in cards]


@router.post("", response_model=CreditCardResponse, status_code=201)
async def create_card(payload: CreditCardCreate, user=Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    doc = {**payload.model_dump(), "issuer": payload.issuer.strip(), "name": payload.name.strip(), "user_id": user["_id"], "created_at": now, "updated_at": now}
    result = await get_database().credit_cards.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _card(doc)


@router.get("/analysis", response_model=CreditCardAnalysisResponse)
async def overall_analysis(from_date: date | None = Query(default=None, alias="from"), to_date: date | None = Query(default=None, alias="to"), user=Depends(get_current_user)):
    return await _analysis(user["_id"], None, from_date, to_date)


@router.post("/statements/import", status_code=201)
async def import_statement_and_detect_card(statement: UploadFile = File(...), user=Depends(get_current_user)):
    data = await statement.read()
    if not data:
        raise HTTPException(400, "Upload a non-empty statement file.")
    filename = statement.filename or "statement"
    try:
        statement_text = extract_statement_text(filename, statement.content_type, data)
        issuer, last_four, card_name, detection_confidence, needs_review = detect_credit_card_details(statement_text, filename)
        report = await build_expense_report(filename, statement.content_type, data)
    except ExpenseTrackerError as error:
        raise HTTPException(422, str(error)) from error
    db = get_database()
    now = datetime.now(timezone.utc)
    digest = sha256(data).hexdigest()
    if await db.credit_card_statements.find_one({"user_id": user["_id"], "file_hash": digest}):
        raise HTTPException(409, "This statement has already been imported.")
    identity = {"user_id": user["_id"], "issuer": issuer, "last_four": last_four}
    card = await db.credit_cards.find_one(identity) if last_four else None
    if card is None and not last_four and issuer != "Imported Card":
        issuer_matches = await db.credit_cards.find({"user_id": user["_id"], "issuer": issuer}).to_list(None)
        if len(issuer_matches) == 1:
            card = issuer_matches[0]
    created = card is None
    if created:
        card_doc = {**identity, "name": card_name, "credit_limit": None, "billing_cycle_day": None, "payment_due_day": None, "created_at": now, "updated_at": now}
        card_doc["_id"] = (await db.credit_cards.insert_one(card_doc)).inserted_id
        card = card_doc
    txns = [{**item.model_dump(mode="json"), "transaction_id": str(ObjectId()), "transaction_type": "purchase"} for item in report.transactions]
    doc = {"user_id": user["_id"], "card_id": card["_id"], "file_hash": digest, "source_filename": report.source_filename, "statement_period_start": report.statement_period_start.isoformat() if report.statement_period_start else None, "statement_period_end": report.statement_period_end.isoformat() if report.statement_period_end else None, "total_spend": report.total_spend, "currency": report.currency, "parser": report.parser, "transactions": txns, "created_at": now}
    doc["_id"] = (await db.credit_card_statements.insert_one(doc)).inserted_id
    review_reason = None
    if issuer == "Imported Card":
        review_reason = "Issuer could not be identified from the statement."
    elif not last_four:
        review_reason = "Card number suffix could not be identified from the statement."
    elif not detection_confidence >= 0.8:
        review_reason = "Card details were only partially identified."
    return {"card": _card(card).model_dump(mode="json"), "card_created": created, "statement": _statement(doc).model_dump(mode="json"), "card_detection": {"confidence": detection_confidence, "needs_review": needs_review, "reason": review_reason}}


@router.get("/{card_id}", response_model=CreditCardResponse)
async def get_card(card_id: str, user=Depends(get_current_user)):
    return _card(await _owned_card(card_id, user["_id"]))


@router.patch("/{card_id}", response_model=CreditCardResponse)
async def update_card(card_id: str, payload: CreditCardUpdate, user=Depends(get_current_user)):
    card = await _owned_card(card_id, user["_id"])
    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return _card(card)
    for key in ("issuer", "name"):
        if changes.get(key) is not None:
            changes[key] = changes[key].strip()
    changes["updated_at"] = datetime.now(timezone.utc)
    await get_database().credit_cards.update_one({"_id": card["_id"], "user_id": user["_id"]}, {"$set": changes})
    card.update(changes)
    return _card(card)


@router.delete("/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_card(card_id: str, user=Depends(get_current_user)) -> Response:
    card = await _owned_card(card_id, user["_id"])
    db = get_database()
    await db.credit_card_statements.delete_many({"user_id": user["_id"], "card_id": card["_id"]})
    await db.credit_cards.delete_one({"_id": card["_id"], "user_id": user["_id"]})
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{card_id}/statements", response_model=list[CreditCardStatementResponse])
async def list_statements(card_id: str, user=Depends(get_current_user)):
    await _owned_card(card_id, user["_id"])
    docs = await get_database().credit_card_statements.find({"user_id": user["_id"], "card_id": ObjectId(card_id)}).sort("created_at", -1).to_list(None)
    return [_statement(doc) for doc in docs]


@router.post("/{card_id}/statements/import", response_model=CreditCardStatementResponse, status_code=201)
async def import_statement(card_id: str, statement: UploadFile = File(...), user=Depends(get_current_user)):
    await _owned_card(card_id, user["_id"])
    data = await statement.read()
    if not data:
        raise HTTPException(400, "Upload a non-empty statement file.")
    digest = sha256(data).hexdigest()
    db = get_database()
    if await db.credit_card_statements.find_one({"user_id": user["_id"], "card_id": ObjectId(card_id), "file_hash": digest}):
        raise HTTPException(409, "This statement has already been imported for this card.")
    try:
        report = await build_expense_report(statement.filename or "statement", statement.content_type, data)
    except ExpenseTrackerError as error:
        raise HTTPException(422, str(error)) from error
    now = datetime.now(timezone.utc)
    txns = [{**item.model_dump(mode="json"), "transaction_id": str(ObjectId()), "transaction_type": "purchase"} for item in report.transactions]
    doc = {"user_id": user["_id"], "card_id": ObjectId(card_id), "file_hash": digest, "source_filename": report.source_filename, "statement_period_start": report.statement_period_start.isoformat() if report.statement_period_start else None, "statement_period_end": report.statement_period_end.isoformat() if report.statement_period_end else None, "total_spend": report.total_spend, "currency": report.currency, "parser": report.parser, "transactions": txns, "created_at": now}
    result = await db.credit_card_statements.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _statement(doc)


@router.patch("/{card_id}/transactions/{transaction_id}")
async def update_transaction_category(card_id: str, transaction_id: str, payload: CreditCardCategoryUpdate, user=Depends(get_current_user)):
    await _owned_card(card_id, user["_id"])
    db = get_database()
    if transaction_id.startswith("legacy_"):
        _, statement_id, raw_index = transaction_id.split("_", 2)
        if not ObjectId.is_valid(statement_id) or not raw_index.isdigit():
            raise HTTPException(404, "Transaction not found.")
        statement = await db.credit_card_statements.find_one({"_id": ObjectId(statement_id), "user_id": user["_id"], "card_id": ObjectId(card_id)})
        index = int(raw_index)
        if statement is None or index >= len(statement.get("transactions", [])):
            raise HTTPException(404, "Transaction not found.")
        transactions = statement["transactions"]
        transactions[index]["category"] = payload.category
        result = await db.credit_card_statements.update_one({"_id": statement["_id"], "user_id": user["_id"]}, {"$set": {"transactions": transactions}})
    else:
        result = await db.credit_card_statements.update_one(
            {"user_id": user["_id"], "card_id": ObjectId(card_id), "transactions.transaction_id": transaction_id},
            {"$set": {"transactions.$.category": payload.category}},
        )
    if result.matched_count == 0:
        raise HTTPException(404, "Transaction not found.")
    return {"transaction_id": transaction_id, "category": payload.category}


@router.get("/{card_id}/analysis", response_model=CreditCardAnalysisResponse)
async def card_analysis(card_id: str, from_date: date | None = Query(default=None, alias="from"), to_date: date | None = Query(default=None, alias="to"), user=Depends(get_current_user)):
    await _owned_card(card_id, user["_id"])
    return await _analysis(user["_id"], ObjectId(card_id), from_date, to_date)


async def _analysis(user_id: ObjectId, card_id: ObjectId | None, from_date: date | None, to_date: date | None):
    query = {"user_id": user_id}
    if card_id is not None:
        query["card_id"] = card_id
    docs = await get_database().credit_card_statements.find(query).to_list(None)
    txns = []
    for doc in docs:
        for index, item in enumerate(doc.get("transactions", [])):
            day = date.fromisoformat(item["transaction_date"])
            if from_date and day < from_date or to_date and day > to_date:
                continue
            txns.append({**item, "transaction_id": item.get("transaction_id") or f"legacy_{doc['_id']}_{index}", "card_id": str(doc["card_id"]), "transaction_date": day})
    cats, merchants, months, per_card_spend, per_card_count = defaultdict(float), defaultdict(float), defaultdict(float), defaultdict(float), defaultdict(int)
    for item in txns:
        if item.get("transaction_type") == "purchase":
            cats[item["category"]] += item["amount"]
            merchants[item.get("merchant") or item["description"]] += item["amount"]
            months[item["transaction_date"].strftime("%Y-%m")] += item["amount"]
            per_card_spend[item["card_id"]] += item["amount"]
            per_card_count[item["card_id"]] += 1
    purchases = [x for x in txns if x.get("transaction_type") == "purchase"]
    return {"period_start": from_date or (min((x["transaction_date"] for x in txns), default=None)), "period_end": to_date or (max((x["transaction_date"] for x in txns), default=None)), "total_spend": round(sum(x["amount"] for x in purchases), 2), "refunds": round(sum(x["amount"] for x in txns if x.get("transaction_type") == "refund"), 2), "fees": round(sum(x["amount"] for x in txns if x.get("transaction_type") == "fee"), 2), "transaction_count": len(txns), "category_totals": [{"category": k, "total": round(v, 2)} for k, v in sorted(cats.items(), key=lambda i: -i[1])], "monthly_trend": [{"month": k, "total": round(v, 2)} for k, v in sorted(months.items())], "top_merchants": [{"merchant": k, "total": round(v, 2)} for k, v in sorted(merchants.items(), key=lambda i: -i[1])[:10]], "card_totals": [{"card_id": k, "total_spend": round(v, 2), "transaction_count": per_card_count[k]} for k, v in sorted(per_card_spend.items(), key=lambda i: -i[1])], "recent_transactions": sorted(txns, key=lambda x: x["transaction_date"], reverse=True)[:50]}

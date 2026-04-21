from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime, time, timedelta, timezone
from typing import Optional
from typing import Literal

from bson import ObjectId

from app.db.database import get_database


def _start_of_day(value: date) -> datetime:
    return datetime.combine(value, time.min, tzinfo=timezone.utc)


def _end_of_day(value: date) -> datetime:
    return datetime.combine(value, time.max, tzinfo=timezone.utc)


def _shift_months(value: date, delta: int) -> date:
    month_index = value.month - 1 + delta
    year = value.year + month_index // 12
    month = month_index % 12 + 1

    return date(year, month, 1)


def _month_end(value: date) -> date:
    return _shift_months(value, 1) - timedelta(days=1)


def _build_buckets(period: Literal["weekly", "monthly"], bucket_count: int) -> list[tuple[date, date, str]]:
    today = date.today()
    buckets: list[tuple[date, date, str]] = []

    if period == "weekly":
        this_week_start = today - timedelta(days=today.weekday())
        for offset in range(bucket_count - 1, -1, -1):
            bucket_start = this_week_start - timedelta(weeks=offset)
            bucket_end = bucket_start + timedelta(days=6)
            label = bucket_start.strftime("%d %b")
            buckets.append((bucket_start, bucket_end, label))
        return buckets

    this_month_start = today.replace(day=1)
    for offset in range(bucket_count - 1, -1, -1):
        bucket_start = _shift_months(this_month_start, -offset)
        bucket_end = _month_end(bucket_start)
        label = bucket_start.strftime("%b %Y")
        buckets.append((bucket_start, bucket_end, label))

    return buckets


def _group_by_id(entries: list[dict], key_name: str) -> dict[str, list[dict]]:
    grouped: dict[str, list[dict]] = defaultdict(list)

    for entry in entries:
        grouped[str(entry[key_name])].append(entry)

    for group_entries in grouped.values():
        group_entries.sort(key=lambda item: (item["as_of_date"], item["created_at"]))

    return grouped


def _latest_entry(entries: list[dict]) -> Optional[dict]:
    if not entries:
        return None

    return max(entries, key=lambda item: (item["as_of_date"], item["created_at"]))


def _latest_entry_before(entries: list[dict], boundary: datetime) -> Optional[dict]:
    matched: Optional[dict] = None

    for entry in entries:
        if entry["as_of_date"] <= boundary:
            matched = entry
        else:
            break

    return matched


async def build_dashboard_data(
    user_id: str,
    period: Literal["weekly", "monthly"],
    bucket_count: int,
) -> dict:
    db = get_database()
    user_oid = ObjectId(user_id)

    account_entries = await db.account_entries.find({"user_id": user_oid}).to_list(length=None)
    investment_entries = await db.investment_entries.find({"user_id": user_oid}).to_list(length=None)

    accounts_by_id = _group_by_id(account_entries, "account_id")
    investments_by_id = _group_by_id(investment_entries, "investment_id")

    latest_account_entries = [_latest_entry(entries) for entries in accounts_by_id.values()]
    latest_investment_entries = [_latest_entry(entries) for entries in investments_by_id.values()]

    cash_total = round(
        sum(entry["balance"] for entry in latest_account_entries if entry is not None),
        2,
    )
    investment_current_total = round(
        sum(entry["current_value"] for entry in latest_investment_entries if entry is not None),
        2,
    )
    investment_principal_total = round(
        sum(entry["invested_amount"] for entry in latest_investment_entries if entry is not None),
        2,
    )
    net_worth = round(cash_total + investment_current_total, 2)

    points = []
    for bucket_start, bucket_end, label in _build_buckets(period, bucket_count):
        boundary = _end_of_day(bucket_end)

        bucket_cash_total = round(
            sum(
                latest["balance"]
                for latest in (
                    _latest_entry_before(entries, boundary) for entries in accounts_by_id.values()
                )
                if latest is not None
            ),
            2,
        )
        bucket_investment_current_total = round(
            sum(
                latest["current_value"]
                for latest in (
                    _latest_entry_before(entries, boundary) for entries in investments_by_id.values()
                )
                if latest is not None
            ),
            2,
        )
        bucket_investment_principal_total = round(
            sum(
                latest["invested_amount"]
                for latest in (
                    _latest_entry_before(entries, boundary) for entries in investments_by_id.values()
                )
                if latest is not None
            ),
            2,
        )

        points.append(
            {
                "label": label,
                "bucket_start": bucket_start,
                "bucket_end": bucket_end,
                "cash_total": bucket_cash_total,
                "investment_current_total": bucket_investment_current_total,
                "investment_principal_total": bucket_investment_principal_total,
                "net_worth": round(bucket_cash_total + bucket_investment_current_total, 2),
            }
        )

    return {
        "summary": {
            "cash_total": cash_total,
            "investment_current_total": investment_current_total,
            "investment_principal_total": investment_principal_total,
            "net_worth": net_worth,
            "gain_loss": round(investment_current_total - investment_principal_total, 2),
            "allocation": [
                {"label": "Bank Accounts", "value": cash_total},
                {"label": "Investments", "value": investment_current_total},
            ],
        },
        "trend": {"period": period, "points": points},
    }

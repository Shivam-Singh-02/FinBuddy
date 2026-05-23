from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app.core.security import get_current_user
from app.db.database import get_database
from app.schemas.expense import ExpenseImportResponse
from app.services.expense_tracker import ExpenseTrackerError, build_expense_report


router = APIRouter(tags=["expenses"])


def _serialize_report(report: dict) -> ExpenseImportResponse:
    return ExpenseImportResponse(
        id=str(report["_id"]),
        source_filename=report["source_filename"],
        parser=report["parser"],
        statement_period_start=report.get("statement_period_start"),
        statement_period_end=report.get("statement_period_end"),
        total_spend=round(float(report["total_spend"]), 2),
        currency=report.get("currency", "INR"),
        category_totals=report.get("category_totals", []),
        transactions=report.get("transactions", []),
        created_at=report["created_at"],
    )


@router.get("/expenses/reports", response_model=list[ExpenseImportResponse])
async def list_expense_reports(current_user=Depends(get_current_user)) -> list[ExpenseImportResponse]:
    reports = await get_database().expense_reports.find({"user_id": current_user["_id"]}).sort(
        "created_at", -1
    ).to_list(length=10)

    return [_serialize_report(report) for report in reports]


@router.post(
    "/expenses/import",
    response_model=ExpenseImportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def import_expense_statement(
    statement: UploadFile = File(...),
    current_user=Depends(get_current_user),
) -> ExpenseImportResponse:
    file_bytes = await statement.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a non-empty statement file.")

    try:
        report = await build_expense_report(
            filename=statement.filename or "statement",
            content_type=statement.content_type,
            file_bytes=file_bytes,
        )
    except ExpenseTrackerError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error)) from error

    db = get_database()
    now = datetime.now(timezone.utc)
    report.created_at = now
    report_document = report.model_dump(mode="python")
    report_document["user_id"] = current_user["_id"]
    report_document.pop("id", None)

    result = await db.expense_reports.insert_one(report_document)
    report.id = str(result.inserted_id)

    return report

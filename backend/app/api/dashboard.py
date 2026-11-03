from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.core.security import get_current_user
from app.schemas.dashboard import DashboardSummaryResponse, DashboardTrendResponse
from app.services.dashboard import build_dashboard_data


router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(current_user=Depends(get_current_user)) -> DashboardSummaryResponse:
    dashboard_data = await build_dashboard_data(str(current_user["_id"]), period="weekly", bucket_count=8)
    return DashboardSummaryResponse(**dashboard_data["summary"])


@router.get("/trends", response_model=DashboardTrendResponse)
async def get_dashboard_trends(
    period: Literal["weekly", "monthly"] = Query(default="weekly"),
    bucket_count: int = Query(default=8, ge=4, le=24),
    current_user=Depends(get_current_user),
) -> DashboardTrendResponse:
    dashboard_data = await build_dashboard_data(str(current_user["_id"]), period=period, bucket_count=bucket_count)
    return DashboardTrendResponse(**dashboard_data["trend"])


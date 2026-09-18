from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.transaction import Transaction
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.dashboard import (
    CategoryBreakdown,
    DashboardSummary,
    DateRangeResponse,
    SpendingTrendPoint,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_SQLITE_TREND_FORMATS = {
    "day": "%Y-%m-%d",
    "week": "%Y-W%W",
    "month": "%Y-%m",
}
_POSTGRES_TREND_FORMATS = {
    "day": "YYYY-MM-DD",
    "week": 'IYYY-"W"IW',
    "month": "YYYY-MM",
}


def _trend_period_label(db: Session, group_by: str):
    if db.bind.dialect.name == "postgresql":
        return func.to_char(Transaction.date, _POSTGRES_TREND_FORMATS[group_by]).label("period_label")
    return func.strftime(_SQLITE_TREND_FORMATS[group_by], Transaction.date).label("period_label")


def _user_transactions(db: Session, current_user: User, start_date: datetime | None, end_date: datetime | None):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)
    if start_date is not None:
        query = query.filter(Transaction.date >= start_date)
    if end_date is not None:
        query = query.filter(Transaction.date <= end_date)
    return query


@router.get("/summary", response_model=DashboardSummary)
def get_summary(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = _user_transactions(db, current_user, start_date, end_date)

    total_income = (
        query.filter(Transaction.type == "income")
        .with_entities(func.coalesce(func.sum(Transaction.amount), 0.0))
        .scalar()
    )
    total_expenses = (
        query.filter(Transaction.type == "expense")
        .with_entities(func.coalesce(func.sum(Transaction.amount), 0.0))
        .scalar()
    )
    transaction_count = query.count()

    return DashboardSummary(
        current_balance=current_user.opening_balance + total_income - total_expenses,
        total_income=total_income,
        total_expenses=total_expenses,
        transaction_count=transaction_count,
    )


@router.get("/category-breakdown", response_model=list[CategoryBreakdown])
def get_category_breakdown(
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = _user_transactions(db, current_user, start_date, end_date).filter(Transaction.type == "expense")

    rows = (
        query.with_entities(Transaction.category, func.sum(Transaction.amount).label("total"))
        .group_by(Transaction.category)
        .order_by(func.sum(Transaction.amount).desc())
        .all()
    )
    return [CategoryBreakdown(category=category, total=total) for category, total in rows]


@router.get("/spending-trend", response_model=list[SpendingTrendPoint])
def get_spending_trend(
    group_by: str = "day",
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if group_by not in _SQLITE_TREND_FORMATS:
        raise HTTPException(status_code=400, detail="group_by must be one of: day, week, month")

    query = _user_transactions(db, current_user, start_date, end_date).filter(Transaction.type == "expense")

    period_label = _trend_period_label(db, group_by)
    rows = (
        query.with_entities(period_label, func.sum(Transaction.amount).label("total"))
        .group_by(period_label)
        .order_by(period_label)
        .all()
    )
    return [SpendingTrendPoint(period_label=label, total=total) for label, total in rows]


@router.get("/date-range/{preset}", response_model=DateRangeResponse)
def get_date_range_preset(preset: str):
    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)

    if preset == "today":
        start_date = today_start
    elif preset == "7d":
        start_date = today_start - timedelta(days=6)
    elif preset == "30d":
        start_date = today_start - timedelta(days=29)
    elif preset == "this_month":
        start_date = datetime(now.year, now.month, 1)
    elif preset == "this_year":
        start_date = datetime(now.year, 1, 1)
    else:
        raise HTTPException(
            status_code=400,
            detail="preset must be one of: today, 7d, 30d, this_month, this_year",
        )

    return DateRangeResponse(start_date=start_date, end_date=now)

from datetime import datetime

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    current_balance: float
    total_income: float
    total_expenses: float
    transaction_count: int


class CategoryBreakdown(BaseModel):
    category: str
    total: float


class SpendingTrendPoint(BaseModel):
    period_label: str
    total: float


class DateRangeResponse(BaseModel):
    start_date: datetime
    end_date: datetime

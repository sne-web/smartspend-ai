from datetime import datetime

from pydantic import BaseModel


class TransactionCreate(BaseModel):
    amount: float
    type: str
    category: str
    merchant: str | None = None
    description: str | None = None
    date: datetime
    payment_method: str | None = None


class TransactionUpdate(BaseModel):
    amount: float | None = None
    type: str | None = None
    category: str | None = None
    merchant: str | None = None
    description: str | None = None
    date: datetime | None = None
    payment_method: str | None = None


class TransactionResponse(BaseModel):
    id: int
    user_id: int
    amount: float
    type: str
    category: str
    merchant: str | None
    description: str | None
    date: datetime
    payment_method: str | None
    created_at: datetime

    model_config = {"from_attributes": True}

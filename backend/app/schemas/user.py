from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    preferred_currency: str = "USD"
    opening_balance: float = 0.0


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    preferred_currency: str
    opening_balance: float
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str

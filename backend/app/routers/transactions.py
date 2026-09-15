from datetime import date as date_type

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import SessionLocal, get_db
from app.ml.predictor import predict_category
from app.models.correction import Correction
from app.models.transaction import Transaction
from app.models.user import User
from app.routers.auth import get_current_user
from app.schemas.transaction import (
    CategoryPredictionRequest,
    CategoryPredictionResponse,
    TransactionCreate,
    TransactionResponse,
    TransactionUpdate,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _record_correction_if_mismatch(
    user_id: int, merchant: str | None, description: str | None, actual_category: str
) -> None:
    """Runs as a FastAPI background task, after the transaction-creation response
    has already been sent - so a slow or failing prediction/log here can never
    delay or break the thing the user is actually waiting on. Opens its own DB
    session rather than reusing the request's, since that one is already closed
    (FastAPI's dependency cleanup runs before background tasks execute).
    """
    if not merchant and not description:
        return

    prediction = predict_category(merchant or "", description or "")
    if prediction.category == actual_category:
        return

    db = SessionLocal()
    try:
        db.add(
            Correction(
                user_id=user_id,
                merchant=merchant,
                description=description,
                predicted_category=prediction.category,
                actual_category=actual_category,
            )
        )
        db.commit()
    finally:
        db.close()


def _get_owned_transaction(transaction_id: int, current_user: User, db: Session) -> Transaction:
    transaction = (
        db.query(Transaction)
        .filter(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
        .first()
    )
    if transaction is None:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction


@router.post("", response_model=TransactionResponse)
def create_transaction(
    transaction_in: TransactionCreate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = Transaction(**transaction_in.model_dump(), user_id=current_user.id)
    db.add(transaction)
    db.commit()
    db.refresh(transaction)

    background_tasks.add_task(
        _record_correction_if_mismatch,
        current_user.id,
        transaction.merchant,
        transaction.description,
        transaction.category,
    )

    return transaction


@router.post("/predict-category", response_model=CategoryPredictionResponse)
def predict_category_endpoint(
    payload: CategoryPredictionRequest,
    current_user: User = Depends(get_current_user),
):
    prediction = predict_category(payload.merchant, payload.description)
    return CategoryPredictionResponse(category=prediction.category, confidence=prediction.confidence)


@router.get("", response_model=list[TransactionResponse])
def list_transactions(
    skip: int = 0,
    limit: int = 50,
    merchant: str | None = None,
    category: str | None = None,
    date: date_type | None = None,
    type: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Transaction).filter(Transaction.user_id == current_user.id)

    if merchant is not None:
        query = query.filter(Transaction.merchant.ilike(f"%{merchant}%"))
    if category is not None:
        query = query.filter(Transaction.category.ilike(f"%{category}%"))
    if date is not None:
        query = query.filter(func.date(Transaction.date) == date.isoformat())
    if type is not None:
        query = query.filter(Transaction.type == type)

    return (
        query.order_by(Transaction.date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.get("/{transaction_id}", response_model=TransactionResponse)
def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return _get_owned_transaction(transaction_id, current_user, db)


@router.put("/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    transaction_in: TransactionUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = _get_owned_transaction(transaction_id, current_user, db)
    for field, value in transaction_in.model_dump(exclude_unset=True).items():
        setattr(transaction, field, value)
    db.commit()
    db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    transaction = _get_owned_transaction(transaction_id, current_user, db)
    db.delete(transaction)
    db.commit()

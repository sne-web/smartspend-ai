from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.models.correction import Correction  # noqa: F401 - ensures the corrections table is registered before create_all
from app.models.transaction import Transaction  # noqa: F401 - ensures the transactions table is registered before create_all
from app.models.user import User  # noqa: F401 - ensures the users table is registered before create_all
from app.routers import auth, dashboard, transactions

app = FastAPI(title="SmartSpend AI")

app.include_router(auth.router)
app.include_router(transactions.router)
app.include_router(dashboard.router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "SmartSpend AI"}

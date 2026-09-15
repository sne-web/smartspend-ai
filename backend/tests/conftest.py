"""
Pytest fixtures for the backend test suite.

Tests run against an isolated, in-memory SQLite database - never the real
backend/smartspend.db - so they can never touch real data and every test
starts from a guaranteed-empty, identical starting point. A StaticPool keeps
every session on the same in-memory database (SQLite's default is a fresh,
separate database per connection, which would make tables "disappear"
between statements without it).

FastAPI's `get_db` dependency is overridden, app-wide, to hand out sessions
from this test engine instead. The app's own startup handler (which runs
`Base.metadata.create_all` against the *real* production engine in
app/main.py) is never triggered here - TestClient only sends ASGI lifespan
events when used as a context manager (`with TestClient(app) as ...`), which
the `client` fixture below deliberately avoids, so a test run never even
opens a connection to smartspend.db.

Tables are created before each test and dropped after it (function-scoped,
not session-scoped) so no test can see data left behind by another.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models.correction import Correction  # noqa: F401 - registers the table with Base
from app.models.transaction import Transaction  # noqa: F401 - registers the table with Base
from app.models.user import User  # noqa: F401 - registers the table with Base

engine = create_engine(
    "sqlite://",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def _override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = _override_get_db


@pytest.fixture()
def client():
    """A TestClient backed by a fresh set of tables, dropped again after the test."""
    Base.metadata.create_all(bind=engine)
    yield TestClient(app)
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def register_user(client):
    """Registers + logs in a user against the test client, returning ready-to-use auth headers."""

    def _register(email: str = "user@example.com", password: str = "TestPass123!", **extra_fields):
        client.post(
            "/auth/register",
            json={"email": email, "password": password, **extra_fields},
        )
        response = client.post(
            "/auth/login",
            data={"username": email, "password": password},
        )
        token = response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    return _register

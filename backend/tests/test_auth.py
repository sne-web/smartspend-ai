def test_register_success(client):
    response = client.post(
        "/auth/register",
        json={"email": "alice@example.com", "password": "SecurePass123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "alice@example.com"
    assert "hashed_password" not in data
    assert data["preferred_currency"] == "USD"
    assert data["opening_balance"] == 0.0


def test_register_duplicate_email_rejected(client):
    payload = {"email": "bob@example.com", "password": "SecurePass123!"}
    first = client.post("/auth/register", json=payload)
    assert first.status_code == 200

    second = client.post("/auth/register", json=payload)
    assert second.status_code == 400


def test_login_success(client):
    client.post("/auth/register", json={"email": "carol@example.com", "password": "SecurePass123!"})

    response = client.post(
        "/auth/login",
        data={"username": "carol@example.com", "password": "SecurePass123!"},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_login_wrong_password_rejected(client):
    client.post("/auth/register", json={"email": "dave@example.com", "password": "SecurePass123!"})

    response = client.post(
        "/auth/login",
        data={"username": "dave@example.com", "password": "WrongPassword!"},
    )
    assert response.status_code == 401


def test_me_with_valid_token(client, register_user):
    headers = register_user(email="erin@example.com")

    response = client.get("/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == "erin@example.com"


def test_me_without_token_rejected(client):
    response = client.get("/auth/me")
    assert response.status_code == 401


def test_me_with_invalid_token_rejected(client):
    response = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert response.status_code == 401

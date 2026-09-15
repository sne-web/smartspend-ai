def _create_transaction(client, headers, **overrides):
    payload = {
        "amount": 42.50,
        "type": "expense",
        "category": "Food",
        "merchant": "Test Merchant",
        "description": "Test transaction",
        "date": "2026-09-01T00:00:00",
    }
    payload.update(overrides)
    return client.post("/transactions", json=payload, headers=headers)


def test_create_transaction(client, register_user):
    headers = register_user()

    response = _create_transaction(client, headers)
    assert response.status_code == 200
    data = response.json()
    assert data["amount"] == 42.50
    assert data["category"] == "Food"


def test_list_transactions(client, register_user):
    headers = register_user()
    _create_transaction(client, headers, category="Food")
    _create_transaction(client, headers, category="Transport")

    response = client.get("/transactions", headers=headers)
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_get_transaction(client, register_user):
    headers = register_user()
    created = _create_transaction(client, headers).json()

    response = client.get(f"/transactions/{created['id']}", headers=headers)
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_update_transaction(client, register_user):
    headers = register_user()
    created = _create_transaction(client, headers).json()

    response = client.put(
        f"/transactions/{created['id']}",
        json={"category": "Updated Category"},
        headers=headers,
    )
    assert response.status_code == 200
    assert response.json()["category"] == "Updated Category"


def test_delete_transaction(client, register_user):
    headers = register_user()
    created = _create_transaction(client, headers).json()

    response = client.delete(f"/transactions/{created['id']}", headers=headers)
    assert response.status_code == 204

    follow_up = client.get(f"/transactions/{created['id']}", headers=headers)
    assert follow_up.status_code == 404


# --- The most important tests in the suite: cross-user access must 404, never 403 or the data. ---
# A 403 would confirm the resource exists to someone who doesn't own it (an
# enumeration leak); a 404 doesn't reveal anything. See CLAUDE.md section 4.


def test_second_user_cannot_get_first_users_transaction(client, register_user):
    owner_headers = register_user(email="owner1@example.com")
    created = _create_transaction(client, owner_headers).json()

    other_headers = register_user(email="other1@example.com")
    response = client.get(f"/transactions/{created['id']}", headers=other_headers)
    assert response.status_code == 404


def test_second_user_cannot_update_first_users_transaction(client, register_user):
    owner_headers = register_user(email="owner2@example.com")
    created = _create_transaction(client, owner_headers).json()

    other_headers = register_user(email="other2@example.com")
    response = client.put(
        f"/transactions/{created['id']}",
        json={"category": "Hijacked"},
        headers=other_headers,
    )
    assert response.status_code == 404

    # Confirm the attempted update never touched the real owner's data.
    check = client.get(f"/transactions/{created['id']}", headers=owner_headers)
    assert check.json()["category"] == "Food"


def test_second_user_cannot_delete_first_users_transaction(client, register_user):
    owner_headers = register_user(email="owner3@example.com")
    created = _create_transaction(client, owner_headers).json()

    other_headers = register_user(email="other3@example.com")
    response = client.delete(f"/transactions/{created['id']}", headers=other_headers)
    assert response.status_code == 404

    # Confirm it still exists for the actual owner.
    check = client.get(f"/transactions/{created['id']}", headers=owner_headers)
    assert check.status_code == 200

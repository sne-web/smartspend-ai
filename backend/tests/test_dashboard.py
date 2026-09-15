def _create_transaction(client, headers, **overrides):
    payload = {
        "amount": 10.0,
        "type": "expense",
        "category": "Food",
        "merchant": "Test Merchant",
        "description": "Test transaction",
        "date": "2026-01-01T00:00:00",
    }
    payload.update(overrides)
    return client.post("/transactions", json=payload, headers=headers)


def _seed_known_transactions(client, headers):
    """A hand-constructed dataset with numbers chosen so every downstream
    aggregate (income/expense totals, per-category totals, per-day totals)
    can be verified by hand: 2000 income, 50+30 Food expenses, 20 Transport."""
    _create_transaction(client, headers, amount=2000, type="income", category="Salary", date="2026-01-05T00:00:00")
    _create_transaction(client, headers, amount=50, type="expense", category="Food", date="2026-01-10T00:00:00")
    _create_transaction(client, headers, amount=30, type="expense", category="Food", date="2026-01-15T00:00:00")
    _create_transaction(client, headers, amount=20, type="expense", category="Transport", date="2026-01-20T00:00:00")


def test_summary_matches_hand_constructed_data(client, register_user):
    headers = register_user(email="dash1@example.com", opening_balance=1000)
    _seed_known_transactions(client, headers)

    response = client.get("/dashboard/summary", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["total_income"] == 2000
    assert data["total_expenses"] == 100
    assert data["current_balance"] == 2900  # 1000 opening + 2000 income - 100 expenses
    assert data["transaction_count"] == 4


def test_category_breakdown_matches_hand_constructed_data(client, register_user):
    headers = register_user(email="dash2@example.com", opening_balance=1000)
    _seed_known_transactions(client, headers)

    response = client.get("/dashboard/category-breakdown", headers=headers)
    assert response.status_code == 200
    assert response.json() == [
        {"category": "Food", "total": 80.0},
        {"category": "Transport", "total": 20.0},
    ]


def test_spending_trend_matches_hand_constructed_data(client, register_user):
    headers = register_user(email="dash3@example.com", opening_balance=1000)
    _seed_known_transactions(client, headers)

    response = client.get("/dashboard/spending-trend", headers=headers)
    assert response.status_code == 200
    assert response.json() == [
        {"period_label": "2026-01-10", "total": 50.0},
        {"period_label": "2026-01-15", "total": 30.0},
        {"period_label": "2026-01-20", "total": 20.0},
    ]


def test_second_user_sees_no_cross_user_leakage(client, register_user):
    owner_headers = register_user(email="dash_owner@example.com", opening_balance=1000)
    _seed_known_transactions(client, owner_headers)

    other_headers = register_user(email="dash_other@example.com", opening_balance=500)

    summary = client.get("/dashboard/summary", headers=other_headers).json()
    assert summary["total_income"] == 0
    assert summary["total_expenses"] == 0
    assert summary["transaction_count"] == 0
    assert summary["current_balance"] == 500  # just their own opening balance, nothing from the other user

    assert client.get("/dashboard/category-breakdown", headers=other_headers).json() == []
    assert client.get("/dashboard/spending-trend", headers=other_headers).json() == []

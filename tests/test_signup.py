from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def test_signup_prevents_duplicates():
    name = "Test Duplicate Club"
    # start with a single participant
    activities[name] = {
        "description": "",
        "schedule": "",
        "max_participants": 5,
        "participants": ["dup@mergington.edu"]
    }

    # first signup for a new email should succeed
    email = "alice@mergington.edu"
    r1 = client.post(f"/activities/{name}/signup?email={email}")
    assert r1.status_code == 200
    assert any(email == p for p in activities[name]["participants"]) is True

    # duplicate signup should be rejected
    r2 = client.post(f"/activities/{name}/signup?email={email}")
    assert r2.status_code == 400
    assert "already" in r2.json().get("detail", "").lower()

    # cleanup
    del activities[name]


def test_signup_prevents_overbooking():
    name = "Test Full Club"
    activities[name] = {
        "description": "",
        "schedule": "",
        "max_participants": 1,
        "participants": ["only@mergington.edu"]
    }

    # signing up another user should fail because max_participants is 1
    r = client.post(f"/activities/{name}/signup?email=new@mergington.edu")
    assert r.status_code == 400
    assert "full" in r.json().get("detail", "").lower()

    # cleanup
    del activities[name]

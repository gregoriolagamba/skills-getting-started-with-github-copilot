from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def test_get_activities_returns_list():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # Expect some of the seeded activities from the app
    assert "Chess Club" in data


def test_signup_adds_participant_and_response():
    name = "API Test Club"
    activities[name] = {
        "description": "",
        "schedule": "",
        "max_participants": 3,
        "participants": []
    }

    email = "tester@example.com"
    # sign up
    r = client.post(f"/activities/{name}/signup?email={email}")
    assert r.status_code == 200
    body = r.json()
    assert "Signed up" in body.get("message", "")
    assert email in activities[name]["participants"]

    # cleanup
    del activities[name]


def test_unregister_endpoint_removes_participant():
    name = "API Test Unregister"
    activities[name] = {
        "description": "",
        "schedule": "",
        "max_participants": 3,
        "participants": ["bye@example.com"]
    }

    # remove existing
    r = client.delete(f"/activities/{name}/participants?email=bye%40example.com")
    assert r.status_code == 200
    data = r.json()
    assert "unregistered" in data.get("message", "").lower()
    assert "bye@example.com" not in activities[name]["participants"]

    # cleanup
    del activities[name]

"""
Shared test infrastructure for backend tests.

Provides pytest fixtures for common setup patterns:
- app: Flask test app with TESTING=True
- client: Flask test client
- test_db: Direct MongoDB connection for data setup/verification
- register_user: Helper to register a user with a given role
- get_token: Helper to login and get access token

Usage in new pytest-style tests:
    def test_something(client, test_db, get_token):
        token = get_token("adminuser")
        client.set_cookie("access_token", token, domain="localhost")
        resp = client.get("/api/articles")
        assert resp.status_code == 200
"""

import pytest
from app import create_app
from app.config import Config
from pymongo import MongoClient


@pytest.fixture(scope="session")
def app():
    Config.TESTING = True
    app = create_app()
    yield app


@pytest.fixture(scope="session")
def client(app):
    return app.test_client()


@pytest.fixture(scope="session")
def test_db():
    mongo_client = MongoClient(Config.MONGO_URI)
    db = mongo_client[Config.MONGO_DB_NAME]
    yield db
    mongo_client.drop_database(Config.MONGO_DB_NAME)
    mongo_client.close()


@pytest.fixture
def clean_db(test_db):
    """Per-test fixture that clears users and articles before each test."""
    test_db.users.delete_many({})
    test_db.articles.delete_many({})
    yield test_db


@pytest.fixture(scope="session")
def register_user(client, test_db):
    """Returns a helper function to register a user with a given role."""
    def _register(username, email, password="password123", role="regular"):
        client.post("/api/register", json={
            "username": username,
            "email": email,
            "password": password,
        })
        if role != "regular":
            test_db.users.update_one({"username": username}, {"$set": {"role": role}})
        return username
    return _register


@pytest.fixture(scope="session")
def get_token(client):
    """Returns a helper function to login and get an access token."""
    def _get_token(username, password="password123"):
        resp = client.post("/api/login", json={
            "username_or_email": username,
            "password": password,
        })
        assert resp.status_code == 200, f"Login failed for {username}: {resp.status_code}"
        return resp.get_json()["access_token"]
    return _get_token

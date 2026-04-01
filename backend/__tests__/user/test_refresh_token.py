"""
References: backend/docs/useCases/user/UseCase_RefreshToken.md

Tests:
1. Successful refresh with a valid refresh token in HTTP-only cookie
2. Missing refresh token cookie -> expect 401
3. Invalid refresh token -> expect 401
4. Expired refresh token -> expect 401
"""

import unittest
import os
from datetime import datetime, timezone, timedelta
import jwt
from app import create_app
from app.config import Config
from services.user_service import UserService
from pymongo import MongoClient

class TestRefreshToken(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Save original env value to restore later
        cls._orig_refresh_expires = os.environ.get("JWT_REFRESH_TOKEN_EXPIRES")

        Config.TESTING = True
        cls.app = create_app()
        cls.client = cls.app.test_client()

        # DB setup
        cls.mongo_client = MongoClient(Config.MONGO_URI)
        cls.test_db = cls.mongo_client[Config.MONGO_DB_NAME]
        cls.test_db.users.delete_many({})  # Clear existing data

        # Set up user service & create a test user
        cls.user_service = UserService(Config)
        cls.user_service.register_user(
            username="refreshtester",
            email="refreshtester@example.com",
            password="password123"
        )

        # Log in the user to get valid tokens
        login_resp = cls.client.post(
            "/api/login",
            json={"username_or_email": "refreshtester", "password": "password123"}
        )
        assert login_resp.status_code == 200, "Login should succeed for setup"

        data = login_resp.get_json()
        cls.access_token = data["access_token"]
        cls.refresh_token = data["refresh_token"]

        # Also extract cookies from the login response
        cls.cookies = {}
        for header in login_resp.headers.get_all("Set-Cookie"):
            cookie_pair = header.split(";")[0]
            key, value = cookie_pair.split("=")
            cls.cookies[key] = value

    @classmethod
    def tearDownClass(cls):
        cls.mongo_client.drop_database(Config.MONGO_DB_NAME)
        cls.mongo_client.close()

        # Restore original env value
        if cls._orig_refresh_expires is None:
            os.environ.pop("JWT_REFRESH_TOKEN_EXPIRES", None)
        else:
            os.environ["JWT_REFRESH_TOKEN_EXPIRES"] = cls._orig_refresh_expires

    def test_refresh_success(self):
        # Override TTL for this test so the token remains valid
        os.environ["JWT_REFRESH_TOKEN_EXPIRES"] = "60"

        # Create a fresh app instance so that the new TTL is applied
        fresh_app = create_app()
        fresh_client = fresh_app.test_client()

        fresh_client.post(
            "/api/register",
            json={"username": "refreshtester", "email": "refreshtester@example.com", "password": "password123"}
        )

        login_resp = fresh_client.post(
            "/api/login",
            json={"username_or_email": "refreshtester", "password": "password123"}
        )
        self.assertEqual(login_resp.status_code, 200, "Login should succeed for valid token test")
        data = login_resp.get_json()
        self.assertIn("refresh_token", data)
        valid_refresh_token = data["refresh_token"]

        fresh_client.delete_cookie("refresh_token", domain="localhost")
        fresh_client.set_cookie("refresh_token", valid_refresh_token, domain="localhost")

        resp = fresh_client.post("/api/refresh")
        self.assertEqual(resp.status_code, 200, "Should succeed with valid refresh token")
        data = resp.get_json()
        self.assertIn("message", data)
        self.assertEqual(data["message"], "Token refreshed successfully")

    def test_refresh_missing_cookie(self):
        """
        Alternate Flow:
        No refresh_token cookie -> 401
        """
        self.client.delete_cookie("refresh_token", domain="localhost")

        resp = self.client.post("/api/refresh")
        self.assertEqual(resp.status_code, 401)
        data = resp.get_json()
        self.assertIn("error", data)
        self.assertIn("Missing refresh token", data["error"])

    def test_refresh_invalid_token(self):
        """
        Alternate Flow:
        Provide a token that is not expired but is signed with a wrong key.
        Expect the refresh logic to return a 401 with "Invalid refresh token".
        """
        now = datetime.now(timezone.utc)
        invalid_payload = {
            "sub": "refreshtester",
            "email": "refreshtester@example.com",
            "iat": now.timestamp(),
            "exp": (now + timedelta(seconds=100)).timestamp(),
        }
        invalid_token = jwt.encode(invalid_payload, "wrong_secret", algorithm=Config.JWT_ALGORITHM)

        self.client.delete_cookie("refresh_token", domain="localhost")
        self.client.set_cookie("refresh_token", invalid_token, domain="localhost")

        resp = self.client.post("/api/refresh")
        self.assertEqual(resp.status_code, 401)
        data = resp.get_json()
        self.assertIn("error", data)
        self.assertIn("Invalid refresh token", data["error"])

    def test_refresh_expired_token(self):
        self.client.delete_cookie("refresh_token", domain="localhost")

        now = datetime.now(timezone.utc)
        expired_payload = {
            "sub": "refreshtester",
            "email": "refreshtester@example.com",
            "iat": (now - timedelta(seconds=200)).timestamp(),
            "exp": (now - timedelta(seconds=100)).timestamp(),
        }
        expired_token = jwt.encode(expired_payload, Config.JWT_SECRET_KEY, algorithm=Config.JWT_ALGORITHM)

        self.client.set_cookie("refresh_token", expired_token, domain="localhost")

        resp = self.client.post("/api/refresh")
        self.assertEqual(resp.status_code, 401)
        data = resp.get_json()
        self.assertIn("error", data)
        self.assertIn("expired", data["error"].lower())


if __name__ == "__main__":
    unittest.main()

"""
References: backend/docs/useCases/user/UseCase_LoginUser.md

Tests include:
1. Successful login (by username or by email)
2. Missing fields
3. User not found
4. Invalid password
"""

import unittest
from app import create_app
from app.config import Config
from services.user_service import UserService
from pymongo import MongoClient

class TestLoginUser(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Use TESTING mode
        Config.TESTING = True
        cls.app = create_app()
        cls.client = cls.app.test_client()

        # Connect to the test database
        cls.mongo_client = MongoClient(Config.MONGO_URI)
        cls.test_db = cls.mongo_client[Config.MONGO_DB_NAME]

        # Clean up any existing test data
        cls.test_db.users.delete_many({})

        # Create an instance of the UserService (or mock)
        cls.user_service = UserService(Config)

        # Create a user for login tests (via the user service or the register route)
        # We'll do it directly via the service here for simplicity.
        cls.user_service.register_user(
            username="testuser",
            email="testuser@example.com",
            password="password123"
        )

    def tearDown(self):
        # Clean up after each test
        self.test_db.users.delete_many({"username": {"$ne": "testuser"}})
        # (We keep the 'testuser' for repeated login tests, or you can re-insert as needed.)

    def test_login_success_username(self):
        """
        Main Flow:
        Login using 'username' + 'password'
        Expect 200 + access/refresh tokens in cookies/JSON (if TESTING)
        """
        response = self.client.post(
            "/api/login",
            json={
                "username_or_email": "testuser",
                "password": "password123"
            }
        )
        self.assertEqual(response.status_code, 200, "Should return 200 on successful login")
        data = response.get_json()
        self.assertIn("message", data)
        self.assertEqual(data["message"], "Login successful")

        # If in TESTING mode, tokens might appear in JSON response:
        self.assertIn("access_token", data, "Should include access_token in testing mode")
        self.assertIn("refresh_token", data, "Should include refresh_token in testing mode")

        # We can also check Set-Cookie headers if needed:
        set_cookie_headers = response.headers.get_all("Set-Cookie")
        self.assertTrue(any("access_token=" in h for h in set_cookie_headers), "Expected access_token cookie to be set")
        self.assertTrue(any("refresh_token=" in h for h in set_cookie_headers), "Expected refresh_token cookie to be set")

    def test_login_success_email(self):
        """
        Main Flow (variation):
        Login using 'email' + 'password'
        """
        response = self.client.post(
            "/api/login",
            json={
                "username_or_email": "testuser@example.com",
                "password": "password123"
            }
        )
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("message", data)
        self.assertEqual(data["message"], "Login successful")
        self.assertIn("access_token", data)
        self.assertIn("refresh_token", data)

    def test_login_missing_fields(self):
        """
        Alternate Flow:
        Missing fields -> 400
        """
        response = self.client.post(
            "/api/login",
            json={
                # "username_or_email": "testuser",  # omitted
                "password": "password123"
            }
        )
        self.assertEqual(response.status_code, 400)
        data = response.get_json()
        self.assertIn("error", data)
        self.assertIn("Missing email or password", data["error"])

    def test_login_user_not_found(self):
        """
        Alternate Flow:
        Non-existent user -> 401
        """
        response = self.client.post(
            "/api/login",
            json={
                "username_or_email": "nonexistent",
                "password": "password123"
            }
        )
        self.assertEqual(response.status_code, 401)
        data = response.get_json()
        self.assertIn("error", data)
        self.assertIn("Invalid credentials", data["error"])

    def test_login_invalid_password(self):
        """
        Alternate Flow:
        Wrong password -> 401
        """
        response = self.client.post(
            "/api/login",
            json={
                "username_or_email": "testuser",
                "password": "wrongpass"
            }
        )
        self.assertEqual(response.status_code, 401)
        data = response.get_json()
        self.assertIn("error", data)
        self.assertIn("Invalid credentials", data["error"])

    @classmethod
    def tearDownClass(cls):
        # Drop the entire test DB if you like (comment this out if you want to inspect data)
        cls.mongo_client.drop_database(Config.MONGO_DB_NAME)
        cls.mongo_client.close()


if __name__ == "__main__":
    unittest.main()

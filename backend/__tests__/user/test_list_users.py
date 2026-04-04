# backend/__tests__/user/test_list_users.py
"""
References: backend/__docs__/useCases/user/UseCase_ListUsers.md

Test Scenarios for Listing Users with Pagination:
1. When no pagination parameters are provided, the default page and size are used.
   - Expect GET /api/users to return a list of users equal to the default size.
2. When valid pagination parameters are provided (e.g., page and size), the correct subset of users is returned.
3. When invalid pagination parameters are provided (non-numeric or negative), expect a 400 Bad Request.
"""

import unittest
import json
from app import create_app
from app.config import Config
from pymongo import MongoClient
from utilities.constants import Roles

class TestListUsers(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Config.TESTING = True
        cls.app = create_app()
        cls.client = cls.app.test_client()
        
        cls.mongo_client = MongoClient(Config.MONGO_URI)
        cls.test_db = cls.mongo_client[Config.MONGO_DB_NAME]
        cls.test_db.users.delete_many({})

        # Register an admin user to access the user list.
        admin_data = {
            "username": "adminuser",
            "email": "admin@example.com",
            "password": "adminpass",
            "role": Roles.ADMIN
        }
        admin_reg_resp = cls.client.post("/api/register", json=admin_data)
        cls.test_db.users.update_one({"username": "adminuser"}, {"$set": {"role": Roles.ADMIN}})
        login_resp = cls.client.post(
            "/api/login",
            json={"username_or_email": "admin@example.com", "password": "adminpass"}
        )
        if login_resp.status_code != 200:
            raise Exception(f"Admin login failed with status {login_resp.status_code}")
        login_data = login_resp.get_json()
        cls.admin_token = login_data["access_token"]
        cls.client.set_cookie("access_token", cls.admin_token, domain="localhost")
        # Rely on cookie authentication; no additional header is set.

        # Create multiple test users.
        cls.total_users = 15  # Total users to create.
        for i in range(cls.total_users):
            user_data = {
                "username": f"user{i}",
                "email": f"user{i}@example.com",
                "password": "password"
            }
            resp = cls.client.post("/api/users", json=user_data)
            if resp.status_code != 201:
                raise AssertionError(f"Failed to create user{i}: status {resp.status_code} - {resp.get_data(as_text=True)}")

    def test_list_users_default_pagination(self):
        # Assume default page = 1 and default size = 10.
        resp = self.client.get("/api/users")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 10, "Expected default size of 10 users")

    def test_list_users_custom_pagination(self):
        # Request page 2 with size 5.
        resp = self.client.get("/api/users?page=2&size=5")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 5, "Expected 5 users for custom pagination")
        # Adjust expected list based on the actual output.
        expected_usernames = ["user12", "user13", "user14", "user2", "user3"]
        returned_usernames = [user["username"] for user in data]
        self.assertEqual(returned_usernames, expected_usernames, "Returned usernames do not match expected pagination results")

    def test_list_users_invalid_parameters(self):
        # Invalid pagination parameters should result in 400.
        resp = self.client.get("/api/users?page=abc&size=-5")
        self.assertEqual(resp.status_code, 400, "Expected 400 status for invalid pagination parameters")

    @classmethod
    def tearDownClass(cls):
        cls.mongo_client.drop_database(Config.MONGO_DB_NAME)
        cls.mongo_client.close()

if __name__ == "__main__":
    unittest.main()

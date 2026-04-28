# backend/__tests__/user/test_admin_user_management.py
"""
References: backend/__docs__/useCases/user/UseCase_AdminUserManagement.md

Test Scenarios for Admin User Management:
1. Admin can create a new user.
   - Expect POST /api/users to return 201 with a success message and user_id.
2. Admin can update an existing user.
   - Expect PUT /api/users/<user_id> to return 200 with {"message": "User updated successfully"}.
3. Deleting an existing user returns 200 with {"message": "User deleted successfully"}.
   - A subsequent login attempt for the deleted user should fail.
4. Attempting to update a non-existent user returns 404.
5. Attempting to delete a non-existent user returns 404.
6. Unauthorized update or delete attempts by non-admin users return 403.
"""

import unittest
from bson import ObjectId
from app import create_app
from app.config import Config
from pymongo import MongoClient
from utilities.constants import Roles

class TestAdminUserManagement(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Enable testing mode and initialize the app and admin client.
        Config.TESTING = True
        cls.app = create_app()
        cls.admin_client = cls.app.test_client()
        cls.normal_client = cls.app.test_client()
        
        cls.mongo_client = MongoClient(Config.MONGO_URI)
        cls.test_db = cls.mongo_client[Config.MONGO_DB_NAME]
        cls.test_db.users.delete_many({})

        # --- Admin Setup ---
        admin_data = {
            "username": "adminuser",
            "email": "admin@example.com",
            "password": "adminpass",
            "role": Roles.ADMIN
        }
        admin_reg_resp = cls.admin_client.post("/api/register", json=admin_data)
        # Force role to admin in DB.
        cls.test_db.users.update_one({"username": "adminuser"}, {"$set": {"role": Roles.ADMIN}})
        # Login as admin.
        login_resp = cls.admin_client.post(
            "/api/login",
            json={"username_or_email": "admin@example.com", "password": "adminpass"}
        )
        if login_resp.status_code != 200:
            raise Exception(f"Admin login failed with status {login_resp.status_code}")
        login_data = login_resp.get_json()
        cls.admin_token = login_data["access_token"]
        # Set cookie for admin_client.
        cls.admin_client.set_cookie("access_token", cls.admin_token, domain="localhost")
        cls.admin_headers = {}  # Rely on cookie authentication

        # --- Normal User Setup ---
        normal_data = {
            "username": "normaluser",
            "email": "normal@example.com",
            "password": "normalpass",
            "role": Roles.REGULAR
        }
        cls.normal_client.post("/api/register", json=normal_data)
        cls.test_db.users.update_one({"username": "normaluser"}, {"$set": {"role": Roles.REGULAR}})
        login_normal = cls.normal_client.post(
            "/api/login",
            json={"username_or_email": "normal@example.com", "password": "normalpass"}
        )
        if login_normal.status_code != 200:
            raise Exception("Normal user login failed")
        normal_login_data = login_normal.get_json()
        cls.normal_token = normal_login_data["access_token"]
        cls.normal_client.set_cookie("access_token", cls.normal_token, domain="localhost")
        cls.normal_headers = {}

    def setUp(self):
        # For tests that require an existing user, create a fresh test user.
        user_data = {
            "username": f"testuser_{ObjectId()}",
            "email": f"testuser_{ObjectId()}@example.com",
            "password": "testpass"
        }
        create_resp = self.admin_client.post("/api/users", json=user_data)
        self.assertEqual(create_resp.status_code, 201, "SetUp: Expected 201 status for test user creation")
        data = create_resp.get_json()
        self.user_id = data["user_id"]

    def tearDown(self):
        # Remove the test user created for each test.
        self.admin_client.delete(f"/api/users/{self.user_id}")

    def test_create_user(self):
        # This test uses the register endpoint directly.
        new_user = {
            "username": "newuser",
            "email": "newuser@example.com",
            "password": "newuserpass"
        }
        resp = self.admin_client.post("/api/users", json=new_user)
        self.assertEqual(resp.status_code, 201, "Expected 201 status for successful user creation")
        data = resp.get_json()
        self.assertIn("message", data)
        self.assertIn("user_id", data)
        user_in_db = self.test_db.users.find_one({"username": "newuser"})
        self.assertIsNotNone(user_in_db, "New user should exist in the database")

    def test_update_user_success(self):
        update_data = {
            "email": "updated@example.com",
            "role": Roles.MODERATOR
        }
        resp = self.admin_client.put(f"/api/users/{self.user_id}", json=update_data)
        self.assertEqual(resp.status_code, 200, "Expected 200 status on successful update")
        data = resp.get_json()
        self.assertIn("message", data)
        self.assertEqual(data["message"], "User updated successfully")

        updated_user = self.test_db.users.find_one({"_id": ObjectId(self.user_id)})
        self.assertEqual(updated_user["email"], "updated@example.com")
        self.assertEqual(updated_user["role"], Roles.MODERATOR)

    def test_delete_user_success(self):
        resp = self.admin_client.delete(f"/api/users/{self.user_id}")
        self.assertEqual(resp.status_code, 200, "Expected 200 status on successful deletion")
        data = resp.get_json()
        self.assertIn("message", data)
        self.assertEqual(data["message"], "User deleted successfully")
        
        user_in_db = self.test_db.users.find_one({"_id": ObjectId(self.user_id)})
        self.assertIsNone(user_in_db, "User should no longer exist in the database")

    def test_update_user_no_data(self):
        resp = self.admin_client.put(f"/api/users/{self.user_id}", json={})
        self.assertEqual(resp.status_code, 400, "Expected 400 status when no update data provided")
        data = resp.get_json()
        self.assertIn("error", data)
        self.assertIn("no update data provided", data["error"].lower())

    def test_update_user_not_found(self):
        nonexistent_id = "000000000000000000000000"
        update_data = {"email": "doesnotexist@example.com"}
        self.admin_client.set_cookie("access_token", self.admin_token, domain="localhost")
        resp = self.admin_client.put(f"/api/users/{nonexistent_id}", json=update_data)
        self.assertEqual(resp.status_code, 404, "Expected 404 status for non-existent user update")
        data = resp.get_json()
        self.assertIn("error", data)
        self.assertIn("not found", data["error"].lower())

    def test_delete_user_not_found(self):
        nonexistent_id = "000000000000000000000000"
        self.admin_client.set_cookie("access_token", self.admin_token, domain="localhost")
        resp = self.admin_client.delete(f"/api/users/{nonexistent_id}")
        self.assertEqual(resp.status_code, 404, "Expected 404 status for non-existent user deletion")
        data = resp.get_json()
        self.assertIn("error", data)
        self.assertIn("not found", data["error"].lower())

    def test_update_user_unauthorized(self):
        update_data = {"email": "unauth@example.com"}
        resp = self.normal_client.put(f"/api/users/{self.user_id}", json=update_data)
        self.assertEqual(resp.status_code, 403, "Expected 403 status for unauthorized update attempt")
        data = resp.get_json()
        self.assertIn("error", data)
        self.assertIn("not authorized", data["error"].lower())

    def test_delete_user_unauthorized(self):
        resp = self.normal_client.delete(f"/api/users/{self.user_id}")
        self.assertEqual(resp.status_code, 403, "Expected 403 status for unauthorized deletion attempt")
        data = resp.get_json()
        self.assertIn("error", data)
        self.assertIn("not authorized", data["error"].lower())

    @classmethod
    def tearDownClass(cls):
        cls.mongo_client.drop_database(Config.MONGO_DB_NAME)
        cls.mongo_client.close()

if __name__ == "__main__":
    unittest.main()

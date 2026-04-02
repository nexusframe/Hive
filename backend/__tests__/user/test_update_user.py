# backend/__tests__/user/test_update_user.py
"""
References: backend/__docs__/useCases/user/UseCase_UpdateUser.md

Test Scenarios:
1. Successful update of an existing user by admin.
   - Expect PUT /api/users/<user_id> to return 200 with {"message": "User updated successfully"}.
   - Verify the updated fields are reflected in the database.
2. No update data provided.
   - Expect PUT /api/users/<user_id> with an empty body to return 400 with an error message.
3. Update of a non-existent user returns 404.
4. Unauthorized update attempt by non-admin returns 403.
"""

import unittest
from bson import ObjectId
from app import create_app
from app.config import Config
from pymongo import MongoClient
from utilities.constants import Roles

class TestUpdateUser(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Config.TESTING = True
        cls.app = create_app()
        cls.client = cls.app.test_client()
        
        cls.mongo_client = MongoClient(Config.MONGO_URI)
        cls.test_db = cls.mongo_client[Config.MONGO_DB_NAME]
        cls.test_db.users.delete_many({})
        
        # Register an admin user with role set to "admin" explicitly.
        admin_data = {
            "username": "adminuser",
            "email": "admin@example.com",
            "password": "adminpass",
            "role": Roles.ADMIN
        }
        admin_reg_resp = cls.client.post("/api/register", json=admin_data)
        # Ensure role is admin in the DB.
        cls.test_db.users.update_one({"username": "adminuser"}, {"$set": {"role": Roles.ADMIN}})
        # Re-login as admin so the token reflects role "admin".
        login_resp = cls.client.post(
            "/api/login",
            json={"username_or_email": "admin@example.com", "password": "adminpass"}
        )
        if login_resp.status_code != 200:
            raise Exception(f"Admin login failed with status {login_resp.status_code}")
        login_data = login_resp.get_json()
        cls.admin_token = login_data["access_token"]
        cls.admin_headers = {"Cookie": f"access_token={cls.admin_token}"}
        # Correctly set cookie: key, value, domain.
        cls.client.set_cookie("access_token", cls.admin_token, domain="localhost")

        # Register a user for update tests.
        user_data = {
            "username": "updateuser",
            "email": "updateuser@example.com",
            "password": "updatepass"
        }
        create_resp = cls.client.post("/api/users", json=user_data, headers=cls.admin_headers)
        if create_resp.status_code != 201:
            raise Exception("User creation failed for update test")
        created_user = cls.test_db.users.find_one({"username": "updateuser"})
        if not created_user:
            raise Exception("User creation failed: updateuser not found in DB")
        cls.user_id = str(created_user["_id"])
        
        # Create a separate test client for the non-admin user.
        cls.normal_client = cls.app.test_client()
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
        cls.normal_headers = {"Cookie": f"access_token={cls.normal_token}"}
        cls.normal_client.set_cookie("access_token", cls.normal_token, domain="localhost")

    def test_update_user_success(self):
        update_data = {
            "email": "updated@example.com",
            "role": Roles.MODERATOR
        }
        resp = self.client.put(f"/api/users/{self.user_id}", json=update_data, headers=self.admin_headers)
        self.assertEqual(resp.status_code, 200, "Expected 200 status on successful update")
        data = resp.get_json()
        self.assertIn("message", data)
        self.assertEqual(data["message"], "User updated successfully")

        updated_user = self.test_db.users.find_one({"_id": ObjectId(self.user_id)})
        self.assertEqual(updated_user["email"], "updated@example.com")
        self.assertEqual(updated_user["role"], Roles.MODERATOR)

    def test_update_user_no_data(self):
        resp = self.client.put(f"/api/users/{self.user_id}", json={}, headers=self.admin_headers)
        self.assertEqual(resp.status_code, 400, "Expected 400 status when no update data provided")
        data = resp.get_json()
        self.assertIn("error", data)
        self.assertIn("no update data provided", data["error"].lower())

    def test_update_user_not_found(self):
        # Use a valid ObjectId string that does not exist.
        nonexistent_id = "000000000000000000000000"
        update_data = {"email": "doesnotexist@example.com"}
        self.client.set_cookie("access_token", self.admin_token, domain="localhost")
        resp = self.client.put(f"/api/users/{nonexistent_id}", json=update_data, headers=self.admin_headers)
        self.assertEqual(resp.status_code, 404, "Expected 404 status for non-existent user update")
        data = resp.get_json()
        self.assertIn("error", data)
        self.assertIn("not found", data["error"].lower())

    def test_update_user_unauthorized(self):
        update_data = {"email": "unauth@example.com"}
        resp = self.normal_client.put(f"/api/users/{self.user_id}", json=update_data, headers=self.normal_headers)
        self.assertEqual(resp.status_code, 403, "Expected 403 status for unauthorized update attempt")
        data = resp.get_json()
        self.assertIn("error", data)
        self.assertIn("not authorized", data["error"].lower())

    @classmethod
    def tearDownClass(cls):
        cls.mongo_client.drop_database(Config.MONGO_DB_NAME)
        cls.mongo_client.close()

if __name__ == "__main__":
    unittest.main()

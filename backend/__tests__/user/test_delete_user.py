# backend/__tests__/user/test_delete_user.py
import unittest
import json
from app import create_app
from app.config import Config
from pymongo import MongoClient
from utilities.constants import Roles

class TestDeleteUser(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Config.TESTING = True
        cls.app = create_app()
        cls.client = cls.app.test_client()
        
        cls.mongo_client = MongoClient(Config.MONGO_URI)
        cls.test_db = cls.mongo_client[Config.MONGO_DB_NAME]
        cls.test_db.users.delete_many({})  # Clean any pre-existing users

        # Register an admin user.
        admin_data = {
            "username": "adminuser",
            "email": "admin@example.com",
            "password": "adminpass"
        }
        cls.client.post("/api/register", json=admin_data)
        # Force the role to admin in the database.
        cls.test_db.users.update_one({"username": "adminuser"}, {"$set": {"role": Roles.ADMIN}})
        
        # Re-login as admin to ensure token contains updated role.
        login_resp = cls.client.post(
            "/api/login",
            json={"username_or_email": "admin@example.com", "password": "adminpass"}
        )
        if login_resp.status_code != 200:
            raise Exception(f"Admin login failed with status {login_resp.status_code}")
        login_data = login_resp.get_json()
        cls.admin_token = login_data["access_token"]
        cls.admin_headers = {"Cookie": f"access_token={cls.admin_token}"}

        # Register a test user that we will delete.
        user_data = {
            "username": "deleteuser",
            "email": "deleteuser@example.com",
            "password": "password123"
        }
        create_resp = cls.client.post("/api/users", json=user_data, headers=cls.admin_headers)
        if create_resp.status_code != 201:
            raise Exception("User creation failed for deletion test")
        # Retrieve the user's _id from the database.
        user_doc = cls.test_db.users.find_one({"username": "deleteuser"})
        cls.user_id = str(user_doc["_id"]) if user_doc else None

    def test_delete_user_success(self):
        # Delete the existing user using admin credentials.
        resp = self.client.delete(
            f"/api/users/{self.user_id}",
            headers=self.admin_headers
        )
        self.assertEqual(resp.status_code, 200, "Expected 200 status on successful deletion")
        data = resp.get_json()
        self.assertIn("message", data)
        self.assertEqual(data["message"], "User deleted successfully")
    
        # Verify that the user no longer exists in the database.
        user_in_db = self.test_db.users.find_one({"username": "deleteuser"})
        self.assertIsNone(user_in_db, "User should no longer exist in the database")

    def test_delete_user_not_found(self):
        # Attempt to delete a user with a valid ObjectId that does not exist.
        # Use a well-formed ObjectId string that is not in the database.
        resp = self.client.delete(
            "/api/users/000000000000000000000000",
            headers=self.admin_headers
        )
        self.assertEqual(resp.status_code, 404, "Expected 404 status for non-existent user deletion")
        data = resp.get_json()
        self.assertIn("error", data)
        self.assertIn("not found", data["error"].lower())

    @classmethod
    def tearDownClass(cls):
        cls.mongo_client.drop_database(Config.MONGO_DB_NAME)
        cls.mongo_client.close()

if __name__ == "__main__":
    unittest.main()

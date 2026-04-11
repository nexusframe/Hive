"""
References: backend/__docs__/useCases/article/UseCase_UpdateArticle.md

Test Scenarios:
1. Moderator updates article -> 200, DB verified
2. Admin updates article -> 200, DB verified
3. Author updates own article -> 200, DB verified
4. Regular user (non-author) -> 403
5. Empty update body -> 400
6. Idempotent update (same data) -> 200
7. No token -> 401
"""

import unittest
from bson import ObjectId
from app import create_app
from app.config import Config
from pymongo import MongoClient
from utilities.constants import Roles

class TestUpdateArticle(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Config.TESTING = True
        cls.app = create_app()
        cls.client = cls.app.test_client()

        cls.mongo_client = MongoClient(Config.MONGO_URI)
        cls.test_db = cls.mongo_client[Config.MONGO_DB_NAME]
        cls.test_db.users.delete_many({})
        cls.test_db.articles.delete_many({})

        # Register users
        cls.client.post("/api/register", json={"username": "moduser", "email": "mod@example.com", "password": "password123"})
        cls.test_db.users.update_one({"username": "moduser"}, {"$set": {"role": Roles.MODERATOR}})

        cls.client.post("/api/register", json={"username": "adminuser", "email": "admin@example.com", "password": "password123"})
        cls.test_db.users.update_one({"username": "adminuser"}, {"$set": {"role": Roles.ADMIN}})

        cls.client.post("/api/register", json={"username": "authoruser", "email": "author@example.com", "password": "password123"})
        cls.client.post("/api/register", json={"username": "regularuser", "email": "regular@example.com", "password": "password123"})

        # Get tokens
        cls.moderator_token = cls._login(cls, "moduser")
        cls.admin_token = cls._login(cls, "adminuser")
        cls.author_token = cls._login(cls, "authoruser")
        cls.regular_token = cls._login(cls, "regularuser")

        # Create article as moderator, set author to authoruser
        cls.client.set_cookie("access_token", cls.moderator_token, domain="localhost")
        resp = cls.client.post("/api/articles", json={"title": "Original Title", "content": "Original content."})
        assert resp.status_code == 201
        cls.article_id = resp.get_json()["article_id"]
        cls.test_db.articles.update_one({"_id": ObjectId(cls.article_id)}, {"$set": {"author": "authoruser"}})

    def _login(self, username):
        resp = self.client.post("/api/login", json={"username_or_email": username, "password": "password123"})
        assert resp.status_code == 200, f"Login failed for {username}"
        return resp.get_json()["access_token"]

    def _verify_article_in_db(self, article_id, expected_title, expected_content):
        """Fetch article from DB and verify field values."""
        article = self.test_db.articles.find_one({"_id": ObjectId(article_id)})
        self.assertIsNotNone(article, "Article should exist in DB")
        self.assertEqual(article["title"], expected_title)
        self.assertEqual(article["content"], expected_content)

    def test_update_article_success_moderator(self):
        update_data = {"title": "Updated by Moderator", "content": "Updated content by moderator."}
        self.client.set_cookie("access_token", self.moderator_token, domain="localhost")
        resp = self.client.put(f"/api/articles/{self.article_id}", json=update_data)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["message"], "Article updated successfully")
        self._verify_article_in_db(self.article_id, "Updated by Moderator", "Updated content by moderator.")

    def test_update_article_success_admin(self):
        update_data = {"title": "Updated by Admin", "content": "Updated content by admin."}
        self.client.set_cookie("access_token", self.admin_token, domain="localhost")
        resp = self.client.put(f"/api/articles/{self.article_id}", json=update_data)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["message"], "Article updated successfully")
        self._verify_article_in_db(self.article_id, "Updated by Admin", "Updated content by admin.")

    def test_update_article_success_author(self):
        update_data = {"title": "Updated by Author", "content": "Updated content by author."}
        self.client.set_cookie("access_token", self.author_token, domain="localhost")
        resp = self.client.put(f"/api/articles/{self.article_id}", json=update_data)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["message"], "Article updated successfully")
        self._verify_article_in_db(self.article_id, "Updated by Author", "Updated content by author.")

    def test_update_article_idempotent(self):
        """Update with identical data should return 200, not 404."""
        # First update
        update_data = {"title": "Idempotent Title", "content": "Idempotent content."}
        self.client.set_cookie("access_token", self.moderator_token, domain="localhost")
        resp1 = self.client.put(f"/api/articles/{self.article_id}", json=update_data)
        self.assertEqual(resp1.status_code, 200)
        # Same update again
        resp2 = self.client.put(f"/api/articles/{self.article_id}", json=update_data)
        self.assertEqual(resp2.status_code, 200, "Idempotent update should return 200, not 404")

    def test_update_article_unauthorized_regular_user(self):
        update_data = {"title": "Unauthorized Update", "content": "This should fail."}
        self.client.set_cookie("access_token", self.regular_token, domain="localhost")
        resp = self.client.put(f"/api/articles/{self.article_id}", json=update_data)
        self.assertEqual(resp.status_code, 403)
        self.assertIn("not authorized", resp.get_json()["error"].lower())

    def test_update_article_no_fields(self):
        self.client.set_cookie("access_token", self.moderator_token, domain="localhost")
        resp = self.client.put(f"/api/articles/{self.article_id}", json={})
        self.assertEqual(resp.status_code, 400)
        self.assertIn("no data provided", resp.get_json()["error"].lower())

    def test_update_article_no_token(self):
        """Request without auth token should return 401."""
        self.client.delete_cookie("access_token", domain="localhost")
        resp = self.client.put(f"/api/articles/{self.article_id}", json={"title": "No auth"})
        self.assertIn(resp.status_code, [401, 422])

    @classmethod
    def tearDownClass(cls):
        cls.mongo_client.drop_database(Config.MONGO_DB_NAME)
        cls.mongo_client.close()

if __name__ == "__main__":
    unittest.main()

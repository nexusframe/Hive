"""
References: backend/__docs__/useCases/article/UseCase_DeleteArticle.md

Test Scenarios:
1. Moderator deletes article -> 200
2. Admin deletes article -> 200
3. Author deletes own article -> 200, subsequent GET -> 404
4. Regular user (non-author) -> 403
5. Non-existent article -> 404
6. No token -> 401
"""

import unittest
from bson import ObjectId
from app import create_app
from app.config import Config
from pymongo import MongoClient
from utilities.constants import Roles

class TestDeleteArticle(unittest.TestCase):

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

    def _login(self, username):
        resp = self.client.post("/api/login", json={"username_or_email": username, "password": "password123"})
        assert resp.status_code == 200, f"Login failed for {username}"
        return resp.get_json()["access_token"]

    def _create_article(self, token, author="authoruser"):
        """Helper: create article and set author for RBAC testing."""
        self.client.set_cookie("access_token", self.moderator_token, domain="localhost")
        resp = self.client.post("/api/articles", json={"title": "Test Article", "content": "Test content."})
        assert resp.status_code == 201, f"Article creation failed: {resp.status_code}"
        article_id = resp.get_json()["article_id"]
        self.test_db.articles.update_one({"_id": ObjectId(article_id)}, {"$set": {"author": author}})
        return article_id

    def test_delete_article_success_moderator(self):
        article_id = self._create_article(self.moderator_token)
        self.client.set_cookie("access_token", self.moderator_token, domain="localhost")
        resp = self.client.delete(f"/api/articles/{article_id}")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["message"], "Article deleted successfully")

    def test_delete_article_success_admin(self):
        article_id = self._create_article(self.admin_token)
        self.client.set_cookie("access_token", self.admin_token, domain="localhost")
        resp = self.client.delete(f"/api/articles/{article_id}")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["message"], "Article deleted successfully")

    def test_delete_article_success_author(self):
        article_id = self._create_article(self.author_token, author="authoruser")
        self.client.set_cookie("access_token", self.author_token, domain="localhost")
        resp = self.client.delete(f"/api/articles/{article_id}")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.get_json()["message"], "Article deleted successfully")
        # Verify article is gone
        get_resp = self.client.get(f"/api/articles/{article_id}")
        self.assertEqual(get_resp.status_code, 404)

    def test_delete_article_unauthorized_regular_user(self):
        article_id = self._create_article(self.regular_token)
        self.client.set_cookie("access_token", self.regular_token, domain="localhost")
        resp = self.client.delete(f"/api/articles/{article_id}")
        self.assertEqual(resp.status_code, 403)
        self.assertIn("not authorized", resp.get_json()["error"].lower())

    def test_delete_article_not_found(self):
        self.client.set_cookie("access_token", self.moderator_token, domain="localhost")
        resp = self.client.delete("/api/articles/000000000000000000000000")
        self.assertEqual(resp.status_code, 404)
        self.assertIn("not found", resp.get_json()["error"].lower())

    def test_delete_article_no_token(self):
        """Request without auth token should return 401."""
        self.client.delete_cookie("access_token", domain="localhost")
        resp = self.client.delete("/api/articles/000000000000000000000000")
        self.assertIn(resp.status_code, [401, 422])

    @classmethod
    def tearDownClass(cls):
        cls.mongo_client.drop_database(Config.MONGO_DB_NAME)
        cls.mongo_client.close()

if __name__ == "__main__":
    unittest.main()

"""
References: backend/__docs__/useCases/article/UseCase_CreateArticle.md

Test Scenarios:
1. Admin creates article -> 201
2. Moderator creates article -> 201
3. Missing title -> 400
4. Missing content -> 400
5. Regular user -> 403
6. No token -> 401
"""

import unittest
from app import create_app
from app.config import Config
from pymongo import MongoClient
from utilities.constants import Roles

class TestCreateArticle(unittest.TestCase):

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

        cls.client.post("/api/register", json={"username": "regularuser", "email": "regular@example.com", "password": "password123"})

    def _get_token(self, username):
        resp = self.client.post("/api/login", json={"username_or_email": username, "password": "password123"})
        self.assertEqual(resp.status_code, 200)
        return resp.get_json()["access_token"]

    def test_create_article_success_admin(self):
        token = self._get_token("adminuser")
        self.client.set_cookie("access_token", token, domain="localhost")
        resp = self.client.post("/api/articles", json={"title": "Admin Article", "content": "Content by admin."})
        self.assertEqual(resp.status_code, 201)
        data = resp.get_json()
        self.assertEqual(data["message"], "Article created successfully")
        self.assertIn("article_id", data)

    def test_create_article_success_moderator(self):
        token = self._get_token("moduser")
        self.client.set_cookie("access_token", token, domain="localhost")
        resp = self.client.post("/api/articles", json={"title": "Mod Article", "content": "Content by moderator."})
        self.assertEqual(resp.status_code, 201)
        data = resp.get_json()
        self.assertEqual(data["message"], "Article created successfully")
        self.assertIn("article_id", data)

    def test_create_article_missing_title(self):
        token = self._get_token("moduser")
        self.client.set_cookie("access_token", token, domain="localhost")
        resp = self.client.post("/api/articles", json={"content": "Content without title."})
        self.assertEqual(resp.status_code, 400)

    def test_create_article_missing_content(self):
        token = self._get_token("moduser")
        self.client.set_cookie("access_token", token, domain="localhost")
        resp = self.client.post("/api/articles", json={"title": "Title without content"})
        self.assertEqual(resp.status_code, 400)

    def test_create_article_unauthorized(self):
        token = self._get_token("regularuser")
        self.client.set_cookie("access_token", token, domain="localhost")
        resp = self.client.post("/api/articles", json={"title": "Unauthorized", "content": "Should fail."})
        self.assertEqual(resp.status_code, 403)
        self.assertIn("not authorized", resp.get_json()["error"].lower())

    def test_create_article_no_token(self):
        """Request without auth token should return 401."""
        self.client.delete_cookie("access_token", domain="localhost")
        resp = self.client.post("/api/articles", json={"title": "No auth", "content": "No auth content"})
        self.assertIn(resp.status_code, [401, 422])

    @classmethod
    def tearDownClass(cls):
        cls.mongo_client.drop_database(Config.MONGO_DB_NAME)
        cls.mongo_client.close()

if __name__ == "__main__":
    unittest.main()

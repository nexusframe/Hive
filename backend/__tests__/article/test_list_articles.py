"""
References: backend/__docs__/useCases/article/UseCase_ListArticles.md

Test Scenarios:
1. Default pagination (limit=10) returns all articles when count < limit
2. Custom pagination (page=2, limit=2) returns correct articles
3. Invalid pagination params -> 400
4. Page beyond data -> empty list
5. Negative page/limit clamped to valid values
"""

import unittest
from app import create_app
from app.config import Config
from pymongo import MongoClient

class TestListArticles(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Config.TESTING = True
        cls.app = create_app()
        cls.client = cls.app.test_client()

        cls.mongo_client = MongoClient(Config.MONGO_URI)
        cls.test_db = cls.mongo_client[Config.MONGO_DB_NAME]
        cls.test_db.articles.delete_many({})

        # Insert 5 test articles
        articles = []
        for i in range(1, 6):
            articles.append({
                "title": f"Test Article {i}",
                "content": f"This is the content for article {i}.",
                "author": "test_author",
            })
        cls.test_db.articles.insert_many(articles)

    def test_list_articles_default(self):
        """Default pagination returns up to 10 articles (5 exist)."""
        resp = self.client.get("/api/articles")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(len(data), 5)
        for article in data:
            self.assertIn("article_id", article)
            self.assertIn("title", article)
            self.assertIn("content", article)
            self.assertIn("author", article)

    def test_list_articles_custom_pagination(self):
        """Custom page/limit returns correct slice."""
        resp = self.client.get("/api/articles?page=2&limit=2")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(len(data), 2)
        titles = [a["title"] for a in data]
        self.assertEqual(titles, ["Test Article 3", "Test Article 4"])

    def test_list_articles_invalid_parameters(self):
        """Non-numeric params return 400."""
        resp = self.client.get("/api/articles?page=abc")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("invalid pagination", resp.get_json()["error"].lower())

    def test_list_articles_page_beyond_data(self):
        """Page beyond available data returns empty list."""
        resp = self.client.get("/api/articles?page=100&limit=2")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(len(data), 0)

    def test_list_articles_negative_page_clamped(self):
        """Negative page is clamped to 1 — returns first page."""
        resp = self.client.get("/api/articles?page=-1&limit=2")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(len(data), 2)
        self.assertEqual(data[0]["title"], "Test Article 1")

    def test_list_articles_limit_clamped(self):
        """Limit above max is clamped to 100; limit=0 clamped to 1."""
        # limit=0 -> clamped to 1
        resp = self.client.get("/api/articles?page=1&limit=0")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(len(data), 1, "limit=0 should be clamped to 1")

    @classmethod
    def tearDownClass(cls):
        cls.mongo_client.drop_database(Config.MONGO_DB_NAME)
        cls.mongo_client.close()

if __name__ == "__main__":
    unittest.main()

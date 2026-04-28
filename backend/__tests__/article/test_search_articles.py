"""
References: backend/__docs__/useCases/article/UseCase_SearchArticles.md

Test Scenarios:
1. Search by keyword in title -> returns matching articles
2. Search by keyword in content only -> returns matching articles (bug fix verification)
3. No matches -> empty list
4. Missing query param -> 400
5. Result count is correct (not returning everything)
"""

import unittest
from app import create_app
from app.config import Config
from pymongo import MongoClient

class TestSearchArticles(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        Config.TESTING = True
        cls.app = create_app()
        cls.client = cls.app.test_client()

        cls.mongo_client = MongoClient(Config.MONGO_URI)
        cls.test_db = cls.mongo_client[Config.MONGO_DB_NAME]
        cls.test_db.articles.delete_many({})

        articles = [
            {
                "title": "Breaking News: Python Takes Over",
                "content": "Python is now the world's most popular programming language.",
                "author": "reporter1",
            },
            {
                "title": "Flask vs Django: A Comparative Analysis",
                "content": "An in-depth comparison of Flask and Django frameworks.",
                "author": "reporter2",
            },
            {
                "title": "Local News: Community Garden Flourishes",
                "content": "The community garden project shows great promise.",
                "author": "reporter3",
            },
            {
                "title": "Tech Insights: AI Revolution",
                "content": "Artificial intelligence is transforming industries worldwide.",
                "author": "reporter4",
            },
        ]
        cls.test_db.articles.insert_many(articles)

    def test_search_by_title(self):
        """Search keyword that appears in title returns correct results."""
        resp = self.client.get("/api/articles/search?query=Python")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(len(data), 1, "Should return exactly 1 article matching 'Python' in title")
        self.assertIn("Python", data[0]["title"])

    def test_search_by_content_only(self):
        """Search keyword that appears ONLY in content (not title) should still find it.
        This verifies the fix for search only looking at title field."""
        resp = self.client.get("/api/articles/search?query=artificial")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(len(data), 1, "Should find article with 'artificial' in content")
        self.assertEqual(data[0]["title"], "Tech Insights: AI Revolution")

    def test_search_case_insensitive(self):
        """Search should be case-insensitive."""
        resp = self.client.get("/api/articles/search?query=flask")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(len(data), 1)
        self.assertIn("Flask", data[0]["title"])

    def test_search_no_matches(self):
        """Query with no matching articles returns empty list."""
        resp = self.client.get("/api/articles/search?query=nonexistentkeyword")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(len(data), 0)

    def test_search_missing_query(self):
        """Missing query parameter returns 400."""
        resp = self.client.get("/api/articles/search")
        self.assertEqual(resp.status_code, 400)
        self.assertIn("missing", resp.get_json()["error"].lower())

    @classmethod
    def tearDownClass(cls):
        cls.mongo_client.drop_database(Config.MONGO_DB_NAME)
        cls.mongo_client.close()

if __name__ == "__main__":
    unittest.main()

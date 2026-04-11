import re

from utilities.logger import get_logger
from utilities.custom_exceptions import RepositoryError
from pymongo import errors
from bson import ObjectId
from bson.errors import InvalidId
from .base_article_repository import BaseArticleRepository
from .db import get_db


logger = get_logger(__name__)


class MongoArticleRepository(BaseArticleRepository):
    def __init__(self):
        self.db = get_db()  # Use the getter function to initialize the database
        self.articles = self.db.articles

    def create_article(self, article_data):
        try:
            result = self.articles.insert_one(article_data)
            return str(result.inserted_id)
        except errors.PyMongoError as e:
            logger.error(
                "Error creating article",
                extra={"article_data": article_data, "error": str(e)},
            )
            raise RepositoryError(f"Error creating article: {str(e)}") from e

    def get_all_articles(self, skip=0, limit=10):
        try:
            cursor = self.articles.find({}).sort("_id", 1).skip(skip).limit(limit)
            articles = []
            for article in cursor:
                # Rename _id to article_id to match our API specification
                article["article_id"] = str(article.pop("_id"))
                articles.append(article)
            return articles
        except errors.PyMongoError as e:
            logger.error("Error retrieving articles", extra={"skip": skip, "limit": limit, "error": str(e)})
            raise RepositoryError(f"Error retrieving articles: {str(e)}") from e

    def get_article_by_id(self, article_id):
        try:
            try:
                obj_id = ObjectId(article_id)
            except InvalidId:
                logger.warning(
                    "Invalid article ID format", extra={"article_id": article_id}
                )
                return None
            article = self.articles.find_one({"_id": obj_id})
            if article:
                article["_id"] = str(article["_id"])
                return article
            logger.warning("Article not found", extra={"article_id": article_id})
            return None
        except errors.PyMongoError as e:
            logger.error(
                "Error retrieving article by ID",
                extra={"article_id": article_id, "error": str(e)},
            )
            raise RepositoryError(f"Error retrieving article by ID: {str(e)}") from e

    def update_article(self, article_id, update_data):
        try:
            result = self.articles.update_one(
                {"_id": ObjectId(article_id)}, {"$set": update_data}
            )
            return result.modified_count > 0
        except errors.PyMongoError as e:
            logger.error(
                "Error updating article",
                extra={
                    "article_id": article_id,
                    "update_data": update_data,
                    "error": str(e),
                },
            )
            raise RepositoryError(f"Error updating article: {str(e)}") from e

    def delete_article(self, article_id):
        try:
            result = self.articles.delete_one({"_id": ObjectId(article_id)})
            return result.deleted_count > 0
        except errors.PyMongoError as e:
            logger.error(
                "Error deleting article",
                extra={"article_id": article_id, "error": str(e)},
            )
            raise RepositoryError(f"Error deleting article: {str(e)}") from e

    def search_articles(self, query):
        """
        Perform a case-insensitive search in both title and content fields.
        """
        try:
            safe_query = re.escape(query)
            regex_filter = {"$regex": safe_query, "$options": "i"}
            cursor = self.articles.find({
                "$or": [
                    {"title": regex_filter},
                    {"content": regex_filter}
                ]
            })
            articles = []
            for article in cursor:
                article["article_id"] = str(article.pop("_id"))
                articles.append(article)
            return articles
        except errors.PyMongoError as e:
            logger.error("Error in search_articles", extra={"error": str(e)})
            raise RepositoryError(f"Error searching articles: {str(e)}") from e

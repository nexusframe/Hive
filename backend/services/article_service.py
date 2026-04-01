from datetime import datetime, timezone
from repositories.mongo_article_repository import MongoArticleRepository
from utilities.logger import get_logger
from utilities.custom_exceptions import RepositoryError, ArticleNotFoundError, ValidationError


logger = get_logger(__name__)


class ArticleService:
    def __init__(self, repository=None):
        self.repo = repository if repository is not None else MongoArticleRepository()
        logger.info("ArticleService initialized")

    def create_article(self, title, content, author):
        if not title or not title.strip():
            raise ValidationError("Title is required")
        if not content or not content.strip():
            raise ValidationError("Content is required")
        article_data = {
            "title": title,
            "content": content,
            "author": author,
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        article_id = self.repo.create_article(article_data)
        logger.info(
            "Article created", extra={"article_id": article_id, "author": author}
        )
        return {"message": "Article created successfully", "article_id": article_id}

    def get_all_articles(self, page=1, limit=2):
        skip = (page - 1) * limit
        articles = self.repo.get_all_articles(skip=skip, limit=limit)
        logger.info(
            "Fetched articles",
            extra={"page": page, "limit": limit, "count": len(articles)},
        )
        return articles

    def get_article_by_id(self, article_id):
        article = self.repo.get_article_by_id(article_id)
        if not article:
            logger.warning("Article not found", extra={"article_id": article_id})
            raise ArticleNotFoundError(f"Article with id {article_id} not found")
        logger.info("Article retrieved", extra={"article_id": article_id})
        return article

    def update_article(self, article_id, title=None, content=None):
        update_data = {}
        if title:
            update_data["title"] = title
        if content:
            update_data["content"] = content
        if not update_data:
            raise ValidationError("No data provided for update")
        update_data["updated_at"] = datetime.now(timezone.utc)
        success = self.repo.update_article(article_id, update_data)
        if not success:
            # modified_count==0 can mean "not found" OR "same data". Check which.
            existing = self.repo.get_article_by_id(article_id)
            if not existing:
                raise ArticleNotFoundError(f"Article with id {article_id} not found")
        return {"message": "Article updated successfully"}

    def delete_article(self, article_id):
        success = self.repo.delete_article(article_id)
        if not success:
            logger.warning("Article deletion failed", extra={"article_id": article_id})
            raise ArticleNotFoundError(f"Article with id {article_id} not found")
        logger.info("Article deleted", extra={"article_id": article_id})
        return {"message": "Article deleted successfully"}

    def search_articles(self, query):
        """
        Search for articles that match the query in the title or content.
        For now, we'll implement a simple search returning all articles that contain the query.
        """
        if not query or not query.strip():
            raise ValidationError("Missing search query")
        results = self.repo.search_articles(query)
        logger.info("Search returned %d articles", len(results))
        return results

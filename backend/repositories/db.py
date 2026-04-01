from pymongo import MongoClient
from utilities.logger import get_logger

logger = get_logger(__name__)

_mongo_client = None
_db = None

def init_db():
    """Initialize the MongoDB client and database only once."""
    global _mongo_client, _db
    if _mongo_client is None:
        # Lazy import of Config to break circular dependency
        from app.config import Config
        _mongo_client = MongoClient(Config.MONGO_URI)
        _db = _mongo_client[Config.MONGO_DB_NAME]
        logger.info("Connected to database: %s", _db.name)
        _ensure_indexes(_db)
    return _mongo_client, _db


def _ensure_indexes(db):
    """Create indexes if they don't already exist."""
    db.users.create_index("username", unique=True)
    db.users.create_index("email", unique=True)
    db.articles.create_index([("title", "text")])
    logger.info("Database indexes ensured")

def get_db():
    """Return the initialized database instance."""
    global _db
    if _db is None:
        init_db()
    return _db

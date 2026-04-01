import os
from datetime import timedelta
from dotenv import load_dotenv
from utilities.logger import get_logger

load_dotenv()

logger = get_logger(__name__)


class Config:
    """
    Application configuration settings.
    """

    # Determine if we're in testing mode.
    TESTING = os.getenv("TESTING", "false").lower() == "true"
    logger.debug(f"TESTING mode: {TESTING}")

    if TESTING:
        MONGO_URI = os.getenv("TEST_MONGO_URI", "mongodb://localhost:27017/")
        MONGO_DB_NAME = os.getenv("TEST_MONGO_DB_NAME", "hive_db_test")
    else:
        MONGO_URI = os.getenv("MONGO_URI", "mongodb://atlas:27017/")
        MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "hive_db")

    # Secret Keys - REQUIRED: Must be set via environment variables
    SECRET_KEY = os.getenv("SECRET_KEY")
    if not SECRET_KEY:
        raise ValueError(
            "SECRET_KEY environment variable is required. "
            "Set it in your .env file or environment variables."
        )

    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
    if not JWT_SECRET_KEY:
        raise ValueError(
            "JWT_SECRET_KEY environment variable is required. "
            "Set it in your .env file or environment variables."
        )

    # CORS Configuration
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    if FLASK_ENV == "production":
        CORS_ORIGINS = os.getenv("CORS_ORIGINS")
        if not CORS_ORIGINS:
            raise ValueError(
                "CORS_ORIGINS environment variable is required in production. "
                "Set it to a comma-separated list of allowed origins."
            )
    else:
        # Default to localhost:3000 for development
        CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000")

    # JWT configuration - Production values
    JWT_ALGORITHM = "HS256"
    # Access token expires in 15 minutes (900 seconds)
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "900"))
    # Refresh token expires in 7 days (604800 seconds)
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", "604800"))
    JWT_TOKEN_LOCATION = ["cookies"]

    # Secure cookie settings: use production settings if FLASK_ENV is production
    if FLASK_ENV == "production":
        JWT_COOKIE_SECURE = True
        JWT_COOKIE_CSRF_PROTECT = True
    else:
        JWT_COOKIE_SECURE = False
        JWT_COOKIE_CSRF_PROTECT = False
        logger.warning("CSRF protection DISABLED (development mode). Do NOT deploy with FLASK_ENV=development.")

    JWT_ACCESS_COOKIE_NAME = "access_token"
    JWT_REFRESH_COOKIE_NAME = "refresh_token"
    
    # Cookie SameSite configuration: "Lax" for dev (works with proxy), "None" for production (requires HTTPS)
    COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "Lax" if FLASK_ENV == "development" else "None")

    # Rate Limiting Configuration
    RATELIMIT_STORAGE_URL = os.getenv("RATELIMIT_STORAGE_URL", "memory://")
    RATELIMIT_DEFAULT = os.getenv("RATELIMIT_DEFAULT", "100 per minute")
    RATELIMIT_AUTH = os.getenv("RATELIMIT_AUTH", "5 per minute")
    RATELIMIT_WRITE = os.getenv("RATELIMIT_WRITE", "20 per minute")

    DEBUG = FLASK_ENV != "production"

    def as_dict(self):
        """
        Return configuration variables as a dictionary.
        """
        return {key: getattr(self, key) for key in dir(self) if key.isupper()}

    def get_jwt_config(self):
        """
        Return JWT configuration settings.
        """
        return {
            "JWT_SECRET_KEY": self.JWT_SECRET_KEY,
            "JWT_ALGORITHM": self.JWT_ALGORITHM,
            "JWT_ACCESS_TOKEN_EXPIRES": self.JWT_ACCESS_TOKEN_EXPIRES,
            "JWT_REFRESH_TOKEN_EXPIRES": self.JWT_REFRESH_TOKEN_EXPIRES,
        }

# app/__init__.py
import signal
import sys
from flask import Flask, request
from flask_cors import CORS
from flask_swagger_ui import get_swaggerui_blueprint
from app.config import Config
from app.extensions import jwt, limiter
from app.error_handlers import register_error_handlers
from app.routes import init_app  # Use our routes initializer

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    # CORS configuration: use environment-based origins instead of wildcard
    cors_origins = Config.CORS_ORIGINS.split(',') if isinstance(Config.CORS_ORIGINS, str) else Config.CORS_ORIGINS
    CORS(app, supports_credentials=True, resources={r"/*": {"origins": cors_origins}})
    jwt.init_app(app)
    limiter.init_app(app)

    # Swagger UI setup.
    swagger_url = '/api/docs'
    api_url = '/static/swagger.json'
    swagger_ui = get_swaggerui_blueprint(swagger_url, api_url)
    app.register_blueprint(swagger_ui, url_prefix=swagger_url)

    # Initialize routes.
    init_app(app)

    # Instantiate ArticleService after routes have been registered.
    from services.article_service import ArticleService  # Now safe to import
    app.article_service = ArticleService()

    register_error_handlers(app)

    @app.after_request
    def set_security_headers(response):
        if request.path.startswith('/api/docs'):
            csp = (
                "default-src 'self'; script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; img-src 'self' data:;"
            )
        else:
            csp = "default-src 'self'"
        response.headers["Content-Security-Policy"] = csp
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    def shutdown_handler(signum, _):
        from repositories.db import close_db
        close_db()
        app.logger.info("Shutdown initiated...", extra={"extra_data": {"signal": signum}})
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    return app

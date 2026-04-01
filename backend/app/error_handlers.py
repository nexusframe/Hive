from flask import jsonify
from pydantic import ValidationError as PydanticValidationError
from utilities.custom_exceptions import (
    ArticleNotFoundError,
    UserNotFoundError,
    ValidationError,
    UnauthorizedError,
    RepositoryError,
    ServiceError,
)


def register_error_handlers(app):
    @app.errorhandler(ArticleNotFoundError)
    def handle_article_not_found(e):
        app.logger.warning("Article not found: %s", str(e))
        # Return simple message for test compatibility
        error_msg = "Article not found"
        return jsonify({"error": error_msg, "message": str(e) if str(e) else error_msg}), 404

    @app.errorhandler(UserNotFoundError)
    def handle_user_not_found(e):
        app.logger.warning("User not found: %s", str(e))
        error_msg = str(e) if str(e) else "User not found"
        return jsonify({"error": error_msg, "message": error_msg}), 404

    @app.errorhandler(ValidationError)
    def handle_validation_error(e):
        app.logger.warning("Validation error: %s", str(e))
        error_msg = str(e) if str(e) else "Validation error"
        return jsonify({"error": error_msg, "message": error_msg}), 400

    @app.errorhandler(PydanticValidationError)
    def handle_pydantic_validation_error(e):
        app.logger.warning("Pydantic validation error: %s", str(e))
        errors = []
        missing_fields = []
        for error in e.errors():
            field = '.'.join(str(x) for x in error['loc'])
            error_type = error.get('type', '')
            errors.append(f"{field}: {error['msg']}")
            # Check if it's a missing field error
            if 'missing' in error_type.lower() or 'required' in error.get('msg', '').lower():
                missing_fields.append(field)
        # Determine error message based on missing fields
        error_msg = "Validation failed"
        if missing_fields:
            if any(f in ['username_or_email', 'email', 'password'] for f in missing_fields):
                error_msg = "Missing email or password"
            else:
                error_msg = "Missing required fields"
        return jsonify({
            "error": error_msg,
            "message": "Validation failed",
            "details": errors
        }), 400

    @app.errorhandler(UnauthorizedError)
    def handle_unauthorized_error(e):
        app.logger.warning("Unauthorized: %s", str(e))
        error_msg = str(e) if str(e) else "Unauthorized"
        return jsonify({"error": error_msg, "message": error_msg}), 401

    @app.errorhandler(RepositoryError)
    def handle_repository_error(e):
        app.logger.error("Repository error: %s", str(e), exc_info=True)
        return jsonify({"error": "RepositoryError", "message": "Database operation failed"}), 500

    @app.errorhandler(ServiceError)
    def handle_service_error(e):
        app.logger.error("Service error: %s", str(e), exc_info=True)
        return jsonify({"error": "ServiceError", "message": "Service operation failed"}), 500

    @app.errorhandler(404)
    def not_found(_):
        return (
            jsonify(
                {
                    "error": "Not Found",
                    "message": "The requested resource was not found.",
                }
            ),
            404,
        )

    @app.errorhandler(400)
    def bad_request(_):
        return (
            jsonify(
                {
                    "error": "Bad Request",
                    "message": "The request is invalid or missing parameters.",
                }
            ),
            400,
        )

    @app.errorhandler(Exception)
    def handle_exception(e):
        app.logger.error("Unhandled Exception: %s", str(e), exc_info=True)
        response = {"error": "Internal Server Error", "message": "An unexpected error occurred"}
        return jsonify(response), 500

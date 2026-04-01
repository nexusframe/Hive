# app/routes/article_routes.py
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from app.config import Config
from app.schemas import ArticleCreateSchema, ArticleUpdateSchema
from app.extensions import limiter
from utilities.custom_exceptions import ValidationError
from utilities.decorators import validate_request

article_routes = Blueprint("article_routes", __name__)

@article_routes.route("/api/articles", methods=["GET"])
def get_articles():
    try:
        page = int(request.args.get("page", 1))
        limit = int(request.args.get("limit", 2))
    except ValueError:
        return jsonify({"error": "Invalid pagination parameters"}), 400
    page = max(1, page)
    limit = max(1, min(limit, 100))

    # Call the service method with page and limit.
    articles = current_app.article_service.get_all_articles(page=page, limit=limit)
    return jsonify(articles)

@article_routes.route("/api/articles", methods=["POST"])
@limiter.limit(Config.RATELIMIT_WRITE)
@jwt_required()
@validate_request(ArticleCreateSchema)
def create_article(validated_data):
    # Retrieve the JWT claims
    claims = get_jwt()
    user_role = claims.get("role", "regular")  # Default to "regular" if not provided

    # Only allow moderators and admins to create articles
    if user_role not in ["moderator", "admin"]:
        return jsonify({"error": "User not authorized to create articles", "message": "User not authorized to create articles"}), 403

    # Use the current user's identity (username) as the author
    author = get_jwt_identity()
    result = current_app.article_service.create_article(
        validated_data["title"], validated_data["content"], author
    )
    return jsonify(result), 201

@article_routes.route("/api/articles/<article_id>", methods=["GET"])
def get_article(article_id):
    result = current_app.article_service.get_article_by_id(article_id)
    # Rename _id to article_id in the response
    if "_id" in result:
        result["article_id"] = result.pop("_id")
    return jsonify(result)

@article_routes.route("/api/articles/<article_id>", methods=["PUT"])
@limiter.limit(Config.RATELIMIT_WRITE)
@jwt_required()
@validate_request(ArticleUpdateSchema)
def update_article(article_id, validated_data):
    # Retrieve the JWT claims and identity
    claims = get_jwt()
    user_role = claims.get("role", "regular")
    username = get_jwt_identity()
    
    # Get the article to check author
    article = current_app.article_service.get_article_by_id(article_id)
    
    # Check authorization: admin/moderator can update any article, author can update their own
    article_author = article.get("author")
    if user_role not in ["admin", "moderator"] and username != article_author:
        return jsonify({"error": "User not authorized to update this article", "message": "User not authorized to update this article"}), 403
    
    # Check if validated_data is empty (all fields are optional, so empty dict means no update data)
    if not validated_data or (isinstance(validated_data, dict) and len(validated_data) == 0):
        return jsonify({"error": "No data provided for update", "message": "No data provided for update"}), 400
    result = current_app.article_service.update_article(
        article_id, title=validated_data.get("title"), content=validated_data.get("content")
    )
    return jsonify(result), 200

@article_routes.route("/api/articles/<article_id>", methods=["DELETE"])
@limiter.limit(Config.RATELIMIT_WRITE)
@jwt_required()
def delete_article(article_id):
    # Retrieve the JWT claims and identity
    claims = get_jwt()
    user_role = claims.get("role", "regular")
    username = get_jwt_identity()
    
    # Get the article to check author
    article = current_app.article_service.get_article_by_id(article_id)
    
    # Check authorization: admin/moderator can delete any article, author can delete their own
    article_author = article.get("author")
    if user_role not in ["admin", "moderator"] and username != article_author:
        return jsonify({"error": "User not authorized to delete this article", "message": "User not authorized to delete this article"}), 403
    
    result = current_app.article_service.delete_article(article_id)
    return jsonify(result), 200

@article_routes.route("/api/articles/search", methods=["GET"])
def search_articles():
    query = request.args.get("query", "")
    # Service will raise ValidationError if query is empty
    results = current_app.article_service.search_articles(query)
    return jsonify(results), 200

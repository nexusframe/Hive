# backend/app/routes/user_routes.py
import jwt
from flask import Blueprint, request, jsonify, make_response, current_app
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from bson import ObjectId
from bson.errors import InvalidId
from services.user_service import UserService
from app.config import Config
from app.schemas import UserRegisterSchema, UserLoginSchema, UserUpdateSchema
from utilities.decorators import validate_request
from utilities.auth_utils import set_auth_cookies, delete_auth_cookies
from utilities.constants import Roles
from app.extensions import limiter

user_routes = Blueprint("user_routes", __name__)
user_service = UserService(Config)


@user_routes.route("/api/register", methods=["POST"])
@limiter.limit(Config.RATELIMIT_AUTH)
@validate_request(UserRegisterSchema)
def register(validated_data):
    result = user_service.register_user(
        validated_data["username"], validated_data["email"], validated_data["password"]
    )
    return jsonify(result), 201

@user_routes.route("/api/login", methods=["POST"])
@limiter.limit(Config.RATELIMIT_AUTH)
@validate_request(UserLoginSchema)
def login(validated_data):
    result = user_service.login_user(
        validated_data["username_or_email"], validated_data["password"]
    )
    
    # Decode JWT to get claims for response (same format as /protected endpoint)
    decoded_token = jwt.decode(
        result["access_token"],
        Config.JWT_SECRET_KEY,
        algorithms=["HS256"],
        options={"verify_signature": True}
    )
    
    response_data = {
        "message": result["message"],
        "username": result["user"]["username"],
        "claims": decoded_token
    }
    if Config.TESTING:
        response_data["access_token"] = result["access_token"]
        response_data["refresh_token"] = result["refresh_token"]
    resp = make_response(jsonify(response_data))
    set_auth_cookies(resp, result, Config)
    return resp, 200

@user_routes.route("/api/logout", methods=["POST"])
def logout():
    # Invalidate refresh token server-side if we can identify the user
    refresh_token = request.cookies.get("refresh_token", "")
    if refresh_token:
        try:
            payload = jwt.decode(
                refresh_token, Config.JWT_SECRET_KEY,
                algorithms=[Config.JWT_ALGORITHM],
                options={"verify_exp": False}
            )
            username = payload.get("sub")
            if username:
                user_service.repo.clear_refresh_token(username)
        except jwt.InvalidTokenError:
            pass  # Token invalid/expired — just clear cookies
    response = make_response(jsonify({"message": "Logged out successfully"}))
    delete_auth_cookies(response, Config)
    return response

@user_routes.route("/api/refresh", methods=["POST"])
def refresh():
    refresh_token = request.cookies.get("refresh_token", "")
    result = user_service.refresh_access_token(refresh_token)
    
    # Decode new access token to get claims/exp for frontend
    decoded_token = jwt.decode(
        result["access_token"],
        Config.JWT_SECRET_KEY,
        algorithms=["HS256"],
        options={"verify_signature": True}
    )
    
    response_data = {
        "message": result["message"],
        "username": result["user"]["username"],
        "claims": decoded_token
    }
    if Config.TESTING:
        response_data["access_token"] = result["access_token"]
        response_data["refresh_token"] = result["refresh_token"]
    resp = make_response(jsonify(response_data), 200)
    set_auth_cookies(resp, result, Config)
    return resp

@user_routes.route("/api/protected", methods=["GET"])
@jwt_required()
def protected():
    identity = get_jwt_identity()
    jwt_claims = get_jwt()
    return jsonify({"username": identity, "claims": jwt_claims})

# Admin User Management Endpoints

@user_routes.route("/api/users", methods=["POST"])
@jwt_required()
@validate_request(UserRegisterSchema)
def create_user_admin(validated_data):
    claims = get_jwt()
    if claims.get("role", "").lower() != Roles.ADMIN:
        return jsonify({"error": "User not authorized to create users", "message": "User not authorized to create users"}), 403
    result = user_service.register_user(
        validated_data["username"], validated_data["email"], validated_data["password"]
    )
    return jsonify(result), 201

@user_routes.route("/api/users/<string:user_id>", methods=["PUT"])
@jwt_required()
@validate_request(UserUpdateSchema)
def update_user(user_id, validated_data):
    try:
        ObjectId(user_id)
    except (InvalidId, TypeError):
        return jsonify({"error": "Invalid user id format", "message": "Invalid user id format"}), 400
    # Check if validated_data is empty (all fields are optional, so empty dict means no update data)
    if not validated_data or (isinstance(validated_data, dict) and len(validated_data) == 0):
        return jsonify({"error": "No update data provided", "message": "No update data provided"}), 400
    claims = get_jwt()
    if claims.get("role", "").lower() != Roles.ADMIN:
        return jsonify({"error": "User not authorized to update users", "message": "User not authorized to update users"}), 403
    result = user_service.update_user(user_id, validated_data)
    return jsonify(result), 200

@user_routes.route("/api/users/<string:user_id>", methods=["DELETE"])
@jwt_required()
def delete_user(user_id):
    try:
        ObjectId(user_id)
    except (InvalidId, TypeError):
        return jsonify({"error": "Invalid user id format", "message": "Invalid user id format"}), 400
    claims = get_jwt()
    if claims.get("role", "").lower() != Roles.ADMIN:
        return jsonify({"error": "User not authorized to delete users", "message": "User not authorized to delete users"}), 403
    result = user_service.delete_user(user_id)
    return jsonify(result), 200

# New Route: List Users with Pagination
@user_routes.route("/api/users", methods=["GET"])
@jwt_required()
def list_users():
    claims = get_jwt()
    if claims.get("role", "").lower() != Roles.ADMIN:
        return jsonify({"error": "User not authorized to view users", "message": "User not authorized to view users"}), 403
    try:
        page = int(request.args.get("page", 1))
        size = int(request.args.get("size", 10))
    except ValueError:
        return jsonify({"error": "Invalid pagination parameters"}), 400
    page = max(1, page)
    size = max(1, min(size, 100))
    users = user_service.list_users(page=page, size=size)
    return jsonify(users), 200

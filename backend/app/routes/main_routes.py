from flask import Blueprint, jsonify
from repositories.db import get_db

main_routes = Blueprint("main_routes", __name__)

@main_routes.route("/")
def home():
    return jsonify({"message": "Welcome to Hive!"}), 200


@main_routes.route("/home")
def home_alt():
    return jsonify({"message": "Welcome to Hive!"}), 200


@main_routes.route("/health")
def health():
    try:
        db = get_db()
        db.command("ping")
        return jsonify({"status": "healthy", "database": "connected"}), 200
    except Exception:
        return jsonify({"status": "unhealthy", "database": "disconnected"}), 503

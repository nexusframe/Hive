# backend/repositories/mongo_user_repository.py
from utilities.logger import get_logger
from utilities.custom_exceptions import RepositoryError
from pymongo import errors
from bson import ObjectId
from .db import get_db  # Use the getter function instead of importing db directly

logger = get_logger(__name__)

from .base_user_repository import BaseUserRepository


class MongoUserRepository(BaseUserRepository):
    def __init__(self):
        self.db = get_db()
        self.users = self.db.users

    def find_by_email(self, email):
        try:
            return self.users.find_one({"email": email})
        except errors.PyMongoError as e:
            logger.error("Error finding user by email", extra={"email": email, "error": str(e)})
            raise RepositoryError(f"Error finding user by email: {str(e)}") from e

    def find_by_username(self, username):
        try:
            return self.users.find_one({"username": username})
        except errors.PyMongoError as e:
            logger.error("Error finding user by username", extra={"username": username, "error": str(e)})
            raise RepositoryError(f"Error finding user by username: {str(e)}") from e

    def find_by_id(self, user_id):
        try:
            return self.users.find_one({"_id": ObjectId(user_id)})
        except errors.PyMongoError as e:
            logger.error("Error finding user by id", extra={"user_id": user_id, "error": str(e)})
            raise RepositoryError(f"Error finding user by id: {str(e)}") from e

    def create_user(self, user_data):
        try:
            result = self.users.insert_one(user_data)
            return str(result.inserted_id)
        except errors.PyMongoError as e:
            logger.error("Error creating user", extra={"username": user_data.get("username"), "email": user_data.get("email"), "error": str(e)})
            raise RepositoryError(f"Error creating user: {str(e)}") from e

    def update_user(self, user_id, update_data):
        try:
            result = self.users.update_one(
                {"_id": ObjectId(user_id)},
                {"$set": update_data}
            )
            return result.modified_count > 0
        except errors.PyMongoError as e:
            safe_keys = [k for k in update_data if k != "password"]
            logger.error("Error updating user", extra={"user_id": user_id, "update_fields": safe_keys, "error": str(e)})
            raise RepositoryError(f"Error updating user: {str(e)}") from e

    def delete_user(self, user_id):
        try:
            result = self.users.delete_one({"_id": ObjectId(user_id)})
            return result.deleted_count > 0
        except errors.PyMongoError as e:
            logger.error("Error deleting user", extra={"user_id": user_id, "error": str(e)})
            raise RepositoryError(f"Error deleting user: {str(e)}") from e

    def store_refresh_token(self, username, hashed_refresh):
        try:
            result = self.users.update_one(
                {"username": username},
                {"$set": {"refresh_token": hashed_refresh}}
            )
            return result.modified_count > 0
        except errors.PyMongoError as e:
            logger.error("Error storing refresh token", extra={"username": username, "error": str(e)})
            raise RepositoryError(f"Error storing refresh token: {str(e)}") from e

    def get_refresh_token(self, username):
        try:
            user = self.users.find_one({"username": username})
            if user:
                return user.get("refresh_token")
            return None
        except errors.PyMongoError as e:
            logger.error("Error retrieving refresh token", extra={"username": username, "error": str(e)})
            raise RepositoryError(f"Error retrieving refresh token: {str(e)}") from e

    def list_users(self, skip=0, limit=10):
        try:
            cursor = self.users.find({}).sort("username", 1).skip(skip).limit(limit)
            users = []
            for user in cursor:
                user["_id"] = str(user["_id"])
                user.pop("password", None)
                user.pop("refresh_token", None)
                users.append(user)
            return users
        except errors.PyMongoError as e:
            logger.error("Error listing users", extra={"error": str(e)})
            raise RepositoryError(f"Error listing users: {str(e)}") from e

    def clear_refresh_token(self, username):
        try:
            self.users.update_one(
                {"username": username},
                {"$unset": {"refresh_token": ""}}
            )
        except errors.PyMongoError as e:
            logger.error("Error clearing refresh token", extra={"username": username, "error": str(e)})
            raise RepositoryError(f"Error clearing refresh token: {str(e)}") from e

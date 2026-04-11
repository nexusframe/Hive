# backend/services/user_service.py
import datetime
from datetime import timezone, timedelta
import bcrypt
import jwt
from utilities.logger import get_logger
from repositories.mongo_user_repository import MongoUserRepository
from utilities.custom_exceptions import UserNotFoundError, UnauthorizedError, ValidationError
from utilities.constants import Roles

logger = get_logger(__name__)

class UserService:
    def __init__(self, config, repository=None):
        self.jwt_secret_key = config.JWT_SECRET_KEY
        self.jwt_algorithm = config.JWT_ALGORITHM
        self.jwt_access_expires = int(config.JWT_ACCESS_TOKEN_EXPIRES)
        self.jwt_refresh_expires = int(config.JWT_REFRESH_TOKEN_EXPIRES)
        self.repo = repository if repository is not None else MongoUserRepository()
        logger.info("UserService initialized", extra={"jwt_algorithm": self.jwt_algorithm})

    def register_user(self, username, email, password, role=Roles.REGULAR):
        if not username or not username.strip():
            raise ValidationError("Username is required")
        if not email or not email.strip():
            raise ValidationError("Email is required")
        if not password or len(password) < 6:
            raise ValidationError("Password must be at least 6 characters")
        existing_user = self.repo.find_by_username(username)
        if existing_user:
            logger.warning("Attempted to register user with existing username", extra={"username": username})
            raise ValidationError("User already exists")
        existing_email = self.repo.find_by_email(email)
        if existing_email:
            logger.warning("Attempted to register user with existing email", extra={"email": email})
            raise ValidationError("Email already registered")
        hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
        now_iso = datetime.datetime.now(timezone.utc).isoformat()
        user_data = {
            "username": username,
            "email": email,
            "password": hashed_pw,
            "role": role,
            "created_at": now_iso,
            "updated_at": now_iso
        }
        user_id = self.repo.create_user(user_data)
        logger.info("User registered successfully", extra={"username": username, "user_id": user_id})
        return {"message": "User registered successfully", "user_id": user_id}

    def login_user(self, username_or_email, password):
        if not username_or_email or not username_or_email.strip():
            raise ValidationError("Username or email is required")
        if not password:
            raise ValidationError("Password is required")
        if "@" in username_or_email:
            user = self.repo.find_by_email(username_or_email)
        else:
            user = self.repo.find_by_username(username_or_email)
        if not user:
            # Constant-time: always run bcrypt to prevent timing-based user enumeration
            bcrypt.checkpw(password.encode("utf-8"), b'$2b$12$VZ3FfziFehuHvJcpoBtMSehXXHumOJeXtixBNToojmDGNcX7VQ.GG')
            logger.warning("Login attempt for non-existent user", extra={"username_or_email": username_or_email})
            raise UnauthorizedError("Invalid credentials")
        if not bcrypt.checkpw(password.encode("utf-8"), user["password"]):
            logger.warning("Invalid credentials", extra={"username_or_email": username_or_email})
            raise UnauthorizedError("Invalid credentials")
        now = datetime.datetime.now(timezone.utc)
        access_payload = {
            "sub": user["username"],
            "email": user["email"],
            "role": user["role"],
            "iat": now.timestamp(),
            "exp": (now + timedelta(seconds=self.jwt_access_expires)).timestamp()
        }
        access_token = jwt.encode(access_payload, self.jwt_secret_key, algorithm=self.jwt_algorithm)
        refresh_payload = {
            "sub": user["username"],
            "email": user["email"],
            "iat": now.timestamp(),
            "exp": (now + timedelta(seconds=self.jwt_refresh_expires)).timestamp()
        }
        refresh_token = jwt.encode(refresh_payload, self.jwt_secret_key, algorithm=self.jwt_algorithm)
        hashed_refresh = bcrypt.hashpw(refresh_token.encode("utf-8"), bcrypt.gensalt())
        self.repo.store_refresh_token(user["username"], hashed_refresh)
        logger.info("User logged in successfully", extra={"username": user["username"]})
        return {
            "message": "Login successful",
            "user": {
                "username": user["username"],
                "email": user["email"],
                "role": user["role"]
            },
            "access_token": access_token,
            "refresh_token": refresh_token
        }

    def refresh_access_token(self, refresh_token):
        if not refresh_token or not refresh_token.strip():
            raise UnauthorizedError("Missing refresh token")
        try:
            unverified_payload = jwt.decode(
                refresh_token,
                options={"verify_signature": False, "verify_exp": False}
            )
        except (jwt.DecodeError, jwt.InvalidTokenError, ValueError) as e:
            logger.error("Error decoding refresh token", extra={"error": str(e)})
            raise UnauthorizedError("Invalid refresh token")
        if "sub" not in unverified_payload or "exp" not in unverified_payload:
            raise UnauthorizedError("Invalid refresh token")
        now_ts = datetime.datetime.now(timezone.utc).timestamp()
        try:
            token_exp = float(unverified_payload["exp"])
        except Exception:
            raise UnauthorizedError("Invalid refresh token")
        if now_ts > token_exp:
            raise UnauthorizedError("Refresh token expired")
        try:
            payload = jwt.decode(refresh_token, self.jwt_secret_key, algorithms=[self.jwt_algorithm])
            username = payload.get("sub")
        except jwt.InvalidTokenError:
            raise UnauthorizedError("Invalid refresh token")
        stored_hash = self.repo.get_refresh_token(username)
        if not stored_hash:
            raise UnauthorizedError("Invalid refresh token")
        stored_hash_bytes = stored_hash if isinstance(stored_hash, bytes) else stored_hash.encode("utf-8")
        if not bcrypt.checkpw(refresh_token.encode("utf-8"), stored_hash_bytes):
            raise UnauthorizedError("Invalid refresh token")
        user = self.repo.find_by_username(username)
        if not user:
            raise UserNotFoundError("User not found")
        now = datetime.datetime.now(timezone.utc)
        access_payload = {
            "sub": user["username"],
            "email": user["email"],
            "role": user["role"],
            "iat": now.timestamp(),
            "exp": (now + timedelta(seconds=self.jwt_access_expires)).timestamp()
        }
        new_access_token = jwt.encode(access_payload, self.jwt_secret_key, algorithm=self.jwt_algorithm)
        new_refresh_payload = {
            "sub": user["username"],
            "email": user["email"],
            "iat": now.timestamp(),
            "exp": (now + timedelta(seconds=self.jwt_refresh_expires)).timestamp()
        }
        new_refresh_token = jwt.encode(new_refresh_payload, self.jwt_secret_key, algorithm=self.jwt_algorithm)
        new_hashed_refresh = bcrypt.hashpw(new_refresh_token.encode("utf-8"), bcrypt.gensalt())
        self.repo.store_refresh_token(user["username"], new_hashed_refresh)
        logger.info("Tokens refreshed successfully", extra={"username": username})
        return {
            "message": "Token refreshed successfully",
            "user": {
                "username": user["username"],
                "email": user["email"],
                "role": user["role"]
            },
            "access_token": new_access_token,
            "refresh_token": new_refresh_token
        }

    def update_user(self, user_id, update_data):
        if not update_data:
            raise ValidationError("No update data provided")
        if "password" in update_data:
            if len(update_data["password"]) < 6:
                raise ValidationError("Password must be at least 6 characters")
            update_data["password"] = bcrypt.hashpw(update_data["password"].encode("utf-8"), bcrypt.gensalt())
        update_data["updated_at"] = datetime.datetime.now(timezone.utc).isoformat()
        success = self.repo.update_user(user_id, update_data)
        if not success:
            existing = self.repo.find_by_id(user_id)
            if not existing:
                logger.warning("User update failed: user not found", extra={"user_id": user_id})
                raise UserNotFoundError(f"User with id {user_id} not found")
            logger.warning("User update failed", extra={"user_id": user_id})
            raise ValidationError("Update failed")
        # Fetch updated user to return complete data
        updated_user = self.repo.find_by_id(user_id)
        if not updated_user:
            logger.warning("User not found after update", extra={"user_id": user_id})
            raise UserNotFoundError(f"User with id {user_id} not found")
        # Remove sensitive fields
        updated_user["_id"] = str(updated_user["_id"])
        if "password" in updated_user:
            updated_user.pop("password")
        if "refresh_token" in updated_user:
            updated_user.pop("refresh_token")
        logger.info("User updated successfully", extra={"user_id": user_id})
        return {"message": "User updated successfully", "user": updated_user}

    def list_users(self, page=1, size=10):
        skip = (page - 1) * size
        users = self.repo.list_users(skip=skip, limit=size)
        logger.info("Listed users", extra={"page": page, "size": size, "count": len(users)})
        return users

    def delete_user(self, user_id):
        success = self.repo.delete_user(user_id)
        if not success:
            logger.warning("User deletion failed", extra={"user_id": user_id})
            raise UserNotFoundError(f"User with id {user_id} not found")
        logger.info("User deleted successfully", extra={"user_id": user_id})
        return {"message": "User deleted successfully"}

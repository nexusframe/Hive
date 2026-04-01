# backend/repositories/base_user_repository.py
from abc import ABC, abstractmethod

class BaseUserRepository(ABC):
    @abstractmethod
    def find_by_email(self, email):
        """Find and return a user document by email."""

    @abstractmethod
    def find_by_username(self, username):
        """Find and return a user document by username."""

    @abstractmethod
    def find_by_id(self, user_id):
        """Find and return a user document by ID."""

    @abstractmethod
    def create_user(self, user_data):
        """Create a new user document with the given data."""

    @abstractmethod
    def update_user(self, user_id, update_data):
        """Update a user document identified by user_id with the given data."""

    @abstractmethod
    def delete_user(self, user_id):
        """Delete the user document identified by user_id."""

    @abstractmethod
    def store_refresh_token(self, username, hashed_refresh):
        """Store the hashed refresh token for the specified user."""

    @abstractmethod
    def get_refresh_token(self, username):
        """Retrieve the stored refresh token for the specified user."""

    @abstractmethod
    def clear_refresh_token(self, username):
        """Remove the stored refresh token for the specified user."""

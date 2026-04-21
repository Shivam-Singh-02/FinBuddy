from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
import os
from typing import Optional

from dotenv import load_dotenv


load_dotenv()


def _split_csv(value: Optional[str]) -> list[str]:
    if not value:
        return ["http://localhost:5173"]

    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = "FinBuddy API"
    api_prefix: str = "/api"
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "finbuddy"
    jwt_secret_key: str = "change-this-secret"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 1440
    cors_origins: list[str] = field(default_factory=lambda: ["http://localhost:5173"])

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            mongodb_uri=os.getenv("MONGODB_URI", cls.mongodb_uri),
            mongodb_database=os.getenv("MONGODB_DATABASE", cls.mongodb_database),
            jwt_secret_key=os.getenv("JWT_SECRET_KEY", cls.jwt_secret_key),
            access_token_expire_minutes=int(
                os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", str(cls.access_token_expire_minutes))
            ),
            cors_origins=_split_csv(os.getenv("CORS_ORIGINS")),
        )


@lru_cache
def get_settings() -> Settings:
    return Settings.from_env()

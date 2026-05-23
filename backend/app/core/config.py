from dataclasses import dataclass, field
from functools import lru_cache
import os

from dotenv import load_dotenv


load_dotenv()


def _split_csv(value: str | None) -> list[str]:
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
    llm_provider: str = "bedrock"
    bedrock_api_key: str | None = None
    bedrock_region: str = "us-east-1"
    bedrock_model: str = "us.amazon.nova-2-lite-v1:0"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4o-mini"

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
            llm_provider=os.getenv("LLM_PROVIDER", cls.llm_provider),
            bedrock_api_key=os.getenv("BEDROCK_API_KEY") or os.getenv("AWS_BEARER_TOKEN_BEDROCK"),
            bedrock_region=os.getenv("BEDROCK_REGION", cls.bedrock_region),
            bedrock_model=os.getenv("BEDROCK_MODEL", cls.bedrock_model),
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            openai_model=os.getenv("OPENAI_MODEL", cls.openai_model),
        )


@lru_cache
def get_settings() -> Settings:
    return Settings.from_env()

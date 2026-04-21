from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings


client: Optional[AsyncIOMotorClient] = None
database: Optional[AsyncIOMotorDatabase] = None


async def connect_to_mongo() -> None:
    global client, database

    settings = get_settings()
    client = AsyncIOMotorClient(settings.mongodb_uri)
    database = client[settings.mongodb_database]
    await database.command("ping")


async def close_mongo_connection() -> None:
    global client, database

    if client is not None:
        client.close()

    client = None
    database = None


def get_database() -> AsyncIOMotorDatabase:
    if database is None:
        raise RuntimeError("Database connection has not been initialized.")

    return database


async def initialize_database() -> None:
    db = get_database()

    await db.users.create_index("email", unique=True)
    await db.accounts.create_index([("user_id", 1), ("updated_at", -1)])
    await db.account_entries.create_index([("user_id", 1), ("account_id", 1), ("as_of_date", -1)])
    await db.investments.create_index([("user_id", 1), ("updated_at", -1)])
    await db.investment_entries.create_index([("user_id", 1), ("investment_id", 1), ("as_of_date", -1)])


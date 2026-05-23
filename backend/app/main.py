from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.api.dashboard import router as dashboard_router
from app.api.expenses import router as expenses_router
from app.api.finances import router as finances_router
from app.core.config import get_settings
from app.core.security import get_current_user
from app.db.database import close_mongo_connection, connect_to_mongo, initialize_database
from app.schemas.auth import UserProfile


settings = get_settings()


@asynccontextmanager
async def lifespan(_: FastAPI):
    await connect_to_mongo()
    await initialize_database()
    yield
    await close_mongo_connection()


app = FastAPI(title=settings.app_name, lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(finances_router, prefix=settings.api_prefix)
app.include_router(dashboard_router, prefix=settings.api_prefix)
app.include_router(expenses_router, prefix=settings.api_prefix)


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.get(f"{settings.api_prefix}/auth/me", response_model=UserProfile)
async def me(current_user=Depends(get_current_user)) -> UserProfile:
    return UserProfile(
        id=str(current_user["_id"]),
        full_name=current_user["full_name"],
        email=current_user["email"],
        created_at=current_user["created_at"],
    )
